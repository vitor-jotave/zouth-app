import { Head, useForm } from '@inertiajs/react';
import PlanForm from '@/components/plan-form';
import type { PlanFormData } from '@/components/plan-form';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/dashboard' },
    { title: 'Planos', href: '/admin/plans' },
    { title: 'Editar Plano', href: '#' },
];

type PlanData = {
    id: number;
    name: string;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    monthly_price_cents: number;
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
};

export default function PlansEdit({ plan }: { plan: PlanData }) {
    const { data, setData, put, processing, errors } = useForm<PlanFormData>({
        name: plan.name,
        description: plan.description ?? '',
        is_active: plan.is_active,
        sort_order: plan.sort_order,
        monthly_price: (plan.monthly_price_cents / 100).toFixed(2).replace('.', ','),
        trial_days: plan.trial_days,
        max_reps: plan.max_reps !== null ? String(plan.max_reps) : '',
        max_products: plan.max_products !== null ? String(plan.max_products) : '',
        max_orders_per_month: plan.max_orders_per_month !== null ? String(plan.max_orders_per_month) : '',
        max_users: plan.max_users !== null ? String(plan.max_users) : '',
        max_data_mb: plan.max_data_mb !== null ? String(plan.max_data_mb) : '',
        max_files_gb: plan.max_files_gb !== null ? String(plan.max_files_gb) : '',
        allow_csv_import: plan.allow_csv_import,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        put(`/admin/plans/${plan.id}`);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${plan.name}`} />

            <div className="space-y-6 p-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Editar Plano</h2>
                    <p className="text-muted-foreground">
                        Atualize as configurações do plano &quot;{plan.name}&quot;.
                    </p>
                    {plan.stripe_product_id && (
                        <p className="mt-1 text-xs text-muted-foreground">
                            Stripe Product: {plan.stripe_product_id} | Price: {plan.stripe_price_id}
                        </p>
                    )}
                </div>

                <PlanForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    processing={processing}
                    onSubmit={handleSubmit}
                    submitLabel="Salvar Alterações"
                />
            </div>
        </AppLayout>
    );
}
