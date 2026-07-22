import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowUpRight,
    Check,
    CircleDot,
    Clock3,
    ExternalLink,
    FileText,
    Mail,
    MapPin,
    Package,
    Phone,
    RotateCcw,
    Save,
    Truck,
    UserRound,
    X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { AppPageHeader } from '@/components/app-page-header';
import { MetricRail } from '@/components/metric-rail';
import { StatusLabel, type StatusLabelTone } from '@/components/status-label';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import manufacturer from '@/routes/manufacturer';
import publicRoutes from '@/routes/public';
import type { BreadcrumbItem } from '@/types';

type ComboComponent = {
    product_id: number;
    product_name: string | null;
    product_sku: string | null;
    variation_key: Record<string, string> | null;
    quantity: number;
};

type OrderItem = {
    id: number;
    product_id: number | null;
    product_name: string;
    product_sku: string | null;
    unit_price: string | null;
    quantity: number;
    size: string | null;
    color: string | null;
    selected_variations: Record<string, string> | null;
    combo_components: ComboComponent[] | null;
    image_urls: string[];
};

type StatusHistory = {
    id: number;
    from_status: string;
    from_label: string;
    to_status: string;
    to_label: string;
    changed_by: string | null;
    created_at: string;
};

type AllowedTransition = {
    value: string;
    label: string;
};

type Order = {
    id: number;
    public_token: string;
    customer_id: number | null;
    status: string;
    status_label: string;
    customer_name: string;
    customer_phone: string | null;
    customer_email: string | null;
    customer_document_type: string | null;
    customer_document: string | null;
    customer_notes: string | null;
    customer_zip_code: string | null;
    customer_state: string | null;
    customer_city: string | null;
    customer_neighborhood: string | null;
    customer_street: string | null;
    customer_address_number: string | null;
    customer_address_complement: string | null;
    customer_address_reference: string | null;
    internal_notes: string | null;
    tracking_ref: string | null;
    items: OrderItem[];
    total_items: number;
    subtotal_amount: string;
    discount_amount: string;
    total_amount: string;
    applied_order_rules: Array<{ name: string; discount_cents: number }>;
    status_history: StatusHistory[];
    sales_rep: { id: number; name: string } | null;
    allowed_transitions: AllowedTransition[];
    created_at: string;
};

type Props = {
    order: Order;
};

const statusTone: Record<string, StatusLabelTone> = {
    new: 'coral',
    confirmed: 'plum',
    preparing: 'neutral',
    shipped: 'muted',
    delivered: 'mineral',
    cancelled: 'coral',
};

function formatCurrency(value: string | number | null): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(Number(value ?? 0));
}

function formatDateTime(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

function formatShortDateTime(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    })
        .format(new Date(value))
        .replace('.', '');
}

function formatPhone(phone: string | null): string | null {
    if (!phone) {
        return null;
    }

    const digits = phone.replace(/\D/g, '');

    if (digits.length === 11) {
        return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    }

    if (digits.length === 10) {
        return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }

    return phone;
}

function formatDocument(
    type: string | null,
    document: string | null,
): string | null {
    if (!document) {
        return null;
    }

    const digits = document.replace(/\D/g, '');

    if (type === 'cpf' && digits.length === 11) {
        return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    }

    if (type === 'cnpj' && digits.length === 14) {
        return digits.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
            '$1.$2.$3/$4-$5',
        );
    }

    return document;
}

function formatZipCode(zipCode: string | null): string | null {
    if (!zipCode) {
        return null;
    }

    const digits = zipCode.replace(/\D/g, '');

    return digits.length === 8
        ? digits.replace(/^(\d{5})(\d{3})$/, '$1-$2')
        : zipCode;
}

function variationSummary(key: Record<string, string> | null): string | null {
    if (!key) {
        return null;
    }

    return Object.entries(key)
        .map(([name, value]) => `${name}: ${value}`)
        .join(' · ');
}

function itemVariationSummary(item: OrderItem): string | null {
    return (
        variationSummary(item.selected_variations) ??
        ([item.color, item.size].filter(Boolean).join(' · ') || null)
    );
}

function transitionActionLabel(transition: AllowedTransition): string {
    return (
        {
            confirmed: 'Confirmar pedido',
            preparing: 'Iniciar preparo',
            shipped: 'Marcar como enviado',
            delivered: 'Marcar como entregue',
        }[transition.value] ?? transition.label
    );
}

function ProductVisual({
    item,
    ordinal,
}: {
    item: OrderItem;
    ordinal: number;
}) {
    if (item.image_urls.length === 0) {
        return null;
    }

    const images = item.image_urls.slice(0, 3);

    return (
        <div
            className={cn(
                'grid aspect-square min-h-32 overflow-hidden bg-[#e7e3dc]',
                images.length === 2 && 'grid-cols-2 gap-px',
                images.length > 2 && 'grid-cols-2 grid-rows-2 gap-px',
            )}
        >
            {images.map((imageUrl, index) => (
                <img
                    key={imageUrl}
                    src={imageUrl}
                    alt={index === 0 ? item.product_name : ''}
                    loading="lazy"
                    className={cn(
                        'h-full w-full object-cover',
                        images.length > 2 && index === 0 && 'row-span-2',
                    )}
                />
            ))}
            <span className="sr-only">Item {ordinal}</span>
        </div>
    );
}

function OrderLine({ item, ordinal }: { item: OrderItem; ordinal: number }) {
    const subtotal = Number(item.unit_price ?? 0) * item.quantity;
    const variation = itemVariationSummary(item);
    const hasVisual = item.image_urls.length > 0;

    return (
        <article
            className={cn(
                'grid gap-5 px-5 py-7 sm:px-7 lg:items-start',
                hasVisual && 'lg:grid-cols-[9.5rem_minmax(0,1fr)]',
            )}
        >
            <ProductVisual item={item} ordinal={ordinal} />

            <div className="min-w-0">
                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
                    <div className="min-w-0">
                        <p className="text-[0.66rem] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                            {String(ordinal).padStart(2, '0')}
                        </p>
                        <h3 className="mt-2 font-zouth-display text-xl font-semibold tracking-[-0.035em] text-foreground">
                            {item.product_name}
                        </h3>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {item.product_sku && (
                                <span>SKU {item.product_sku}</span>
                            )}
                            {variation && <span>{variation}</span>}
                        </div>
                    </div>

                    <dl className="grid min-w-[17rem] grid-cols-3 gap-5 border-t border-border pt-4 text-right xl:border-t-0 xl:pt-0">
                        <div>
                            <dt className="text-[0.62rem] font-bold tracking-[0.13em] text-muted-foreground uppercase">
                                Qtd.
                            </dt>
                            <dd className="mt-2 font-zouth-display text-sm font-semibold tabular-nums">
                                {item.quantity}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[0.62rem] font-bold tracking-[0.13em] text-muted-foreground uppercase">
                                Unitário
                            </dt>
                            <dd className="mt-2 font-zouth-display text-sm font-semibold tabular-nums">
                                {item.unit_price === null
                                    ? 'Sob consulta'
                                    : formatCurrency(item.unit_price)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-[0.62rem] font-bold tracking-[0.13em] text-muted-foreground uppercase">
                                Subtotal
                            </dt>
                            <dd className="mt-2 font-zouth-display text-sm font-semibold tabular-nums">
                                {item.unit_price === null
                                    ? '—'
                                    : formatCurrency(subtotal)}
                            </dd>
                        </div>
                    </dl>
                </div>

                {item.combo_components && item.combo_components.length > 0 && (
                    <div className="mt-6 border border-border bg-[#e7e3dc]/25">
                        <p className="border-b border-border px-4 py-3 text-[0.62rem] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                            Composição do combo
                        </p>
                        <div className="divide-y divide-border">
                            {item.combo_components.map((component, index) => (
                                <div
                                    key={`${component.product_id}-${index}`}
                                    className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center"
                                >
                                    <span className="font-zouth-display font-semibold tabular-nums">
                                        {component.quantity}x
                                    </span>
                                    <span className="font-medium text-foreground">
                                        {component.product_name ??
                                            'Produto do combo'}
                                    </span>
                                    <span className="text-xs text-muted-foreground sm:text-right">
                                        {variationSummary(
                                            component.variation_key,
                                        ) ??
                                            component.product_sku ??
                                            'Sem variação'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </article>
    );
}

function DetailRow({
    icon: Icon,
    label,
    children,
}: {
    icon: typeof Phone;
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3 py-3.5">
            <Icon
                className="mt-0.5 size-4 text-muted-foreground"
                aria-hidden="true"
            />
            <div className="min-w-0">
                <p className="text-[0.62rem] font-bold tracking-[0.13em] text-muted-foreground uppercase">
                    {label}
                </p>
                <div className="mt-1 text-sm leading-6 text-foreground">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default function OrderShow({ order }: Props) {
    const [internalNotes, setInternalNotes] = useState(
        order.internal_notes ?? '',
    );
    const [savedNotes, setSavedNotes] = useState(order.internal_notes ?? '');
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [savingNotes, setSavingNotes] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

    const nextTransition =
        order.allowed_transitions.find(
            (transition) => transition.value !== 'cancelled',
        ) ?? null;
    const cancelTransition =
        order.allowed_transitions.find(
            (transition) => transition.value === 'cancelled',
        ) ?? null;
    const formattedPhone = formatPhone(order.customer_phone);
    const formattedDocument = formatDocument(
        order.customer_document_type,
        order.customer_document,
    );
    const formattedZipCode = formatZipCode(order.customer_zip_code);
    const hasDeliveryAddress = Boolean(
        order.customer_street || order.customer_city || order.customer_zip_code,
    );
    const timeline = order.status_history.reduce<StatusHistory[]>(
        (entries, entry) => {
            const existingIndex = entries.findIndex(
                (existing) => existing.to_status === entry.to_status,
            );

            if (existingIndex === -1) {
                return [...entries, entry];
            }

            return entries.map((existing, index) =>
                index === existingIndex ? entry : existing,
            );
        },
        [],
    );
    const lastMovement = timeline.at(-1) ?? null;
    const notesAreDirty = internalNotes !== savedNotes;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Visão geral', href: dashboard().url },
        { title: 'Pedidos', href: manufacturer.orders.index().url },
        {
            title: `#${String(order.id).padStart(4, '0')}`,
            href: manufacturer.orders.show(order.id).url,
        },
    ];

    const updateStatus = (status: string) => {
        setUpdatingStatus(true);
        router.post(
            manufacturer.orders.updateStatus(order.id).url,
            { status },
            {
                preserveScroll: true,
                onFinish: () => {
                    setUpdatingStatus(false);
                    setCancelDialogOpen(false);
                },
            },
        );
    };

    const saveNotes = () => {
        setSavingNotes(true);
        router.put(
            manufacturer.orders.updateNotes(order.id).url,
            { internal_notes: internalNotes },
            {
                preserveScroll: true,
                onSuccess: () => setSavedNotes(internalNotes),
                onFinish: () => setSavingNotes(false),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Pedido #${String(order.id).padStart(4, '0')}`} />

            <div className="mx-auto flex w-full max-w-[1720px] flex-1 flex-col px-5 py-8 sm:px-7 md:px-9 lg:pt-8 lg:pb-12 xl:px-12 2xl:px-14">
                <Link
                    href={manufacturer.orders.index().url}
                    className="mb-7 inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-foreground transition-colors hover:text-[#d9382b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Voltar para pedidos
                </Link>

                <AppPageHeader
                    eyebrow={`Pedido #${String(order.id).padStart(4, '0')}`}
                    title={
                        <>
                            {order.customer_name}
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description={
                        <div className="flex flex-wrap items-center gap-3">
                            <StatusLabel
                                tone={statusTone[order.status] ?? 'neutral'}
                            >
                                {order.status_label}
                            </StatusLabel>
                            <span>
                                Recebido em {formatDateTime(order.created_at)}
                            </span>
                        </div>
                    }
                    aside={
                        <section className="border border-[#18181f] bg-background p-5 sm:p-6">
                            {nextTransition ? (
                                <Button
                                    type="button"
                                    onClick={() =>
                                        updateStatus(nextTransition.value)
                                    }
                                    disabled={updatingStatus}
                                    className="min-h-12 w-full rounded-[2px] bg-[#ff4d3d] px-5 font-bold text-[#18181f] shadow-none hover:bg-[#f23c2e] focus-visible:ring-[#ff4d3d]/40"
                                >
                                    {nextTransition.value === 'shipped' ? (
                                        <Truck
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        <Package
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    )}
                                    {updatingStatus
                                        ? 'Atualizando…'
                                        : transitionActionLabel(nextTransition)}
                                </Button>
                            ) : (
                                <div className="mt-4 flex min-h-12 items-center gap-3 border-l-2 border-[#2e705a] pl-4 text-sm font-semibold">
                                    <Check
                                        className="size-4 text-[#2e705a]"
                                        aria-hidden="true"
                                    />
                                    Fluxo concluído
                                </div>
                            )}
                            {cancelTransition && (
                                <button
                                    type="button"
                                    onClick={() => setCancelDialogOpen(true)}
                                    disabled={updatingStatus}
                                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 text-sm font-bold text-[#b42318] transition-colors hover:bg-[#ff4d3d]/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]"
                                >
                                    <X className="size-4" aria-hidden="true" />
                                    Cancelar pedido
                                </button>
                            )}
                        </section>
                    }
                />

                <MetricRail
                    variant="open"
                    className="mt-7"
                    items={[
                        {
                            label: 'Total líquido',
                            value: (
                                <span className="text-[1.28rem] whitespace-nowrap sm:text-[1.65rem] xl:text-[2.2rem]">
                                    {formatCurrency(order.total_amount)}
                                </span>
                            ),
                            icon: (
                                <CircleDot
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                        },
                        {
                            label: order.total_items === 1 ? 'Peça' : 'Peças',
                            value: order.total_items,
                            icon: (
                                <Package
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                        },
                        {
                            label:
                                order.items.length === 1 ? 'Linha' : 'Linhas',
                            value: order.items.length,
                            icon: (
                                <FileText
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                        },
                        {
                            label: 'Situação atual',
                            value: (
                                <span className="text-[1.15rem] leading-tight sm:text-[1.35rem] xl:text-[1.6rem]">
                                    {order.status_label}
                                </span>
                            ),
                            icon: (
                                <Clock3 className="size-4" aria-hidden="true" />
                            ),
                        },
                    ]}
                />

                <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(21rem,0.8fr)] xl:items-start">
                    <div className="min-w-0 space-y-6">
                        <section className="border border-border bg-background">
                            <div className="flex min-h-16 items-center justify-between gap-4 border-b border-border px-5 sm:px-7">
                                <div>
                                    <p className="text-[0.64rem] font-bold tracking-[0.17em] text-[#ff4d3d] uppercase">
                                        Pedido em mãos
                                    </p>
                                    <h2 className="mt-1 font-zouth-display text-xl font-semibold tracking-[-0.035em]">
                                        Seleção comprada
                                    </h2>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {order.total_items}{' '}
                                    {order.total_items === 1 ? 'peça' : 'peças'}
                                </p>
                            </div>
                            <div className="divide-y divide-border">
                                {order.items.map((item, index) => (
                                    <OrderLine
                                        key={item.id}
                                        item={item}
                                        ordinal={index + 1}
                                    />
                                ))}
                            </div>
                            <div className="flex flex-wrap items-end justify-between gap-4 border-t border-[#18181f] bg-[#e7e3dc]/25 px-5 py-5 sm:px-7">
                                <p className="text-sm font-semibold">
                                    {order.items.length}{' '}
                                    {order.items.length === 1
                                        ? 'linha'
                                        : 'linhas'}{' '}
                                    · {order.total_items}{' '}
                                    {order.total_items === 1 ? 'peça' : 'peças'}
                                </p>
                                <div className="grid min-w-52 gap-1 text-sm">
                                    <p className="flex justify-between gap-6 text-muted-foreground">
                                        <span>Subtotal</span>
                                        <span className="tabular-nums">
                                            {formatCurrency(
                                                order.subtotal_amount,
                                            )}
                                        </span>
                                    </p>
                                    {Number(order.discount_amount) > 0 && (
                                        <p className="flex justify-between gap-6 text-[#2e705a]">
                                            <span>Desconto</span>
                                            <span className="tabular-nums">
                                                −{' '}
                                                {formatCurrency(
                                                    order.discount_amount,
                                                )}
                                            </span>
                                        </p>
                                    )}
                                    <p className="mt-1 flex justify-between gap-6 border-t border-border pt-2 font-zouth-display text-lg font-semibold tracking-[-0.03em]">
                                        <span>Total líquido</span>
                                        <span className="tabular-nums">
                                            {formatCurrency(order.total_amount)}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="border border-border bg-background px-5 py-6 sm:px-7 sm:py-7">
                            <p className="text-[0.64rem] font-bold tracking-[0.17em] text-[#ff4d3d] uppercase">
                                Andamento do pedido
                            </p>
                            <h2 className="mt-2 font-zouth-display text-xl font-semibold tracking-[-0.035em]">
                                Histórico
                            </h2>

                            {timeline.length > 0 ? (
                                <ol
                                    className="mt-7 grid gap-5 md:auto-cols-fr md:grid-flow-col md:gap-0"
                                    aria-label="Histórico do pedido"
                                >
                                    {timeline.map((entry, index) => {
                                        const isCurrent =
                                            index === timeline.length - 1;

                                        return (
                                            <li
                                                key={entry.id}
                                                className="relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3 md:block md:pr-5"
                                            >
                                                {index <
                                                    timeline.length - 1 && (
                                                    <span
                                                        className="absolute top-6 bottom-[-1.25rem] left-[0.7rem] w-px bg-[#2e705a] md:top-[0.7rem] md:right-0 md:bottom-auto md:left-5 md:h-px md:w-[calc(100%-1.25rem)]"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                                <span
                                                    className={cn(
                                                        'relative z-10 mt-0.5 flex size-6 items-center justify-center border-2 bg-background',
                                                        isCurrent
                                                            ? 'border-[#ff4d3d] text-[#ff4d3d]'
                                                            : 'border-[#2e705a] bg-[#2e705a] text-white',
                                                    )}
                                                >
                                                    {isCurrent ? (
                                                        <CircleDot
                                                            className="size-3"
                                                            aria-hidden="true"
                                                        />
                                                    ) : (
                                                        <Check
                                                            className="size-3"
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                </span>
                                                <div className="md:mt-4">
                                                    <p className="font-zouth-display text-sm font-semibold">
                                                        {entry.to_label}
                                                    </p>
                                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                        {entry.changed_by && (
                                                            <>
                                                                {
                                                                    entry.changed_by
                                                                }
                                                                <br />
                                                            </>
                                                        )}
                                                        {formatShortDateTime(
                                                            entry.created_at,
                                                        )}
                                                    </p>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ol>
                            ) : (
                                <p className="mt-5 text-sm text-muted-foreground">
                                    O primeiro movimento deste pedido ainda não
                                    foi registrado.
                                </p>
                            )}
                        </section>
                    </div>

                    <aside className="min-w-0 space-y-6 xl:sticky xl:top-6">
                        <section className="border border-border bg-background">
                            <div className="flex min-h-16 items-center justify-between gap-4 border-b border-border px-5 sm:px-6">
                                <h2 className="font-zouth-display text-xl font-semibold tracking-[-0.035em]">
                                    Lojista & entrega
                                </h2>
                                {order.customer_id && (
                                    <Link
                                        href={
                                            manufacturer.customers.show(
                                                order.customer_id,
                                            ).url
                                        }
                                        className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-foreground transition-colors hover:text-[#d9382b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]"
                                    >
                                        Ver cliente
                                        <ArrowUpRight
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                )}
                            </div>
                            <div className="divide-y divide-border px-5 sm:px-6">
                                {formattedPhone && (
                                    <DetailRow icon={Phone} label="Telefone">
                                        <a
                                            href={`tel:${order.customer_phone}`}
                                            className="font-medium hover:underline"
                                        >
                                            {formattedPhone}
                                        </a>
                                    </DetailRow>
                                )}
                                {order.customer_email && (
                                    <DetailRow icon={Mail} label="E-mail">
                                        <a
                                            href={`mailto:${order.customer_email}`}
                                            className="font-medium break-all hover:underline"
                                        >
                                            {order.customer_email}
                                        </a>
                                    </DetailRow>
                                )}
                                {formattedDocument && (
                                    <DetailRow
                                        icon={FileText}
                                        label={
                                            order.customer_document_type ===
                                            'cnpj'
                                                ? 'CNPJ'
                                                : 'CPF'
                                        }
                                    >
                                        {formattedDocument}
                                    </DetailRow>
                                )}
                                {hasDeliveryAddress && (
                                    <DetailRow icon={MapPin} label="Entrega">
                                        <address className="not-italic">
                                            {[
                                                order.customer_street,
                                                order.customer_address_number,
                                            ]
                                                .filter(Boolean)
                                                .join(', ')}
                                            {order.customer_address_complement &&
                                                ` · ${order.customer_address_complement}`}
                                            <br />
                                            {[
                                                order.customer_neighborhood,
                                                order.customer_city,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                            {order.customer_state &&
                                                `/${order.customer_state}`}
                                            {formattedZipCode && (
                                                <>
                                                    <br />
                                                    CEP {formattedZipCode}
                                                </>
                                            )}
                                            {order.customer_address_reference && (
                                                <>
                                                    <br />
                                                    Referência:{' '}
                                                    {
                                                        order.customer_address_reference
                                                    }
                                                </>
                                            )}
                                        </address>
                                    </DetailRow>
                                )}
                                {order.sales_rep && (
                                    <DetailRow
                                        icon={UserRound}
                                        label="Representante"
                                    >
                                        {order.sales_rep.name}
                                    </DetailRow>
                                )}
                                {order.customer_notes && (
                                    <DetailRow
                                        icon={FileText}
                                        label="Observação do lojista"
                                    >
                                        {order.customer_notes}
                                    </DetailRow>
                                )}
                            </div>
                            <a
                                href={
                                    publicRoutes.order.show(order.public_token)
                                        .url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex min-h-13 items-center justify-between gap-4 border-t border-border px-5 text-sm font-bold transition-colors hover:bg-[#e7e3dc]/30 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d] sm:px-6"
                            >
                                Acompanhamento público
                                <ExternalLink
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </a>
                        </section>

                        <section className="border border-border bg-background p-5 sm:p-6">
                            <p className="text-[0.64rem] font-bold tracking-[0.17em] text-[#ff4d3d] uppercase">
                                Interno
                            </p>
                            <h2 className="mt-2 font-zouth-display text-xl font-semibold tracking-[-0.035em]">
                                Anotações internas
                            </h2>
                            <Textarea
                                value={internalNotes}
                                onChange={(event) =>
                                    setInternalNotes(event.target.value)
                                }
                                rows={5}
                                maxLength={5000}
                                placeholder="Registre acordos, cuidados de separação ou próximos contatos."
                                aria-label="Notas internas do pedido"
                                className="mt-5 min-h-32 resize-y rounded-[2px] border-border bg-[#f6f4f0] p-4 text-sm leading-6 shadow-none focus-visible:border-[#ff4d3d] focus-visible:ring-[#ff4d3d]/20"
                            />
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                                <span>
                                    {lastMovement?.changed_by
                                        ? `Último movimento por ${lastMovement.changed_by}`
                                        : 'Visível apenas internamente'}
                                </span>
                                <span>{internalNotes.length}/5000</span>
                            </div>
                            <div className="mt-5 grid gap-2 sm:grid-cols-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setInternalNotes(savedNotes)}
                                    disabled={!notesAreDirty || savingNotes}
                                    className="min-h-11 rounded-[2px] border-border bg-transparent shadow-none"
                                >
                                    <RotateCcw
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Descartar
                                </Button>
                                <Button
                                    type="button"
                                    onClick={saveNotes}
                                    disabled={!notesAreDirty || savingNotes}
                                    className="min-h-11 rounded-[2px] bg-[#18181f] text-[#f6f4f0] shadow-none hover:bg-[#2a2a32]"
                                >
                                    <Save
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    {savingNotes ? 'Salvando…' : 'Salvar nota'}
                                </Button>
                            </div>
                        </section>
                    </aside>
                </div>
            </div>

            <AlertDialog
                open={cancelDialogOpen}
                onOpenChange={setCancelDialogOpen}
            >
                <AlertDialogContent className="rounded-[2px] border-[#18181f] bg-[#f6f4f0] shadow-none">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-zouth-display text-2xl tracking-[-0.035em]">
                            Cancelar o pedido #
                            {String(order.id).padStart(4, '0')}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="leading-6">
                            O pedido sai do fluxo comercial e o estoque
                            reservado é devolvido. Esta ação fica registrada no
                            histórico.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="min-h-11 rounded-[2px] border-[#18181f] bg-transparent shadow-none">
                            Manter pedido
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() =>
                                cancelTransition &&
                                updateStatus(cancelTransition.value)
                            }
                            disabled={updatingStatus}
                            className="min-h-11 rounded-[2px] bg-[#b42318] text-white shadow-none hover:bg-[#8f1c13]"
                        >
                            {updatingStatus ? 'Cancelando…' : 'Sim, cancelar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
