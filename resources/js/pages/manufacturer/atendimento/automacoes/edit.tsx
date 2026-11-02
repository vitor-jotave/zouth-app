import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Check,
    CirclePlay,
    LoaderCircle,
    Save,
    Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useDraftState } from '@/hooks/use-draft-history';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import AppLayout from '@/layouts/app-layout';
import { inspectAutomation, previewAutomation } from '@/lib/automation-preview';
import { index, update } from '@/routes/manufacturer/atendimento/automations';
import type { BreadcrumbItem } from '@/types';
import type {
    Automation,
    AutomationDefinition,
    AutomationMovement,
    AutomationNode,
    FunnelOption,
} from './automation-types';
import { movementGroups } from './automation-types';
import { AutomationCanvas } from './components/automation-canvas';
import { AutomationInspector } from './components/automation-inspector';
import { AutomationMovementLibrary } from './components/automation-movement-library';

interface Props {
    automation: Automation;
    funnels: FunnelOption[];
}

function movementOption(movement: AutomationMovement) {
    return movementGroups
        .flatMap((group) => group.options)
        .find((option) => option.movement === movement);
}

function nextPosition(definition: AutomationDefinition) {
    const lastNode = definition.nodes.at(-1);

    if (!lastNode) {
        return { x: 48, y: 220 };
    }

    return {
        x: Math.min(lastNode.position.x + 220, 680),
        y: Math.min(lastNode.position.y + 150, 470),
    };
}

export default function AtendimentoAutomacoesEdit({
    automation,
    funnels,
}: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Chat', href: '/manufacturer/atendimento' },
        { title: 'Automações', href: index().url },
        { title: automation.name, href: '#' },
    ];
    const [definition, setDefinition] = useDraftState<AutomationDefinition>(
        `automation-definition:${automation.id}`,
        automation.definition,
    );
    const [selectedNodeId, setSelectedNodeId] = useDraftState<string | null>(
        `automation-selected:${automation.id}`,
        automation.definition.nodes.find((node) => node.kind === 'condition')
            ?.id ??
            automation.definition.nodes[0]?.id ??
            null,
    );
    const [name, setName] = useDraftState(
        `automation-name:${automation.id}`,
        automation.name,
    );
    const dirty =
        name !== automation.name ||
        JSON.stringify(definition) !== JSON.stringify(automation.definition);
    const serverAutomation = useRef(automation);
    useUnsavedChangesGuard(dirty);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [testingNodeId, setTestingNodeId] = useState<string | null>(null);
    const [testing, setTesting] = useState(false);
    const [testComplete, setTestComplete] = useState(false);
    const testTimers = useRef<number[]>([]);
    const [exampleMessage, setExampleMessage] = useState(
        'Olá, quero conhecer a coleção',
    );
    const [reviewOpen, setReviewOpen] = useState(false);
    const [saveErrors, setSaveErrors] = useState<string[]>([]);
    const [mobilePanel, setMobilePanel] = useState<
        'library' | 'canvas' | 'inspector'
    >('canvas');
    const issues = inspectAutomation(definition, funnels);
    const previewSteps = previewAutomation(definition, exampleMessage);
    const displayDefinition = useMemo(
        () => ({
            ...definition,
            nodes: definition.nodes.map((node) =>
                node.movement === 'send_funnel'
                    ? {
                          ...node,
                          data: {
                              ...node.data,
                              summary:
                                  funnels.find(
                                      (funnel) =>
                                          funnel.id === node.data.funnel_id,
                                  )?.name ?? 'Escolha um roteiro comercial',
                          },
                      }
                    : node,
            ),
        }),
        [definition, funnels],
    );

    const selectedNode = useMemo(
        () =>
            definition.nodes.find((node) => node.id === selectedNodeId) ?? null,
        [definition.nodes, selectedNodeId],
    );

    useEffect(() => {
        if (serverAutomation.current === automation) return;
        serverAutomation.current = automation;
        const currentDefinition = automation.definition;

        setDefinition(currentDefinition);
        setName(automation.name);
        setSelectedNodeId(
            currentDefinition.nodes.find((node) => node.kind === 'condition')
                ?.id ??
                currentDefinition.nodes[0]?.id ??
                null,
        );
        setSaved(false);
    }, [automation, setDefinition, setName, setSelectedNodeId]);

    useEffect(
        () => () => {
            testTimers.current.forEach((timer) => window.clearTimeout(timer));
        },
        [],
    );

    const markChanged = () => {
        testTimers.current.forEach((timer) => window.clearTimeout(timer));
        setTesting(false);
        setTestingNodeId(null);
        setTestComplete(false);
        setSaved(false);
    };

    const persist = (isActive = automation.is_active) => {
        setSaveErrors([]);
        if (isActive && issues.length > 0) {
            setReviewOpen(true);
            return;
        }
        setSaving(true);
        const payload = {
            name,
            is_active: isActive,
            definition,
        } as unknown as Parameters<typeof router.put>[1];

        router.put(update(automation.id).url, payload, {
            preserveScroll: true,
            onSuccess: () => {
                setSaved(true);
                window.setTimeout(() => setSaved(false), 1800);
            },
            onFinish: () => setSaving(false),
            onError: (errors) => setSaveErrors(Object.values(errors)),
        });
    };

    const changeNode = (changedNode: AutomationNode) => {
        setDefinition((current) => ({
            ...current,
            nodes: current.nodes.map((node) =>
                node.id === changedNode.id ? changedNode : node,
            ),
        }));
        markChanged();
    };

    const moveNode = (nodeId: string, x: number, y: number) => {
        setDefinition((current) => ({
            ...current,
            nodes: current.nodes.map((node) =>
                node.id === nodeId ? { ...node, position: { x, y } } : node,
            ),
        }));
        markChanged();
    };

    const addMovement = (
        movement: AutomationMovement,
        x?: number,
        y?: number,
    ) => {
        const option = movementOption(movement);

        if (!option) {
            return;
        }

        const position =
            x === undefined || y === undefined
                ? nextPosition(definition)
                : { x: Math.round(x), y: Math.round(y) };
        const nodeId = `${movement}-${Date.now()}`;
        const node: AutomationNode = {
            id: nodeId,
            kind: option.kind,
            movement,
            position,
            data: {
                title: option.title,
                summary: option.summary,
                ...(movement === 'message_contains'
                    ? {
                          keywords: [],
                          match: 'any' as const,
                          case_sensitive: false,
                      }
                    : {}),
                ...(movement === 'send_funnel'
                    ? {
                          funnel_id: funnels[0]?.id ?? null,
                          summary: funnels[0]
                              ? `${funnels[0].name} · ${funnels[0].code}`
                              : 'Escolha um roteiro comercial',
                      }
                    : {}),
            },
        };

        setDefinition((current) => {
            const source = current.nodes.find(
                (candidate) => candidate.id === selectedNodeId,
            );
            const branch =
                source?.kind === 'condition'
                    ? current.edges.some(
                          (edge) =>
                              edge.from === source.id && edge.branch === 'sim',
                      )
                        ? ('não' as const)
                        : ('sim' as const)
                    : null;
            const edge = source
                ? [
                      {
                          id: `edge-${source.id}-${nodeId}`,
                          from: source.id,
                          to: nodeId,
                          branch,
                      },
                  ]
                : [];

            return {
                nodes: [...current.nodes, node],
                edges: [...current.edges, ...edge],
            };
        });
        setSelectedNodeId(nodeId);
        markChanged();
    };

    const deleteNode = (nodeId: string) => {
        setDefinition((current) => ({
            nodes: current.nodes.filter((node) => node.id !== nodeId),
            edges: current.edges.filter(
                (edge) => edge.from !== nodeId && edge.to !== nodeId,
            ),
        }));
        setSelectedNodeId(null);
        markChanged();
    };

    const testFlow = () => {
        setReviewOpen(true);
        if (issues.length > 0) return;
        testTimers.current.forEach((timer) => window.clearTimeout(timer));
        const ordered = previewSteps;

        setTesting(true);
        setTestComplete(false);
        ordered.forEach((node, indexValue) => {
            testTimers.current.push(
                window.setTimeout(
                    () => setTestingNodeId(node.id),
                    indexValue * 430,
                ),
            );
        });
        testTimers.current.push(
            window.setTimeout(
                () => {
                    setTestingNodeId(null);
                    setTesting(false);
                    setTestComplete(true);
                },
                ordered.length * 430 + 300,
            ),
        );
        testTimers.current.push(
            window.setTimeout(
                () => setTestComplete(false),
                ordered.length * 430 + 2300,
            ),
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${automation.name} · Automações`} />

            <main
                data-theme="dark"
                className="flex h-[calc(100svh-4rem)] flex-col overflow-hidden bg-[#101015] font-zouth-body text-[#f6f4f0]"
            >
                <header className="flex min-h-[6.9rem] shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#f6f4f0]/12 bg-[#141419] px-4 py-4 lg:px-8">
                    <div className="flex min-w-0 items-center gap-6">
                        <Link
                            href={index().url}
                            prefetch
                            aria-label="Voltar para automações"
                            className="hidden size-12 shrink-0 items-center justify-center border border-[#f6f4f0]/14 text-[#cac4ba] transition-colors hover:border-[#ff4d3d] hover:text-[#ff6a5c] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ff4d3d] sm:flex"
                        >
                            <ArrowLeft className="size-5" />
                        </Link>
                        <div className="min-w-0">
                            <div className="flex items-center gap-3">
                                <span className="text-[0.64rem] font-bold tracking-[0.18em] text-[#ff6a5c] uppercase">
                                    Editor de automação
                                </span>
                                <span className="h-3 w-px bg-[#f6f4f0]/18" />
                                <span className="text-xs text-[#98968d]">
                                    {automation.is_active
                                        ? 'Em movimento'
                                        : 'Rascunho'}
                                </span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                <input
                                    value={name}
                                    onChange={(event) => {
                                        setName(event.target.value);
                                        markChanged();
                                    }}
                                    aria-label="Nome da automação"
                                    className="max-w-[28rem] min-w-0 border-0 bg-transparent p-0 font-zouth-display text-2xl font-semibold tracking-[-0.045em] text-[#f6f4f0] outline-none sm:text-[2rem]"
                                    style={{
                                        width: `${Math.min(Math.max((name.length + 1) * 0.82, 10), 28)}ch`,
                                    }}
                                />
                                <span className="font-zouth-display text-2xl font-semibold text-[#ff4d3d] sm:text-[2rem]">
                                    .
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={testFlow}
                            disabled={testing}
                            aria-label="Simular sem enviar mensagens"
                            className="h-11 rounded-[2px] border-[#f6f4f0]/14 bg-transparent px-4 text-[#f6f4f0] hover:border-[#ff4d3d] hover:bg-transparent hover:text-[#ff6a5c]"
                        >
                            {testing ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : testComplete ? (
                                <Check className="size-4 text-[#43c979]" />
                            ) : (
                                <CirclePlay className="size-4" />
                            )}
                            <span>
                                {testing
                                    ? 'Simulando'
                                    : testComplete
                                      ? 'Simulação concluída'
                                      : 'Simular'}
                            </span>
                        </Button>
                        <Button
                            type="button"
                            onClick={() => persist(!automation.is_active)}
                            disabled={saving}
                            className={`h-11 rounded-[2px] px-5 font-zouth-display font-bold ${
                                automation.is_active
                                    ? 'bg-[#29282e] text-[#f6f4f0] hover:bg-[#343239]'
                                    : 'bg-[#ff4d3d] text-[#18181f] hover:bg-[#ff6a5c]'
                            }`}
                        >
                            {saving ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : automation.is_active ? (
                                <span className="size-2 rounded-full bg-[#43c979]" />
                            ) : (
                                <Sparkles className="size-4" />
                            )}
                            {automation.is_active ? 'Pausar' : 'Ativar'}
                        </Button>
                    </div>
                </header>

                {saveErrors.length > 0 && (
                    <div
                        role="alert"
                        className="shrink-0 border-b border-[#ff4d3d]/40 px-5 py-3 text-sm text-[#ff9f94]"
                    >
                        {saveErrors.join(' ')}
                    </div>
                )}
                {reviewOpen && (
                    <section
                        aria-label="Conferência da automação"
                        className="max-h-[40vh] shrink-0 overflow-y-auto border-b border-[#f6f4f0]/12 bg-[#18181f] p-4 text-sm"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="font-semibold">
                                Simulação sem envio
                            </h2>
                            <button
                                type="button"
                                onClick={() => setReviewOpen(false)}
                                className="underline"
                            >
                                Fechar simulação
                            </button>
                        </div>
                        <p className="mt-2 text-[#cac4ba]">
                            Confere a configuração e o caminho da mensagem de
                            exemplo. Não envia mensagens nem verifica a conexão
                            do WhatsApp.
                        </p>
                        {issues.length > 0 ? (
                            <ul
                                role="alert"
                                className="mt-3 list-inside list-disc text-[#ff9f94]"
                            >
                                {issues.map((issue) => (
                                    <li key={issue}>{issue}</li>
                                ))}
                            </ul>
                        ) : (
                            <>
                                <label
                                    className="mt-3 block"
                                    htmlFor="automation-example"
                                >
                                    Mensagem de exemplo
                                </label>
                                <input
                                    id="automation-example"
                                    value={exampleMessage}
                                    onChange={(event) => {
                                        setExampleMessage(event.target.value);
                                        setTestComplete(false);
                                    }}
                                    className="mt-2 min-h-11 w-full border border-white/20 bg-transparent px-3"
                                />
                                <ol
                                    className="mt-3 list-inside list-decimal"
                                    aria-label="Caminho simulado"
                                >
                                    {previewSteps.map((step) => (
                                        <li key={step.id}>
                                            {step.title} — {step.result}
                                        </li>
                                    ))}
                                </ol>
                            </>
                        )}
                    </section>
                )}
                <nav
                    aria-label="Painéis da automação"
                    className="flex shrink-0 border-b border-white/15 xl:hidden"
                >
                    {(
                        [
                            ['library', 'Movimentos'],
                            ['canvas', 'Fluxo'],
                            ['inspector', 'Configurar'],
                        ] as const
                    ).map(([panel, label]) => (
                        <button
                            key={panel}
                            type="button"
                            aria-pressed={mobilePanel === panel}
                            onClick={() => setMobilePanel(panel)}
                            className={`min-h-11 flex-1 px-2 text-sm ${mobilePanel === panel ? 'border-b-2 border-[#ff4d3d] text-white' : 'text-[#cac4ba]'}`}
                        >
                            {label}
                        </button>
                    ))}
                </nav>

                <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[13.5rem_minmax(0,1fr)_17rem]">
                    <div
                        className={`min-h-0 overflow-y-auto ${mobilePanel === 'library' ? 'block' : 'hidden'} xl:block`}
                    >
                        <AutomationMovementLibrary
                            onAddMovement={addMovement}
                        />
                    </div>
                    <section
                        className={`relative min-h-0 min-w-0 border-r border-[#f6f4f0]/12 ${mobilePanel === 'canvas' ? 'block' : 'hidden'} xl:block`}
                    >
                        <div className="absolute top-5 left-5 z-30 flex items-center gap-2 border border-[#f6f4f0]/12 bg-[#18181f]/92 px-3 py-2 text-[0.66rem] text-[#98968d] backdrop-blur-sm">
                            <span className="size-1.5 rounded-full bg-[#43c979]" />
                            Quadro de configuração
                        </div>
                        <div className="hidden h-full xl:block">
                            <AutomationCanvas
                                definition={displayDefinition}
                                selectedNodeId={selectedNodeId}
                                testingNodeId={testingNodeId}
                                onSelectNode={setSelectedNodeId}
                                onMoveNode={moveNode}
                                onDropMovement={addMovement}
                            />
                        </div>
                        <div
                            className="h-full overflow-y-auto px-4 pt-20 pb-6 xl:hidden"
                            aria-label="Movimentos e caminhos do fluxo"
                        >
                            <p className="mb-4 text-xs text-[#cac4ba]">
                                Toque em um movimento para configurar. Os
                                caminhos abaixo mostram as ligações do fluxo.
                            </p>
                            {displayDefinition.nodes.map((node) => (
                                <article
                                    key={node.id}
                                    className="mb-4 border border-white/15 bg-[#18181f] p-4"
                                >
                                    <button
                                        type="button"
                                        aria-label={`Configurar ${node.data.title}`}
                                        onClick={() => {
                                            setSelectedNodeId(node.id);
                                            setMobilePanel('inspector');
                                        }}
                                        className="min-h-11 w-full text-left focus-visible:outline-2 focus-visible:outline-[#ff4d3d]"
                                    >
                                        <span className="block font-semibold">
                                            {node.data.title}
                                        </span>
                                        <span className="mt-1 block text-xs text-[#cac4ba]">
                                            {node.data.summary}
                                        </span>
                                    </button>
                                    <ul className="mt-3 space-y-1 text-xs text-[#cac4ba]">
                                        {definition.edges
                                            .filter(
                                                (edge) => edge.from === node.id,
                                            )
                                            .map((edge) => (
                                                <li key={edge.id}>
                                                    {edge.branch
                                                        ? `${edge.branch === 'sim' ? 'Sim' : 'Não'} → `
                                                        : 'Depois → '}
                                                    {definition.nodes.find(
                                                        (target) =>
                                                            target.id ===
                                                            edge.to,
                                                    )?.data.title ??
                                                        'Movimento indisponível'}
                                                </li>
                                            ))}
                                    </ul>
                                </article>
                            ))}
                        </div>
                    </section>
                    <div
                        className={`min-h-0 overflow-y-auto ${mobilePanel === 'inspector' ? 'block' : 'hidden'} xl:block`}
                    >
                        <div className="border-b border-white/15 p-3 xl:hidden">
                            <label
                                htmlFor="mobile-automation-node"
                                className="mb-2 block text-sm"
                            >
                                Movimento para configurar
                            </label>
                            <select
                                id="mobile-automation-node"
                                value={selectedNodeId ?? ''}
                                onChange={(event) =>
                                    setSelectedNodeId(event.target.value)
                                }
                                className="min-h-11 w-full border border-white/20 bg-[#18181f] px-2"
                            >
                                {definition.nodes.map((node) => (
                                    <option key={node.id} value={node.id}>
                                        {node.data.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <AutomationInspector
                            node={selectedNode}
                            funnels={funnels}
                            saving={saving}
                            onChange={changeNode}
                            onDelete={deleteNode}
                            onApply={() => persist()}
                        />
                    </div>
                </div>

                <footer className="flex min-h-14 shrink-0 items-center justify-between border-t border-[#f6f4f0]/12 bg-[#141419] px-5 text-xs text-[#77746d]">
                    <p>
                        {dirty
                            ? 'Alterações ainda não aplicadas'
                            : saved
                              ? 'Alterações aplicadas ao fluxo'
                              : 'Fluxo salvo'}
                    </p>
                    {dirty && (
                        <button
                            type="button"
                            onClick={() => persist()}
                            className="inline-flex items-center gap-2 font-bold text-[#f6f4f0] hover:text-[#ff6a5c] focus-visible:outline-2 focus-visible:outline-[#ff4d3d]"
                        >
                            <Save className="size-3.5" />
                            Salvar rascunho
                        </button>
                    )}
                </footer>
            </main>
        </AppLayout>
    );
}
