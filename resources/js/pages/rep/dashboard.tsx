import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    Clock3,
    Handshake,
    ShoppingCart,
    TrendingUp,
} from 'lucide-react';
import { DashboardMetricCard } from '@/components/dashboard-metric-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { show as tracking } from '@/routes/public/order';
import rep from '@/routes/rep';
import type { BreadcrumbItem } from '@/types';

type Stats = {
    active_affiliations: number;
    pending_affiliations: number;
    orders_total: number;
    orders_this_month: number;
    gross_sales: number;
    available_manufacturers: number;
};

type RecentOrder = {
    id: number;
    public_token: string;
    manufacturer_name: string;
    customer_name: string;
    status: string;
    status_label: string;
    total_items: number;
    total_amount: number;
    created_at: string;
};

type Props = {
    stats: Stats;
    recentOrders: RecentOrder[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Representante', href: rep.dashboard().url },
    { title: 'Dashboard', href: rep.dashboard().url },
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

export default function RepDashboard({ stats, recentOrders }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard do representante" />
            <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Área comercial
                        </p>
                        <h1 className="text-2xl font-semibold">
                            Dashboard do representante
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Acompanhe suas afiliações e os pedidos atribuídos a
                            você.
                        </p>
                    </div>
                    <Button asChild>
                        <Link href={rep.manufacturers.index()}>
                            Encontrar fabricantes
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                    </Button>
                </div>

                <section aria-labelledby="rep-indicators">
                    <h2 id="rep-indicators" className="sr-only">
                        Indicadores do representante
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <DashboardMetricCard
                            title="Afiliações ativas"
                            value={stats.active_affiliations}
                            description="Fabricantes liberados para venda"
                            icon={Handshake}
                        />
                        <DashboardMetricCard
                            title="Solicitações pendentes"
                            value={stats.pending_affiliations}
                            description="Aguardando aprovação"
                            icon={Clock3}
                        />
                        <DashboardMetricCard
                            title="Fabricantes disponíveis"
                            value={stats.available_manufacturers}
                            description="Novas oportunidades de afiliação"
                            icon={Building2}
                        />
                        <DashboardMetricCard
                            title="Pedidos no mês"
                            value={stats.orders_this_month}
                            description={`${stats.orders_total} pedido(s) no histórico`}
                            icon={ShoppingCart}
                        />
                        <DashboardMetricCard
                            title="Volume vendido"
                            value={formatCurrency(stats.gross_sales)}
                            description="Pedidos atribuídos, sem cancelados"
                            icon={TrendingUp}
                        />
                    </div>
                </section>

                <Card className="gap-0 rounded-lg py-0 shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between gap-4 border-b px-5 py-4">
                        <CardTitle className="text-base">
                            Pedidos recentes
                        </CardTitle>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={rep.orders.index()}>
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
                                    Nenhum pedido atribuído
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Afilie-se a fabricantes para começar a
                                    vender.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {recentOrders.map((order) => (
                                    <a
                                        key={order.id}
                                        href={tracking(order.public_token).url}
                                        target="_blank"
                                        rel="noreferrer"
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
                                                {order.manufacturer_name} ·{' '}
                                                {order.customer_name} ·{' '}
                                                {order.total_items} item(ns)
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
                                    </a>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </AppLayout>
    );
}
