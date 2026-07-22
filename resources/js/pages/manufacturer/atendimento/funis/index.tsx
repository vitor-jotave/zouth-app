import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    type DragEndEvent,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    GripVertical,
    Plus,
    Route,
    Save,
    Sparkles,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import {
    edit,
    order,
    store,
    toggle,
} from '@/actions/App/Http/Controllers/Manufacturer/WhatsappFunnelController';
import InputError from '@/components/input-error';
import { Pagination } from '@/components/pagination';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import {
    funnelStepMeta,
    funnelStepSummary,
    type FunnelStepPayload,
    type FunnelStepType,
} from './funnel-step-meta';

interface WhatsappFunnelStep {
    id: number;
    type: FunnelStepType;
    sort_order: number;
    payload: FunnelStepPayload;
}

interface WhatsappFunnel {
    id: number;
    name: string;
    code: string;
    is_active: boolean;
    sort_order: number;
    steps_count: number;
    steps: WhatsappFunnelStep[];
}

interface Paginated<T> {
    data: T[];
    links?: Array<{ url: string | null; label: string; active: boolean }>;
    meta?: {
        links?: Array<{ url: string | null; label: string; active: boolean }>;
    };
}

interface Props {
    funnels: Paginated<WhatsappFunnel>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Chat', href: '/manufacturer/atendimento' },
    { title: 'Funis', href: '/manufacturer/atendimento/funis' },
];

function SortableFunnelCard({
    funnel,
    position,
}: {
    funnel: WhatsappFunnel;
    position: number;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: funnel.id });

    return (
        <article
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
            className={`group relative border border-white/12 bg-white/[0.025] transition-colors hover:border-white/25 ${isDragging ? 'z-20 border-zouth-coral bg-[#21191b] shadow-2xl shadow-black/40' : ''}`}
        >
            <div className="grid gap-6 p-5 md:grid-cols-[48px_minmax(0,1fr)_auto] md:items-center md:p-7">
                <div className="flex items-center gap-3 md:flex-col">
                    <span className="font-zouth-display text-xs font-bold tracking-[0.18em] text-zouth-warm-gray">
                        {String(position).padStart(2, '0')}
                    </span>
                    <button
                        type="button"
                        aria-label={`Reordenar ${funnel.name}`}
                        className="flex size-10 touch-none items-center justify-center border border-white/12 text-zouth-warm-gray transition-colors hover:border-zouth-coral hover:text-zouth-coral focus-visible:ring-2 focus-visible:ring-zouth-coral focus-visible:outline-none"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="size-4" />
                    </button>
                </div>

                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <h2 className="font-zouth-display text-2xl font-bold tracking-[-0.04em] text-zouth-ivory">
                            {funnel.name}
                            <span className="text-zouth-coral">.</span>
                        </h2>
                        <span className="border-l border-white/15 pl-4 font-zouth-display text-xs font-semibold tracking-[0.12em] text-zouth-warm-gray uppercase">
                            {funnel.code}
                        </span>
                        <button
                            type="button"
                            onClick={() =>
                                router.post(
                                    toggle(funnel.id).url,
                                    {},
                                    {
                                        preserveScroll: true,
                                    },
                                )
                            }
                            className="inline-flex items-center gap-2 text-sm text-zouth-stone transition-colors hover:text-zouth-ivory focus-visible:ring-2 focus-visible:ring-zouth-coral focus-visible:outline-none"
                        >
                            <span
                                className={`size-2 rounded-full ${funnel.is_active ? 'bg-zouth-mineral' : 'bg-zouth-warm-gray'}`}
                            />
                            {funnel.is_active ? 'Ativo no chat' : 'Em pausa'}
                        </button>
                    </div>

                    <div className="mt-5 flex min-w-0 items-center gap-2 overflow-hidden">
                        {funnel.steps.slice(0, 6).map((step, index) => {
                            const meta = funnelStepMeta(step.type);
                            const Icon = meta.icon;

                            return (
                                <div
                                    key={step.id}
                                    className="flex min-w-0 items-center gap-2"
                                >
                                    {index > 0 && (
                                        <span className="h-px w-4 shrink-0 bg-zouth-coral/55" />
                                    )}
                                    <span
                                        title={funnelStepSummary(
                                            step.type,
                                            step.payload,
                                        )}
                                        className="inline-flex h-9 min-w-0 items-center gap-2 border border-white/10 px-3 text-xs text-zouth-stone"
                                    >
                                        <Icon className="size-3.5 shrink-0 text-zouth-coral" />
                                        <span className="max-w-36 truncate">
                                            {funnelStepSummary(
                                                step.type,
                                                step.payload,
                                            )}
                                        </span>
                                    </span>
                                </div>
                            );
                        })}
                        {funnel.steps_count > 6 && (
                            <span className="shrink-0 text-xs text-zouth-warm-gray">
                                +{funnel.steps_count - 6}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 md:justify-end">
                    <span className="hidden text-xs text-zouth-warm-gray xl:inline">
                        {funnel.steps_count}{' '}
                        {funnel.steps_count === 1 ? 'movimento' : 'movimentos'}
                    </span>
                    <Link
                        href={edit(funnel.id).url}
                        className="inline-flex h-11 items-center gap-3 border border-white/15 px-4 font-zouth-display text-sm font-semibold text-zouth-ivory transition-colors hover:border-zouth-coral hover:text-zouth-coral focus-visible:ring-2 focus-visible:ring-zouth-coral focus-visible:outline-none"
                    >
                        Abrir roteiro
                        <ArrowRight className="size-4" />
                    </Link>
                </div>
            </div>
        </article>
    );
}

export default function AtendimentoFunisIndex({ funnels }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [orderedFunnels, setOrderedFunnels] = useState(funnels.data);
    const [orderDirty, setOrderDirty] = useState(false);
    const [orderSaving, setOrderSaving] = useState(false);
    const [orderSaved, setOrderSaved] = useState(false);
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );
    const createForm = useForm({
        name: '',
        code: '',
        is_active: true,
        steps: [{ type: 'text', body: '' }],
    });
    const createErrors = createForm.errors as Record<string, string>;
    const activeCount = orderedFunnels.filter(
        (funnel) => funnel.is_active,
    ).length;

    useEffect(() => {
        setOrderedFunnels(funnels.data);
    }, [funnels.data]);

    const createFunnel = (event: FormEvent) => {
        event.preventDefault();

        createForm.post(store().url, {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                setCreateOpen(false);
            },
        });
    };

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) {
            return;
        }

        setOrderedFunnels((current) => {
            const from = current.findIndex((funnel) => funnel.id === active.id);
            const to = current.findIndex((funnel) => funnel.id === over.id);

            return arrayMove(current, from, to);
        });
        setOrderDirty(true);
        setOrderSaved(false);
    };

    const saveOrder = () => {
        setOrderSaving(true);
        router.put(
            order().url,
            {
                funnels: orderedFunnels.map((funnel, index) => ({
                    id: funnel.id,
                    sort_order: index + 1,
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setOrderDirty(false);
                    setOrderSaved(true);
                },
                onFinish: () => setOrderSaving(false),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Funis" />

            <div
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
                                Funis<span className="text-zouth-coral">.</span>
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-zouth-warm-gray sm:text-base">
                                Transforme abordagens que funcionam em roteiros
                                prontos para conversa rápida.
                            </p>
                        </div>

                        <Button
                            type="button"
                            onClick={() => setCreateOpen(true)}
                            className="h-12 rounded-[2px] bg-zouth-coral px-6 font-zouth-display font-bold text-zouth-charcoal hover:bg-[#ff6a5d]"
                        >
                            <Plus className="size-4" />
                            Criar novo funil
                        </Button>
                    </header>

                    <div className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-zouth-stone">
                            <span className="font-zouth-display font-bold text-zouth-ivory">
                                {orderedFunnels.length}
                            </span>{' '}
                            {orderedFunnels.length === 1 ? 'funil' : 'funis'}
                            <span className="mx-3 text-white/20">/</span>
                            <span className="font-zouth-display font-bold text-zouth-ivory">
                                {activeCount}
                            </span>{' '}
                            {activeCount === 1 ? 'ativo' : 'ativos'} no Chat
                        </p>

                        {(orderDirty || orderSaving || orderSaved) && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={saveOrder}
                                disabled={!orderDirty || orderSaving}
                                className="h-10 rounded-[2px] border-white/15 bg-transparent text-zouth-ivory hover:border-zouth-coral hover:bg-transparent hover:text-zouth-coral disabled:opacity-70"
                            >
                                {orderSaved && !orderDirty ? (
                                    <Check className="size-4 text-zouth-mineral" />
                                ) : (
                                    <Save className="size-4" />
                                )}
                                {orderSaving
                                    ? 'Salvando ordem...'
                                    : orderSaved && !orderDirty
                                      ? 'Ordem salva'
                                      : 'Salvar nova ordem'}
                            </Button>
                        )}
                    </div>

                    {orderedFunnels.length === 0 ? (
                        <section className="flex min-h-96 flex-col items-start justify-center border border-dashed border-white/15 px-8 py-16 sm:px-14">
                            <span className="mb-7 flex size-14 items-center justify-center border border-zouth-coral text-zouth-coral">
                                <Route className="size-6" />
                            </span>
                            <h2 className="max-w-xl font-zouth-display text-3xl font-bold tracking-[-0.04em]">
                                Sua primeira boa conversa pode virar um roteiro
                                para todo o time.
                            </h2>
                            <p className="mt-4 max-w-xl leading-7 text-zouth-warm-gray">
                                Comece com a mensagem de abertura. Depois você
                                combina pausas, áudio e produtos no ritmo certo.
                            </p>
                            <Button
                                type="button"
                                onClick={() => setCreateOpen(true)}
                                className="mt-8 h-11 rounded-[2px] bg-zouth-coral px-5 font-zouth-display font-bold text-zouth-charcoal hover:bg-[#ff6a5d]"
                            >
                                <Sparkles className="size-4" />
                                Começar um funil
                            </Button>
                        </section>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={orderedFunnels.map(
                                    (funnel) => funnel.id,
                                )}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-3">
                                    {orderedFunnels.map((funnel, index) => (
                                        <SortableFunnelCard
                                            key={funnel.id}
                                            funnel={funnel}
                                            position={index + 1}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}

                    <div className="pt-6 text-zouth-ivory">
                        <Pagination
                            links={funnels.meta?.links ?? funnels.links}
                        />
                    </div>
                </div>
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent
                    data-theme="dark"
                    className="overflow-hidden rounded-[2px] border-white/15 bg-zouth-charcoal p-0 text-zouth-ivory sm:max-w-2xl [&>button]:text-zouth-stone [&>button]:hover:text-zouth-coral"
                >
                    <div className="border-b border-white/12 px-6 py-6 sm:px-8">
                        <DialogHeader className="text-left">
                            <p className="font-zouth-display text-xs font-bold tracking-[0.18em] text-zouth-coral uppercase">
                                Novo funil
                            </p>
                            <DialogTitle className="font-zouth-display text-3xl font-bold tracking-[-0.045em] text-zouth-ivory">
                                Comece pela abertura
                                <span className="text-zouth-coral">.</span>
                            </DialogTitle>
                            <DialogDescription className="max-w-lg leading-6 text-zouth-warm-gray">
                                Dê um nome para a abordagem e escreva a primeira
                                mensagem. O restante da sequência é construído
                                no editor visual.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <form
                        onSubmit={createFunnel}
                        className="space-y-6 p-6 sm:p-8"
                    >
                        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_180px]">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="funnel-name"
                                    className="font-zouth-display text-xs font-bold tracking-[0.12em] text-zouth-stone uppercase"
                                >
                                    Nome do funil
                                </Label>
                                <Input
                                    id="funnel-name"
                                    autoFocus
                                    placeholder="Ex.: Boas-vindas ao lojista"
                                    value={createForm.data.name}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'name',
                                            event.target.value,
                                        )
                                    }
                                    className="h-12 rounded-[2px] border-white/15 bg-[#101014] text-zouth-ivory placeholder:text-zouth-warm-gray focus-visible:border-zouth-coral focus-visible:ring-zouth-coral/30"
                                />
                                <InputError message={createForm.errors.name} />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    htmlFor="funnel-code"
                                    className="font-zouth-display text-xs font-bold tracking-[0.12em] text-zouth-stone uppercase"
                                >
                                    Código curto
                                </Label>
                                <Input
                                    id="funnel-code"
                                    placeholder="BOAS-VINDAS"
                                    value={createForm.data.code}
                                    onChange={(event) =>
                                        createForm.setData(
                                            'code',
                                            event.target.value.toUpperCase(),
                                        )
                                    }
                                    className="h-12 rounded-[2px] border-white/15 bg-[#101014] font-zouth-display text-zouth-ivory uppercase placeholder:text-zouth-warm-gray focus-visible:border-zouth-coral focus-visible:ring-zouth-coral/30"
                                />
                                <InputError message={createForm.errors.code} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label
                                htmlFor="funnel-first-message"
                                className="font-zouth-display text-xs font-bold tracking-[0.12em] text-zouth-stone uppercase"
                            >
                                Primeira mensagem
                            </Label>
                            <Textarea
                                id="funnel-first-message"
                                placeholder="Olá, tudo bem? Posso te apresentar nossa nova coleção?"
                                value={createForm.data.steps[0].body}
                                onChange={(event) =>
                                    createForm.setData('steps', [
                                        {
                                            type: 'text',
                                            body: event.target.value,
                                        },
                                    ])
                                }
                                rows={4}
                                className="min-h-28 rounded-[2px] border-white/15 bg-[#101014] text-zouth-ivory placeholder:text-zouth-warm-gray focus-visible:border-zouth-coral focus-visible:ring-zouth-coral/30"
                            />
                            <InputError
                                message={createErrors['steps.0.body']}
                            />
                        </div>

                        <div className="flex items-center justify-between gap-4 border-y border-white/10 py-4">
                            <div>
                                <Label
                                    htmlFor="funnel-active"
                                    className="font-zouth-display font-semibold text-zouth-ivory"
                                >
                                    Disponível no Chat
                                </Label>
                                <p className="mt-1 text-sm text-zouth-warm-gray">
                                    O time poderá iniciar o funil imediatamente.
                                </p>
                            </div>
                            <Switch
                                id="funnel-active"
                                checked={createForm.data.is_active}
                                onCheckedChange={(checked) =>
                                    createForm.setData('is_active', checked)
                                }
                            />
                        </div>

                        <DialogFooter className="gap-3 sm:justify-between">
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
                                disabled={createForm.processing}
                                className="h-11 rounded-[2px] bg-zouth-coral px-6 font-zouth-display font-bold text-zouth-charcoal hover:bg-[#ff6a5d]"
                            >
                                {createForm.processing
                                    ? 'Criando funil...'
                                    : 'Criar e continuar'}
                                <ArrowRight className="size-4" />
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
