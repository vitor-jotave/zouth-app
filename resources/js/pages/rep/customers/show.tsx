import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { AppPageHeader } from '@/components/app-page-header';
import { MetricRail } from '@/components/metric-rail';
import { orderStatusTone } from '@/components/order-detail';
import { Pagination } from '@/components/pagination';
import { StatusLabel } from '@/components/status-label';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import rep from '@/routes/rep';
import type { PageSet } from './index';

type HistoryOrder = {
    id: number;
    status: string;
    status_label: string;
    total_amount: number | null;
    created_at: string;
};
type Props = {
    customer: { id: number; name: string; brand: string };
    orders: PageSet<HistoryOrder>;
    quotes: PageSet<HistoryOrder>;
    net_cents: number;
    filters: { search: string; brand: number; page: number };
};

export default function CustomerDetail({
    customer,
    orders,
    quotes,
    net_cents,
    filters,
}: Props) {
    const back = rep.customers.index({ query: filters });

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Clientes', href: back.url },
                {
                    title: customer.name,
                    href: rep.customers.show(customer.id).url,
                },
            ]}
        >
            <Head title={customer.name} />
            <div className="mx-auto w-full max-w-[1720px] px-5 py-8 sm:px-7 md:px-9 xl:px-12 2xl:px-14">
                <Link
                    href={back}
                    className="mb-7 inline-flex min-h-11 items-center gap-2 text-sm font-bold hover:text-[#b63329]"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" /> Voltar
                    para clientes
                </Link>
                <AppPageHeader
                    eyebrow={customer.brand}
                    title={
                        <>
                            {customer.name}
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description="Histórico de pedidos e orçamentos atribuídos a você nesta marca."
                />
                <MetricRail
                    className="mt-7"
                    items={[
                        { label: 'Pedidos', value: orders.total },
                        { label: 'Orçamentos', value: quotes.total },
                        {
                            label: 'Valor líquido',
                            value: formatCurrency(net_cents / 100),
                            className: 'col-span-2 xl:col-span-1',
                        },
                    ]}
                />
                <div className="mt-7 grid min-w-0 gap-6 xl:grid-cols-2 xl:items-start">
                    {[
                        {
                            label: 'Pedidos',
                            type: 'Pedido',
                            list: orders,
                            empty: 'Nenhum pedido para este lojista.',
                        },
                        {
                            label: 'Orçamentos',
                            type: 'Orçamento',
                            list: quotes,
                            empty: 'Nenhum orçamento para este lojista.',
                        },
                    ].map(({ label, type, list, empty }) => (
                        <section
                            key={label}
                            aria-label={label}
                            className="min-w-0 border border-border bg-background"
                        >
                            <h2 className="border-b border-border px-5 py-4 font-zouth-display text-lg font-semibold">
                                {label}
                            </h2>
                            {list.data.length ? (
                                <ul className="divide-y divide-border">
                                    {list.data.map((order) => (
                                        <li key={order.id}>
                                            <Link
                                                href={rep.orders.show(
                                                    order.id,
                                                    {
                                                        query: {
                                                            from_customer:
                                                                customer.id,
                                                            search: filters.search,
                                                            brand: filters.brand,
                                                            portfolio_page:
                                                                filters.page,
                                                            orders_page:
                                                                orders.current_page,
                                                            quotes_page:
                                                                quotes.current_page,
                                                        },
                                                    },
                                                )}
                                                className="group flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ff4d3d]"
                                            >
                                                <div>
                                                    <p className="text-sm font-semibold">
                                                        {type} #
                                                        {String(
                                                            order.id,
                                                        ).padStart(4, '0')}
                                                    </p>
                                                    <p className="mt-1 text-xs text-muted-foreground">
                                                        {formatDateTime(
                                                            order.created_at,
                                                        )}
                                                    </p>
                                                </div>
                                                <StatusLabel
                                                    tone={
                                                        orderStatusTone[
                                                            order.status
                                                        ] ?? 'neutral'
                                                    }
                                                >
                                                    {order.status_label}
                                                </StatusLabel>
                                                <span className="flex items-center gap-2 text-sm font-semibold tabular-nums">
                                                    {order.total_amount == null
                                                        ? 'Sob consulta'
                                                        : formatCurrency(
                                                              order.total_amount,
                                                          )}{' '}
                                                    <ArrowRight
                                                        className="size-4 group-hover:text-[#b63329]"
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="px-5 py-6 text-sm text-muted-foreground">
                                    {empty}
                                </p>
                            )}
                            {list.links.length > 3 && (
                                <div className="px-5 pb-5">
                                    <Pagination links={list.links} />
                                </div>
                            )}
                        </section>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
