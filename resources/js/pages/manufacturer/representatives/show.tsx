import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Banknote,
    ClipboardList,
    Clock3,
    Package,
} from 'lucide-react';
import { useState } from 'react';
import { AppPageHeader } from '@/components/app-page-header';
import { MetricRail } from '@/components/metric-rail';
import { orderStatusTone } from '@/components/order-detail';
import { Pagination } from '@/components/pagination';
import {
    TrendChart,
    type ChartMode,
    type SeriesPoint,
} from '@/components/report-trend-chart';
import { RepresentativeShareLink } from '@/components/representative-share-link';
import { StatusLabel, type StatusLabelTone } from '@/components/status-label';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import manufacturer from '@/routes/manufacturer';

const periods = [
    { value: '30_days', label: '30 dias' },
    { value: '90_days', label: '90 dias' },
    { value: '12_months', label: '12 meses' },
] as const;
const affiliationStates: Record<
    string,
    { label: string; tone: StatusLabelTone }
> = {
    pending: { label: 'Em análise', tone: 'coral' },
    active: { label: 'Parceria ativa', tone: 'mineral' },
    rejected: { label: 'Solicitação recusada', tone: 'muted' },
    revoked: { label: 'Parceria encerrada', tone: 'muted' },
};
type Filters = {
    period: (typeof periods)[number]['value'];
    type: 'standard' | 'quote';
    status: string;
};
type Props = {
    representative: {
        id: number;
        name: string;
        email: string;
        status: string;
        source: string | null;
        requested_at: string | null;
        approved_at: string | null;
        rejected_at: string | null;
        revoked_at: string | null;
        application_note: string | null;
        catalog_url: string | null;
        profile: {
            whatsapp: string | null;
            city: string | null;
            state: string | null;
            territory: string | null;
            presentation: string | null;
        } | null;
    };
    filters: Filters;
    stats: {
        orders: number;
        in_progress: number;
        quotes: number;
        net_cents: number;
    };
    statuses: Array<{ value: string; label: string }>;
    series: SeriesPoint[];
    can_open_orders: boolean;
    history: {
        current_page: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
        data: Array<{
            id: number;
            customer_name: string;
            status: string;
            status_label: string;
            total_cents: number | null;
            created_at: string;
        }>;
    };
};

export default function RepresentativeDashboard({
    representative,
    filters,
    stats,
    statuses,
    series,
    can_open_orders,
    history,
}: Props) {
    const [mode, setMode] = useState<ChartMode>('revenue');
    const index = manufacturer.representatives.index();
    const current = manufacturer.representatives.show(representative.id);
    const affiliation = affiliationStates[representative.status] ?? {
        label: 'Sem status',
        tone: 'neutral',
    };
    const profile = representative.profile;
    const quoteView = filters.type === 'quote';
    const routeFor = (next: Partial<Filters>) =>
        manufacturer.representatives.show(representative.id, {
            query: { ...filters, ...next },
        });
    const tabs =
        'inline-flex min-h-10 items-center justify-center px-3 text-center text-sm font-semibold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ff4d3d]';
    const milestones = [
        ['Solicitação', representative.requested_at],
        ['Aprovação', representative.approved_at],
        ['Recusa', representative.rejected_at],
        ['Encerramento', representative.revoked_at],
    ];

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Representantes', href: index.url },
                { title: representative.name, href: current.url },
            ]}
        >
            <Head title={representative.name} />
            <div className="mx-auto w-full max-w-[1720px] px-5 py-8 sm:px-7 md:px-9 xl:px-12 2xl:px-14">
                <Link
                    href={index}
                    className="mb-7 inline-flex min-h-11 items-center gap-2 text-sm font-bold hover:text-[#b63329]"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" /> Voltar
                    para representantes
                </Link>
                <AppPageHeader
                    eyebrow="Rede comercial"
                    title={
                        <>
                            {representative.name}
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description={
                        <div className="flex flex-wrap items-center gap-3">
                            <StatusLabel tone={affiliation.tone}>
                                {affiliation.label}
                            </StatusLabel>
                            <span>Desempenho nesta marca</span>
                        </div>
                    }
                    aside={
                        <div
                            role="group"
                            aria-label="Período do dashboard"
                            className="flex w-fit max-w-full flex-wrap border border-border bg-background"
                        >
                            {periods.map(({ value, label }) => (
                                <Link
                                    key={value}
                                    href={routeFor({ period: value })}
                                    aria-current={
                                        filters.period === value
                                            ? 'true'
                                            : undefined
                                    }
                                    preserveState
                                    preserveScroll
                                    className={cn(
                                        tabs,
                                        filters.period === value
                                            ? 'bg-[#18181f] text-white'
                                            : 'hover:bg-accent',
                                    )}
                                >
                                    {label}
                                </Link>
                            ))}
                        </div>
                    }
                />
                <MetricRail
                    variant="open"
                    className="mt-7"
                    items={[
                        {
                            label: 'Pedidos recebidos',
                            value: stats.orders,
                            icon: (
                                <Package
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                        },
                        {
                            label: 'Em andamento',
                            value: stats.in_progress,
                            icon: (
                                <Clock3 className="size-4" aria-hidden="true" />
                            ),
                        },
                        {
                            label: 'Orçamentos',
                            value: stats.quotes,
                            icon: (
                                <ClipboardList
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                        },
                        {
                            label: 'Valor líquido atribuído',
                            value: (
                                <span className="block pr-5 text-lg leading-tight sm:text-xl">
                                    {formatCurrency(stats.net_cents / 100)}
                                </span>
                            ),
                            icon: (
                                <Banknote
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                        },
                    ]}
                />
                <div className="mt-7 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.35fr)] xl:items-start">
                    <div className="grid min-w-0 gap-6">
                        <section
                            className="min-w-0 border border-border bg-background p-5 sm:p-7"
                            aria-labelledby="representative-trend"
                        >
                            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h2
                                        id="representative-trend"
                                        className="font-zouth-display text-xl font-semibold"
                                    >
                                        Ritmo das vendas
                                    </h2>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Valor líquido de pedidos não cancelados.
                                        Não representa comissão ou pagamento
                                        recebido.
                                    </p>
                                </div>
                                <div
                                    role="group"
                                    aria-label="Métrica do gráfico"
                                    className="flex border border-border"
                                >
                                    {(
                                        [
                                            {
                                                value: 'revenue',
                                                label: 'Valor líquido',
                                            },
                                            {
                                                value: 'orders',
                                                label: 'Pedidos',
                                            },
                                        ] as const
                                    ).map(({ value, label }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            aria-pressed={mode === value}
                                            onClick={() => setMode(value)}
                                            className={cn(
                                                tabs,
                                                mode === value
                                                    ? 'bg-[#18181f] text-white'
                                                    : 'hover:bg-accent',
                                            )}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {stats.orders === 0 &&
                            !series.some(
                                (point) => point.previous_orders > 0,
                            ) ? (
                                <p className="border-t border-border py-6 text-sm text-muted-foreground">
                                    Sem vendas atribuídas neste período ou no
                                    anterior.
                                </p>
                            ) : (
                                <TrendChart series={series} mode={mode} />
                            )}
                        </section>
                        <section
                            className="min-w-0 border border-border bg-background"
                            aria-labelledby="representative-history"
                        >
                            <div className="grid gap-4 border-b border-border px-5 py-5 sm:px-7">
                                <h2
                                    id="representative-history"
                                    className="font-zouth-display text-xl font-semibold"
                                >
                                    Histórico comercial
                                </h2>
                                <div className="flex flex-wrap items-end justify-between gap-3">
                                    <div
                                        role="group"
                                        aria-label="Tipo de registro"
                                        className="flex border border-border"
                                    >
                                        <Link
                                            href={routeFor({
                                                type: 'standard',
                                                status: '',
                                            })}
                                            preserveState
                                            preserveScroll
                                            aria-current={
                                                !quoteView ? 'true' : undefined
                                            }
                                            className={cn(
                                                tabs,
                                                !quoteView
                                                    ? 'bg-[#18181f] text-white'
                                                    : 'hover:bg-accent',
                                            )}
                                        >
                                            Pedidos
                                        </Link>
                                        <Link
                                            href={routeFor({
                                                type: 'quote',
                                                status: '',
                                            })}
                                            preserveState
                                            preserveScroll
                                            aria-current={
                                                quoteView ? 'true' : undefined
                                            }
                                            className={cn(
                                                tabs,
                                                quoteView
                                                    ? 'bg-[#18181f] text-white'
                                                    : 'hover:bg-accent',
                                            )}
                                        >
                                            Orçamentos
                                        </Link>
                                    </div>
                                    <label className="grid gap-1 text-xs font-semibold">
                                        Status
                                        <select
                                            value={filters.status}
                                            onChange={(event) =>
                                                router.visit(
                                                    routeFor({
                                                        status: event
                                                            .currentTarget
                                                            .value,
                                                    }),
                                                    {
                                                        preserveState: true,
                                                        preserveScroll: true,
                                                    },
                                                )
                                            }
                                            className="min-h-10 max-w-full rounded-sm border border-input bg-background px-3 text-sm"
                                        >
                                            <option value="">
                                                Todos os status
                                            </option>
                                            {statuses.map((status) => (
                                                <option
                                                    key={status.value}
                                                    value={status.value}
                                                >
                                                    {status.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                            </div>
                            {history.data.length ? (
                                <ul className="divide-y divide-border">
                                    {history.data.map((order) => {
                                        const content = (
                                            <>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block font-semibold break-words">
                                                        {order.customer_name}
                                                    </span>
                                                    <span className="mt-1 block text-xs text-muted-foreground">
                                                        #
                                                        {String(
                                                            order.id,
                                                        ).padStart(4, '0')}{' '}
                                                        ·{' '}
                                                        {formatDateTime(
                                                            order.created_at,
                                                        )}
                                                    </span>
                                                </span>
                                                <StatusLabel
                                                    tone={
                                                        orderStatusTone[
                                                            order.status
                                                        ] ?? 'neutral'
                                                    }
                                                >
                                                    {order.status_label}
                                                </StatusLabel>
                                                <span className="text-sm font-semibold tabular-nums">
                                                    {order.total_cents === null
                                                        ? 'Sob consulta'
                                                        : `${quoteView ? 'Estimativa: ' : ''}${formatCurrency(order.total_cents / 100)}`}
                                                </span>
                                                {can_open_orders && (
                                                    <ArrowRight
                                                        className="size-4 shrink-0"
                                                        aria-hidden="true"
                                                    />
                                                )}
                                            </>
                                        );
                                        const row =
                                            'flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 sm:px-7';
                                        return (
                                            <li key={order.id}>
                                                {can_open_orders ? (
                                                    <Link
                                                        href={manufacturer.orders.show(
                                                            order.id,
                                                            {
                                                                query: {
                                                                    representative:
                                                                        representative.id,
                                                                    ...filters,
                                                                    page: history.current_page,
                                                                },
                                                            },
                                                        )}
                                                        className={cn(
                                                            row,
                                                            'hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ff4d3d]',
                                                        )}
                                                    >
                                                        {content}
                                                    </Link>
                                                ) : (
                                                    <div className={row}>
                                                        {content}
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p className="px-5 py-7 text-sm text-muted-foreground sm:px-7">
                                    {quoteView
                                        ? 'Nenhum orçamento'
                                        : 'Nenhum pedido'}{' '}
                                    para os filtros selecionados.
                                </p>
                            )}
                            {history.links.length > 3 && (
                                <div className="px-5 pb-5">
                                    <Pagination links={history.links} />
                                </div>
                            )}
                        </section>
                    </div>
                    <aside
                        className="min-w-0 border border-border bg-background p-5 sm:p-7"
                        aria-labelledby="representative-profile"
                    >
                        <h2
                            id="representative-profile"
                            className="font-zouth-display text-xl font-semibold"
                        >
                            Perfil comercial
                        </h2>
                        <dl className="mt-4 grid gap-4 text-sm">
                            {[
                                ['E-mail', representative.email],
                                ['WhatsApp profissional', profile?.whatsapp],
                                [
                                    'Cidade / UF',
                                    [profile?.city, profile?.state]
                                        .filter(Boolean)
                                        .join(' / '),
                                ],
                                ['Território', profile?.territory],
                                [
                                    'Origem',
                                    representative.source === 'invitation'
                                        ? 'Convite da marca'
                                        : 'Solicitação pela Vitrine',
                                ],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <dt className="text-xs font-semibold text-muted-foreground">
                                        {label}
                                    </dt>
                                    <dd className="mt-1 break-words">
                                        {value || 'Não informado'}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        {profile?.presentation && (
                            <p className="mt-5 text-sm leading-relaxed break-words whitespace-pre-wrap">
                                {profile.presentation}
                            </p>
                        )}
                        {representative.application_note && (
                            <p className="mt-4 border-l-2 border-[#ff4d3d] pl-3 text-sm break-words">
                                “{representative.application_note}”
                            </p>
                        )}
                        <h3 className="mt-6 border-t border-border pt-5 font-semibold">
                            Histórico do vínculo
                        </h3>
                        {milestones.some(([, date]) => date) ? (
                            <dl className="mt-3 grid gap-2 text-sm">
                                {milestones.map(
                                    ([label, date]) =>
                                        date && (
                                            <div
                                                key={label}
                                                className="flex flex-wrap justify-between gap-x-3"
                                            >
                                                <dt>{label}</dt>
                                                <dd className="text-muted-foreground">
                                                    {formatDateTime(date)}
                                                </dd>
                                            </div>
                                        ),
                                )}
                            </dl>
                        ) : (
                            <p className="mt-2 text-sm text-muted-foreground">
                                Sem datas registradas.
                            </p>
                        )}
                        {representative.catalog_url && (
                            <div className="mt-6">
                                <RepresentativeShareLink
                                    url={representative.catalog_url}
                                    label="Copiar link rastreável"
                                    compact
                                />
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </AppLayout>
    );
}
