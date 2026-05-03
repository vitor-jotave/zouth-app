import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    Bot,
    Clock,
    Image,
    MessageSquare,
    Mic,
    Plus,
    Trash2,
} from 'lucide-react';
import type { FormEvent } from 'react';
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

type StepType = 'wait' | 'text' | 'audio' | 'product';

interface FunnelStepPayload {
    seconds?: number;
    body?: string;
    media_path?: string;
    file_name?: string;
    mimetype?: string;
    product_id?: number;
    include_photo?: boolean;
    include_price?: boolean;
    include_description?: boolean;
    include_sku?: boolean;
}

interface FunnelStep {
    id: number;
    type: StepType;
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
    type: StepType;
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
}

const stepTypes = [
    { value: 'wait', label: 'Espera', icon: Clock },
    { value: 'text', label: 'Texto', icon: MessageSquare },
    { value: 'audio', label: 'Áudio', icon: Mic },
    { value: 'product', label: 'Produto', icon: Image },
] as const;

function stepFromPayload(step: FunnelStep): StepForm {
    return {
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

function emptyStep(type: StepType): StepForm {
    return {
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

function formatPrice(priceCents: number | null): string {
    if (priceCents === null) {
        return 'Sem preço';
    }

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(priceCents / 100);
}

export default function AtendimentoFunisEdit({ funnel, products }: Props) {
    const form = useForm({
        name: funnel.name,
        code: funnel.code,
        is_active: funnel.is_active,
        steps: funnel.steps.map(stepFromPayload),
    });
    const errors = form.errors as Record<string, string>;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Atendimento', href: '/manufacturer/atendimento' },
        { title: 'Funis', href: '/manufacturer/atendimento/funis' },
        {
            title: funnel.name,
            href: `/manufacturer/atendimento/funis/${funnel.id}/edit`,
        },
    ];

    const addStep = (type: StepType) => {
        form.setData('steps', [...form.data.steps, emptyStep(type)]);
    };

    const updateStep = (index: number, data: Partial<StepForm>) => {
        form.setData(
            'steps',
            form.data.steps.map((step, currentIndex) =>
                currentIndex === index ? { ...step, ...data } : step,
            ),
        );
    };

    const removeStep = (index: number) => {
        form.setData(
            'steps',
            form.data.steps.filter((_, currentIndex) => currentIndex !== index),
        );
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();

        form.put(`/manufacturer/atendimento/funis/${funnel.id}`, {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar funil - ${funnel.name}`} />

            <form onSubmit={submit} className="flex flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link href="/manufacturer/atendimento/funis">
                            <Button type="button" variant="outline" size="icon">
                                <ArrowLeft className="size-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                Editar funil
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Configure a sequência que será disparada no chat
                            </p>
                        </div>
                    </div>

                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? 'Salvando...' : 'Salvar funil'}
                    </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="space-y-4 rounded-lg border p-4">
                        <div className="space-y-2">
                            <Label htmlFor="funnel-name">Nome</Label>
                            <Input
                                id="funnel-name"
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                            />
                            <InputError message={form.errors.name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="funnel-code">Código curto</Label>
                            <Input
                                id="funnel-code"
                                value={form.data.code}
                                onChange={(event) =>
                                    form.setData(
                                        'code',
                                        event.target.value.toUpperCase(),
                                    )
                                }
                            />
                            <InputError message={form.errors.code} />
                        </div>

                        <div className="flex items-center gap-2">
                            <Switch
                                id="funnel-active"
                                checked={form.data.is_active}
                                onCheckedChange={(checked) =>
                                    form.setData('is_active', checked)
                                }
                            />
                            <Label htmlFor="funnel-active">Ativo no chat</Label>
                        </div>

                        <div className="space-y-2">
                            <Label>Adicionar passo</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {stepTypes.map((type) => {
                                    const Icon = type.icon;

                                    return (
                                        <Button
                                            key={type.value}
                                            type="button"
                                            variant="outline"
                                            onClick={() => addStep(type.value)}
                                        >
                                            <Icon className="mr-2 size-4" />
                                            {type.label}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {form.data.steps.length === 0 && (
                            <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-lg border text-center text-muted-foreground">
                                <Bot className="size-10" />
                                Adicione pelo menos um passo ao funil.
                            </div>
                        )}

                        {form.data.steps.map((step, index) => {
                            const StepIcon =
                                stepTypes.find(
                                    (type) => type.value === step.type,
                                )?.icon ?? Bot;

                            return (
                                <div
                                    key={index}
                                    className="rounded-lg border bg-white p-4"
                                >
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                                                <StepIcon className="size-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">
                                                    Passo {index + 1}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Execução sequencial
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Select
                                                value={step.type}
                                                onValueChange={(value) =>
                                                    updateStep(index, {
                                                        ...emptyStep(
                                                            value as StepType,
                                                        ),
                                                        type: value as StepType,
                                                    })
                                                }
                                            >
                                                <SelectTrigger className="w-36">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {stepTypes.map((type) => (
                                                        <SelectItem
                                                            key={type.value}
                                                            value={type.value}
                                                        >
                                                            {type.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    removeStep(index)
                                                }
                                            >
                                                <Trash2 className="size-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </div>

                                    {step.type === 'wait' && (
                                        <div className="max-w-xs space-y-2">
                                            <Label
                                                htmlFor={`step-${index}-seconds`}
                                            >
                                                Segundos de espera
                                            </Label>
                                            <Input
                                                id={`step-${index}-seconds`}
                                                type="number"
                                                min={1}
                                                value={step.seconds ?? ''}
                                                onChange={(event) =>
                                                    updateStep(index, {
                                                        seconds:
                                                            event.target.value,
                                                    })
                                                }
                                            />
                                            <InputError
                                                message={
                                                    errors[
                                                        `steps.${index}.seconds`
                                                    ]
                                                }
                                            />
                                        </div>
                                    )}

                                    {step.type === 'text' && (
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor={`step-${index}-body`}
                                            >
                                                Mensagem
                                            </Label>
                                            <Textarea
                                                id={`step-${index}-body`}
                                                value={step.body ?? ''}
                                                onChange={(event) =>
                                                    updateStep(index, {
                                                        body: event.target
                                                            .value,
                                                    })
                                                }
                                                rows={4}
                                            />
                                            <InputError
                                                message={
                                                    errors[
                                                        `steps.${index}.body`
                                                    ]
                                                }
                                            />
                                        </div>
                                    )}

                                    {step.type === 'audio' && (
                                        <div className="space-y-2">
                                            <Label
                                                htmlFor={`step-${index}-audio`}
                                            >
                                                Arquivo de áudio
                                            </Label>
                                            <Input
                                                id={`step-${index}-audio`}
                                                type="file"
                                                accept="audio/*"
                                                onChange={(event) =>
                                                    updateStep(index, {
                                                        audio_file:
                                                            event.target
                                                                .files?.[0] ??
                                                            null,
                                                    })
                                                }
                                            />
                                            {step.file_name && (
                                                <p className="text-xs text-muted-foreground">
                                                    Atual: {step.file_name}
                                                </p>
                                            )}
                                            <InputError
                                                message={
                                                    errors[
                                                        `steps.${index}.audio_file`
                                                    ]
                                                }
                                            />
                                        </div>
                                    )}

                                    {step.type === 'product' && (
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label
                                                    htmlFor={`step-${index}-product`}
                                                >
                                                    Produto
                                                </Label>
                                                <Select
                                                    value={String(
                                                        step.product_id ?? '',
                                                    )}
                                                    onValueChange={(value) =>
                                                        updateStep(index, {
                                                            product_id: value,
                                                        })
                                                    }
                                                >
                                                    <SelectTrigger
                                                        id={`step-${index}-product`}
                                                    >
                                                        <SelectValue placeholder="Selecione um produto" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {products.map(
                                                            (product) => (
                                                                <SelectItem
                                                                    key={
                                                                        product.id
                                                                    }
                                                                    value={String(
                                                                        product.id,
                                                                    )}
                                                                >
                                                                    {
                                                                        product.name
                                                                    }{' '}
                                                                    -{' '}
                                                                    {formatPrice(
                                                                        product.price_cents,
                                                                    )}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                <InputError
                                                    message={
                                                        errors[
                                                            `steps.${index}.product_id`
                                                        ]
                                                    }
                                                />
                                            </div>

                                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                                                        'SKU',
                                                    ] as const,
                                                ].map(([field, label]) => (
                                                    <label
                                                        key={field}
                                                        className="flex items-center gap-2 rounded-md border p-3 text-sm"
                                                    >
                                                        <Checkbox
                                                            checked={
                                                                step[field] ===
                                                                true
                                                            }
                                                            onCheckedChange={(
                                                                checked,
                                                            ) =>
                                                                updateStep(
                                                                    index,
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
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </form>
        </AppLayout>
    );
}
