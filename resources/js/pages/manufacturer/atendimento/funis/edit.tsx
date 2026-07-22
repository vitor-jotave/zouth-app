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
import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Check,
    GripVertical,
    Info,
    LoaderCircle,
    Save,
    Settings2,
    Trash2,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import {
    index as funnelsIndex,
    update,
} from '@/actions/App/Http/Controllers/Manufacturer/WhatsappFunnelController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { VoiceMessagePreview } from '../components/voice-message-preview';
import {
    funnelStepMeta,
    funnelStepSummary,
    funnelStepTypes,
    type FunnelStepPayload,
    type FunnelStepType,
} from './funnel-step-meta';

interface FunnelStep {
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
    steps: FunnelStep[];
}

interface Product {
    id: number;
    name: string;
    sku: string | null;
    price_cents: number | null;
}

interface StepForm {
    audio_url?: string;
    clientId: string;
    type: FunnelStepType;
    seconds?: number | string;
    body?: string;
    media_path?: string;
    file_name?: string;
    mimetype?: string;
    audio_file?: File | null;
    product_id?: number | string;
    include_photo?: boolean;
    include_price?: boolean;
    include_description?: boolean;
    include_sku?: boolean;
}

interface Props {
    funnel: WhatsappFunnel;
    products: Product[];
    sender_profile: {
        name: string | null;
        picture_url: string | null;
    };
}

const fieldClassName =
    'rounded-[2px] border-white/15 bg-[#101014] text-zouth-ivory placeholder:text-zouth-warm-gray focus-visible:border-zouth-coral focus-visible:ring-zouth-coral/30';

const fieldLabelClassName =
    'font-zouth-display text-xs font-bold tracking-[0.12em] text-zouth-stone uppercase';

function newStepId(): string {
    return `new-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;
}

function stepFromPayload(step: FunnelStep): StepForm {
    return {
        audio_url: step.payload.audio_url,
        clientId: `step-${step.id}`,
        type: step.type,
        seconds: step.payload.seconds ?? 2,
        body: step.payload.body ?? '',
        media_path: step.payload.media_path ?? '',
        file_name: step.payload.file_name ?? '',
        mimetype: step.payload.mimetype ?? '',
        audio_file: null,
        product_id: step.payload.product_id ?? '',
        include_photo: step.payload.include_photo ?? true,
        include_price: step.payload.include_price ?? true,
        include_description: step.payload.include_description ?? true,
        include_sku: step.payload.include_sku ?? false,
    };
}

function emptyStep(type: FunnelStepType): StepForm {
    return {
        audio_url: '',
        clientId: newStepId(),
        type,
        seconds: 2,
        body: '',
        media_path: '',
        file_name: '',
        mimetype: '',
        audio_file: null,
        product_id: '',
        include_photo: true,
        include_price: true,
        include_description: true,
        include_sku: false,
    };
}

function stepPayload(step: StepForm): FunnelStepPayload {
    return {
        seconds:
            typeof step.seconds === 'string'
                ? Number(step.seconds)
                : step.seconds,
        body: step.body,
        media_path: step.media_path,
        file_name: step.file_name,
        mimetype: step.mimetype,
        product_id:
            typeof step.product_id === 'string'
                ? Number(step.product_id) || undefined
                : step.product_id,
        include_photo: step.include_photo,
        include_price: step.include_price,
        include_description: step.include_description,
        include_sku: step.include_sku,
    };
}

function formatPrice(priceCents: number | null): string {
    if (priceCents === null) {
        return 'Sob consulta';
    }

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(priceCents / 100);
}

function SortableStepCard({
    step,
    index,
    selected,
    summary,
    isLast,
    onSelect,
    onRemove,
}: {
    step: StepForm;
    index: number;
    selected: boolean;
    summary: string;
    isLast: boolean;
    onSelect: () => void;
    onRemove: () => void;
}) {
    const meta = funnelStepMeta(step.type);
    const Icon = meta.icon;
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: step.clientId });

    return (
        <li
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
            }}
            className={`relative ${isDragging ? 'z-20' : ''}`}
        >
            <div
                className={`group grid min-h-20 grid-cols-[minmax(0,1fr)_auto_auto] items-stretch border transition-colors ${selected ? 'border-zouth-coral bg-[#21191b]' : 'border-white/14 bg-white/[0.025] hover:border-white/30'} ${isDragging ? 'shadow-2xl shadow-black/50' : ''}`}
            >
                <button
                    type="button"
                    onClick={onSelect}
                    className="flex min-w-0 items-center gap-4 px-4 py-3 text-left focus-visible:ring-2 focus-visible:ring-zouth-coral focus-visible:outline-none focus-visible:ring-inset sm:px-5"
                >
                    <span
                        className={`flex size-9 shrink-0 items-center justify-center border font-zouth-display text-xs font-bold ${selected ? 'border-zouth-coral bg-zouth-coral text-zouth-charcoal' : 'border-white/12 bg-white/[0.04] text-zouth-stone'}`}
                    >
                        {index + 1}
                    </span>
                    <span
                        className={`flex size-11 shrink-0 items-center justify-center rounded-full border ${selected ? 'border-zouth-coral text-zouth-coral' : 'border-white/15 text-zouth-stone'}`}
                    >
                        <Icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                        <span className="block font-zouth-display text-xs font-bold tracking-[0.12em] text-zouth-warm-gray uppercase">
                            {meta.label}
                        </span>
                        <span className="mt-1 block truncate text-sm font-medium text-zouth-ivory sm:text-base">
                            {summary}
                        </span>
                    </span>
                </button>

                <button
                    type="button"
                    aria-label={`Reordenar passo ${index + 1}`}
                    className="flex w-12 touch-none items-center justify-center border-l border-white/10 text-zouth-warm-gray transition-colors hover:text-zouth-coral focus-visible:ring-2 focus-visible:ring-zouth-coral focus-visible:outline-none focus-visible:ring-inset"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="size-4" />
                </button>

                <button
                    type="button"
                    aria-label={`Excluir passo ${index + 1}`}
                    onClick={onRemove}
                    className="flex w-12 items-center justify-center border-l border-white/10 text-zouth-warm-gray transition-colors hover:bg-zouth-coral/10 hover:text-zouth-coral focus-visible:ring-2 focus-visible:ring-zouth-coral focus-visible:outline-none focus-visible:ring-inset"
                >
                    <Trash2 className="size-4" />
                </button>
            </div>

            {!isLast && (
                <div
                    aria-hidden="true"
                    className="mx-auto h-4 w-px bg-zouth-coral/70"
                />
            )}
        </li>
    );
}

function ConversationPreview({
    step,
    product,
    senderProfile,
}: {
    step: StepForm;
    product?: Product;
    senderProfile: Props['sender_profile'];
}) {
    const payload = stepPayload(step);

    if (step.type === 'wait') {
        return (
            <div className="border-l-2 border-zouth-coral bg-white/[0.025] px-4 py-4">
                <p className="font-zouth-display text-sm font-semibold text-zouth-ivory">
                    O ritmo da conversa respira por {payload.seconds || 1}{' '}
                    segundos.
                </p>
                <p className="mt-2 text-sm leading-6 text-zouth-warm-gray">
                    Depois desse intervalo, o próximo movimento é enviado
                    automaticamente.
                </p>
            </div>
        );
    }

    if (step.type === 'audio') {
        return (
            <div className="border border-white/12 bg-[#0d1512] p-4">
                <p className="mb-3 flex items-center gap-2 text-xs text-zouth-warm-gray">
                    <span className="size-2 rounded-full bg-zouth-mineral" />
                    Como chega para o lojista
                </p>
                <VoiceMessagePreview
                    file={step.audio_file}
                    sourceUrl={step.audio_url}
                    profileName={senderProfile.name}
                    profilePictureUrl={senderProfile.picture_url}
                />
            </div>
        );
    }

    return (
        <div className="border border-white/12 bg-[#0d1512] p-4">
            <p className="mb-3 flex items-center gap-2 text-xs text-zouth-warm-gray">
                <span className="size-2 rounded-full bg-zouth-mineral" />
                Como chega para o lojista
            </p>
            <div className="ml-auto max-w-[88%] border border-zouth-mineral/35 bg-[#15231e] px-4 py-3">
                {step.type === 'text' && (
                    <p className="text-sm leading-6 whitespace-pre-wrap text-zouth-ivory">
                        {step.body?.trim() || 'Sua mensagem aparece aqui.'}
                    </p>
                )}

                {step.type === 'product' && (
                    <div>
                        <p className="font-zouth-display font-bold text-zouth-ivory">
                            {product?.name || 'Produto selecionado'}
                        </p>
                        {step.include_price && (
                            <p className="mt-2 text-sm text-zouth-stone">
                                Preço:{' '}
                                {product
                                    ? formatPrice(product.price_cents)
                                    : 'Sob consulta'}
                            </p>
                        )}
                        {step.include_description && (
                            <p className="mt-2 text-sm leading-6 text-zouth-warm-gray">
                                Detalhes da peça seguem junto da apresentação.
                            </p>
                        )}
                        {step.include_sku && product?.sku && (
                            <p className="mt-2 font-zouth-display text-xs font-semibold tracking-[0.08em] text-zouth-warm-gray uppercase">
                                SKU {product.sku}
                            </p>
                        )}
                    </div>
                )}

                <p className="mt-3 text-right text-[10px] text-zouth-warm-gray">
                    agora ✓✓
                </p>
            </div>
        </div>
    );
}

export default function AtendimentoFunisEdit({
    funnel,
    products,
    sender_profile,
}: Props) {
    const initialSteps = funnel.steps.map(stepFromPayload);
    const form = useForm({
        name: funnel.name,
        code: funnel.code,
        is_active: funnel.is_active,
        steps: initialSteps,
    });
    const [selectedStepId, setSelectedStepId] = useState<string | null>(
        initialSteps[0]?.clientId ?? null,
    );
    const errors = form.errors as Record<string, string>;
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Chat', href: '/manufacturer/atendimento' },
        { title: 'Funis', href: funnelsIndex().url },
        {
            title: funnel.name,
            href: `/manufacturer/atendimento/funis/${funnel.id}/edit`,
        },
    ];
    const selectedIndex = form.data.steps.findIndex(
        (step) => step.clientId === selectedStepId,
    );
    const selectedStep =
        selectedIndex >= 0 ? form.data.steps[selectedIndex] : null;
    const selectedMeta = selectedStep
        ? funnelStepMeta(selectedStep.type)
        : null;
    const selectedProduct = selectedStep
        ? products.find(
              (product) =>
                  String(product.id) === String(selectedStep.product_id),
          )
        : undefined;

    const addStep = (type: FunnelStepType) => {
        const step = emptyStep(type);
        form.setData('steps', [...form.data.steps, step]);
        setSelectedStepId(step.clientId);
    };

    const updateStep = (index: number, data: Partial<StepForm>) => {
        form.setData(
            'steps',
            form.data.steps.map((step, currentIndex) =>
                currentIndex === index ? { ...step, ...data } : step,
            ),
        );
    };

    const changeStepType = (index: number, type: FunnelStepType) => {
        const currentStep = form.data.steps[index];
        updateStep(index, {
            ...emptyStep(type),
            clientId: currentStep.clientId,
            type,
        });
    };

    const removeStep = (index: number) => {
        const nextSteps = form.data.steps.filter(
            (_, currentIndex) => currentIndex !== index,
        );
        form.setData('steps', nextSteps);

        if (form.data.steps[index]?.clientId === selectedStepId) {
            setSelectedStepId(
                nextSteps[index]?.clientId ??
                    nextSteps[index - 1]?.clientId ??
                    null,
            );
        }
    };

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over || active.id === over.id) {
            return;
        }

        const from = form.data.steps.findIndex(
            (step) => step.clientId === active.id,
        );
        const to = form.data.steps.findIndex(
            (step) => step.clientId === over.id,
        );

        form.setData('steps', arrayMove(form.data.steps, from, to));
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();

        form.transform((data) => ({
            ...data,
            steps: data.steps.map((step) => ({
                type: step.type,
                seconds: step.seconds,
                body: step.body,
                media_path: step.media_path,
                file_name: step.file_name,
                mimetype: step.mimetype,
                audio_file: step.audio_file,
                product_id: step.product_id,
                include_photo: step.include_photo,
                include_price: step.include_price,
                include_description: step.include_description,
                include_sku: step.include_sku,
            })),
        }));
        form.put(update(funnel.id).url, {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar funil - ${funnel.name}`} />

            <form
                data-theme="dark"
                onSubmit={submit}
                className="min-h-[calc(100svh-4rem)] bg-[#101014] text-zouth-ivory lg:grid lg:h-[calc(100svh-4rem)] lg:min-h-0 lg:grid-cols-[230px_minmax(430px,1fr)_minmax(340px,410px)] lg:overflow-hidden xl:grid-cols-[250px_minmax(520px,1fr)_420px]"
            >
                <aside className="flex flex-col border-b border-white/12 bg-zouth-charcoal lg:min-h-0 lg:border-r lg:border-b-0">
                    <div className="border-b border-white/10 p-5">
                        <Link
                            href={funnelsIndex().url}
                            className="inline-flex items-center gap-3 text-sm text-zouth-stone transition-colors hover:text-zouth-coral focus-visible:ring-2 focus-visible:ring-zouth-coral focus-visible:outline-none"
                        >
                            <ArrowLeft className="size-4" />
                            Todos os funis
                        </Link>
                    </div>

                    <div className="p-5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                        <p className="font-zouth-display text-xs font-bold tracking-[0.16em] text-zouth-warm-gray uppercase">
                            Adicionar passo
                        </p>
                        <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-1">
                            {funnelStepTypes.map((type) => {
                                const Icon = type.icon;

                                return (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => addStep(type.value)}
                                        className="group flex min-h-14 items-center gap-3 border border-white/14 px-4 text-left text-sm font-semibold text-zouth-ivory transition-colors hover:border-zouth-coral hover:bg-zouth-coral/[0.06] focus-visible:ring-2 focus-visible:ring-zouth-coral focus-visible:outline-none"
                                    >
                                        <Icon className="size-4 text-zouth-stone transition-colors group-hover:text-zouth-coral" />
                                        {type.label}
                                        <span className="ml-auto font-zouth-display text-lg font-light text-zouth-warm-gray group-hover:text-zouth-coral">
                                            +
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            type="button"
                            onClick={() => setSelectedStepId(null)}
                            className={`mt-6 flex w-full items-center gap-3 border px-4 py-4 text-left text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-zouth-coral focus-visible:outline-none ${selectedStepId === null ? 'border-zouth-coral bg-zouth-coral/[0.06] text-zouth-coral' : 'border-white/10 text-zouth-stone hover:border-white/25 hover:text-zouth-ivory'}`}
                        >
                            <Settings2 className="size-4" />
                            Dados do funil
                        </button>
                    </div>

                    <div className="hidden border-t border-white/10 p-5 text-xs leading-5 text-zouth-warm-gray lg:block">
                        <Info className="mb-3 size-4 text-zouth-coral" />
                        Arraste os passos pelo puxador para acertar o ritmo da
                        conversa.
                    </div>
                </aside>

                <section className="bg-[#101014] px-5 py-8 sm:px-8 lg:min-h-0 lg:overflow-y-auto lg:px-10 lg:py-10">
                    <div className="mx-auto max-w-3xl">
                        <header className="mb-8 border-b border-white/12 pb-7">
                            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                                <div className="min-w-0">
                                    <p className="font-zouth-display text-xs font-bold tracking-[0.16em] text-zouth-coral uppercase">
                                        Funil de atendimento
                                    </p>
                                    <h1>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedStepId(null)
                                            }
                                            className="mt-2 max-w-full text-left focus-visible:ring-2 focus-visible:ring-zouth-coral focus-visible:outline-none"
                                        >
                                            <span className="block truncate font-zouth-display text-3xl font-semibold tracking-[-0.05em] text-zouth-ivory sm:text-4xl">
                                                {form.data.name ||
                                                    'Funil sem nome'}
                                                <span className="text-zouth-coral">
                                                    .
                                                </span>
                                            </span>
                                        </button>
                                    </h1>
                                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-zouth-warm-gray">
                                        <span className="font-zouth-display font-semibold tracking-[0.08em] uppercase">
                                            {form.data.code || 'SEM-CÓDIGO'}
                                        </span>
                                        <span className="h-4 w-px bg-white/15" />
                                        <span className="inline-flex items-center gap-2">
                                            <span
                                                className={`size-2 rounded-full ${form.data.is_active ? 'bg-zouth-mineral' : 'bg-zouth-warm-gray'}`}
                                            />
                                            {form.data.is_active
                                                ? 'Ativo no Chat'
                                                : 'Em pausa'}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSelectedStepId(null)}
                                    className="inline-flex h-10 shrink-0 items-center gap-2 border border-white/14 px-4 text-sm text-zouth-stone transition-colors hover:border-zouth-coral hover:text-zouth-coral focus-visible:ring-2 focus-visible:ring-zouth-coral focus-visible:outline-none"
                                >
                                    <Settings2 className="size-4" />
                                    Editar dados
                                </button>
                            </div>
                        </header>

                        {form.data.steps.length === 0 ? (
                            <div className="flex min-h-72 flex-col items-center justify-center border border-dashed border-white/15 px-8 text-center">
                                <span className="flex size-12 items-center justify-center border border-zouth-coral text-zouth-coral">
                                    +
                                </span>
                                <h2 className="mt-6 font-zouth-display text-2xl font-bold tracking-[-0.035em]">
                                    A conversa ainda não começou.
                                </h2>
                                <p className="mt-3 max-w-md leading-6 text-zouth-warm-gray">
                                    Escolha uma mensagem, espera, áudio ou
                                    produto para criar o primeiro movimento.
                                </p>
                            </div>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={form.data.steps.map(
                                        (step) => step.clientId,
                                    )}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <ol>
                                        {form.data.steps.map((step, index) => {
                                            const product = products.find(
                                                (candidate) =>
                                                    String(candidate.id) ===
                                                    String(step.product_id),
                                            );

                                            return (
                                                <SortableStepCard
                                                    key={step.clientId}
                                                    step={step}
                                                    index={index}
                                                    selected={
                                                        step.clientId ===
                                                        selectedStepId
                                                    }
                                                    summary={funnelStepSummary(
                                                        step.type,
                                                        stepPayload(step),
                                                        product?.name,
                                                    )}
                                                    isLast={
                                                        index ===
                                                        form.data.steps.length -
                                                            1
                                                    }
                                                    onSelect={() =>
                                                        setSelectedStepId(
                                                            step.clientId,
                                                        )
                                                    }
                                                    onRemove={() =>
                                                        removeStep(index)
                                                    }
                                                />
                                            );
                                        })}
                                    </ol>
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>
                </section>

                <aside className="flex flex-col border-t border-white/12 bg-zouth-charcoal lg:min-h-0 lg:border-t-0 lg:border-l">
                    <div className="border-b border-white/10 px-5 py-6 sm:px-7">
                        <p className="font-zouth-display text-xs font-bold tracking-[0.16em] text-zouth-coral uppercase">
                            {selectedStep ? 'Passo selecionado' : 'Identidade'}
                        </p>
                        <h2 className="mt-2 font-zouth-display text-2xl font-bold tracking-[-0.035em]">
                            {selectedMeta?.configurationTitle ??
                                'Dados do funil'}
                            <span className="text-zouth-coral">.</span>
                        </h2>
                        <p className="mt-2 text-sm text-zouth-warm-gray">
                            {selectedStep
                                ? `Passo ${selectedIndex + 1} de ${form.data.steps.length}`
                                : 'Nome, código e disponibilidade no Chat'}
                        </p>
                    </div>

                    <div className="space-y-7 p-5 sm:p-7 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                        {!selectedStep && (
                            <>
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="funnel-name"
                                        className={fieldLabelClassName}
                                    >
                                        Nome do funil
                                    </Label>
                                    <Input
                                        id="funnel-name"
                                        value={form.data.name}
                                        onChange={(event) =>
                                            form.setData(
                                                'name',
                                                event.target.value,
                                            )
                                        }
                                        className={`h-12 ${fieldClassName}`}
                                    />
                                    <InputError message={form.errors.name} />
                                </div>

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="funnel-code"
                                        className={fieldLabelClassName}
                                    >
                                        Código curto
                                    </Label>
                                    <Input
                                        id="funnel-code"
                                        value={form.data.code}
                                        onChange={(event) =>
                                            form.setData(
                                                'code',
                                                event.target.value.toUpperCase(),
                                            )
                                        }
                                        className={`h-12 font-zouth-display uppercase ${fieldClassName}`}
                                    />
                                    <InputError message={form.errors.code} />
                                </div>

                                <div className="flex items-center justify-between gap-4 border-y border-white/10 py-5">
                                    <div>
                                        <Label
                                            htmlFor="funnel-active"
                                            className="font-zouth-display font-semibold text-zouth-ivory"
                                        >
                                            Ativo no Chat
                                        </Label>
                                        <p className="mt-1 text-sm leading-5 text-zouth-warm-gray">
                                            O roteiro fica disponível para o
                                            time iniciar nas conversas.
                                        </p>
                                    </div>
                                    <Switch
                                        id="funnel-active"
                                        checked={form.data.is_active}
                                        onCheckedChange={(checked) =>
                                            form.setData('is_active', checked)
                                        }
                                    />
                                </div>
                            </>
                        )}

                        {selectedStep && (
                            <>
                                <div className="space-y-2">
                                    <Label className={fieldLabelClassName}>
                                        Tipo de movimento
                                    </Label>
                                    <Select
                                        value={selectedStep.type}
                                        onValueChange={(value) =>
                                            changeStepType(
                                                selectedIndex,
                                                value as FunnelStepType,
                                            )
                                        }
                                    >
                                        <SelectTrigger
                                            className={`h-12 w-full ${fieldClassName}`}
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent
                                            data-theme="dark"
                                            className="rounded-[2px] border-white/15 bg-zouth-charcoal text-zouth-ivory"
                                        >
                                            {funnelStepTypes.map((type) => {
                                                const Icon = type.icon;

                                                return (
                                                    <SelectItem
                                                        key={type.value}
                                                        value={type.value}
                                                        className="rounded-[2px] focus:bg-zouth-coral focus:text-zouth-charcoal"
                                                    >
                                                        <span className="flex items-center gap-2">
                                                            <Icon className="size-4" />
                                                            {type.label}
                                                        </span>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedStep.type === 'wait' && (
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor={`step-${selectedIndex}-seconds`}
                                            className={fieldLabelClassName}
                                        >
                                            Tempo de espera
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id={`step-${selectedIndex}-seconds`}
                                                type="number"
                                                min={1}
                                                value={
                                                    selectedStep.seconds ?? ''
                                                }
                                                onChange={(event) =>
                                                    updateStep(selectedIndex, {
                                                        seconds:
                                                            event.target.value,
                                                    })
                                                }
                                                className={`h-12 pr-24 ${fieldClassName}`}
                                            />
                                            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-zouth-warm-gray">
                                                segundos
                                            </span>
                                        </div>
                                        <InputError
                                            message={
                                                errors[
                                                    `steps.${selectedIndex}.seconds`
                                                ]
                                            }
                                        />
                                    </div>
                                )}

                                {selectedStep.type === 'text' && (
                                    <div className="space-y-2">
                                        <Label
                                            htmlFor={`step-${selectedIndex}-body`}
                                            className={fieldLabelClassName}
                                        >
                                            Texto da mensagem
                                        </Label>
                                        <Textarea
                                            id={`step-${selectedIndex}-body`}
                                            value={selectedStep.body ?? ''}
                                            onChange={(event) =>
                                                updateStep(selectedIndex, {
                                                    body: event.target.value,
                                                })
                                            }
                                            rows={6}
                                            className={`min-h-36 ${fieldClassName}`}
                                        />
                                        <div className="flex items-center justify-between text-xs text-zouth-warm-gray">
                                            <span>
                                                Escreva como você falaria.
                                            </span>
                                            <span>
                                                {
                                                    (selectedStep.body ?? '')
                                                        .length
                                                }{' '}
                                                caracteres
                                            </span>
                                        </div>
                                        <InputError
                                            message={
                                                errors[
                                                    `steps.${selectedIndex}.body`
                                                ]
                                            }
                                        />
                                    </div>
                                )}

                                {selectedStep.type === 'audio' && (
                                    <div className="space-y-3">
                                        <Label
                                            htmlFor={`step-${selectedIndex}-audio`}
                                            className={fieldLabelClassName}
                                        >
                                            Mensagem de voz
                                        </Label>
                                        <label
                                            htmlFor={`step-${selectedIndex}-audio`}
                                            className="flex cursor-pointer flex-col items-center justify-center border border-dashed border-white/20 px-5 py-8 text-center transition-colors hover:border-zouth-coral"
                                        >
                                            <span className="font-zouth-display text-sm font-semibold text-zouth-ivory">
                                                {selectedStep.audio_file
                                                    ?.name ||
                                                    selectedStep.file_name ||
                                                    'Escolher arquivo de áudio'}
                                            </span>
                                            <span className="mt-2 text-xs text-zouth-warm-gray">
                                                MP3, OGG ou outro formato de voz
                                            </span>
                                        </label>
                                        <Input
                                            id={`step-${selectedIndex}-audio`}
                                            type="file"
                                            accept="audio/*"
                                            className="sr-only"
                                            onChange={(event) =>
                                                updateStep(selectedIndex, {
                                                    audio_file:
                                                        event.target
                                                            .files?.[0] ?? null,
                                                })
                                            }
                                        />
                                        <InputError
                                            message={
                                                errors[
                                                    `steps.${selectedIndex}.audio_file`
                                                ]
                                            }
                                        />
                                    </div>
                                )}

                                {selectedStep.type === 'product' && (
                                    <div className="space-y-6">
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor={`step-${selectedIndex}-product`}
                                                className={fieldLabelClassName}
                                            >
                                                Produto apresentado
                                            </Label>
                                            <Select
                                                value={String(
                                                    selectedStep.product_id ??
                                                        '',
                                                )}
                                                onValueChange={(value) =>
                                                    updateStep(selectedIndex, {
                                                        product_id: value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger
                                                    id={`step-${selectedIndex}-product`}
                                                    className={`h-12 w-full ${fieldClassName}`}
                                                >
                                                    <SelectValue placeholder="Escolha uma peça" />
                                                </SelectTrigger>
                                                <SelectContent
                                                    data-theme="dark"
                                                    className="rounded-[2px] border-white/15 bg-zouth-charcoal text-zouth-ivory"
                                                >
                                                    {products.map((product) => (
                                                        <SelectItem
                                                            key={product.id}
                                                            value={String(
                                                                product.id,
                                                            )}
                                                            className="rounded-[2px] focus:bg-zouth-coral focus:text-zouth-charcoal"
                                                        >
                                                            {product.name} ·{' '}
                                                            {formatPrice(
                                                                product.price_cents,
                                                            )}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                message={
                                                    errors[
                                                        `steps.${selectedIndex}.product_id`
                                                    ]
                                                }
                                            />
                                        </div>

                                        <div>
                                            <p className={fieldLabelClassName}>
                                                O que acompanha a peça
                                            </p>
                                            <div className="mt-3 grid grid-cols-2 gap-2">
                                                {[
                                                    [
                                                        'include_photo',
                                                        'Foto',
                                                    ] as const,
                                                    [
                                                        'include_price',
                                                        'Preço',
                                                    ] as const,
                                                    [
                                                        'include_description',
                                                        'Descrição',
                                                    ] as const,
                                                    [
                                                        'include_sku',
                                                        'Código',
                                                    ] as const,
                                                ].map(([field, label]) => (
                                                    <label
                                                        key={field}
                                                        className={`flex cursor-pointer items-center gap-3 border px-3 py-3 text-sm transition-colors ${selectedStep[field] === true ? 'border-zouth-coral/55 bg-zouth-coral/[0.05] text-zouth-ivory' : 'border-white/12 text-zouth-stone hover:border-white/25'}`}
                                                    >
                                                        <Checkbox
                                                            checked={
                                                                selectedStep[
                                                                    field
                                                                ] === true
                                                            }
                                                            onCheckedChange={(
                                                                checked,
                                                            ) =>
                                                                updateStep(
                                                                    selectedIndex,
                                                                    {
                                                                        [field]:
                                                                            checked ===
                                                                            true,
                                                                    },
                                                                )
                                                            }
                                                        />
                                                        {label}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="border-t border-white/10 pt-7">
                                    <p className={fieldLabelClassName}>
                                        Prévia no Chat
                                    </p>
                                    <div className="mt-3">
                                        <ConversationPreview
                                            step={selectedStep}
                                            product={selectedProduct}
                                            senderProfile={sender_profile}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="border-t border-white/12 bg-zouth-charcoal p-5 sm:p-7">
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="h-12 w-full rounded-[2px] bg-zouth-coral font-zouth-display font-bold text-zouth-charcoal hover:bg-[#ff6a5d]"
                        >
                            {form.processing ? (
                                <LoaderCircle className="size-4 animate-spin" />
                            ) : form.recentlySuccessful ? (
                                <Check className="size-4" />
                            ) : (
                                <Save className="size-4" />
                            )}
                            {form.processing
                                ? 'Salvando funil...'
                                : form.recentlySuccessful
                                  ? 'Funil salvo'
                                  : 'Salvar funil'}
                        </Button>
                    </div>
                </aside>
            </form>
        </AppLayout>
    );
}
