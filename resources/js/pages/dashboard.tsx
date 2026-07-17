import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    Boxes,
    Eye,
    Package,
    ShoppingCart,
    TrendingUp,
    Users,
} from 'lucide-react';
import { DashboardMetricCard } from '@/components/dashboard-metric-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

type Props = {
    manufacturer: { name: string; plan_name: string | null };
    stats: Stats;
    recentOrders: RecentOrder[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: dashboard().url },
];

const statusVariants: Record<
    string,
    'default' | 'secondary' | 'destructive' | 'outline'
> = {
    new: 'default',
    confirmed: 'secondary',
    preparing: 'outline',
    shipped: 'secondary',
    delivered: 'default',
    cancelled: 'destructive',
};

export default function Dashboard({
    manufacturer: company,
    stats,
    recentOrders,
}: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Visão geral
                        </p>
                        <h1 className="text-2xl font-semibold">
                            {company.name}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Acompanhe pedidos, clientes e alcance do catálogo.
                        </p>
                    </div>
                    {company.plan_name && (
                        <Badge variant="outline" className="w-fit">
                            Plano {company.plan_name}
                        </Badge>
                    )}
                </div>

                <section aria-labelledby="dashboard-indicators">
                    <h2 id="dashboard-indicators" className="sr-only">
                        Indicadores
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <DashboardMetricCard
                            title="Pedidos no mês"
                            value={stats.orders_this_month}
                            description={`${stats.orders_total} pedido(s) no histórico`}
                            icon={ShoppingCart}
                        />
                        <DashboardMetricCard
                            title="Novos pedidos"
                            value={stats.new_orders}
                            description="Aguardando confirmação"
                            icon={Boxes}
                        />
                        <DashboardMetricCard
                            title="Clientes"
                            value={stats.customers}
                            description="Cadastros vinculados a pedidos"
                            icon={Users}
                        />
                        <DashboardMetricCard
                            title="Faturamento em pedidos"
                            value={formatCurrency(stats.gross_revenue)}
                            description="Pedidos não cancelados"
                            icon={TrendingUp}
                        />
                        <DashboardMetricCard
                            title="Produtos ativos"
                            value={stats.active_products}
                            description="Disponíveis para o catálogo"
                            icon={Package}
                        />
                        <DashboardMetricCard
                            title="Visitas ao catálogo"
                            value={stats.catalog_visits_30_days}
                            description="Últimos 30 dias"
                            icon={Eye}
                        />
                    </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
                    <Card className="gap-0 rounded-lg py-0 shadow-none">
                        <CardHeader className="flex flex-row items-center justify-between gap-4 border-b px-5 py-4">
                            <CardTitle className="text-base">
                                Pedidos recentes
                            </CardTitle>
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={manufacturer.orders.index()}>
                                    Ver todos
                                    <ArrowRight
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                </Link>
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {recentOrders.length === 0 ? (
                                <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-5 text-center">
                                    <ShoppingCart className="size-6 text-muted-foreground" />
                                    <p className="font-medium">
                                        Nenhum pedido recebido
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Compartilhe o catálogo para começar a
                                        vender.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {recentOrders.map((order) => (
                                        <Link
                                            key={order.id}
                                            href={manufacturer.orders.show(
                                                order.id,
                                            )}
                                            className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-medium">
                                                        Pedido #{order.id}
                                                    </span>
                                                    <Badge
                                                        variant={
                                                            statusVariants[
                                                                order.status
                                                            ] ?? 'outline'
                                                        }
                                                    >
                                                        {order.status_label}
                                                    </Badge>
                                                </div>
                                                <p className="mt-1 truncate text-sm text-muted-foreground">
                                                    {order.customer_name} ·{' '}
                                                    {order.total_items} item(ns)
                                                    {order.sales_rep_name
                                                        ? ` · ${order.sales_rep_name}`
                                                        : ''}
                                                </p>
                                            </div>
                                            <div className="shrink-0 sm:text-right">
                                                <p className="font-medium tabular-nums">
                                                    {formatCurrency(
                                                        order.total_amount,
                                                    )}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDateTime(
                                                        order.created_at,
                                                    )}
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="space-y-3">
                        <h2 className="text-base font-semibold">
                            Ações rápidas
                        </h2>
                        <Button
                            variant="outline"
                            className="h-auto w-full justify-start gap-3 p-4"
                            asChild
                        >
                            <Link href={manufacturer.products.index()}>
                                <Package
                                    className="size-5"
                                    aria-hidden="true"
                                />
                                <span className="text-left">
                                    <span className="block font-medium">
                                        Gerenciar produtos
                                    </span>
                                    <span className="block text-xs font-normal text-muted-foreground">
                                        Estoque, fotos e combos
                                    </span>
                                </span>
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-auto w-full justify-start gap-3 p-4"
                            asChild
                        >
                            <Link href={manufacturer.catalogSettings.index()}>
                                <Eye className="size-5" aria-hidden="true" />
                                <span className="text-left">
                                    <span className="block font-medium">
                                        Personalizar catálogo
                                    </span>
                                    <span className="block text-xs font-normal text-muted-foreground">
                                        Aparência e link público
                                    </span>
                                </span>
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-auto w-full justify-start gap-3 p-4"
                            asChild
                        >
                            <Link href={manufacturer.customers.index()}>
                                <BookOpen
                                    className="size-5"
                                    aria-hidden="true"
                                />
                                <span className="text-left">
                                    <span className="block font-medium">
                                        Consultar clientes
                                    </span>
                                    <span className="block text-xs font-normal text-muted-foreground">
                                        Dados e histórico de compras
                                    </span>
                                </span>
                            </Link>
                        </Button>
                    </div>
                </section>
            </main>
        </AppLayout>
    );
}
