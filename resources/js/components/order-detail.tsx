import { Check, CircleDot } from 'lucide-react';
import type { StatusLabelTone } from '@/components/status-label';
import {
    isCurrentStatusMovement,
    orderStatusTimeline,
} from '@/lib/order-status-timeline';
import { cn } from '@/lib/utils';

type ComboComponent = {
    product_id: number;
    product_name: string | null;
    product_sku: string | null;
    variation_key: Record<string, string> | null;
    quantity: number;
};

export type OrderItem = {
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

export type StatusHistory = {
    id: number;
    from_status: string;
    from_label: string;
    to_status: string;
    to_label: string;
    changed_by?: string | null;
    created_at: string;
};

export const orderStatusTone: Record<string, StatusLabelTone> = {
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

                    <dl className="grid min-w-0 grid-cols-3 gap-2 border-t border-border pt-4 text-right sm:gap-5 xl:border-t-0 xl:pt-0">
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

type Selection = {
    items: OrderItem[];
    total_items: number;
    subtotal_amount: string | number;
    discount_amount: string | number;
    total_amount: string | number;
};

export function OrderSelection({
    order,
    isQuote,
    quoteNote,
    showQuoteEstimate = true,
}: {
    order: Selection;
    isQuote: boolean;
    quoteNote: string;
    showQuoteEstimate?: boolean;
}) {
    return (
        <section className="border border-border bg-background">
            {isQuote && (
                <div className="flex gap-3 border-b border-[#ff4d3d]/35 bg-[#fff3ef] px-5 py-4 text-sm sm:px-7">
                    <CircleDot
                        className="mt-0.5 size-4 shrink-0 text-[#ff4d3d]"
                        aria-hidden="true"
                    />
                    <p className="leading-6 text-[#5f5b55]">
                        Solicitação sem reserva de estoque.
                        {quoteNote}
                    </p>
                </div>
            )}
            <div className="flex min-h-16 items-center justify-between gap-4 border-b border-border px-5 sm:px-7">
                <div>
                    <p className="text-[0.64rem] font-bold tracking-[0.17em] text-[#ff4d3d] uppercase">
                        {isQuote ? 'Seleção para negociar' : 'Pedido em mãos'}
                    </p>
                    <h2 className="mt-1 font-zouth-display text-xl font-semibold tracking-[-0.035em]">
                        {isQuote ? 'Peças solicitadas' : 'Seleção comprada'}
                    </h2>
                </div>
                <p className="text-xs text-muted-foreground">
                    {order.total_items}{' '}
                    {order.total_items === 1 ? 'peça' : 'peças'}
                </p>
            </div>
            <div className="divide-y divide-border">
                {order.items.map((item, index) => (
                    <OrderLine key={item.id} item={item} ordinal={index + 1} />
                ))}
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4 border-t border-[#18181f] bg-[#e7e3dc]/25 px-5 py-5 sm:px-7">
                <p className="text-sm font-semibold">
                    {order.items.length}{' '}
                    {order.items.length === 1 ? 'linha' : 'linhas'} ·{' '}
                    {order.total_items}{' '}
                    {order.total_items === 1 ? 'peça' : 'peças'}
                </p>
                {(!isQuote || showQuoteEstimate) && (
                    <div className="grid min-w-0 gap-1 text-sm sm:min-w-52">
                        <p className="flex justify-between gap-6 text-muted-foreground">
                            <span>Subtotal</span>
                            <span className="tabular-nums">
                                {formatCurrency(order.subtotal_amount)}
                            </span>
                        </p>
                        {Number(order.discount_amount) > 0 && (
                            <p className="flex justify-between gap-6 text-[#2e705a]">
                                <span>Desconto</span>
                                <span className="tabular-nums">
                                    − {formatCurrency(order.discount_amount)}
                                </span>
                            </p>
                        )}
                        <p className="mt-1 flex justify-between gap-6 border-t border-border pt-2 font-zouth-display text-lg font-semibold tracking-[-0.03em]">
                            <span>
                                {isQuote ? 'Estimativa atual' : 'Total líquido'}
                            </span>
                            <span className="tabular-nums">
                                {formatCurrency(order.total_amount)}
                            </span>
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
}

export function OrderHistory({
    history,
    status,
}: {
    history: StatusHistory[];
    status: string;
}) {
    const timeline = orderStatusTimeline(history);

    return (
        <section className="border border-border bg-background px-5 py-6 sm:px-7 sm:py-7">
            <p className="text-[0.64rem] font-bold tracking-[0.17em] text-[#ff4d3d] uppercase">
                Andamento do pedido
            </p>
            <h2 className="mt-2 font-zouth-display text-xl font-semibold tracking-[-0.035em]">
                Histórico
            </h2>

            {timeline.length > 0 ? (
                <ol
                    className="mt-7 grid gap-5"
                    aria-label="Histórico do pedido"
                >
                    {timeline.map((entry, index) => {
                        const isCurrent = isCurrentStatusMovement(
                            entry,
                            timeline,
                            status,
                        );

                        return (
                            <li
                                key={entry.id}
                                className="relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3"
                                aria-current={isCurrent ? 'step' : undefined}
                            >
                                {index < timeline.length - 1 && (
                                    <span
                                        className="absolute top-6 bottom-[-1.25rem] left-[0.7rem] w-px bg-[#2e705a]"
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
                                <div>
                                    <p className="font-zouth-display text-sm font-semibold">
                                        {entry.from_status !==
                                            entry.to_status && (
                                            <span className="font-normal text-muted-foreground">
                                                {entry.from_label} →{' '}
                                            </span>
                                        )}
                                        {entry.to_label}
                                        {isCurrent && (
                                            <span className="ml-2 text-xs font-normal text-[#b63329]">
                                                Status atual
                                            </span>
                                        )}
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                        {entry.changed_by && (
                                            <>
                                                {entry.changed_by}
                                                <br />
                                            </>
                                        )}
                                        {formatShortDateTime(entry.created_at)}
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            ) : (
                <p className="mt-5 text-sm text-muted-foreground">
                    O primeiro movimento deste pedido ainda não foi registrado.
                </p>
            )}
        </section>
    );
}
