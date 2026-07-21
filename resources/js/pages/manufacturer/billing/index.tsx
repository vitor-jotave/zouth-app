import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Boxes,
    Check,
    CircleGauge,
    ExternalLink,
    FileText,
    Infinity as InfinityIcon,
    PackageOpen,
    RefreshCw,
    ShoppingBag,
    UserRoundCheck,
    UsersRound,
    WalletCards,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import {
    cancel,
    checkout,
    portal,
    resume,
    swap,
} from '@/actions/App/Http/Controllers/Manufacturer/BillingController';
import { AppPageHeader } from '@/components/app-page-header';
import { StatusLabel, type StatusLabelTone } from '@/components/status-label';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, DowngradeViolation, SharedData } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Visão geral', href: '/dashboard' },
    { title: 'Assinatura', href: '/manufacturer/billing' },
];

type Plan = {
    id: number;
    name: string;
    description: string | null;
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

type CapacityMeasureProps = {
    icon: ReactNode;
    label: string;
    item: UsageItem;
    remainingLabel: (remaining: number) => string;
};

const limitLabels: Record<string, string> = {
    products: 'Produtos',
    users: 'Equipe',
    reps: 'Representantes',
    orders_this_month: 'Pedidos no mês',
    files_gb: 'Arquivos',
    data_mb: 'Dados',
};

function formatLimit(value: number | null): string {
    return value === null ? 'Ilimitado' : String(value);
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(new Date(value));
}

function daysUntil(value: string): number {
    const difference = new Date(value).getTime() - Date.now();

    return Math.max(0, Math.ceil(difference / 86_400_000));
}

function hasCompleteUsage(
    usage: Usage | Record<string, never>,
): usage is Usage {
    return (
        'products' in usage &&
        'users' in usage &&
        'reps' in usage &&
        'orders_this_month' in usage
    );
}

function subscriptionStatus(subscription: Subscription | null): {
    label: string;
    tone: StatusLabelTone;
    detail: string;
} {
    if (!subscription) {
        return {
            label: 'Sem assinatura',
            tone: 'muted',
            detail: 'Escolha o ritmo ideal para começar.',
        };
    }

    if (subscription.on_trial) {
        const remainingDays = subscription.trial_ends_at
            ? daysUntil(subscription.trial_ends_at)
            : null;

        return {
            label: 'Em teste',
            tone: 'coral',
            detail:
                remainingDays === null
                    ? 'Seu período de teste está ativo.'
                    : remainingDays === 1
                      ? '1 dia de teste restante'
                      : `${remainingDays} dias de teste restantes`,
        };
    }

    if (subscription.cancelled && subscription.on_grace_period) {
        return {
            label: 'Encerramento agendado',
            tone: 'coral',
            detail: subscription.ends_at
                ? `Acesso preservado até ${formatDate(subscription.ends_at)}`
                : 'Seu acesso continua até o fim do período atual.',
        };
    }

    if (subscription.active) {
        return {
            label: 'Ativa',
            tone: 'mineral',
            detail: 'Cobrança mensal automática',
        };
    }

    return {
        label: 'Aguardando confirmação',
        tone: 'muted',
        detail: 'A cobrança está confirmando sua assinatura.',
    };
}

function CapacityMeasure({
    icon,
    label,
    item,
    remainingLabel,
}: CapacityMeasureProps) {
    const percentage = Math.min(item.percentage ?? 0, 100);
    const remaining =
        item.limit === null ? null : Math.max(item.limit - item.current, 0);

    return (
        <div className="grid gap-3 border-t border-border py-4 first:border-t-0 sm:grid-cols-[2.25rem_minmax(7rem,0.65fr)_minmax(10rem,1.15fr)_auto] sm:items-center sm:gap-4">
            <span className="flex size-9 items-center justify-center border border-border text-muted-foreground">
                {icon}
            </span>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <div className="min-w-0">
                {item.limit === null ? (
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#2e705a]">
                        <InfinityIcon className="size-4" aria-hidden="true" />
                        Sem limite
                    </div>
                ) : (
                    <div
                        className="h-1.5 bg-[#e7e3dc]"
                        role="progressbar"
                        aria-label={`${label}: ${item.current} de ${item.limit}`}
                        aria-valuemin={0}
                        aria-valuemax={item.limit}
                        aria-valuenow={item.current}
                    >
                        <div
                            className={cn(
                                'h-full transition-[width] duration-500',
                                percentage >= 90
                                    ? 'bg-[#ff4d3d]'
                                    : 'bg-[#2e705a]',
                            )}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                )}
            </div>
            <div className="text-left sm:text-right">
                <p className="font-zouth-display text-sm font-semibold text-foreground tabular-nums">
                    {item.current} de {formatLimit(item.limit)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    {remaining === null
                        ? 'Espaço livre para crescer'
                        : remainingLabel(remaining)}
                </p>
            </div>
        </div>
    );
}

function PlanLimit({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-semibold text-foreground tabular-nums">
                {value}
            </dd>
        </div>
    );
}

export default function BillingIndex({
    plans,
    currentPlanId,
    subscription,
    usage,
}: Props) {
    const { flash } = usePage<SharedData>().props;
    const [planToChange, setPlanToChange] = useState<Plan | null>(null);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

    const currentPlan = useMemo(
        () => plans.find((plan) => plan.id === currentPlanId) ?? null,
        [currentPlanId, plans],
    );
    const status = subscriptionStatus(subscription);
    const downgradeViolations = flash?.downgrade_violations;
    const usageAvailable = hasCompleteUsage(usage);

    const isDowngrade =
        planToChange !== null && currentPlan !== null
            ? planToChange.sort_order < currentPlan.sort_order
            : false;

    function handlePlanChange() {
        if (!planToChange) {
            return;
        }

        router.post(
            swap.url(),
            { plan_id: planToChange.id },
            {
                preserveScroll: true,
                onSuccess: () => setPlanToChange(null),
            },
        );
    }

    function handleCancel() {
        router.post(
            cancel.url(),
            {},
            {
                preserveScroll: true,
                onSuccess: () => setCancelDialogOpen(false),
            },
        );
    }

    function handleResume() {
        router.post(resume.url(), {}, { preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Assinatura" />

            <div className="mx-auto w-full max-w-[1440px] px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
                <AppPageHeader
                    eyebrow="Gestão"
                    title={
                        <>
                            Sua assinatura
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description="Acompanhe os limites de uso da sua assinatura."
                    className="lg:grid-cols-1"
                />

                <section className="grid border-b border-border lg:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.22fr)]">
                    <div className="border-b border-border px-1 py-8 sm:px-6 lg:border-r lg:border-b-0 lg:px-8 lg:py-9">
                        <p className="text-[0.68rem] font-bold tracking-[0.2em] text-muted-foreground uppercase">
                            {currentPlan ? 'Plano atual' : 'Periodo de testes'}
                        </p>
                        <h2 className="mt-4 font-zouth-display text-[clamp(2.4rem,4vw,3.6rem)] leading-[0.92] font-semibold tracking-[-0.055em] text-foreground">
                            {currentPlan?.name ?? 'Escolha seu plano'}
                        </h2>
                        {currentPlan ? (
                            <p className="mt-5 font-zouth-display text-[clamp(2rem,3.5vw,3.4rem)] leading-none font-semibold tracking-[-0.045em] text-foreground tabular-nums">
                                {currentPlan.formatted_price}
                                <span className="ml-1 text-base font-medium tracking-normal text-muted-foreground">
                                    /mês
                                </span>
                            </p>
                        ) : (
                            <p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground">
                                Compare os planos abaixo e escolha a que atende
                                a sua coleção.
                            </p>
                        )}

                        {subscription && (
                            <div className="mt-7 flex flex-wrap items-center gap-3 border-y border-border py-4">
                                <StatusLabel tone={status.tone}>
                                    {status.label}
                                </StatusLabel>
                                <span className="text-sm font-semibold text-[#d9382b]">
                                    {status.detail}
                                </span>
                            </div>
                        )}

                        <div className="mt-7 grid gap-3">
                            {subscription?.cancelled &&
                            subscription.on_grace_period ? (
                                <Button
                                    size="lg"
                                    className="min-h-12 w-full justify-between rounded-none px-5 font-bold"
                                    onClick={handleResume}
                                >
                                    Retomar assinatura
                                    <RefreshCw className="size-4" />
                                </Button>
                            ) : subscription ? (
                                <Button
                                    size="lg"
                                    className="min-h-12 w-full justify-between rounded-none px-5 font-bold"
                                    asChild
                                >
                                    <a href={portal.url()}>
                                        Gerenciar cobrança
                                        <ArrowRight className="size-4" />
                                    </a>
                                </Button>
                            ) : null}

                            {subscription && (
                                <a
                                    href={portal.url()}
                                    className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-foreground underline decoration-[#98968d] underline-offset-4 hover:decoration-[#ff4d3d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]"
                                >
                                    Pagamentos, faturas e notas
                                    <ExternalLink className="size-3.5" />
                                </a>
                            )}
                        </div>
                    </div>

                    <div className="px-1 py-8 sm:px-6 lg:px-10 lg:py-9">
                        <div className="flex items-start gap-4">
                            <span className="flex size-11 shrink-0 items-center justify-center bg-[#2e705a]/10 text-[#2e705a]">
                                <CircleGauge className="size-5" />
                            </span>
                            <div>
                                <p className="text-[0.68rem] font-bold tracking-[0.2em] text-foreground uppercase">
                                    Limites do plano
                                </p>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    Veja quanto da sua estrutura já está em
                                    movimento e quanto ainda pode crescer.
                                </p>
                            </div>
                        </div>

                        {usageAvailable ? (
                            <div className="mt-7">
                                <CapacityMeasure
                                    icon={<Boxes className="size-4" />}
                                    label="Produtos"
                                    item={usage.products}
                                    remainingLabel={(remaining) =>
                                        remaining === 1
                                            ? '1 espaço livre'
                                            : `${remaining} espaços livres`
                                    }
                                />
                                <CapacityMeasure
                                    icon={<ShoppingBag className="size-4" />}
                                    label="Pedidos no mês"
                                    item={usage.orders_this_month}
                                    remainingLabel={(remaining) =>
                                        remaining === 1
                                            ? '1 pedido disponível'
                                            : `${remaining} pedidos disponíveis`
                                    }
                                />
                                <CapacityMeasure
                                    icon={<UsersRound className="size-4" />}
                                    label="Equipe"
                                    item={usage.users}
                                    remainingLabel={(remaining) =>
                                        remaining === 1
                                            ? '1 lugar livre'
                                            : `${remaining} lugares livres`
                                    }
                                />
                                <CapacityMeasure
                                    icon={<UserRoundCheck className="size-4" />}
                                    label="Representantes"
                                    item={usage.reps}
                                    remainingLabel={(remaining) =>
                                        remaining === 1
                                            ? '1 vínculo disponível'
                                            : `${remaining} vínculos disponíveis`
                                    }
                                />
                            </div>
                        ) : (
                            <div className="mt-7 border-y border-border py-6">
                                <PackageOpen className="size-6 text-muted-foreground" />
                                <p className="mt-4 font-zouth-display text-lg font-semibold text-foreground">
                                    Os limites não se aplicam ao periodo de
                                    testes.
                                </p>
                                <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                                    Assim que a assinatura for confirmada, você
                                    acompanha aqui o espaço disponível para
                                    produtos, pedidos, equipe e representantes.
                                </p>
                            </div>
                        )}
                    </div>
                </section>

                {downgradeViolations && downgradeViolations.length > 0 && (
                    <section className="mt-8 border border-[#ff4d3d] bg-[#ff4d3d]/[0.035] p-5 sm:p-7">
                        <div className="flex items-start gap-4">
                            <span className="flex size-11 shrink-0 items-center justify-center bg-[#ff4d3d]/10 text-[#d9382b]">
                                <AlertTriangle className="size-5" />
                            </span>
                            <div>
                                <h2 className="font-zouth-display text-xl font-semibold tracking-[-0.03em] text-foreground">
                                    Este plano ainda não comporta sua operação.
                                </h2>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                    Reduza os itens abaixo antes de escolher um
                                    ritmo menor.
                                </p>
                                <ul className="mt-5 grid gap-2 text-sm text-foreground sm:grid-cols-2">
                                    {downgradeViolations.map(
                                        (violation: DowngradeViolation) => (
                                            <li
                                                key={violation.limit_type}
                                                className="flex items-center justify-between gap-4 border-t border-[#ff4d3d]/30 pt-2"
                                            >
                                                <span>
                                                    {limitLabels[
                                                        violation.limit_type
                                                    ] ?? violation.limit_type}
                                                </span>
                                                <strong className="tabular-nums">
                                                    {violation.current} de{' '}
                                                    {violation.limit}
                                                </strong>
                                            </li>
                                        ),
                                    )}
                                </ul>
                            </div>
                        </div>
                    </section>
                )}

                <section className="py-10 lg:py-12">
                    <div className="flex flex-col gap-4 border-b border-border pb-7 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-[0.68rem] font-bold tracking-[0.2em] text-[#ff4d3d] uppercase">
                                Planos Disponíveis
                            </p>
                            <h2 className="mt-3 max-w-3xl font-zouth-display text-[clamp(2rem,3vw,2.8rem)] leading-[0.98] font-semibold tracking-[-0.05em] text-foreground">
                                Escolha de planos.
                            </h2>
                        </div>
                        <p className="max-w-md text-sm leading-6 text-muted-foreground">
                            Mude de plano quando precisar. A escolha atual fica
                            marcada e as diferenças aparecem lado a lado.
                        </p>
                    </div>

                    <div className="grid border-b border-border xl:grid-cols-3">
                        {plans.map((plan, index) => {
                            const isCurrent = plan.id === currentPlanId;
                            const isHigher = currentPlan
                                ? plan.sort_order > currentPlan.sort_order
                                : true;

                            return (
                                <article
                                    key={plan.id}
                                    className={cn(
                                        'relative flex min-h-[22rem] flex-col border-t border-border px-5 py-7 first:border-t-0 sm:px-7 xl:border-t-0 xl:border-l xl:first:border-l-0',
                                        isCurrent &&
                                            'z-[1] outline-1 -outline-offset-1 outline-[#2e705a]',
                                        index === 0 && 'xl:border-l-0',
                                    )}
                                >
                                    {isCurrent && (
                                        <span className="absolute top-0 left-0 bg-[#2e705a] px-3 py-1 text-[0.62rem] font-bold tracking-[0.12em] text-white uppercase">
                                            Plano atual
                                        </span>
                                    )}
                                    <div
                                        className={cn(
                                            'flex items-start justify-between gap-5',
                                            isCurrent && 'pt-5',
                                        )}
                                    >
                                        <div>
                                            <h3 className="font-zouth-display text-2xl font-semibold tracking-[-0.035em] text-foreground">
                                                {plan.name}
                                            </h3>
                                            <p className="mt-2 max-w-xs text-sm leading-5 text-muted-foreground">
                                                {plan.description}
                                            </p>
                                        </div>
                                        <p className="shrink-0 font-zouth-display text-lg font-semibold text-foreground tabular-nums">
                                            {plan.formatted_price}
                                            <span className="text-xs font-medium text-muted-foreground">
                                                /mês
                                            </span>
                                        </p>
                                    </div>

                                    <dl className="mt-8 grid gap-3 border-t border-border pt-5">
                                        <PlanLimit
                                            label="Produtos"
                                            value={formatLimit(
                                                plan.max_products,
                                            )}
                                        />
                                        <PlanLimit
                                            label="Pedidos no mês"
                                            value={formatLimit(
                                                plan.max_orders_per_month,
                                            )}
                                        />
                                        <PlanLimit
                                            label="Equipe"
                                            value={formatLimit(plan.max_users)}
                                        />
                                        <PlanLimit
                                            label="Representantes"
                                            value={formatLimit(plan.max_reps)}
                                        />
                                    </dl>

                                    <div className="mt-auto pt-8">
                                        {isCurrent ? (
                                            <p className="flex min-h-11 items-center gap-2 text-sm font-semibold text-[#2e705a]">
                                                <Check className="size-4" />
                                                Plano em uso
                                            </p>
                                        ) : subscription?.active ? (
                                            <button
                                                type="button"
                                                className={cn(
                                                    'group inline-flex min-h-11 items-center gap-3 text-sm font-bold underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]',
                                                    isHigher
                                                        ? 'text-[#d9382b] hover:underline'
                                                        : 'text-foreground hover:underline',
                                                )}
                                                onClick={() =>
                                                    setPlanToChange(plan)
                                                }
                                            >
                                                {isHigher
                                                    ? 'Ganhar mais fôlego'
                                                    : `Reduzir para ${plan.name}`}
                                                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                                            </button>
                                        ) : plan.has_stripe ? (
                                            <a
                                                href={checkout.url(plan.id)}
                                                className="group inline-flex min-h-11 items-center gap-3 text-sm font-bold text-[#d9382b] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]"
                                            >
                                                Escolher {plan.name}
                                                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                                            </a>
                                        ) : (
                                            <span className="text-sm font-semibold text-muted-foreground">
                                                Em breve
                                            </span>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>

                {subscription && (
                    <section className="grid border-y border-border md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <a
                            href={portal.url()}
                            className="group grid min-h-24 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-5 py-5 hover:bg-[#e7e3dc]/35 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d] sm:px-7 md:border-r md:border-border"
                        >
                            <WalletCards className="size-5 text-muted-foreground" />
                            <span>
                                <span className="block font-zouth-display text-sm font-semibold text-foreground">
                                    Cobrança e documentos
                                </span>
                                <span className="mt-1 block text-xs text-muted-foreground">
                                    Forma de pagamento, faturas e notas fiscais.
                                </span>
                            </span>
                            <ExternalLink className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                        </a>

                        {subscription.active && !subscription.cancelled ? (
                            <button
                                type="button"
                                className="group grid min-h-24 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 border-t border-border px-5 py-5 text-left hover:bg-[#e7e3dc]/35 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d] sm:px-7 md:border-t-0"
                                onClick={() => setCancelDialogOpen(true)}
                            >
                                <FileText className="size-5 text-muted-foreground" />
                                <span>
                                    <span className="block font-zouth-display text-sm font-semibold text-foreground">
                                        Encerrar assinatura
                                    </span>
                                    <span className="mt-1 block text-xs text-muted-foreground">
                                        Seu acesso continua até o fim do
                                        período.
                                    </span>
                                </span>
                                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                            </button>
                        ) : (
                            <div className="grid min-h-24 grid-cols-[auto_minmax(0,1fr)] items-center gap-4 border-t border-border px-5 py-5 sm:px-7 md:border-t-0">
                                <RefreshCw className="size-5 text-muted-foreground" />
                                <span>
                                    <span className="block font-zouth-display text-sm font-semibold text-foreground">
                                        Assinatura protegida
                                    </span>
                                    <span className="mt-1 block text-xs text-muted-foreground">
                                        Você pode retomar enquanto o acesso
                                        estiver ativo.
                                    </span>
                                </span>
                            </div>
                        )}
                    </section>
                )}
            </div>

            <Dialog
                open={planToChange !== null}
                onOpenChange={(open) => !open && setPlanToChange(null)}
            >
                <DialogContent className="rounded-none border-[#18181f] shadow-none sm:max-w-xl">
                    <DialogHeader>
                        <p className="text-[0.68rem] font-bold tracking-[0.2em] text-[#ff4d3d] uppercase">
                            Troca de plano
                        </p>
                        <DialogTitle className="font-zouth-display text-3xl leading-tight tracking-[-0.045em]">
                            {isDowngrade
                                ? 'Um ritmo menor cabe na operação atual?'
                                : 'Pronto para ganhar mais fôlego?'}
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-sm leading-6">
                            {planToChange && (
                                <>
                                    Você vai solicitar a mudança para o plano{' '}
                                    <strong className="text-foreground">
                                        {planToChange.name}
                                    </strong>{' '}
                                    por{' '}
                                    <strong className="text-foreground">
                                        {planToChange.formatted_price}/mês
                                    </strong>
                                    . A cobrança confirma a alteração em
                                    seguida.
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    {isDowngrade && (
                        <div className="border-l-2 border-[#ff4d3d] bg-[#ff4d3d]/[0.035] px-4 py-3 text-sm leading-6 text-muted-foreground">
                            Antes de concluir, a Zouth verifica se seus
                            produtos, pedidos e equipe cabem no novo limite.
                        </div>
                    )}
                    <DialogFooter className="mt-3 sm:justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-11 rounded-none"
                            onClick={() => setPlanToChange(null)}
                        >
                            Voltar
                        </Button>
                        <Button
                            type="button"
                            className="min-h-11 rounded-none px-6 font-bold"
                            onClick={handlePlanChange}
                        >
                            Confirmar mudança
                            <ArrowRight className="size-4" />
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogContent className="rounded-none border-[#18181f] shadow-none sm:max-w-xl">
                    <DialogHeader>
                        <p className="text-[0.68rem] font-bold tracking-[0.2em] text-[#ff4d3d] uppercase">
                            Encerrar assinatura
                        </p>
                        <DialogTitle className="font-zouth-display text-3xl leading-tight tracking-[-0.045em]">
                            Sua coleção não precisa parar agora.
                        </DialogTitle>
                        <DialogDescription className="pt-2 text-sm leading-6">
                            Ao encerrar, o acesso continua até o fim do período
                            atual. Depois disso, catálogo, pedidos e gestão
                            ficam indisponíveis até uma nova assinatura.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-3 sm:justify-between">
                        <Button
                            type="button"
                            variant="outline"
                            className="min-h-11 rounded-none"
                            onClick={() => setCancelDialogOpen(false)}
                        >
                            Manter assinatura
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            className="min-h-11 rounded-none px-6"
                            onClick={handleCancel}
                        >
                            Confirmar encerramento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
