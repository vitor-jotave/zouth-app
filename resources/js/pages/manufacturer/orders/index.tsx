import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    type DragEndEvent,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    Banknote,
    Boxes,
    CheckCircle2,
    CircleDot,
    Filter,
    GripVertical,
    LayoutGrid,
    List,
    PackageCheck,
    Search,
} from 'lucide-react';
import {
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';
import { AppPageHeader } from '@/components/app-page-header';
import { EmptyState } from '@/components/empty-state';
import { MetricRail } from '@/components/metric-rail';
import { Pagination } from '@/components/pagination';
import { RecordList, RecordRow } from '@/components/record-list';
import { ResourceToolbar } from '@/components/resource-toolbar';
import { StatusLabel, type StatusLabelTone } from '@/components/status-label';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import manufacturer from '@/routes/manufacturer';
import type { BreadcrumbItem } from '@/types';

type AllowedTransition = {
    value: string;
    label: string;
};

type Order = {
    id: number;
    public_token: string;
    status: string;
    status_label: string;
    order_type: 'standard' | 'quote';
    order_type_label: string;
    customer_name: string;
    customer_phone: string | null;
    customer_email: string | null;
    tracking_ref: string | null;
    total_items: number;
    subtotal_amount: string;
    discount_amount: string;
    total_amount: string;
    allowed_transitions: AllowedTransition[];
    sales_rep: { id: number; name: string } | null;
    created_at: string;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Paginated<T> = {
    data: T[];
    links?: PaginationLink[];
    meta?: {
        total: number;
        from: number | null;
        to: number | null;
        current_page: number;
        last_page: number;
        links?: PaginationLink[];
    };
};

type BoardStage = {
    value: string;
    label: string;
    count: number;
    total_amount: string;
    has_more: boolean;
    orders: Order[];
};

type OrderSummary = {
    total_orders: number;
    in_progress: number;
    total_amount: string;
    awaiting_confirmation: number;
};

type Props = {
    orders: Paginated<Order>;
    board_stages: BoardStage[];
    order_summary: OrderSummary;
    filters: {
        status: string;
        search: string;
        view: 'board' | 'list';
    };
    statuses: Array<{ value: string; label: string }>;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Visão geral', href: dashboard().url },
    { title: 'Pedidos', href: manufacturer.orders.index().url },
];

const stageOrdinal: Record<string, string> = {
    new: '01',
    confirmed: '02',
    preparing: '03',
    shipped: '04',
    delivered: '05',
    cancelled: '06',
};

const stageDisplayLabel: Record<string, string> = {
    new: 'Novos',
    confirmed: 'Confirmados',
    preparing: 'Em preparação',
    shipped: 'Enviados',
    delivered: 'Entregues',
    cancelled: 'Cancelados',
};

const stageTone: Record<string, StatusLabelTone> = {
    new: 'coral',
    confirmed: 'plum',
    preparing: 'neutral',
    shipped: 'muted',
    delivered: 'mineral',
    cancelled: 'coral',
};

const stageBorder: Record<string, string> = {
    new: 'border-t-[#ff4d3d]',
    confirmed: 'border-t-[#5a2a4f]',
    preparing: 'border-t-[#18181f]',
    shipped: 'border-t-[#98968d]',
    delivered: 'border-t-[#2e705a]',
    cancelled: 'border-t-[#b42318]',
};

const allowedTransitionsByStatus: Record<string, AllowedTransition[]> = {
    new: [
        { value: 'confirmed', label: 'Confirmado' },
        { value: 'cancelled', label: 'Cancelado' },
    ],
    confirmed: [
        { value: 'preparing', label: 'Em preparação' },
        { value: 'cancelled', label: 'Cancelado' },
    ],
    preparing: [
        { value: 'shipped', label: 'Enviado' },
        { value: 'cancelled', label: 'Cancelado' },
    ],
    shipped: [
        { value: 'delivered', label: 'Entregue' },
        { value: 'cancelled', label: 'Cancelado' },
    ],
    delivered: [],
    cancelled: [],
};

function formatCurrency(value: string | number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(Number(value));
}

function formatOrderDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    })
        .format(new Date(value))
        .replace('.', '');
}

function orderItemsLabel(count: number): string {
    return count === 1 ? '1 peça' : `${count} peças`;
}

function nextOperationalTransition(order: Order): AllowedTransition | null {
    return (
        order.allowed_transitions.find(
            (transition) => transition.value !== 'cancelled',
        ) ?? null
    );
}

function transitionActionLabel(
    transition: AllowedTransition,
    isQuote = false,
): string {
    if (isQuote) {
        return (
            {
                confirmed: 'Iniciar negociação',
                preparing: 'Marcar como aprovado',
                shipped: 'Marcar como formalizado',
                delivered: 'Concluir orçamento',
            }[transition.value] ?? transition.label
        );
    }

    return (
        {
            confirmed: 'Confirmar pedido',
            preparing: 'Iniciar preparo',
            shipped: 'Marcar como enviado',
            delivered: 'Marcar como entregue',
        }[transition.value] ?? transition.label
    );
}

function moveOrderBetweenStages(
    stages: BoardStage[],
    order: Order,
    transition: AllowedTransition,
): BoardStage[] {
    const orderAmount = Number(order.total_amount);
    const optimisticOrder: Order = {
        ...order,
        status: transition.value,
        status_label: transition.label,
        allowed_transitions: allowedTransitionsByStatus[transition.value] ?? [],
    };

    return stages.map((stage) => {
        if (stage.value === order.status) {
            return {
                ...stage,
                count: Math.max(0, stage.count - 1),
                total_amount: Math.max(
                    0,
                    Number(stage.total_amount) - orderAmount,
                ).toFixed(2),
                orders: stage.orders.filter(
                    (stageOrder) => stageOrder.id !== order.id,
                ),
            };
        }

        if (stage.value === transition.value) {
            const orders = [
                optimisticOrder,
                ...stage.orders.filter(
                    (stageOrder) => stageOrder.id !== order.id,
                ),
            ];

            return {
                ...stage,
                count: stage.count + 1,
                total_amount: (
                    Number(stage.total_amount) + orderAmount
                ).toFixed(2),
                has_more: stage.has_more || orders.length > 12,
                orders: orders.slice(0, 12),
            };
        }

        return stage;
    });
}

function OrderCard({
    order,
    onAdvance,
    isUpdating,
}: {
    order: Order;
    onAdvance: (order: Order, transition: AllowedTransition) => void;
    isUpdating: boolean;
}) {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useDraggable({
            id: `order-${order.id}`,
            data: { order },
        });
    const nextTransition = nextOperationalTransition(order);
    const style: CSSProperties = {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 40 : undefined,
    };

    return (
        <article
            ref={setNodeRef}
            style={style}
            className={cn(
                'group relative border border-t-2 border-border bg-background transition-[border-color,opacity] duration-150',
                stageBorder[order.status] ?? 'border-t-[#18181f]',
                isDragging && 'opacity-60 will-change-transform',
            )}
        >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <p className="font-zouth-display text-[0.72rem] font-bold tracking-[0.08em] text-muted-foreground uppercase tabular-nums">
                    {order.order_type_label} #
                    {String(order.id).padStart(4, '0')}
                </p>
                <button
                    type="button"
                    className="flex size-11 cursor-grab touch-none items-center justify-center text-muted-foreground transition-colors hover:bg-[#e7e3dc]/55 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d] active:cursor-grabbing"
                    aria-label={`Mover pedido ${order.id}`}
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="size-4" aria-hidden="true" />
                </button>
            </div>

            <Link
                href={manufacturer.orders.show(order.id).url}
                className="block px-4 py-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d]"
            >
                <h3 className="font-zouth-display text-lg leading-tight font-semibold tracking-[-0.025em] text-foreground">
                    {order.customer_name}
                </h3>
                <p className="mt-1.5 truncate text-xs text-muted-foreground">
                    {order.customer_phone ??
                        order.customer_email ??
                        'Contato não informado'}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4">
                    <div>
                        <p className="text-[0.62rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                            {order.order_type === 'quote'
                                ? 'Estimativa'
                                : 'Valor'}
                        </p>
                        <p className="mt-1 font-zouth-display text-base font-semibold tracking-[-0.02em] text-foreground tabular-nums">
                            {formatCurrency(order.total_amount)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[0.62rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                            Volume
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground tabular-nums">
                            {orderItemsLabel(order.total_items)}
                        </p>
                    </div>
                </div>

                <div className="mt-4 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[0.62rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                            Recebido
                        </p>
                        <p className="mt-1 text-xs text-foreground">
                            {formatOrderDate(order.created_at)}
                        </p>
                    </div>
                    {order.sales_rep && (
                        <p className="max-w-[44%] truncate text-right text-xs text-muted-foreground">
                            {order.sales_rep.name}
                        </p>
                    )}
                </div>
            </Link>

            <div className="border-t border-border px-4 py-3">
                {nextTransition ? (
                    <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => onAdvance(order, nextTransition)}
                        className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-xs font-bold text-foreground transition-colors hover:text-[#d63227] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d] disabled:pointer-events-none disabled:opacity-50"
                    >
                        <span>
                            {isUpdating
                                ? 'Atualizando pedido…'
                                : transitionActionLabel(
                                      nextTransition,
                                      order.order_type === 'quote',
                                  )}
                        </span>
                        <ArrowRight className="size-4" aria-hidden="true" />
                    </button>
                ) : (
                    <div className="flex min-h-11 items-center gap-2 text-xs font-semibold text-muted-foreground">
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                        Fluxo concluído
                    </div>
                )}
            </div>
        </article>
    );
}

function OrderStage({
    stage,
    onAdvance,
    updatingOrderId,
    onShowAll,
}: {
    stage: BoardStage;
    onAdvance: (order: Order, transition: AllowedTransition) => void;
    updatingOrderId: number | null;
    onShowAll: (status: string) => void;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: stage.value });

    return (
        <section
            ref={setNodeRef}
            aria-label={`${stageDisplayLabel[stage.value] ?? stage.label}: ${stage.count} pedidos`}
            className={cn(
                'flex min-h-[440px] min-w-0 flex-col border-x border-b border-border bg-[#f6f4f0] transition-colors',
                isOver && 'bg-[#ff4d3d]/[0.045]',
            )}
        >
            <header
                className={cn(
                    'border-t-2 border-b border-border px-4 py-4',
                    stageBorder[stage.value] ?? 'border-t-[#18181f]',
                )}
            >
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <span className="font-zouth-display text-[0.68rem] font-bold text-muted-foreground tabular-nums">
                            {stageOrdinal[stage.value] ?? '—'}
                        </span>
                        <h2 className="truncate font-zouth-display text-sm font-semibold tracking-[-0.02em] text-foreground">
                            {stageDisplayLabel[stage.value] ?? stage.label}
                        </h2>
                    </div>
                    <span className="flex size-7 shrink-0 items-center justify-center bg-[#e7e3dc] text-[0.68rem] font-bold text-foreground tabular-nums">
                        {stage.count}
                    </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground tabular-nums">
                    {formatCurrency(stage.total_amount)} nesta etapa
                </p>
            </header>

            <div className="flex flex-1 flex-col gap-3 p-3">
                {stage.orders.map((order) => (
                    <OrderCard
                        key={order.id}
                        order={order}
                        onAdvance={onAdvance}
                        isUpdating={updatingOrderId === order.id}
                    />
                ))}

                {stage.orders.length === 0 && (
                    <div className="flex min-h-40 flex-1 flex-col items-center justify-center border border-dashed border-[#cac4ba] px-5 text-center">
                        <PackageCheck
                            className="size-5 text-muted-foreground"
                            aria-hidden="true"
                        />
                        <p className="mt-3 text-sm font-semibold text-foreground">
                            Etapa livre
                        </p>
                        <p className="mt-1 max-w-44 text-xs leading-5 text-muted-foreground">
                            Os pedidos aparecem aqui quando avançam no fluxo.
                        </p>
                    </div>
                )}

                {stage.has_more && (
                    <button
                        type="button"
                        onClick={() => onShowAll(stage.value)}
                        className="mt-auto min-h-11 border-t border-border text-xs font-bold text-foreground transition-colors hover:text-[#d63227] focus-visible:outline-2 focus-visible:outline-[#ff4d3d]"
                    >
                        Ver todos desta etapa
                    </button>
                )}
            </div>
        </section>
    );
}

function ViewButton({
    active,
    icon,
    children,
    onClick,
}: {
    active: boolean;
    icon: ReactNode;
    children: ReactNode;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={cn(
                'inline-flex min-h-11 items-center gap-2 border px-4 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]',
                active
                    ? 'border-[#18181f] bg-[#18181f] text-[#f6f4f0]'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground',
            )}
        >
            {icon}
            {children}
        </button>
    );
}

export default function OrdersIndex({
    orders,
    board_stages,
    order_summary,
    filters,
    statuses,
}: Props) {
    const [boardStages, setBoardStages] = useState(board_stages);
    const [search, setSearch] = useState(filters.search ?? '');
    const [filterMenuOpen, setFilterMenuOpen] = useState(false);
    const [isFiltering, setIsFiltering] = useState(false);
    const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 4 },
        }),
        useSensor(KeyboardSensor),
    );

    useEffect(() => {
        setBoardStages(board_stages);
    }, [board_stages]);

    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    const navigate = (
        changes: Partial<Props['filters']>,
        searchValue = search,
    ) => {
        const nextFilters = {
            search: searchValue || undefined,
            status: filters.status || undefined,
            view: filters.view,
            ...changes,
        };

        router.get(manufacturer.orders.index().url, nextFilters, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setIsFiltering(true),
            onFinish: () => setIsFiltering(false),
        });
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            navigate({ search: value || undefined }, value);
        }, 300);
    };

    const updateOrderStatus = (order: Order, transition: AllowedTransition) => {
        if (
            updatingOrderId !== null ||
            !order.allowed_transitions.some(
                (allowed) => allowed.value === transition.value,
            )
        ) {
            return;
        }

        let rollbackStages: BoardStage[] | null = null;

        setBoardStages((currentStages) => {
            rollbackStages = currentStages;

            return moveOrderBetweenStages(currentStages, order, transition);
        });
        setUpdatingOrderId(order.id);
        router.post(
            manufacturer.orders.updateStatus(order.id).url,
            { status: transition.value },
            {
                preserveScroll: true,
                onError: () => {
                    if (rollbackStages) {
                        setBoardStages(rollbackStages);
                    }
                },
                onFinish: () => setUpdatingOrderId(null),
            },
        );
    };

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (!over) {
            return;
        }

        const order = active.data.current?.order as Order | undefined;
        const targetStatus = String(over.id);
        const transition = order?.allowed_transitions.find(
            (allowed) => allowed.value === targetStatus,
        );

        if (!order || !transition || order.status === targetStatus) {
            return;
        }

        updateOrderStatus(order, transition);
    };

    const selectStatusFilter = (status: string) => {
        setFilterMenuOpen(false);
        navigate({
            status: status === 'all' ? undefined : status,
        });
    };

    const clearStatusFilter = () => {
        navigate({ status: undefined });
    };

    const showStageInList = (status: string) => {
        navigate({ view: 'list', status });
    };

    const activeFilterCount = filters.status ? 1 : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pedidos" />

            <div className="mx-auto flex w-full max-w-[1720px] flex-1 flex-col px-5 py-8 sm:px-7 md:px-9 lg:pt-8 lg:pb-12 xl:px-12 2xl:px-14">
                <AppPageHeader
                    eyebrow="Comercial"
                    title={
                        <>
                            Pedidos
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    aside={
                        <div className="border-l-2 border-[#ff4d3d] pl-5">
                            <p className="mt-2 text-sm leading-6 text-foreground">
                                Arraste um pedido ou use a ação do cartão para
                                avançar a próxima etapa.
                            </p>
                        </div>
                    }
                />

                <MetricRail
                    variant="open"
                    className="mt-7"
                    items={[
                        {
                            label: 'Pedidos recebidos',
                            value: order_summary.total_orders,
                            icon: (
                                <Boxes className="size-4" aria-hidden="true" />
                            ),
                        },
                        {
                            label: 'Em movimento',
                            value: order_summary.in_progress,
                            icon: (
                                <CircleDot
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                        },
                        {
                            label: 'Volume comercial',
                            value: (
                                <span className="text-[1.28rem] whitespace-nowrap sm:text-[1.65rem] xl:text-[2.2rem]">
                                    {formatCurrency(order_summary.total_amount)}
                                </span>
                            ),
                            icon: (
                                <Banknote
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                        },
                        {
                            label: 'Pedem atenção',
                            value: order_summary.awaiting_confirmation,
                            icon: (
                                <PackageCheck
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                            className:
                                order_summary.awaiting_confirmation > 0
                                    ? '[&_dd:first-of-type]:text-[#d63227]'
                                    : undefined,
                        },
                    ]}
                />

                <ResourceToolbar
                    className="mt-7"
                    isBusy={isFiltering}
                    search={
                        <div className="relative">
                            <Search
                                className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    handleSearchChange(event.target.value)
                                }
                                placeholder="Buscar cliente, contato ou nº do pedido"
                                aria-label="Buscar pedidos"
                                className="min-h-11 rounded-[2px] border-border bg-background pl-10 shadow-none"
                            />
                        </div>
                    }
                    views={
                        <div className="flex" aria-label="Modo de visualização">
                            <ViewButton
                                active={filters.view === 'board'}
                                onClick={() => navigate({ view: 'board' })}
                                icon={
                                    <LayoutGrid
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                }
                            >
                                Kanban
                            </ViewButton>
                            <ViewButton
                                active={filters.view === 'list'}
                                onClick={() => navigate({ view: 'list' })}
                                icon={
                                    <List
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                }
                            >
                                Lista
                            </ViewButton>
                        </div>
                    }
                    filters={
                        <DropdownMenu
                            open={filterMenuOpen}
                            onOpenChange={setFilterMenuOpen}
                        >
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="min-h-11 rounded-[2px] border-border bg-background shadow-none data-[state=open]:border-[#18181f] data-[state=open]:bg-[#e7e3dc]/35"
                                >
                                    <Filter
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Filtrar status
                                    {activeFilterCount > 0 && (
                                        <span className="flex size-5 items-center justify-center bg-[#ff4d3d] text-[0.65rem] font-bold text-[#18181f]">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                sideOffset={8}
                                collisionPadding={12}
                                className="max-h-[var(--radix-dropdown-menu-content-available-height)] w-56 overflow-y-auto rounded-[2px] border-[#18181f] bg-[#f6f4f0] p-2 shadow-none"
                            >
                                <DropdownMenuLabel className="px-3 py-2 text-[0.64rem] font-bold tracking-[0.16em] text-[#ff4d3d] uppercase">
                                    Etapa do pedido
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="mx-0 bg-border" />
                                <DropdownMenuRadioGroup
                                    value={filters.status || 'all'}
                                    onValueChange={selectStatusFilter}
                                >
                                    <DropdownMenuRadioItem
                                        value="all"
                                        className="min-h-9 rounded-[2px] px-3 pl-9 font-semibold data-[state=checked]:bg-[#18181f] data-[state=checked]:text-[#f6f4f0]"
                                    >
                                        Todas as etapas
                                    </DropdownMenuRadioItem>
                                    {statuses.map((status) => (
                                        <DropdownMenuRadioItem
                                            key={status.value}
                                            value={status.value}
                                            className="min-h-9 rounded-[2px] px-3 pl-9 font-semibold data-[state=checked]:bg-[#18181f] data-[state=checked]:text-[#f6f4f0]"
                                        >
                                            {status.label}
                                        </DropdownMenuRadioItem>
                                    ))}
                                </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    }
                    supporting={
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                            <p>
                                {filters.view === 'board'
                                    ? 'Arraste pelos puxadores. Cada movimento respeita o fluxo do pedido.'
                                    : `${orders.meta?.total ?? orders.data.length} pedidos na seleção atual.`}
                            </p>
                            {filters.status && (
                                <button
                                    type="button"
                                    onClick={clearStatusFilter}
                                    className="font-bold text-foreground underline decoration-[#ff4d3d] underline-offset-4"
                                >
                                    Limpar filtro
                                </button>
                            )}
                        </div>
                    }
                />

                {filters.view === 'board' ? (
                    boardStages.length > 0 ? (
                        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                            <div className="-mx-5 mt-7 overflow-x-auto px-5 pb-4 sm:-mx-7 sm:px-7 md:-mx-9 md:px-9 xl:-mx-12 xl:px-12 2xl:-mx-14 2xl:px-14">
                                <div
                                    className={cn(
                                        'grid gap-3',
                                        boardStages.length === 1
                                            ? 'max-w-sm grid-cols-1'
                                            : 'min-w-[1080px] grid-cols-5',
                                    )}
                                >
                                    {boardStages.map((stage) => (
                                        <OrderStage
                                            key={stage.value}
                                            stage={stage}
                                            onAdvance={updateOrderStatus}
                                            updatingOrderId={updatingOrderId}
                                            onShowAll={showStageInList}
                                        />
                                    ))}
                                </div>
                            </div>
                        </DndContext>
                    ) : (
                        <EmptyState
                            className="mt-7"
                            visual={
                                <PackageCheck
                                    className="size-8 text-muted-foreground"
                                    aria-hidden="true"
                                />
                            }
                            eyebrow="Fluxo vazio"
                            title="Nenhum pedido por aqui."
                            description="Assim que um lojista enviar um pedido pelo catálogo, ele entra no começo deste fluxo."
                        />
                    )
                ) : orders.data.length > 0 ? (
                    <div className="mt-7">
                        <RecordList title="Pedidos da seleção">
                            {orders.data.map((order) => (
                                <RecordRow
                                    key={order.id}
                                    href={
                                        manufacturer.orders.show(order.id).url
                                    }
                                    title={order.customer_name}
                                    status={
                                        <StatusLabel
                                            tone={
                                                stageTone[order.status] ??
                                                'neutral'
                                            }
                                        >
                                            {order.order_type === 'quote'
                                                ? `Orçamento · ${order.status_label}`
                                                : order.status_label}
                                        </StatusLabel>
                                    }
                                    description={`${order.order_type_label} #${String(order.id).padStart(4, '0')} · ${orderItemsLabel(order.total_items)} · ${order.customer_phone ?? order.customer_email ?? 'Contato não informado'}`}
                                    value={`${order.order_type === 'quote' ? 'Estim. ' : ''}${formatCurrency(order.total_amount)}`}
                                    meta={formatOrderDate(order.created_at)}
                                />
                            ))}
                        </RecordList>
                        <Pagination
                            links={orders.meta?.links ?? orders.links}
                        />
                    </div>
                ) : (
                    <EmptyState
                        className="mt-7"
                        visual={
                            <PackageCheck
                                className="size-8 text-muted-foreground"
                                aria-hidden="true"
                            />
                        }
                        eyebrow="Sem resultados"
                        title="Nenhum pedido combina com esta busca."
                        description="Tente outro cliente, número ou limpe o filtro de status."
                    />
                )}
            </div>
        </AppLayout>
    );
}
