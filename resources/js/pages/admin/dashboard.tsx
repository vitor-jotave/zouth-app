import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BadgeDollarSign,
    Building2,
    ChartNoAxesCombined,
    ShoppingCart,
    UserRoundCheck,
    Users,
} from 'lucide-react';
import { DashboardMetricCard } from '@/components/dashboard-metric-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import admin from '@/routes/admin';
import type { BreadcrumbItem } from '@/types';

type Stats = {
    active_manufacturers: number;
    total_manufacturers: number;
    paying_manufacturers: number;
    monthly_recurring_revenue: number;
    sales_reps: number;
    orders_last_30_days: number;
    volume_last_30_days: number;
};

type RecentManufacturer = {
    id: number;
    name: string;
    is_active: boolean;
    plan_name: string | null;
    products_count: number;
    orders_count: number;
    created_at: string;
};

type Props = {
    stats: Stats;
    recentManufacturers: RecentManufacturer[];
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Administração', href: admin.dashboard().url },
    { title: 'Dashboard', href: admin.dashboard().url },
];

export default function AdminDashboard({ stats, recentManufacturers }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard administrativo" />
            <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <div>
                    <p className="text-sm text-muted-foreground">
                        Operação Zouth
                    </p>
                    <h1 className="text-2xl font-semibold">
                        Dashboard administrativo
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Saúde comercial e atividade da plataforma.
                    </p>
                </div>

                <section aria-labelledby="admin-indicators">
                    <h2 id="admin-indicators" className="sr-only">
                        Indicadores administrativos
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <DashboardMetricCard
                            title="Fabricantes ativos"
                            value={stats.active_manufacturers}
                            description={`${stats.total_manufacturers} cadastrado(s) no total`}
                            icon={Building2}
                        />
                        <DashboardMetricCard
                            title="Assinantes válidos"
                            value={stats.paying_manufacturers}
                            description="Assinaturas ativas ou em trial"
                            icon={UserRoundCheck}
                        />
                        <DashboardMetricCard
                            title="Receita mensal recorrente"
                            value={formatCurrency(
                                stats.monthly_recurring_revenue,
                            )}
                            description="Calculada por assinaturas válidas"
                            icon={BadgeDollarSign}
                        />
                        <DashboardMetricCard
                            title="Representantes"
                            value={stats.sales_reps}
                            description="Usuários comerciais cadastrados"
                            icon={Users}
                        />
                        <DashboardMetricCard
                            title="Pedidos"
                            value={stats.orders_last_30_days}
                            description="Recebidos nos últimos 30 dias"
                            icon={ShoppingCart}
                        />
                        <DashboardMetricCard
                            title="Volume em pedidos"
                            value={formatCurrency(stats.volume_last_30_days)}
                            description="Últimos 30 dias, sem cancelados"
                            icon={ChartNoAxesCombined}
                        />
                    </div>
                </section>

                <Card className="gap-0 rounded-lg py-0 shadow-none">
                    <CardHeader className="flex flex-row items-center justify-between gap-4 border-b px-5 py-4">
                        <div>
                            <CardTitle className="text-base">
                                Fabricantes recentes
                            </CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Últimas contas criadas na plataforma
                            </p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={admin.manufacturers.index()}>
                                Ver todos
                                <ArrowRight
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        {recentManufacturers.length === 0 ? (
                            <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-5 text-center">
                                <Building2 className="size-6 text-muted-foreground" />
                                <p className="font-medium">
                                    Nenhum fabricante cadastrado
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {recentManufacturers.map((manufacturer) => (
                                    <div
                                        key={manufacturer.id}
                                        className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="truncate font-medium">
                                                    {manufacturer.name}
                                                </p>
                                                <Badge
                                                    variant={
                                                        manufacturer.is_active
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                >
                                                    {manufacturer.is_active
                                                        ? 'Ativo'
                                                        : 'Inativo'}
                                                </Badge>
                                                {manufacturer.plan_name && (
                                                    <Badge variant="outline">
                                                        {manufacturer.plan_name}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {manufacturer.products_count}{' '}
                                                produto(s) ·{' '}
                                                {manufacturer.orders_count}{' '}
                                                pedido(s)
                                            </p>
                                        </div>
                                        <p className="shrink-0 text-xs text-muted-foreground">
                                            Criado em{' '}
                                            {formatDateTime(
                                                manufacturer.created_at,
                                            )}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </AppLayout>
    );
}
