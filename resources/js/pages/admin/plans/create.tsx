import { Head, useForm } from '@inertiajs/react';
import PlanForm from '@/components/plan-form';
import type { PlanFormData } from '@/components/plan-form';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/dashboard' },
    { title: 'Planos', href: '/admin/plans' },
    { title: 'Novo Plano', href: '/admin/plans/create' },
];

export default function PlansCreate() {
    const { data, setData, post, processing, errors } = useForm<PlanFormData>({
        name: '',
        description: '',
        is_active: true,
        sort_order: 0,
        monthly_price: '',
        trial_days: 0,
        max_reps: '',
        max_products: '',
        max_orders_per_month: '',
        max_users: '',
        max_data_mb: '',
        max_files_gb: '',
        allow_csv_import: false,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/admin/plans');
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Novo Plano" />

            <div className="space-y-6 p-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Novo Plano</h2>
                    <p className="text-muted-foreground">
                        Crie um novo plano de assinatura.
                    </p>
                </div>

                <PlanForm
                    data={data}
                    setData={setData}
                    errors={errors}
                    processing={processing}
                    onSubmit={handleSubmit}
                    submitLabel="Criar Plano"
                />
            </div>
        </AppLayout>
    );
}
