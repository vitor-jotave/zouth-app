import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BellRing,
    CheckCircle2,
    Eye,
    Package,
    ShoppingBag,
} from 'lucide-react';
import { ActionRow } from '@/components/action-row';
import { AppPageHeader } from '@/components/app-page-header';
import { AttentionPanel } from '@/components/attention-panel';
import { MetricRail } from '@/components/metric-rail';
import { RecordList, RecordRow } from '@/components/record-list';
import { StatusLabel, type StatusLabelTone } from '@/components/status-label';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { dashboard } from '@/routes';
import manufacturer from '@/routes/manufacturer';
import type { BreadcrumbItem } from '@/types';

type Stats = {
    orders_total: number;
    orders_this_month: number;
    new_orders: number;
    customers: number;
    active_products: number;
    catalog_visits_30_days: number;
    gross_revenue: number;
};

type RecentOrder = {
    id: number;
    customer_name: string;
    status: string;
    status_label: string;
    total_items: number;
    total_amount: number;
    sales_rep_name: string | null;
    created_at: string;
};

type CatalogProduct = {
    id: number;
    name: string;
    price: number | null;
    image_url: string | null;
    image_alt: string | null;
};

type Props = {
    manufacturer: { name: string; plan_name: string | null };
    stats: Stats;
    catalog: {
        public_link: string | null;
        is_public: boolean;
        products: CatalogProduct[];
    };
    recentOrders: RecentOrder[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Visão geral', href: dashboard().url },
];

const statusTones: Record<string, StatusLabelTone> = {
    new: 'coral',
    confirmed: 'plum',
    preparing: 'plum',
    shipped: 'mineral',
    delivered: 'mineral',
    cancelled: 'muted',
};

function CatalogImage({ product }: { product?: CatalogProduct }) {
    if (!product?.image_url) {
        return (
            <div className="flex min-h-80 flex-col items-center justify-center bg-[#e7e3dc]/65 px-8 text-center lg:min-h-[31rem]">
                <span className="flex size-14 items-center justify-center bg-[#f6f4f0] text-[#18181f]">
                    <Package className="size-6" aria-hidden="true" />
                </span>
                <p className="mt-5 font-zouth-display text-xl font-semibold tracking-[-0.025em] text-[#18181f]">
                    Sua coleção merece aparecer.
                </p>
                <p className="mt-2 max-w-xs text-sm leading-6 text-[#68665f]">
                    Adicione fotos aos produtos para dar vida a esta visão.
                </p>
            </div>
        );
    }

    return (
        <div className="relative min-h-80 overflow-hidden bg-[#e7e3dc] lg:min-h-[31rem]">
            <img
                src={product.image_url}
                alt={product.image_alt ?? product.name}
                className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out hover:scale-[1.02]"
            />
            <div className="absolute right-4 bottom-4 left-4 flex items-end justify-between gap-4 bg-[#f6f4f0]/95 px-4 py-3 backdrop-blur-sm">
                <div className="min-w-0">
                    <p className="truncate font-zouth-display text-sm font-semibold tracking-[-0.01em] text-[#18181f]">
                        {product.name}
                    </p>
                    <p className="mt-0.5 text-[0.68rem] font-bold tracking-[0.12em] text-[#68665f] uppercase">
                        Em destaque no catálogo
                    </p>
                </div>
                {product.price !== null && (
                    <p className="shrink-0 text-sm font-bold text-[#18181f] tabular-nums">
                        {formatCurrency(product.price)}
                    </p>
                )}
            </div>
        </div>
    );
}

function EmptyOrders() {
    return (
        <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
            <span className="flex size-12 items-center justify-center bg-[#2e705a]/10 text-[#2e705a]">
                <ShoppingBag className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-5 font-zouth-display text-lg font-semibold tracking-[-0.02em] text-foreground">
                Pronta para o próximo pedido.
            </p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                Compartilhe seu catálogo para colocar a coleção diante de mais
                lojistas.
            </p>
        </div>
    );
}

export default function Dashboard({
    manufacturer: company,
    stats,
    catalog,
    recentOrders,
}: Props) {
    const featuredProduct =
        catalog.products.find((product) => product.image_url) ??
        catalog.products[0];
    const attentionHref = manufacturer.orders.index({
        query: stats.new_orders > 0 ? { status: 'new' } : {},
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Visão geral" />

            <div className="zouth-dashboard mx-auto flex w-full max-w-[1560px] flex-1 flex-col px-5 py-8 sm:px-7 md:px-9 lg:pt-8 lg:pb-4 xl:px-12 2xl:px-14">
                <AppPageHeader
                    eyebrow={
                        company.plan_name
                            ? `Visão geral · Plano ${company.plan_name}`
                            : 'Visão geral'
                    }
                    title={
                        <>
                            Sua coleção está em movimento
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description={
                        <>
                            <p className="font-zouth-display text-lg font-semibold tracking-[-0.02em] text-foreground sm:text-xl">
                                Olá, {company.name}
                            </p>
                            <p className="mt-1.5">
                                Veja o que despertou interesse e o que pede sua
                                atenção hoje.
                            </p>
                        </>
                    }
                    aside={
                        <AttentionPanel
                            icon={
                                stats.new_orders > 0 ? BellRing : CheckCircle2
                            }
                            value={
                                stats.new_orders > 0
                                    ? stats.new_orders
                                    : 'Tudo certo'
                            }
                            label={
                                stats.new_orders === 1
                                    ? 'pedido esperando sua confirmação'
                                    : stats.new_orders > 1
                                      ? 'pedidos esperando sua confirmação'
                                      : 'nenhum pedido pendente agora'
                            }
                            href={attentionHref}
                            actionLabel={
                                stats.new_orders > 0
                                    ? 'Ver novos pedidos'
                                    : 'Ver pedidos'
                            }
                            tone={stats.new_orders > 0 ? 'coral' : 'mineral'}
                        />
                    }
                />

                <section className="mt-7" aria-labelledby="pulso-comercial">
                    <h2 id="pulso-comercial" className="sr-only">
                        Pulso comercial
                    </h2>
                    <MetricRail
                        items={[
                            {
                                label:
                                    stats.orders_this_month === 1
                                        ? 'pedido neste mês'
                                        : 'pedidos neste mês',
                                value: stats.orders_this_month,
                                supportingText: `${stats.orders_total} no histórico`,
                                className:
                                    'order-2 border-t border-r xl:order-none xl:border-t-0 xl:border-r-0',
                            },
                            {
                                label: 'em pedidos',
                                value: formatCurrency(stats.gross_revenue),
                                supportingText: 'Pedidos não cancelados',
                                className:
                                    'order-1 col-span-2 border-t-0 sm:border-l-0 xl:order-none xl:col-span-1 xl:border-l',
                            },
                            {
                                label:
                                    stats.customers === 1
                                        ? 'lojista comprando'
                                        : 'lojistas comprando',
                                value: stats.customers,
                                supportingText: 'Relacionamentos em movimento',
                                className: 'order-3 xl:order-none',
                            },
                        ]}
                    />
                </section>

                <div className="mt-5 grid min-w-0 gap-7 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
                    <section className="grid min-w-0 border border-border bg-background lg:grid-cols-[minmax(0,1.12fr)_minmax(300px,0.88fr)]">
                        <CatalogImage product={featuredProduct} />

                        <div className="flex min-w-0 flex-col px-6 py-7 sm:px-8">
                            <p className="text-[0.68rem] font-bold tracking-[0.22em] text-[#e93d30] uppercase">
                                Catálogo
                            </p>
                            <h2 className="mt-4 max-w-sm font-zouth-display text-[clamp(1.9rem,2.5vw,2.25rem)] leading-[0.98] font-semibold tracking-[-0.04em] text-foreground">
                                Catálogo em circulação
                                <span className="text-[#ff4d3d]">.</span>
                            </h2>
                            <p className="mt-5 max-w-sm text-sm leading-5 text-muted-foreground">
                                Suas peças estão sendo vistas. Mantenha a
                                coleção atualizada e aproveite cada
                                oportunidade.
                            </p>

                            <dl className="mt-8 divide-y divide-border border-y border-border">
                                <div className="grid grid-cols-[auto_1fr] items-center gap-4 py-4">
                                    <span className="flex size-10 items-center justify-center bg-[#e7e3dc]/70 text-foreground">
                                        <Package
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div>
                                        <dd className="font-zouth-display text-2xl leading-none font-semibold tracking-[-0.035em] text-foreground tabular-nums">
                                            {stats.active_products}
                                        </dd>
                                        <dt className="mt-1 text-xs text-muted-foreground">
                                            produtos ativos na coleção
                                        </dt>
                                    </div>
                                </div>
                                <div className="grid grid-cols-[auto_1fr] items-center gap-4 py-4">
                                    <span className="flex size-10 items-center justify-center bg-[#e7e3dc]/70 text-foreground">
                                        <Eye
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div>
                                        <dd className="font-zouth-display text-2xl leading-none font-semibold tracking-[-0.035em] text-foreground tabular-nums">
                                            {stats.catalog_visits_30_days}
                                        </dd>
                                        <dt className="mt-1 text-xs text-muted-foreground">
                                            visitas nos últimos 30 dias
                                        </dt>
                                    </div>
                                </div>
                            </dl>

                            <div className="mt-auto pt-7">
                                {catalog.public_link ? (
                                    <a
                                        href={catalog.public_link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex min-h-12 items-center gap-3 text-sm font-bold text-foreground transition-colors hover:text-[#e93d30] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]"
                                    >
                                        Acessar catálogo
                                        <ArrowRight
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </a>
                                ) : (
                                    <Link
                                        href={manufacturer.catalogSettings.index()}
                                        className="inline-flex min-h-12 items-center gap-3 text-sm font-bold text-foreground transition-colors hover:text-[#e93d30] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]"
                                    >
                                        Colocar catálogo no ar
                                        <ArrowRight
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                )}
                            </div>
                        </div>
                    </section>

                    <div className="flex min-w-0 flex-col gap-6">
                        <RecordList
                            title="Pedidos recentes"
                            href={manufacturer.orders.index()}
                        >
                            {recentOrders.length === 0 ? (
                                <EmptyOrders />
                            ) : (
                                recentOrders.slice(0, 3).map((order) => (
                                    <RecordRow
                                        key={order.id}
                                        href={manufacturer.orders.show(
                                            order.id,
                                        )}
                                        title={`Pedido #${order.id}`}
                                        status={
                                            <StatusLabel
                                                tone={
                                                    statusTones[order.status] ??
                                                    'neutral'
                                                }
                                            >
                                                {order.status_label}
                                            </StatusLabel>
                                        }
                                        description={
                                            <>
                                                {order.customer_name} ·{' '}
                                                {order.total_items}{' '}
                                                {order.total_items === 1
                                                    ? 'item'
                                                    : 'itens'}
                                                {order.sales_rep_name
                                                    ? ` · ${order.sales_rep_name}`
                                                    : ''}
                                            </>
                                        }
                                        value={formatCurrency(
                                            order.total_amount,
                                        )}
                                        meta={formatDateTime(order.created_at)}
                                    />
                                ))
                            )}
                        </RecordList>

                        <section
                            className="grid gap-3"
                            aria-label="Próximos passos"
                        >
                            <ActionRow
                                href={manufacturer.products.index()}
                                icon={Package}
                                title="Organizar produtos"
                                description="Fotos, peças e combinações"
                            />
                            <ActionRow
                                href={manufacturer.catalogSettings.index()}
                                icon={Eye}
                                title="Personalizar catálogo"
                                description="Aparência, narrativa e link público"
                            />
                        </section>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
