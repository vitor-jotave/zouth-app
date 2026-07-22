import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    Clock3,
    Filter,
    MessageSquare,
    Plus,
    Route,
    Sparkles,
    UserRoundCheck,
    Workflow,
    type LucideIcon,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import {
    edit,
    index,
    store,
} from '@/routes/manufacturer/atendimento/automations';
import type { BreadcrumbItem } from '@/types';
import type {
    Automation,
    AutomationDefinition,
    AutomationMovement,
    AutomationNode,
} from './automation-types';

interface Props {
    automations: Automation[];
    starter_definition: AutomationDefinition;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Chat', href: '/manufacturer/atendimento' },
    { title: 'Automações', href: index().url },
];

const movementIcons: Record<AutomationMovement, LucideIcon> = {
    message_received: MessageSquare,
    client_replied: UserRoundCheck,
    message_contains: Filter,
    send_funnel: Route,
    wait_reply: Clock3,
};

const movementKindLabel = {
    trigger: 'Quando',
    condition: 'Se',
    action: 'Faça',
} as const;

const movementTone = {
    trigger: 'border-[#ff4d3d]/35 text-[#ff6a5c]',
    condition: 'border-[#aa73ad]/35 text-[#c99bcc]',
    action: 'border-[#f6f4f0]/14 text-[#cac4ba]',
} as const;

function orderedNodes(definition: AutomationDefinition): AutomationNode[] {
    return [...definition.nodes].sort((first, second) => {
        const xDifference = first.position.x - second.position.x;

        return xDifference === 0
            ? first.position.y - second.position.y
            : xDifference;
    });
}

function updatedLabel(value: string | null): string {
    if (!value) {
        return 'Agora mesmo';
    }

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    })
        .format(new Date(value))
        .replace('.', '');
}

function AutomationCard({
    automation,
    position,
}: {
    automation: Automation;
    position: number;
}) {
    const nodes = orderedNodes(automation.definition);
    const visibleNodes = nodes.slice(0, 4);
    const hiddenCount = Math.max(nodes.length - visibleNodes.length, 0);

    return (
        <article className="group border border-white/12 bg-white/[0.025] transition-colors hover:border-white/25">
            <div className="grid gap-6 px-5 py-6 md:grid-cols-[54px_minmax(0,1fr)_auto] md:items-center md:px-7">
                <div className="flex items-center gap-3 md:flex-col">
                    <span className="font-zouth-display text-xs font-bold tracking-[0.18em] text-zouth-warm-gray">
                        {String(position).padStart(2, '0')}
                    </span>
                    <span className="flex size-10 items-center justify-center border border-white/12 text-zouth-stone">
                        <Workflow className="size-4" />
                    </span>
                </div>

                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <h2 className="font-zouth-display text-2xl font-semibold tracking-[-0.04em] text-zouth-ivory">
                            {automation.name}
                            <span className="text-zouth-coral">.</span>
                        </h2>
                        <span className="h-3 w-px bg-white/15" />
                        <span
                            className={`inline-flex items-center gap-2 text-xs ${
                                automation.is_active
                                    ? 'text-zouth-mineral'
                                    : 'text-zouth-warm-gray'
                            }`}
                        >
                            <span
                                className={`size-2 rounded-full ${
                                    automation.is_active
                                        ? 'bg-zouth-mineral'
                                        : 'bg-white/25'
                                }`}
                            />
                            {automation.is_active ? 'Em movimento' : 'Rascunho'}
                        </span>
                        <span className="text-[0.68rem] text-zouth-warm-gray">
                            Atualizada em {updatedLabel(automation.updated_at)}
                        </span>
                    </div>

                    <div className="mt-5 flex min-w-0 items-center gap-2 overflow-hidden">
                        {visibleNodes.map((node, indexValue) => {
                            const Icon = movementIcons[node.movement];

                            return (
                                <div
                                    key={node.id}
                                    className="flex min-w-0 items-center gap-2"
                                >
                                    {indexValue > 0 && (
                                        <span className="h-px w-4 shrink-0 bg-zouth-coral/35" />
                                    )}
                                    <span
                                        className={`flex max-w-48 min-w-0 items-center gap-2 border bg-[#101014] px-3 py-2.5 ${movementTone[node.kind]}`}
                                        title={`${movementKindLabel[node.kind]}: ${node.data.title}`}
                                    >
                                        <Icon className="size-3.5 shrink-0" />
                                        <span className="truncate text-xs text-zouth-stone">
                                            <span className="mr-1 font-bold tracking-[0.08em] uppercase">
                                                {movementKindLabel[node.kind]}
                                            </span>
                                            {node.data.title}
                                        </span>
                                    </span>
                                </div>
                            );
                        })}
                        {hiddenCount > 0 && (
                            <span className="shrink-0 text-xs text-zouth-warm-gray">
                                +{hiddenCount}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-5 md:justify-end">
                    <span className="text-xs whitespace-nowrap text-zouth-warm-gray">
                        {nodes.length}{' '}
                        {nodes.length === 1 ? 'movimento' : 'movimentos'}
                    </span>
                    <Button
                        asChild
                        variant="outline"
                        className="h-11 rounded-[2px] border-white/15 bg-transparent px-5 font-zouth-display font-semibold text-zouth-ivory hover:border-zouth-coral hover:bg-transparent hover:text-zouth-coral"
                    >
                        <Link href={edit(automation.id).url} prefetch>
                            Abrir fluxo
                            <ArrowRight className="size-4" />
                        </Link>
                    </Button>
                </div>
            </div>
        </article>
    );
}

export default function AtendimentoAutomacoesIndex({
    automations,
    starter_definition,
}: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const createForm = useForm({ name: '' });
    const activeCount = automations.filter(
        (automation) => automation.is_active,
    ).length;

    const createAutomation = (event: FormEvent) => {
        event.preventDefault();
        const payload = {
            name: createForm.data.name,
            definition: starter_definition,
        } as unknown as Parameters<typeof router.post>[1];

        router.post(store().url, payload, {
            onStart: () => setCreating(true),
            onError: (errors) => {
                if (errors.name) {
                    createForm.setError('name', errors.name);
                }
            },
            onSuccess: () => {
                createForm.reset();
                setCreateOpen(false);
            },
            onFinish: () => setCreating(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Automações" />

            <main
                data-theme="dark"
                className="min-h-[calc(100svh-4rem)] bg-[#101014] px-5 py-8 text-zouth-ivory sm:px-8 lg:px-10 lg:py-10"
            >
                <div className="mx-auto max-w-[1480px]">
                    <header className="flex flex-col gap-7 border-b border-white/12 pb-8 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="mb-3 font-zouth-display text-xs font-bold tracking-[0.18em] text-zouth-coral uppercase">
                                Atendimento
                            </p>
                            <h1 className="font-zouth-display text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
                                Automações
                                <span className="text-zouth-coral">.</span>
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-zouth-warm-gray sm:text-base">
                                Transforme sinais de interesse em próximos
                                movimentos, sem deixar nenhuma conversa esfriar.
                            </p>
                        </div>

                        <Button
                            type="button"
                            onClick={() => {
                                createForm.setData('name', '');
                                createForm.clearErrors();
                                setCreateOpen(true);
                            }}
                            className="h-12 rounded-[2px] bg-zouth-coral px-6 font-zouth-display font-bold text-zouth-charcoal hover:bg-[#ff6a5d]"
                        >
                            <Plus className="size-4" />
                            Criar automação
                        </Button>
                    </header>

                    <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-zouth-stone">
                            <span className="font-zouth-display font-bold text-zouth-ivory">
                                {automations.length}
                            </span>{' '}
                            {automations.length === 1
                                ? 'automação'
                                : 'automações'}
                            <span className="mx-3 text-white/20">/</span>
                            <span className="font-zouth-display font-bold text-zouth-ivory">
                                {activeCount}
                            </span>{' '}
                            em movimento
                        </p>
                        <p className="text-xs text-zouth-warm-gray">
                            Rascunhos nunca agem sem sua ativação.
                        </p>
                    </div>

                    {automations.length === 0 ? (
                        <section className="flex min-h-96 flex-col items-start justify-center border border-dashed border-white/15 px-8 py-16 sm:px-14">
                            <span className="mb-7 flex size-14 items-center justify-center border border-zouth-coral text-zouth-coral">
                                <Workflow className="size-6" />
                            </span>
                            <h2 className="max-w-2xl font-zouth-display text-3xl font-semibold tracking-[-0.04em]">
                                Uma boa conversa pode encontrar o próximo passo
                                sozinha
                                <span className="text-zouth-coral">.</span>
                            </h2>
                            <p className="mt-4 max-w-xl leading-7 text-zouth-warm-gray">
                                Comece escolhendo o sinal de interesse. Depois,
                                desenhe a resposta no editor visual.
                            </p>
                            <Button
                                type="button"
                                onClick={() => setCreateOpen(true)}
                                className="mt-8 h-11 rounded-[2px] bg-zouth-coral px-5 font-zouth-display font-bold text-zouth-charcoal hover:bg-[#ff6a5d]"
                            >
                                <Sparkles className="size-4" />
                                Criar primeira automação
                            </Button>
                        </section>
                    ) : (
                        <div className="space-y-3">
                            {automations.map((automation, indexValue) => (
                                <AutomationCard
                                    key={automation.id}
                                    automation={automation}
                                    position={indexValue + 1}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </main>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent
                    data-theme="dark"
                    className="overflow-hidden rounded-[2px] border-white/15 bg-zouth-charcoal p-0 text-zouth-ivory sm:max-w-lg [&>button]:text-zouth-stone [&>button]:hover:text-zouth-coral"
                >
                    <div className="border-b border-white/12 px-7 py-7">
                        <DialogHeader className="text-left">
                            <p className="font-zouth-display text-xs font-bold tracking-[0.18em] text-zouth-coral uppercase">
                                Nova automação
                            </p>
                            <DialogTitle className="font-zouth-display text-3xl font-semibold tracking-[-0.045em] text-zouth-ivory">
                                Dê um nome ao movimento
                                <span className="text-zouth-coral">.</span>
                            </DialogTitle>
                            <DialogDescription className="leading-6 text-zouth-warm-gray">
                                O fluxo nasce como rascunho. No editor, você
                                decide quando começa, o que observa e qual ação
                                acontece.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <form onSubmit={createAutomation} className="p-7">
                        <Label
                            htmlFor="automation-name"
                            className="font-zouth-display text-xs font-bold tracking-[0.12em] text-zouth-stone uppercase"
                        >
                            Nome da automação
                        </Label>
                        <Input
                            id="automation-name"
                            autoFocus
                            value={createForm.data.name}
                            onChange={(event) =>
                                createForm.setData('name', event.target.value)
                            }
                            placeholder="Ex.: Interesse na nova coleção"
                            className="mt-3 h-12 rounded-[2px] border-white/15 bg-[#101014] text-zouth-ivory placeholder:text-zouth-warm-gray focus-visible:border-zouth-coral focus-visible:ring-zouth-coral/30"
                        />
                        <InputError message={createForm.errors.name} />

                        <DialogFooter className="mt-7 flex-row justify-between">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setCreateOpen(false)}
                                className="rounded-[2px] text-zouth-stone hover:bg-white/[0.05] hover:text-zouth-ivory"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={creating}
                                className="h-11 rounded-[2px] bg-zouth-coral px-5 font-zouth-display font-bold text-zouth-charcoal hover:bg-[#ff6a5d]"
                            >
                                {creating ? 'Criando...' : 'Criar e abrir'}
                                <ArrowRight className="size-4" />
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
