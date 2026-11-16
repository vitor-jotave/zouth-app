import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    CalendarRange,
    Handshake,
    ShoppingBag,
} from 'lucide-react';
import { useState } from 'react';
import { ActionRow } from '@/components/action-row';
import { RecordList, RecordRow } from '@/components/record-list';
import {
    TrendChart,
    type ChartMode,
    type SeriesPoint,
} from '@/components/report-trend-chart';
import { StatusLabel, type StatusLabelTone } from '@/components/status-label';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import rep from '@/routes/rep';
import type { BreadcrumbItem } from '@/types';
type Stats = {
    portfolio_customers: number;
    orders_in_progress: number;
    active_affiliations: number;
    pending_affiliations: number;
    orders_total: number;
    quotes_total: number;
    orders_this_month: number;
    net_sales: number;
    available_manufacturers: number;
};

type RecentOrder = {
    id: number;
    manufacturer_name: string;
    customer_name: string;
    status: string;
    status_label: string;
    order_type: string;
    order_type_label: string;
    total_items: number;
    total_amount: number;
    created_at: string;
};

type Props = {
    stats: Stats;
    activity: {
        series: SeriesPoint[];
        statuses: { value: string; label: string; count: number }[];
    };
    recentOrders: RecentOrder[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Visão geral', href: rep.dashboard().url },
];

const statusTones: Record<string, StatusLabelTone> = {
    new: 'coral',
    confirmed: 'plum',
    preparing: 'plum',
    shipped: 'mineral',
    delivered: 'mineral',
    cancelled: 'muted',
};

export default function RepDashboard({ stats, recentOrders, activity }: Props) {
    const [mode, setMode] = useState<ChartMode>('revenue');
    const hasPartners = stats.active_affiliations > 0;
    const myBrands = rep.manufacturers.index({ query: { status: 'mine' } });
    const discover = rep.manufacturers.index();
    const periodOrders = activity.series.reduce(
        (sum, day) => sum + day.orders,
        0,
    );
    const periodRevenue = activity.series.reduce(
        (sum, day) => sum + day.revenue_cents,
        0,
    );
    const statusTotal = activity.statuses.reduce(
        (sum, status) => sum + status.count,
        0,
    );
    const metrics = [
        {
            label: 'Valor líquido no período',
            value: formatCurrency(periodRevenue / 100),
            note: 'Pedidos não cancelados',
        },
        {
            label: 'Pedidos no período',
            value: periodOrders,
            note: `${stats.orders_total} no histórico`,
        },
        {
            label: 'Ticket médio no período',
            value: periodOrders
                ? formatCurrency(periodRevenue / periodOrders / 100)
                : '—',
            note: 'Valor líquido por pedido',
        },
        {
            label: 'Orçamentos',
            value: stats.quotes_total,
            note: 'Total no histórico',
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Visão geral do representante" />
            <main className="min-h-full bg-[#f6f4f0] font-zouth-body text-[#18181f]">
                <div className="mx-auto w-full max-w-[1560px] min-w-0 space-y-7 px-4 py-7 sm:space-y-8 sm:px-7 sm:py-8 xl:px-10 xl:py-9">
                    <header className="flex flex-col gap-5 border-b border-[#cfcac1] pb-6 sm:gap-7 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0">
                            <p className="text-[0.66rem] font-bold tracking-[0.24em] text-[#cf3428] uppercase">
                                Visão geral · Representante
                            </p>
                            <h1 className="mt-4 font-zouth-display text-[clamp(2.65rem,4vw,4.35rem)] leading-[0.94] font-semibold tracking-[-0.06em]">
                                Sua operação
                                <span className="text-[#ff4d3d]">.</span>
                            </h1>
                            <p className="mt-4 max-w-2xl text-sm leading-6 text-[#6c6860] sm:text-base">
                                Acompanhe o desempenho dos seus pedidos e
                                mantenha suas coleções em circulação.
                            </p>
                        </div>
                        <Link
                            href={hasPartners ? myBrands : discover}
                            className="inline-flex min-h-12 items-center justify-between gap-5 border border-[#18181f] bg-[#18181f] px-5 text-sm font-semibold text-[#f6f4f0] transition-colors hover:bg-[#303039] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d] sm:w-fit lg:shrink-0"
                        >
                            {hasPartners
                                ? 'Compartilhar catálogo'
                                : 'Encontrar marcas'}
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                    </header>

                    <section
                        aria-label="Acompanhamento comercial"
                        className="grid gap-px border border-border bg-border sm:grid-cols-2"
                    >
                        {[
                            {
                                label: 'Clientes da carteira',
                                count: stats.portfolio_customers,
                                href: rep.customers.index(),
                            },
                            {
                                label: 'Pedidos em andamento',
                                count: stats.orders_in_progress,
                                href: rep.orders.index({
                                    query: { status: 'in_progress' },
                                }),
                            },
                        ].map(({ label, count, href }) => (
                            <Link
                                key={label}
                                href={href}
                                className="group flex min-h-20 items-center gap-4 bg-background px-5 py-4 hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ff4d3d]"
                            >
                                <span className="font-zouth-display text-2xl font-semibold tabular-nums">
                                    {count}
                                </span>
                                <span className="text-sm font-semibold">
                                    {label}
                                </span>
                                <ArrowRight
                                    className="ml-auto size-4 shrink-0 group-hover:text-[#b63329]"
                                    aria-hidden="true"
                                />
                            </Link>
                        ))}
                    </section>

                    <section aria-label="Indicadores comerciais">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <p className="text-[0.65rem] font-bold tracking-[0.18em] text-[#6c6860] uppercase">
                                Pulso comercial
                            </p>
                            <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#6c6860]">
                                <CalendarRange
                                    className="size-4"
                                    aria-hidden="true"
                                />{' '}
                                Últimos 30 dias
                            </span>
                        </div>
                        <dl className="grid grid-cols-2 border-y border-[#cfcac1] xl:grid-cols-4">
                            {metrics.map((metric, index) => (
                                <div
                                    key={metric.label}
                                    className={cn(
                                        'min-w-0 px-3 py-4 sm:px-6 sm:py-5',
                                        index % 2 === 1 &&
                                            'border-l border-[#cfcac1]',
                                        index > 1 &&
                                            'border-t border-[#cfcac1] xl:border-t-0',
                                        index > 0 &&
                                            'xl:border-l xl:border-[#cfcac1]',
                                    )}
                                >
                                    <dt className="text-[0.64rem] leading-4 font-bold tracking-[0.1em] text-[#6c6860] uppercase">
                                        {metric.label}
                                    </dt>
                                    <dd className="mt-2 font-zouth-display text-[clamp(1.25rem,2.3vw,2.2rem)] leading-tight font-semibold tracking-[-0.05em] break-words tabular-nums">
                                        {metric.value}
                                    </dd>
                                    <dd className="mt-1.5 text-xs leading-4 text-[#6c6860]">
                                        {metric.note}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </section>

                    <div className="grid min-w-0 border-y border-[#cfcac1] xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.65fr)]">
                        <section
                            className="min-w-0 px-3 py-5 sm:px-6 sm:py-6 xl:border-r xl:border-[#cfcac1]"
                            aria-labelledby="rep-trend"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                    <p className="text-[0.64rem] font-bold tracking-[0.18em] text-[#6c6860] uppercase">
                                        Desempenho diário
                                    </p>
                                    <h2
                                        id="rep-trend"
                                        className="mt-2 font-zouth-display text-2xl font-semibold tracking-[-0.045em] sm:text-3xl"
                                    >
                                        Ritmo das vendas
                                        <span className="text-[#ff4d3d]">
                                            .
                                        </span>
                                    </h2>
                                </div>
                                <div
                                    className="inline-grid grid-cols-2 border border-[#cfcac1]"
                                    role="group"
                                    aria-label="Métrica do gráfico"
                                >
                                    {(['revenue', 'orders'] as const).map(
                                        (option) => (
                                            <button
                                                key={option}
                                                type="button"
                                                aria-pressed={mode === option}
                                                onClick={() => setMode(option)}
                                                className={cn(
                                                    'min-h-11 px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d] sm:px-4',
                                                    mode === option
                                                        ? 'bg-[#18181f] text-[#f6f4f0]'
                                                        : 'text-[#6c6860] hover:bg-white/60',
                                                )}
                                            >
                                                {option === 'revenue'
                                                    ? 'Valor líquido'
                                                    : 'Pedidos'}
                                            </button>
                                        ),
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#6c6860]">
                                <span className="inline-flex items-center gap-2">
                                    <span className="h-0.5 w-5 bg-[#ff4d3d]" />{' '}
                                    Período atual
                                </span>
                                <span className="inline-flex items-center gap-2">
                                    <span className="w-5 border-t border-dashed border-[#969189]" />{' '}
                                    30 dias anteriores
                                </span>
                            </div>
                            <TrendChart series={activity.series} mode={mode} />
                            {!activity.series.some(
                                (day) => day.orders || day.previous_orders,
                            ) && (
                                <p className="mt-3 text-sm text-[#6c6860]">
                                    Ainda não há pedidos não cancelados nesses
                                    períodos.
                                </p>
                            )}
                        </section>
                        <section
                            className="min-w-0 border-t border-[#cfcac1] px-3 py-5 sm:px-6 sm:py-6 xl:border-t-0"
                            aria-labelledby="rep-order-statuses"
                        >
                            <p className="text-[0.64rem] font-bold tracking-[0.18em] text-[#6c6860] uppercase">
                                Operação comercial
                            </p>
                            <h2
                                id="rep-order-statuses"
                                className="mt-2 font-zouth-display text-2xl font-semibold tracking-[-0.045em]"
                            >
                                Status dos pedidos
                                <span className="text-[#ff4d3d]">.</span>
                            </h2>
                            {statusTotal === 0 ? (
                                <p className="mt-5 text-sm leading-6 text-[#6c6860]">
                                    Nenhum pedido atribuído neste período.
                                </p>
                            ) : (
                                <ul className="mt-5 grid gap-3">
                                    {activity.statuses.map((status) => (
                                        <li
                                            key={status.value}
                                            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1"
                                        >
                                            <span className="text-xs font-semibold">
                                                {status.label}
                                            </span>
                                            <span className="text-xs font-semibold tabular-nums">
                                                {status.count}
                                            </span>
                                            <span
                                                aria-hidden="true"
                                                className="col-span-2 h-1 bg-[#e7e3dc]"
                                            >
                                                <span
                                                    className={cn(
                                                        'block h-full',
                                                        status.value ===
                                                            'cancelled'
                                                            ? 'bg-[#969189]'
                                                            : 'bg-[#ff4d3d]',
                                                    )}
                                                    style={{
                                                        width: `${(status.count / statusTotal) * 100}%`,
                                                    }}
                                                />
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </div>
                    <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.65fr)] lg:gap-6">
                        <RecordList
                            title="Pedidos recentes"
                            href={rep.orders.index()}
                            className="min-w-0 self-start"
                        >
                            {recentOrders.length === 0 ? (
                                <div className="px-5 py-8 sm:px-6">
                                    <span className="flex size-10 items-center justify-center bg-[#e7e3dc]/70 text-foreground">
                                        <ShoppingBag
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <p className="mt-5 font-zouth-display text-lg font-semibold tracking-[-0.02em]">
                                        Nenhum pedido atribuído
                                    </p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {hasPartners
                                            ? 'Compartilhe o catálogo de uma marca parceira. Os pedidos feitos pelos seus links aparecem aqui.'
                                            : 'Encontre uma marca para começar a representar.'}
                                    </p>
                                </div>
                            ) : (
                                recentOrders
                                    .slice(0, 3)
                                    .map((order) => (
                                        <RecordRow
                                            key={order.id}
                                            href={rep.orders.show(order.id)}
                                            title={`${order.order_type_label} #${order.id}`}
                                            status={
                                                <StatusLabel
                                                    tone={
                                                        statusTones[
                                                            order.status
                                                        ] ?? 'neutral'
                                                    }
                                                >
                                                    {order.status_label}
                                                </StatusLabel>
                                            }
                                            description={`${order.manufacturer_name} · ${order.customer_name} · ${order.total_items} ${order.total_items === 1 ? 'peça' : 'peças'}`}
                                            value={
                                                order.order_type === 'quote'
                                                    ? 'Sob consulta'
                                                    : formatCurrency(
                                                          order.total_amount,
                                                      )
                                            }
                                            meta={formatDateTime(
                                                order.created_at,
                                            )}
                                        />
                                    ))
                            )}
                        </RecordList>

                        <RecordList
                            title="Minhas marcas"
                            className="min-w-0 self-start"
                        >
                            <div className="px-5 py-5 sm:px-6">
                                <dl className="grid grid-cols-2 gap-4">
                                    <div>
                                        <dt className="text-sm text-muted-foreground">
                                            Parcerias ativas
                                        </dt>
                                        <dd className="mt-1 font-zouth-display text-2xl font-semibold tracking-[-0.035em] tabular-nums">
                                            {stats.active_affiliations}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-sm text-muted-foreground">
                                            Em análise
                                        </dt>
                                        <dd className="mt-1 font-zouth-display text-2xl font-semibold tracking-[-0.035em] tabular-nums">
                                            {stats.pending_affiliations}
                                        </dd>
                                    </div>
                                </dl>
                                <div className="mt-5 grid gap-3">
                                    <ActionRow
                                        href={myBrands}
                                        icon={Handshake}
                                        title="Ver minhas marcas"
                                        description="Parcerias e solicitações"
                                    />
                                    <ActionRow
                                        href={discover}
                                        icon={Building2}
                                        title="Explorar a vitrine"
                                        description={
                                            stats.available_manufacturers === 1
                                                ? '1 marca para conhecer'
                                                : `${stats.available_manufacturers} marcas para conhecer`
                                        }
                                    />
                                </div>
                            </div>
                        </RecordList>
                    </div>
                </div>
            </main>
        </AppLayout>
    );
}
