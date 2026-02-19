import { Head, router, usePage } from '@inertiajs/react';
import { AlertTriangle, Check, Crown, ExternalLink, Infinity, X } from 'lucide-react';
import { checkout } from '@/actions/App/Http/Controllers/Manufacturer/BillingController';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, DowngradeViolation, SharedData } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Assinatura', href: '/manufacturer/billing' },
];

type Plan = {
    id: number;
    name: string;
    description: string | null;
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
    has_stripe: boolean;
};

type Subscription = {
    stripe_status: string;
    on_trial: boolean;
    trial_ends_at: string | null;
    ends_at: string | null;
    on_grace_period: boolean;
    cancelled: boolean;
    active: boolean;
};

type UsageItem = {
    current: number;
    limit: number | null;
    percentage: number | null;
};

type Usage = {
    products: UsageItem;
    users: UsageItem;
    reps: UsageItem;
    orders_this_month: UsageItem;
    files_gb: UsageItem;
    data_mb: UsageItem;
};

type Props = {
    plans: Plan[];
    currentPlanId: number | null;
    subscription: Subscription | null;
    usage: Usage | Record<string, never>;
};

function formatLimit(value: number | null): string {
    return value === null ? 'Ilimitado' : String(value);
}

function UsageBar({ label, item, formatter }: { label: string; item: UsageItem; formatter?: (v: number) => string }) {
    const percentage = item.percentage ?? 0;
    const isWarning = percentage >= 80;
    const isDanger = percentage >= 95;
    const fmt = formatter ?? String;

    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">
                    {fmt(item.current)} / {item.limit !== null ? fmt(item.limit) : <Infinity className="inline h-4 w-4" />}
                </span>
            </div>
            {item.limit !== null && (
                <div className="bg-secondary h-2 w-full rounded-full">
                    <div
                        className={`h-2 rounded-full transition-all ${
                            isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-primary'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
            )}
        </div>
    );
}

const limitLabels: Record<string, string> = {
    products: 'Produtos',
    users: 'Usuários',
    reps: 'Representantes',
    orders_this_month: 'Pedidos (mês)',
    files_gb: 'Arquivos (GB)',
    data_mb: 'Dados (MB)',
};

export default function BillingIndex({ plans, currentPlanId, subscription, usage }: Props) {
    const { flash } = usePage<SharedData>().props;
    const downgradeViolations = flash?.downgrade_violations;

    function handleSwap(planId: number) {
        router.post('/manufacturer/billing/swap', { plan_id: planId }, { preserveScroll: true });
    }

    function handleCancel() {
        if (confirm('Tem certeza que deseja cancelar sua assinatura?')) {
            router.post('/manufacturer/billing/cancel', {}, { preserveScroll: true });
        }
    }

    function handleResume() {
        router.post('/manufacturer/billing/resume', {}, { preserveScroll: true });
    }

    const hasUsage = Object.keys(usage).length > 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Assinatura" />

            <div className="space-y-8 p-6">
                {/* Header */}
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Assinatura</h2>
                    <p className="text-muted-foreground">
                        Gerencie seu plano e assinatura.
                    </p>
                </div>

                {/* Current Subscription Status */}
                {subscription && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Crown className="h-5 w-5" />
                                Status da Assinatura
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground text-sm">Status:</span>
                                <Badge variant={subscription.active ? 'default' : 'secondary'}>
                                    {subscription.on_trial
                                        ? 'Em Trial'
                                        : subscription.cancelled
                                            ? 'Cancelada'
                                            : subscription.active
                                                ? 'Ativa'
                                                : subscription.stripe_status}
                                </Badge>
                            </div>

                            {subscription.on_trial && subscription.trial_ends_at && (
                                <p className="text-sm text-muted-foreground">
                                    Trial expira em:{' '}
                                    <span className="font-medium text-foreground">
                                        {new Date(subscription.trial_ends_at).toLocaleDateString('pt-BR')}
                                    </span>
                                </p>
                            )}

                            {subscription.cancelled && subscription.on_grace_period && subscription.ends_at && (
                                <p className="text-sm text-muted-foreground">
                                    Acesso até:{' '}
                                    <span className="font-medium text-foreground">
                                        {new Date(subscription.ends_at).toLocaleDateString('pt-BR')}
                                    </span>
                                </p>
                            )}
                        </CardContent>
                        <CardFooter className="gap-2">
                            {subscription.cancelled && subscription.on_grace_period && (
                                <Button onClick={handleResume}>
                                    Retomar Assinatura
                                </Button>
                            )}
                            {subscription.active && !subscription.cancelled && (
                                <Button variant="destructive" onClick={handleCancel}>
                                    Cancelar Assinatura
                                </Button>
                            )}
                            <Button variant="outline" asChild>
                                <a href="/manufacturer/billing/portal">
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Portal de Pagamento
                                </a>
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Usage */}
                {hasUsage && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Uso Atual</CardTitle>
                            <CardDescription>Consumo do seu plano neste mês.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <UsageBar label="Produtos" item={usage.products} />
                            <UsageBar label="Usuários" item={usage.users} />
                            <UsageBar label="Representantes" item={usage.reps} />
                            <UsageBar label="Pedidos (mês)" item={usage.orders_this_month} />
                            {usage.files_gb && <UsageBar label="Arquivos (GB)" item={usage.files_gb} formatter={(v) => `${v} GB`} />}
                            {usage.data_mb && <UsageBar label="Dados (MB)" item={usage.data_mb} formatter={(v) => `${v} MB`} />}
                        </CardContent>
                    </Card>
                )}

                {/* Downgrade blocked */}
                {downgradeViolations && downgradeViolations.length > 0 && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Downgrade bloqueado</AlertTitle>
                        <AlertDescription>
                            <p className="mb-2">
                                Seu uso atual excede os limites do plano selecionado. Exclua itens suficientes e tente novamente:
                            </p>
                            <ul className="list-disc pl-4 space-y-1">
                                {downgradeViolations.map((v: DowngradeViolation) => (
                                    <li key={v.limit_type}>
                                        <strong>{limitLabels[v.limit_type] ?? v.limit_type}</strong>: {v.current} cadastrados, limite do plano é {v.limit}
                                    </li>
                                ))}
                            </ul>
                        </AlertDescription>
                    </Alert>
                )}

                {/* Plans Grid */}
                <div>
                    <h3 className="mb-4 text-lg font-medium">Planos Disponíveis</h3>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {plans.map((plan) => {
                            const isCurrent = plan.id === currentPlanId;

                            return (
                                <Card
                                    key={plan.id}
                                    className={isCurrent ? 'ring-primary ring-2' : ''}
                                >
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle>{plan.name}</CardTitle>
                                            {isCurrent && (
                                                <Badge variant="default">Atual</Badge>
                                            )}
                                        </div>
                                        <CardDescription>{plan.description}</CardDescription>
                                        <div className="pt-2">
                                            <span className="text-3xl font-bold">
                                                {plan.formatted_price}
                                            </span>
                                            <span className="text-muted-foreground">/mês</span>
                                        </div>
                                        {plan.trial_days > 0 && (
                                            <p className="text-sm text-green-600">
                                                {plan.trial_days} dias grátis para testar
                                            </p>
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-2 text-sm">
                                            <FeatureRow label="Representantes" value={formatLimit(plan.max_reps)} />
                                            <FeatureRow label="Produtos" value={formatLimit(plan.max_products)} />
                                            <FeatureRow label="Pedidos/mês" value={formatLimit(plan.max_orders_per_month)} />
                                            <FeatureRow label="Usuários" value={formatLimit(plan.max_users)} />
                                            <FeatureRow label="Armazenamento" value={plan.max_data_mb ? `${plan.max_data_mb} MB` : 'Ilimitado'} />
                                            <FeatureRow label="Arquivos" value={plan.max_files_gb ? `${plan.max_files_gb} GB` : 'Ilimitado'} />
                                            <li className="flex items-center gap-2">
                                                {plan.allow_csv_import ? (
                                                    <Check className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <X className="h-4 w-4 text-muted-foreground" />
                                                )}
                                                <span className={!plan.allow_csv_import ? 'text-muted-foreground' : ''}>
                                                    Importação CSV
                                                </span>
                                            </li>
                                        </ul>
                                    </CardContent>
                                    <CardFooter>
                                        {isCurrent ? (
                                            <Button className="w-full" disabled>
                                                Plano Atual
                                            </Button>
                                        ) : subscription?.active ? (
                                            <Button
                                                className="w-full"
                                                variant="outline"
                                                onClick={() => handleSwap(plan.id)}
                                            >
                                                Trocar para {plan.name}
                                            </Button>
                                        ) : (
                                            plan.has_stripe ? (
                                                <Button className="w-full" asChild>
                                                    <a href={checkout.url(plan.id)}>
                                                        Selecionar
                                                    </a>
                                                </Button>
                                            ) : (
                                                <Button className="w-full" disabled>
                                                    Em breve
                                                </Button>
                                            )
                                        )}
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

function FeatureRow({ label, value }: { label: string; value: string }) {
    return (
        <li className="flex items-center justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </li>
    );
}
