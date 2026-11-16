import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Building2,
    CircleDot,
    FileText,
    Package,
} from 'lucide-react';
import { AppPageHeader } from '@/components/app-page-header';
import { MetricRail } from '@/components/metric-rail';
import {
    OrderHistory,
    OrderSelection,
    orderStatusTone,
    type OrderItem,
    type StatusHistory,
} from '@/components/order-detail';
import { StatusLabel } from '@/components/status-label';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import rep from '@/routes/rep';
import type { RepOrder } from './index';

export default function RepOrderDetail({
    order,
    from_customer,
}: {
    order: RepOrder & { items: OrderItem[]; status_history: StatusHistory[] };
    from_customer: {
        id: number;
        search: string;
        brand: number;
        portfolio_page: number;
        orders_page: number;
        quotes_page: number;
    } | null;
}) {
    const isQuote = order.order_type === 'quote';
    const orderTitle = `${order.order_type_label} #${String(order.id).padStart(4, '0')}`;
    const back = from_customer
        ? rep.customers.show(from_customer.id, {
              query: {
                  search: from_customer.search,
                  brand: from_customer.brand,
                  portfolio_page: from_customer.portfolio_page,
                  orders_page: from_customer.orders_page,
                  quotes_page: from_customer.quotes_page,
              },
          })
        : rep.orders.index();

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Pedidos', href: rep.orders.index().url },
                { title: orderTitle, href: rep.orders.show(order.id).url },
            ]}
        >
            <Head title={orderTitle} />
            <div className="mx-auto flex w-full max-w-[1720px] flex-1 flex-col px-5 py-8 sm:px-7 md:px-9 lg:pt-8 lg:pb-12 xl:px-12 2xl:px-14">
                <Link
                    href={back}
                    className="mb-7 inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-foreground transition-colors hover:text-[#d9382b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    {from_customer
                        ? 'Voltar para o cliente'
                        : 'Voltar para meus pedidos'}
                </Link>
                <AppPageHeader
                    eyebrow={orderTitle}
                    title={
                        <>
                            {order.customer_name}
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description={
                        <div className="flex flex-wrap items-center gap-3">
                            <StatusLabel
                                tone={
                                    orderStatusTone[order.status] ?? 'neutral'
                                }
                            >
                                {order.status_label}
                            </StatusLabel>
                            <span>
                                Recebido em {formatDateTime(order.created_at)}
                            </span>
                        </div>
                    }
                />
                <MetricRail
                    variant="open"
                    className="mt-7"
                    items={[
                        {
                            label: isQuote ? 'Orçamento' : 'Total líquido',
                            value: (
                                <span className="text-lg sm:text-2xl">
                                    {isQuote
                                        ? 'Sob consulta'
                                        : formatCurrency(order.total_amount)}
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
                            label: 'Marca',
                            value: (
                                <span className="block pr-6 text-lg leading-tight break-words sm:text-xl">
                                    {order.manufacturer_name}
                                </span>
                            ),
                            icon: (
                                <Building2
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                        },
                    ]}
                />
                <div className="mt-7 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(21rem,0.8fr)] xl:items-start">
                    <OrderSelection
                        order={order}
                        isQuote={isQuote}
                        showQuoteEstimate={false}
                        quoteNote="Valores sob consulta com a marca."
                    />
                    <OrderHistory
                        history={order.status_history}
                        status={order.status}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
