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
import AppLayout from '@/layouts/app-layout';
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
    const [definition, setDefinition] = useState<AutomationDefinition>(
        automation.definition,
    );
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
        automation.definition.nodes.find((node) => node.kind === 'condition')
            ?.id ??
            automation.definition.nodes[0]?.id ??
            null,
    );
    const [name, setName] = useState(automation.name);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [testingNodeId, setTestingNodeId] = useState<string | null>(null);
    const [testing, setTesting] = useState(false);
    const [testComplete, setTestComplete] = useState(false);
    const testTimers = useRef<number[]>([]);

    const selectedNode = useMemo(
        () =>
            definition.nodes.find((node) => node.id === selectedNodeId) ?? null,
        [definition.nodes, selectedNodeId],
    );

    useEffect(() => {
        const currentDefinition = automation.definition;

        setDefinition(currentDefinition);
        setName(automation.name);
        setSelectedNodeId(
            currentDefinition.nodes.find((node) => node.kind === 'condition')
                ?.id ??
                currentDefinition.nodes[0]?.id ??
                null,
        );
        setDirty(false);
        setSaved(false);
    }, [automation]);

    useEffect(
        () => () => {
            testTimers.current.forEach((timer) => window.clearTimeout(timer));
        },
        [],
    );

    const markChanged = () => {
        setDirty(true);
        setSaved(false);
    };

    const persist = (isActive = automation.is_active) => {
        setSaving(true);
        const payload = {
            name,
            is_active: isActive,
            definition,
        } as unknown as Parameters<typeof router.put>[1];

        router.put(update(automation.id).url, payload, {
            preserveScroll: true,
            onSuccess: () => {
                setDirty(false);
                setSaved(true);
                window.setTimeout(() => setSaved(false), 1800);
            },
            onFinish: () => setSaving(false),
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
        testTimers.current.forEach((timer) => window.clearTimeout(timer));
        const ordered = [...definition.nodes].sort(
            (first, second) => first.position.x - second.position.x,
        );

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
                <header className="flex min-h-[6.9rem] shrink-0 items-center justify-between gap-6 border-b border-[#f6f4f0]/12 bg-[#141419] px-6 py-5 lg:px-8">
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
                            className="h-11 rounded-[2px] border-[#f6f4f0]/14 bg-transparent px-4 text-[#f6f4f0] hover:border-[#ff4d3d] hover:bg-transparent hover:text-[#ff6a5c]"
                        >
                            {testing ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : testComplete ? (
                                <Check className="size-4 text-[#43c979]" />
                            ) : (
                                <CirclePlay className="size-4" />
                            )}
                            <span className="hidden sm:inline">
                                {testing
                                    ? 'Testando'
                                    : testComplete
                                      ? 'Fluxo pronto'
                                      : 'Testar fluxo'}
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

                <div className="grid min-h-0 min-w-[62rem] flex-1 grid-cols-[13.5rem_minmax(32rem,1fr)_17rem] overflow-hidden">
                    <AutomationMovementLibrary onAddMovement={addMovement} />
                    <section className="relative min-h-0 min-w-0 border-r border-[#f6f4f0]/12">
                        <div className="absolute top-5 left-5 z-30 flex items-center gap-2 border border-[#f6f4f0]/12 bg-[#18181f]/92 px-3 py-2 text-[0.66rem] text-[#98968d] backdrop-blur-sm">
                            <span className="size-1.5 rounded-full bg-[#43c979]" />
                            Cada caminho acontece em tempo real
                        </div>
                        <AutomationCanvas
                            definition={definition}
                            selectedNodeId={selectedNodeId}
                            testingNodeId={testingNodeId}
                            onSelectNode={setSelectedNodeId}
                            onMoveNode={moveNode}
                            onDropMovement={addMovement}
                        />
                    </section>
                    <AutomationInspector
                        node={selectedNode}
                        funnels={funnels}
                        saving={saving}
                        onChange={changeNode}
                        onDelete={deleteNode}
                        onApply={() => persist()}
                    />
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
