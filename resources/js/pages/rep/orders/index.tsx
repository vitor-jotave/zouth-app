import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Banknote,
    Boxes,
    CircleDot,
    LayoutGrid,
    List,
    PackageCheck,
    Search,
} from 'lucide-react';
import { AppPageHeader } from '@/components/app-page-header';
import { EmptyState } from '@/components/empty-state';
import { MetricRail } from '@/components/metric-rail';
import { Pagination } from '@/components/pagination';
import { RecordList, RecordRow } from '@/components/record-list';
import { ResourceToolbar } from '@/components/resource-toolbar';
import { StatusLabel, type StatusLabelTone } from '@/components/status-label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import rep from '@/routes/rep';

export type RepOrder = {
    id: number;
    manufacturer_name: string;
    customer_name: string;
    status: string;
    status_label: string;
    order_type: string;
    order_type_label: string;
    total_amount: number;
    subtotal_amount: number;
    discount_amount: number;
    total_items: number;
    created_at: string;
};

type View = 'board' | 'list';
type Stage = {
    value: string;
    label: string;
    count: number;
    orders: RepOrder[];
};
type Props = {
    orders: {
        data: RepOrder[];
        total: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
    brands: { id: number; name: string }[];
    statuses: { value: string; label: string }[];
    filters: {
        brand: number;
        status: string;
        days: number;
        search: string;
        view: View;
    };
    stages: Stage[];
    summary: {
        total: number;
        new: number;
        in_progress: number;
        net_amount: number;
    };
};

const stageStyles: Record<
    string,
    { label: string; border: string; tone: StatusLabelTone; ordinal: string }
> = {
    new: {
        label: 'Novos',
        border: 'border-t-[#ff4d3d]',
        tone: 'coral',
        ordinal: '01',
    },
    confirmed: {
        label: 'Confirmados',
        border: 'border-t-[#5a2a4f]',
        tone: 'plum',
        ordinal: '02',
    },
    preparing: {
        label: 'Em preparação',
        border: 'border-t-[#18181f]',
        tone: 'neutral',
        ordinal: '03',
    },
    shipped: {
        label: 'Enviados',
        border: 'border-t-[#98968d]',
        tone: 'muted',
        ordinal: '04',
    },
    delivered: {
        label: 'Entregues',
        border: 'border-t-[#2e705a]',
        tone: 'mineral',
        ordinal: '05',
    },
    cancelled: {
        label: 'Cancelados',
        border: 'border-t-[#b42318]',
        tone: 'coral',
        ordinal: '06',
    },
};

const selectClass =
    'min-h-11 max-w-full rounded-[2px] border border-border bg-background px-2 text-sm focus-visible:outline-2 focus-visible:outline-[#ff4d3d] xl:max-w-40';
const orderNumber = (order: RepOrder) =>
    `${order.order_type_label} #${String(order.id).padStart(4, '0')}`;
const orderVolume = (count: number) =>
    `${count} ${count === 1 ? 'peça' : 'peças'}`;
const orderValue = (order: RepOrder) =>
    order.order_type === 'quote'
        ? 'Sob consulta'
        : formatCurrency(order.total_amount);

function ReadOnlyOrderCard({ order }: { order: RepOrder }) {
    return (
        <Link
            href={rep.orders.show(order.id)}
            className={cn(
                'group block border border-t-2 border-border bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]',
                stageStyles[order.status]?.border,
            )}
        >
            <div className="border-b border-border px-4 py-3 font-zouth-display text-xs font-bold tracking-wider text-muted-foreground uppercase">
                {orderNumber(order)}
            </div>
            <div className="px-4 py-4">
                <h3 className="font-zouth-display text-lg leading-tight font-semibold tracking-[-0.025em] break-words">
                    {order.customer_name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                    {order.manufacturer_name}
                </p>
                <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-3">
                    <p className="font-zouth-display text-sm font-semibold tabular-nums">
                        {orderValue(order)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {orderVolume(order.total_items)}
                    </p>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                    {formatDateTime(order.created_at)}
                </p>
            </div>
            <div className="flex min-h-11 items-center justify-between border-t border-border px-4 text-xs font-bold group-hover:text-[#d63227]">
                Ver pedido <ArrowRight className="size-4" aria-hidden="true" />
            </div>
        </Link>
    );
}

export default function RepOrders({
    orders,
    brands,
    statuses,
    filters,
    stages,
    summary,
}: Props) {
    const isFiltered = Boolean(
        filters.brand || filters.status || filters.days || filters.search,
    );
    const indexUrl = (view: View, status = filters.status) =>
        rep.orders.index({
            query: {
                view,
                brand: filters.brand || undefined,
                status: status || undefined,
                days: filters.days || undefined,
                search: filters.search || undefined,
            },
        });

    return (
        <AppLayout
            breadcrumbs={[{ title: 'Pedidos', href: rep.orders.index().url }]}
        >
            <Head title="Meus pedidos" />
            <div className="mx-auto w-full max-w-[1600px] min-w-0 px-4 py-7 sm:px-7 sm:py-8 xl:px-10 xl:py-9">
                <AppPageHeader
                    eyebrow="Operação comercial"
                    title={
                        <>
                            Meus pedidos
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description="Acompanhe os pedidos e orçamentos atribuídos a você. As etapas são atualizadas pelo fabricante."
                />
                <MetricRail
                    variant="open"
                    className="mt-7"
                    items={[
                        {
                            label: 'Pedidos recebidos',
                            value: summary.total,
                            icon: (
                                <Boxes className="size-4" aria-hidden="true" />
                            ),
                        },
                        {
                            label: 'Em movimento',
                            value: summary.in_progress,
                            icon: (
                                <CircleDot
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                        },
                        {
                            label: 'Valor líquido',
                            value: (
                                <span className="block max-w-full pr-2 text-[1.25rem] break-words sm:text-[1.65rem] xl:text-[2.2rem]">
                                    {formatCurrency(summary.net_amount)}
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
                            label: 'Novos',
                            value: summary.new,
                            icon: (
                                <PackageCheck
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                        },
                    ]}
                />
                <Form key={JSON.stringify(filters)} action={rep.orders.index()}>
                    {({ processing }) => (
                        <>
                            <input
                                type="hidden"
                                name="view"
                                value={filters.view}
                            />
                            <ResourceToolbar
                                className="mt-7 [&>div:first-child]:xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,34rem)]"
                                isBusy={processing}
                                search={
                                    <div className="relative">
                                        <Search
                                            aria-hidden="true"
                                            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                                        />
                                        <Input
                                            type="search"
                                            name="search"
                                            defaultValue={filters.search}
                                            maxLength={100}
                                            aria-label="Buscar pedidos"
                                            placeholder="Buscar lojista, marca ou pedido"
                                            className="min-h-11 rounded-[2px] bg-background pl-10 shadow-none"
                                        />
                                    </div>
                                }
                                views={
                                    <nav
                                        className="inline-flex border border-border"
                                        aria-label="Modo de visualização"
                                    >
                                        {(
                                            [
                                                {
                                                    mode: 'board',
                                                    label: 'Kanban',
                                                    icon: LayoutGrid,
                                                },
                                                {
                                                    mode: 'list',
                                                    label: 'Lista',
                                                    icon: List,
                                                },
                                            ] as const
                                        ).map(({ mode, label, icon: Icon }) => (
                                            <Link
                                                key={mode}
                                                href={indexUrl(mode)}
                                                aria-current={
                                                    filters.view === mode
                                                        ? 'page'
                                                        : undefined
                                                }
                                                className={cn(
                                                    'inline-flex min-h-11 items-center gap-2 px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#ff4d3d]',
                                                    filters.view === mode
                                                        ? 'bg-[#18181f] text-white'
                                                        : 'bg-background text-muted-foreground hover:text-foreground',
                                                )}
                                            >
                                                <Icon
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                                {label}
                                            </Link>
                                        ))}
                                    </nav>
                                }
                                filters={
                                    <>
                                        <select
                                            name="brand"
                                            aria-label="Marca"
                                            defaultValue={filters.brand || ''}
                                            className={selectClass}
                                        >
                                            <option value="">
                                                Todas as marcas
                                            </option>
                                            {brands.map((brand) => (
                                                <option
                                                    key={brand.id}
                                                    value={brand.id}
                                                >
                                                    {brand.name}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            name="status"
                                            aria-label="Status"
                                            defaultValue={filters.status}
                                            className={selectClass}
                                        >
                                            <option value="">
                                                Todos os status
                                            </option>
                                            <option value="in_progress">
                                                Em andamento
                                            </option>
                                            {statuses.map((status) => (
                                                <option
                                                    key={status.value}
                                                    value={status.value}
                                                >
                                                    {status.label}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            name="days"
                                            aria-label="Período"
                                            defaultValue={filters.days}
                                            className={selectClass}
                                        >
                                            <option value="0">
                                                Todo o histórico
                                            </option>
                                            <option value="30">
                                                Últimos 30 dias
                                            </option>
                                            <option value="90">
                                                Últimos 90 dias
                                            </option>
                                        </select>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                            className="min-h-11 rounded-[2px] shadow-none"
                                        >
                                            Aplicar filtros
                                        </Button>
                                    </>
                                }
                                supporting={
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                        <p>
                                            {filters.view === 'board'
                                                ? 'Selecione um pedido para ver os detalhes.'
                                                : `${orders.total} ${orders.total === 1 ? 'pedido na seleção' : 'pedidos na seleção'}.`}
                                        </p>
                                        {isFiltered && (
                                            <Link
                                                href={rep.orders.index({
                                                    query: {
                                                        view: filters.view,
                                                    },
                                                })}
                                                className="font-bold underline decoration-[#ff4d3d] underline-offset-4"
                                            >
                                                Limpar filtros
                                            </Link>
                                        )}
                                    </div>
                                }
                            />
                        </>
                    )}
                </Form>
                {summary.total === 0 ? (
                    <EmptyState
                        className="mt-7"
                        visual={
                            <PackageCheck
                                className="size-8 text-muted-foreground"
                                aria-hidden="true"
                            />
                        }
                        eyebrow={
                            isFiltered
                                ? 'Sem resultados'
                                : 'Acompanhe suas vendas'
                        }
                        title={
                            isFiltered
                                ? 'Nenhum pedido corresponde aos filtros.'
                                : 'Nenhum pedido por aqui.'
                        }
                        description={
                            isFiltered
                                ? 'Tente outra busca ou limpe os filtros.'
                                : 'Os pedidos feitos pelos seus links aparecem aqui.'
                        }
                        actions={
                            !isFiltered && (
                                <Button asChild variant="outline">
                                    <Link
                                        href={rep.manufacturers.index({
                                            query: { status: 'mine' },
                                        })}
                                    >
                                        Ver minhas parcerias
                                    </Link>
                                </Button>
                            )
                        }
                    />
                ) : filters.view === 'board' ? (
                    <div
                        role="region"
                        aria-label="Kanban de pedidos"
                        tabIndex={0}
                        className="mt-7 w-full min-w-0 overflow-x-auto pb-3 focus-visible:outline-2 focus-visible:outline-[#ff4d3d]"
                    >
                        <div className="grid auto-cols-[min(17rem,85vw)] grid-flow-col gap-3">
                            {stages.map((stage) => {
                                const style = stageStyles[stage.value];
                                return (
                                    <section
                                        key={stage.value}
                                        aria-label={style?.label ?? stage.label}
                                        className="flex min-h-[25rem] min-w-0 flex-col border-x border-b border-border bg-[#f6f4f0]"
                                    >
                                        <header
                                            className={cn(
                                                'flex min-h-16 items-center gap-2.5 border-t-2 border-b border-border px-4',
                                                style?.border,
                                            )}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className="text-xs font-bold text-muted-foreground"
                                            >
                                                {style?.ordinal}
                                            </span>
                                            <h2 className="font-zouth-display text-sm font-semibold">
                                                {style?.label ?? stage.label}
                                            </h2>
                                            <span className="ml-auto bg-[#e7e3dc] px-2 py-1 text-xs font-bold tabular-nums">
                                                {stage.count}
                                            </span>
                                        </header>
                                        <div className="grid gap-3 p-3">
                                            {stage.orders.map((order) => (
                                                <ReadOnlyOrderCard
                                                    order={order}
                                                    key={order.id}
                                                />
                                            ))}
                                            {!stage.orders.length && (
                                                <div className="grid min-h-32 place-items-center border border-dashed border-[#cac4ba] px-4 text-center text-sm text-muted-foreground">
                                                    Nenhum pedido nesta etapa.
                                                </div>
                                            )}
                                            {stage.count >
                                                stage.orders.length && (
                                                <Link
                                                    href={indexUrl(
                                                        'list',
                                                        stage.value,
                                                    )}
                                                    className="py-3 text-center text-xs font-bold underline underline-offset-4"
                                                >
                                                    Ver todos desta etapa
                                                </Link>
                                            )}
                                        </div>
                                    </section>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="mt-7">
                        <RecordList title="Pedidos da seleção">
                            {orders.data.map((order) => (
                                <RecordRow
                                    key={order.id}
                                    href={rep.orders.show(order.id)}
                                    title={order.customer_name}
                                    status={
                                        <StatusLabel
                                            tone={
                                                stageStyles[order.status]
                                                    ?.tone ?? 'neutral'
                                            }
                                        >
                                            {order.status_label}
                                        </StatusLabel>
                                    }
                                    description={`${orderNumber(order)} · ${order.manufacturer_name} · ${orderVolume(order.total_items)}`}
                                    value={orderValue(order)}
                                    meta={formatDateTime(order.created_at)}
                                />
                            ))}
                        </RecordList>
                        <Pagination links={orders.links} />
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
