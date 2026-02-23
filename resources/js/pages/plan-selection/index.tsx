import { Head } from '@inertiajs/react';
import { Check, X } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

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

type Props = {
    manufacturer: {
        id: number;
        name: string;
    };
    plans: Plan[];
    checkoutUrls: Record<number, string>;
};

function formatLimit(value: number | null): string {
    return value === null ? 'Ilimitado' : String(value);
}

function FeatureRow({ label, value }: { label: string; value: string }) {
    return (
        <li className="flex items-center justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
        </li>
    );
}

export default function PlanSelectionIndex({ manufacturer, plans, checkoutUrls }: Props) {
    return (
        <div className="min-h-svh bg-background">
            <Head title={`Selecionar Plano — ${manufacturer.name}`} />

            {/* Header */}
            <header className="border-b bg-background/95 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md">
                        <AppLogoIcon className="size-9 fill-current text-[var(--foreground)]" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Configuração de conta</p>
                        <p className="text-sm font-medium">{manufacturer.name}</p>
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="mx-auto max-w-7xl px-6 py-12">
                {/* Title section */}
                <div className="mb-10 text-center">
                    <h1 className="text-3xl font-bold tracking-tight">
                        Bem-vindo, {manufacturer.name}!
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Escolha o plano ideal para a sua operação. Sem compromisso — você pode trocar a qualquer momento.
                    </p>
                </div>

                {/* Plans grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {plans.map((plan) => (
                        <Card key={plan.id} className="flex flex-col">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle>{plan.name}</CardTitle>
                                    {plan.trial_days > 0 && (
                                        <Badge variant="secondary">
                                            {plan.trial_days} dias grátis
                                        </Badge>
                                    )}
                                </div>
                                <CardDescription>{plan.description}</CardDescription>
                                <div className="pt-2">
                                    <span className="text-3xl font-bold">
                                        {plan.formatted_price}
                                    </span>
                                    <span className="text-muted-foreground">/mês</span>
                                </div>
                            </CardHeader>

                            <CardContent className="flex-1">
                                <ul className="space-y-2 text-sm">
                                    <FeatureRow label="Representantes" value={formatLimit(plan.max_reps)} />
                                    <FeatureRow label="Produtos" value={formatLimit(plan.max_products)} />
                                    <FeatureRow label="Pedidos/mês" value={formatLimit(plan.max_orders_per_month)} />
                                    <FeatureRow label="Usuários" value={formatLimit(plan.max_users)} />
                                    <FeatureRow
                                        label="Armazenamento"
                                        value={plan.max_data_mb ? `${plan.max_data_mb} MB` : 'Ilimitado'}
                                    />
                                    <FeatureRow
                                        label="Arquivos"
                                        value={plan.max_files_gb ? `${plan.max_files_gb} GB` : 'Ilimitado'}
                                    />
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
                                {plan.has_stripe ? (
                                    <Button className="w-full" asChild>
                                        <a href={checkoutUrls[plan.id]}>
                                            Selecionar {plan.name}
                                        </a>
                                    </Button>
                                ) : (
                                    <Button className="w-full" disabled>
                                        Em breve
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>

                <p className="mt-10 text-center text-xs text-muted-foreground">
                    Este link é válido por 3 dias. Para obter um novo link, entre em contato com o suporte.
                </p>
            </main>
        </div>
    );
}
