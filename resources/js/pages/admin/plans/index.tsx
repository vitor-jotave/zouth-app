import { Head, Link, router } from '@inertiajs/react';
import { Check, Pencil, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/dashboard' },
    { title: 'Planos', href: '/admin/plans' },
];

type Plan = {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    monthly_price_cents: number;
    formatted_price: string;
    trial_days: number;
    max_reps: number | null;
    max_products: number | null;
    max_orders_per_month: number | null;
    max_users: number | null;
    max_data_mb: number | null;
    max_files_gb: number | null;
    allow_csv_import: boolean;
    stripe_product_id: string | null;
    stripe_price_id: string | null;
    manufacturers_count: number;
    created_at: string;
};

function formatLimit(value: number | null): string {
    return value === null ? 'Ilimitado' : String(value);
}

export default function PlansIndex({ plans }: { plans: Plan[] }) {
    function handleToggle(planId: number) {
        router.post(`/admin/plans/${planId}/toggle`, {}, { preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Planos" />

            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Planos</h2>
                        <p className="text-muted-foreground">
                            Gerencie os planos de assinatura disponíveis.
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/admin/plans/create">Novo Plano</Link>
                    </Button>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Preço/mês</TableHead>
                                <TableHead>Trial</TableHead>
                                <TableHead>Reps</TableHead>
                                <TableHead>Produtos</TableHead>
                                <TableHead>Pedidos/mês</TableHead>
                                <TableHead>Usuários</TableHead>
                                <TableHead>CSV</TableHead>
                                <TableHead>Stripe</TableHead>
                                <TableHead>Assinantes</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {plans.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={12} className="text-muted-foreground text-center">
                                        Nenhum plano encontrado. Crie um para começar.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                plans.map((plan) => (
                                    <TableRow key={plan.id}>
                                        <TableCell className="font-medium">{plan.name}</TableCell>
                                        <TableCell>{plan.formatted_price}</TableCell>
                                        <TableCell>
                                            {plan.trial_days > 0
                                                ? `${plan.trial_days} dias`
                                                : '-'}
                                        </TableCell>
                                        <TableCell>{formatLimit(plan.max_reps)}</TableCell>
                                        <TableCell>{formatLimit(plan.max_products)}</TableCell>
                                        <TableCell>{formatLimit(plan.max_orders_per_month)}</TableCell>
                                        <TableCell>{formatLimit(plan.max_users)}</TableCell>
                                        <TableCell>
                                            {plan.allow_csv_import ? (
                                                <Check className="h-4 w-4 text-green-600" />
                                            ) : (
                                                <X className="h-4 w-4 text-muted-foreground" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {plan.stripe_price_id ? (
                                                <Badge variant="default">Sincronizado</Badge>
                                            ) : (
                                                <Badge variant="secondary">Pendente</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>{plan.manufacturers_count}</TableCell>
                                        <TableCell>
                                            {plan.is_active ? (
                                                <Badge variant="default">Ativo</Badge>
                                            ) : (
                                                <Badge variant="secondary">Inativo</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <Link href={`/admin/plans/${plan.id}/edit`}>
                                                        <Pencil className="mr-1 h-3 w-3" />
                                                        Editar
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleToggle(plan.id)}
                                                >
                                                    {plan.is_active ? 'Desativar' : 'Ativar'}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}
