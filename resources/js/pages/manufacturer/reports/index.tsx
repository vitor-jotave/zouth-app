import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowRight,
    ArrowUpRight,
    CalendarRange,
    ChartNoAxesCombined,
    CircleDollarSign,
    Eye,
    MapPin,
    Minus,
    PackageCheck,
    PackageOpen,
    ShoppingBag,
    Store,
    UsersRound,
} from 'lucide-react';
import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
    type ReactNode,
} from 'react';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import manufacturer from '@/routes/manufacturer';
import type { BreadcrumbItem } from '@/types';

type ReportTab =
    | 'overview'
    | 'collection'
    | 'customers'
    | 'representatives'
    | 'catalog';
type ChartMode = 'revenue' | 'orders';

interface Period {
    key: string;
    start: string;
    end: string;
    label: string;
    comparison_label: string;
}

interface Summary {
    net_revenue_cents: number;
    net_revenue_change_percent: number | null;
    orders_count: number;
    orders_change_percent: number | null;
    average_order_value_cents: number;
    average_order_value_change_percent: number | null;
    conversion_rate: number;
    conversion_change_points: number;
    units_sold: number;
    discount_cents: number;
}

interface SeriesPoint {
    date: string;
    label: string;
    revenue_cents: number;
    orders: number;
    previous_revenue_cents: number;
    previous_orders: number;
}

interface ProductPerformance {
    id: number | null;
    name: string;
    sku: string | null;
    category: string;
    image_url: string | null;
    units: number;
    revenue_cents: number;
    stock: number | null;
    stock_status: 'unknown' | 'out' | 'low' | 'healthy';
    trend: number[];
}

interface ReportData {
    period: Period;
    summary: Summary;
    series: SeriesPoint[];
    insights: Array<{
        title: string;
        description: string;
        section: ReportTab;
    }>;
    top_products: ProductPerformance[];
    collection: {
        active_products: number;
        units_sold: number;
        stock_units: number;
        out_of_stock: number;
        low_stock: number;
        categories: Array<{
            name: string;
            revenue_cents: number;
            units: number;
        }>;
        inventory_risk: ProductPerformance[];
    };
    customers: {
        buyers_count: number;
        new_buyers: number;
        returning_buyers: number;
        repeat_rate: number;
        average_reorder_days: number | null;
        inactive_count: number;
        top: Array<{
            name: string;
            state: string | null;
            city: string | null;
            orders: number;
            revenue_cents: number;
            last_order_at: string;
        }>;
        regions: Array<{
            state: string;
            orders: number;
            revenue_cents: number;
        }>;
    };
    representatives: {
        active_count: number;
        attributed_orders: number;
        attributed_revenue_cents: number;
        share_percent: number;
        unassigned_orders: number;
        ranking: Array<{
            id: number;
            name: string;
            orders: number;
            revenue_cents: number;
            average_order_value_cents: number;
        }>;
    };
    catalog: {
        visits: number;
        visits_change_percent: number | null;
        orders: number;
        conversion_rate: number;
        previous_conversion_rate: number;
        sources: Array<{
            source: string;
            visits: number;
            orders: number;
            revenue_cents: number;
            conversion_rate: number;
        }>;
    };
    operations: {
        status_distribution: Array<{
            status: string;
            label: string;
            count: number;
        }>;
        cancellation_rate: number;
        average_confirmation_hours: number | null;
        average_shipping_hours: number | null;
        attention_orders: number;
    };
}

interface Props {
    manufacturer: { name: string };
    report: ReportData;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Visão geral', href: dashboard().url },
    { title: 'Relatórios', href: manufacturer.reports.index().url },
];

const tabs: Array<{ value: ReportTab; label: string }> = [
    { value: 'overview', label: 'Panorama' },
    { value: 'collection', label: 'Coleção' },
    { value: 'customers', label: 'Lojistas' },
    { value: 'representatives', label: 'Representantes' },
    { value: 'catalog', label: 'Catálogo' },
];

const periodOptions = [
    { value: '7_days', label: 'Últimos 7 dias' },
    { value: '30_days', label: 'Últimos 30 dias' },
    { value: '90_days', label: 'Últimos 90 dias' },
    { value: 'current_month', label: 'Este mês' },
    { value: 'current_year', label: 'Este ano' },
    { value: 'custom', label: 'Período personalizado' },
];

function formatMoney(cents: number, compact = false): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        notation: compact ? 'compact' : 'standard',
        maximumFractionDigits: compact ? 1 : 2,
    }).format(cents / 100);
}

function formatInteger(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
    })
        .format(new Date(`${value}T12:00:00`))
        .replace('.', '');
}

function formatHours(value: number | null): string {
    if (value === null) {
        return 'Sem histórico';
    }

    if (value < 24) {
        return `${value.toLocaleString('pt-BR')}h`;
    }

    return `${(value / 24).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`;
}

function Delta({
    value,
    suffix = '%',
}: {
    value: number | null;
    suffix?: string;
}) {
    if (value === null) {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#2e705a]">
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
                Novo no período
            </span>
        );
    }

    if (value === 0) {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <Minus className="size-3.5" aria-hidden="true" />
                Estável
            </span>
        );
    }

    const positive = value > 0;
    const Icon = positive ? ArrowUpRight : ArrowDownRight;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 text-xs font-semibold',
                positive ? 'text-[#2e705a]' : 'text-[#b63329]',
            )}
        >
            <Icon className="size-3.5" aria-hidden="true" />
            {positive ? '+' : ''}
            {value.toLocaleString('pt-BR')}
            {suffix}
        </span>
    );
}

function MetricLedger({ report }: { report: ReportData }) {
    const metrics = [
        {
            label: 'Faturamento líquido',
            value: formatMoney(report.summary.net_revenue_cents),
            delta: report.summary.net_revenue_change_percent,
            note: report.summary.discount_cents
                ? `${formatMoney(report.summary.discount_cents)} em descontos`
                : 'Pedidos não cancelados',
        },
        {
            label: 'Pedidos',
            value: formatInteger(report.summary.orders_count),
            delta: report.summary.orders_change_percent,
            note: `${formatInteger(report.summary.units_sold)} peças movimentadas`,
        },
        {
            label: 'Ticket médio',
            value: formatMoney(report.summary.average_order_value_cents),
            delta: report.summary.average_order_value_change_percent,
            note: 'Valor líquido por pedido',
        },
        {
            label: 'Conversão estimada',
            value: `${report.summary.conversion_rate.toLocaleString('pt-BR')}%`,
            delta: report.summary.conversion_change_points,
            suffix: ' p.p.',
            note: 'Pedidos ÷ aberturas do catálogo',
        },
    ];

    return (
        <dl className="grid border-y border-[#cfcac1] bg-[#f6f4f0] sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric, index) => (
                <div
                    key={metric.label}
                    className={cn(
                        'min-w-0 px-4 py-4 sm:px-6 xl:px-7',
                        index % 2 === 1 && 'border-l border-[#cfcac1]',
                        index > 1 && 'border-t border-[#cfcac1] xl:border-t-0',
                        index > 0 && 'xl:border-l',
                    )}
                >
                    <dt className="text-[0.64rem] font-bold tracking-[0.17em] text-[#77736c] uppercase">
                        {metric.label}
                    </dt>
                    <dd className="mt-2.5 truncate font-zouth-display text-[clamp(1.55rem,2.25vw,2.15rem)] leading-none font-semibold tracking-[-0.05em] text-[#18181f] tabular-nums">
                        {metric.value}
                    </dd>
                    <dd className="mt-2.5 flex min-h-7 flex-col items-start gap-1">
                        <Delta value={metric.delta} suffix={metric.suffix} />
                        <span className="text-[0.68rem] leading-4 text-[#77736c]">
                            {metric.note}
                        </span>
                    </dd>
                </div>
            ))}
        </dl>
    );
}

function TrendChart({
    series,
    mode,
}: {
    series: SeriesPoint[];
    mode: ChartMode;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;

        if (!canvas || !wrap || series.length === 0) {
            return;
        }

        let frame = 0;
        let animationFrame = 0;
        const context = canvas.getContext('2d');

        if (!context) {
            return;
        }

        const draw = (progress = 1) => {
            const width = wrap.clientWidth;
            const height = 190;
            const ratio = window.devicePixelRatio || 1;
            canvas.width = Math.floor(width * ratio);
            canvas.height = Math.floor(height * ratio);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            context.clearRect(0, 0, width, height);

            const padding = { top: 20, right: 12, bottom: 24, left: 12 };
            const chartWidth = Math.max(
                1,
                width - padding.left - padding.right,
            );
            const chartHeight = height - padding.top - padding.bottom;
            const current = series.map((point) =>
                mode === 'revenue' ? point.revenue_cents : point.orders,
            );
            const previous = series.map((point) =>
                mode === 'revenue'
                    ? point.previous_revenue_cents
                    : point.previous_orders,
            );
            const maximum = Math.max(1, ...current, ...previous) * 1.12;
            const x = (index: number) =>
                padding.left +
                (series.length === 1
                    ? chartWidth / 2
                    : (index / (series.length - 1)) * chartWidth);
            const y = (value: number) =>
                padding.top + chartHeight - (value / maximum) * chartHeight;

            context.strokeStyle = '#d8d3ca';
            context.lineWidth = 1;
            for (let line = 0; line <= 4; line += 1) {
                const lineY = padding.top + (chartHeight / 4) * line;
                context.beginPath();
                context.moveTo(padding.left, lineY);
                context.lineTo(width - padding.right, lineY);
                context.stroke();
            }

            context.save();
            context.setLineDash([5, 7]);
            context.strokeStyle = '#969189';
            context.lineWidth = 1.5;
            context.beginPath();
            previous.forEach((value, index) => {
                const pointX = x(index);
                const pointY = y(value);
                if (index === 0) context.moveTo(pointX, pointY);
                else context.lineTo(pointX, pointY);
            });
            context.stroke();
            context.restore();

            const visiblePoints = Math.max(
                1,
                Math.ceil(current.length * progress),
            );
            const gradient = context.createLinearGradient(
                0,
                padding.top,
                0,
                height - padding.bottom,
            );
            gradient.addColorStop(0, 'rgba(255, 77, 61, 0.22)');
            gradient.addColorStop(1, 'rgba(255, 77, 61, 0)');
            context.beginPath();
            current.slice(0, visiblePoints).forEach((value, index) => {
                const pointX = x(index);
                const pointY = y(value);
                if (index === 0) context.moveTo(pointX, pointY);
                else context.lineTo(pointX, pointY);
            });
            const lastIndex = visiblePoints - 1;
            context.lineTo(x(lastIndex), height - padding.bottom);
            context.lineTo(x(0), height - padding.bottom);
            context.closePath();
            context.fillStyle = gradient;
            context.fill();

            context.beginPath();
            current.slice(0, visiblePoints).forEach((value, index) => {
                const pointX = x(index);
                const pointY = y(value);
                if (index === 0) context.moveTo(pointX, pointY);
                else context.lineTo(pointX, pointY);
            });
            context.strokeStyle = '#ff4d3d';
            context.lineWidth = 2.6;
            context.lineJoin = 'round';
            context.lineCap = 'round';
            context.stroke();

            if (hoverIndex !== null && series[hoverIndex]) {
                const pointX = x(hoverIndex);
                const pointY = y(current[hoverIndex]);
                context.strokeStyle = '#18181f';
                context.lineWidth = 1;
                context.beginPath();
                context.moveTo(pointX, padding.top);
                context.lineTo(pointX, height - padding.bottom);
                context.stroke();
                context.fillStyle = '#ff4d3d';
                context.beginPath();
                context.arc(pointX, pointY, 4.5, 0, Math.PI * 2);
                context.fill();
                context.strokeStyle = '#f6f4f0';
                context.lineWidth = 2;
                context.stroke();
            }
        };

        const animate = () => {
            frame += 1;
            draw(Math.min(1, frame / 24));
            if (frame < 24) animationFrame = requestAnimationFrame(animate);
        };
        const observer = new ResizeObserver(() => draw(1));
        observer.observe(wrap);
        animate();

        return () => {
            observer.disconnect();
            cancelAnimationFrame(animationFrame);
        };
    }, [hoverIndex, mode, series]);

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (series.length === 0) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const position = Math.max(
            0,
            Math.min(rect.width, event.clientX - rect.left),
        );
        setHoverIndex(
            Math.round(
                (position / rect.width) * Math.max(0, series.length - 1),
            ),
        );
    };
    const hovered = hoverIndex === null ? null : series[hoverIndex];

    return (
        <div
            ref={wrapRef}
            className="relative mt-4 min-h-[190px] w-full"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoverIndex(null)}
        >
            <canvas
                ref={canvasRef}
                role="img"
                aria-label={`Evolução de ${mode === 'revenue' ? 'faturamento' : 'pedidos'} no período`}
                className="block w-full touch-pan-y"
            />
            {hovered && hoverIndex !== null && (
                <div
                    className="pointer-events-none absolute top-2 z-10 min-w-36 border border-[#18181f] bg-[#18181f] px-3 py-2 text-[#f6f4f0] shadow-xl"
                    style={{
                        left: `${Math.max(0, Math.min(78, (hoverIndex / Math.max(1, series.length - 1)) * 100))}%`,
                    }}
                >
                    <p className="text-[0.61rem] font-bold tracking-[0.14em] text-[#cac4ba] uppercase">
                        {formatDate(hovered.date)}
                    </p>
                    <p className="mt-1 font-zouth-display text-base font-semibold tabular-nums">
                        {mode === 'revenue'
                            ? formatMoney(hovered.revenue_cents)
                            : `${hovered.orders} pedidos`}
                    </p>
                </div>
            )}
            <div className="absolute inset-x-3 bottom-0 flex justify-between text-[0.64rem] text-[#77736c]">
                {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
                    const point =
                        series[Math.round((series.length - 1) * fraction)];
                    return point ? (
                        <span key={fraction}>{point.label}</span>
                    ) : null;
                })}
            </div>
            <table className="sr-only">
                <caption>Dados diários do ritmo da coleção</caption>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Faturamento</th>
                        <th>Pedidos</th>
                    </tr>
                </thead>
                <tbody>
                    {series.map((point) => (
                        <tr key={point.date}>
                            <td>{point.date}</td>
                            <td>{formatMoney(point.revenue_cents)}</td>
                            <td>{point.orders}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Sparkline({ values }: { values: number[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;
        const ratio = window.devicePixelRatio || 1;
        const width = 90;
        const height = 30;
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, width, height);
        const max = Math.max(1, ...values);
        context.beginPath();
        values.forEach((value, index) => {
            const x = (index / Math.max(1, values.length - 1)) * width;
            const y = height - 3 - (value / max) * (height - 6);
            if (index === 0) context.moveTo(x, y);
            else context.lineTo(x, y);
        });
        context.strokeStyle = '#ff4d3d';
        context.lineWidth = 1.8;
        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.stroke();
    }, [values]);

    return (
        <canvas
            ref={canvasRef}
            className="h-[30px] w-[90px]"
            role="img"
            aria-label={`Movimento recente: ${values.join(', ')}`}
        />
    );
}

function SectionHeading({
    eyebrow,
    title,
    description,
    aside,
}: {
    eyebrow: string;
    title: string;
    description?: string;
    aside?: ReactNode;
}) {
    return (
        <header className="flex flex-col gap-5 border-b border-[#cfcac1] pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <p className="text-[0.64rem] font-bold tracking-[0.21em] text-[#ff4d3d] uppercase">
                    {eyebrow}
                </p>
                <h2 className="mt-3 font-zouth-display text-[clamp(1.85rem,3vw,2.8rem)] leading-none font-semibold tracking-[-0.05em] text-[#18181f]">
                    {title}
                    <span className="text-[#ff4d3d]">.</span>
                </h2>
                {description && (
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-[#77736c]">
                        {description}
                    </p>
                )}
            </div>
            {aside}
        </header>
    );
}

function EmptyReport({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-56 flex-col items-center justify-center border-y border-[#cfcac1] px-6 text-center">
            <ChartNoAxesCombined
                className="size-7 text-[#ff4d3d]"
                aria-hidden="true"
            />
            <p className="mt-5 max-w-md font-zouth-display text-xl font-semibold tracking-[-0.03em] text-[#18181f]">
                {children}
            </p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#77736c]">
                Assim que a coleção começar a circular, este espaço ganha vida.
            </p>
        </div>
    );
}

function Overview({
    report,
    onOpenTab,
}: {
    report: ReportData;
    onOpenTab: (tab: ReportTab) => void;
}) {
    const [chartMode, setChartMode] = useState<ChartMode>('revenue');

    return (
        <div className="space-y-8">
            <MetricLedger report={report} />

            <div className="grid min-w-0 gap-0 border-y border-[#cfcac1] xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.65fr)]">
                <section className="min-w-0 px-4 py-5 sm:px-7 xl:border-r xl:border-[#cfcac1]">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-[0.64rem] font-bold tracking-[0.2em] text-[#77736c] uppercase">
                                Desempenho diário
                            </p>
                            <h2 className="mt-3 font-zouth-display text-2xl font-semibold tracking-[-0.04em] text-[#18181f] sm:text-3xl">
                                Ritmo da coleção
                                <span className="text-[#ff4d3d]">.</span>
                            </h2>
                        </div>
                        <div
                            className="inline-grid w-fit grid-cols-2 border border-[#cfcac1]"
                            aria-label="Métrica do gráfico"
                        >
                            {(['revenue', 'orders'] as ChartMode[]).map(
                                (mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setChartMode(mode)}
                                        className={cn(
                                            'min-h-10 px-4 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]',
                                            chartMode === mode
                                                ? 'bg-[#18181f] text-[#f6f4f0]'
                                                : 'text-[#77736c] hover:bg-white/60 hover:text-[#18181f]',
                                        )}
                                    >
                                        {mode === 'revenue'
                                            ? 'Faturamento'
                                            : 'Pedidos'}
                                    </button>
                                ),
                            )}
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#77736c]">
                        <span className="inline-flex items-center gap-2">
                            <span className="h-0.5 w-5 bg-[#ff4d3d]" />
                            Período atual
                        </span>
                        <span className="inline-flex items-center gap-2">
                            <span className="w-5 border-t border-dashed border-[#969189]" />
                            Período anterior
                        </span>
                    </div>
                    <TrendChart series={report.series} mode={chartMode} />
                </section>

                <aside className="px-5 py-5 sm:px-7">
                    <p className="text-[0.64rem] font-bold tracking-[0.2em] text-[#77736c] uppercase">
                        Leituras do período
                    </p>
                    <div className="mt-5 divide-y divide-[#cfcac1] border-y border-[#cfcac1]">
                        {report.insights.map((insight, index) => (
                            <button
                                key={`${insight.title}-${index}`}
                                type="button"
                                onClick={() => onOpenTab(insight.section)}
                                className="group grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] gap-3 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]"
                            >
                                <span className="font-zouth-display text-sm font-semibold text-[#ff4d3d] tabular-nums">
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                <span>
                                    <span className="block font-zouth-display text-base font-semibold tracking-[-0.02em] text-[#18181f]">
                                        {insight.title}
                                    </span>
                                    <span className="mt-2 block text-xs leading-5 text-[#77736c]">
                                        {insight.description}
                                    </span>
                                </span>
                                <ArrowRight
                                    className="mt-0.5 size-4 text-[#77736c] transition-transform group-hover:translate-x-1 group-hover:text-[#ff4d3d]"
                                    aria-hidden="true"
                                />
                            </button>
                        ))}
                    </div>
                </aside>
            </div>

            <ProductRanking products={report.top_products} />
            <Operations report={report} />
        </div>
    );
}

function ProductRanking({ products }: { products: ProductPerformance[] }) {
    return (
        <section>
            <SectionHeading
                eyebrow="Movimento por peça"
                title="Peças que puxaram a coleção"
                description="O ranking combina unidades e faturamento sem esconder a posição atual do estoque."
            />
            {products.length === 0 ? (
                <EmptyReport>
                    Nenhuma peça foi vendida neste período.
                </EmptyReport>
            ) : (
                <div className="divide-y divide-[#cfcac1] border-b border-[#cfcac1]">
                    {products.map((product, index) => (
                        <article
                            key={`${product.id ?? product.sku}-${index}`}
                            className="grid min-w-0 gap-4 py-4 sm:grid-cols-[2.5rem_4.5rem_minmax(160px,1fr)_auto_auto] sm:items-center sm:gap-5 lg:grid-cols-[2.5rem_4.5rem_minmax(210px,1fr)_minmax(90px,0.45fr)_minmax(120px,0.55fr)_minmax(100px,0.42fr)_100px]"
                        >
                            <span className="font-zouth-display text-sm font-semibold text-[#77736c] tabular-nums">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <div className="h-20 w-[4.5rem] overflow-hidden bg-[#e7e3dc]">
                                {product.image_url ? (
                                    <img
                                        src={product.image_url}
                                        alt=""
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <span className="flex h-full items-center justify-center text-[#98968d]">
                                        <PackageOpen
                                            className="size-5"
                                            aria-hidden="true"
                                        />
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0 sm:col-span-2 lg:col-span-1">
                                <h3 className="truncate font-zouth-display text-base font-semibold tracking-[-0.025em] text-[#18181f]">
                                    {product.name}
                                </h3>
                                <p className="mt-1 truncate text-xs text-[#77736c]">
                                    {product.category} ·{' '}
                                    {product.sku || 'Sem SKU'}
                                </p>
                            </div>
                            <ProductFact
                                label="Saída"
                                value={`${formatInteger(product.units)} un.`}
                            />
                            <ProductFact
                                label="Faturamento"
                                value={formatMoney(product.revenue_cents)}
                            />
                            <ProductFact
                                label="Estoque"
                                value={
                                    product.stock === null
                                        ? 'Histórico'
                                        : `${formatInteger(product.stock)} un.`
                                }
                                tone={
                                    product.stock_status === 'out' ||
                                    product.stock_status === 'low'
                                        ? 'attention'
                                        : 'default'
                                }
                            />
                            <div className="hidden justify-self-end lg:block">
                                <Sparkline values={product.trend} />
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
}

function ProductFact({
    label,
    value,
    tone = 'default',
}: {
    label: string;
    value: string;
    tone?: 'default' | 'attention';
}) {
    return (
        <div>
            <p className="text-[0.59rem] font-bold tracking-[0.13em] text-[#77736c] uppercase">
                {label}
            </p>
            <p
                className={cn(
                    'mt-1 font-zouth-display text-sm font-semibold tabular-nums',
                    tone === 'attention' ? 'text-[#b63329]' : 'text-[#18181f]',
                )}
            >
                {value}
            </p>
        </div>
    );
}

function Operations({ report }: { report: ReportData }) {
    const total = Math.max(
        1,
        report.operations.status_distribution.reduce(
            (sum, item) => sum + item.count,
            0,
        ),
    );

    return (
        <section className="pb-2">
            <SectionHeading
                eyebrow="Operação comercial"
                title="Do pedido à entrega"
                description="Onde os pedidos estão e quanto tempo a operação leva para fazê-los avançar."
            />
            <div className="grid border-b border-[#cfcac1] lg:grid-cols-[1.35fr_0.65fr]">
                <div className="py-7 lg:border-r lg:border-[#cfcac1] lg:pr-8">
                    <div
                        className="flex h-4 w-full overflow-hidden bg-[#e7e3dc]"
                        aria-label="Distribuição dos pedidos por etapa"
                    >
                        {report.operations.status_distribution.map(
                            (status, index) => (
                                <span
                                    key={status.status}
                                    className={cn(
                                        index === 0
                                            ? 'bg-[#ff4d3d]'
                                            : index === 5
                                              ? 'bg-[#98968d]'
                                              : 'bg-[#18181f]',
                                    )}
                                    style={{
                                        width: `${(status.count / total) * 100}%`,
                                        opacity: 1 - index * 0.08,
                                    }}
                                    title={`${status.label}: ${status.count}`}
                                />
                            ),
                        )}
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
                        {report.operations.status_distribution.map((status) => (
                            <div
                                key={status.status}
                                className="flex items-baseline justify-between gap-3 border-b border-[#ded9d0] pb-2"
                            >
                                <span className="text-xs text-[#77736c]">
                                    {status.label}
                                </span>
                                <strong className="font-zouth-display text-sm font-semibold text-[#18181f] tabular-nums">
                                    {status.count}
                                </strong>
                            </div>
                        ))}
                    </div>
                </div>
                <dl className="grid grid-cols-2 divide-x divide-[#cfcac1] lg:grid-cols-1 lg:divide-x-0 lg:divide-y">
                    <OperationFact
                        label="Até confirmar"
                        value={formatHours(
                            report.operations.average_confirmation_hours,
                        )}
                    />
                    <OperationFact
                        label="Até enviar"
                        value={formatHours(
                            report.operations.average_shipping_hours,
                        )}
                    />
                    <OperationFact
                        label="Cancelamentos"
                        value={`${report.operations.cancellation_rate.toLocaleString('pt-BR')}%`}
                    />
                    <OperationFact
                        label="Pedem atenção"
                        value={String(report.operations.attention_orders)}
                        attention={report.operations.attention_orders > 0}
                    />
                </dl>
            </div>
        </section>
    );
}

function OperationFact({
    label,
    value,
    attention = false,
}: {
    label: string;
    value: string;
    attention?: boolean;
}) {
    return (
        <div className="px-5 py-5 lg:px-7">
            <dt className="text-[0.61rem] font-bold tracking-[0.14em] text-[#77736c] uppercase">
                {label}
            </dt>
            <dd
                className={cn(
                    'mt-2 font-zouth-display text-xl font-semibold tracking-[-0.03em] tabular-nums',
                    attention ? 'text-[#b63329]' : 'text-[#18181f]',
                )}
            >
                {value}
            </dd>
        </div>
    );
}

function CollectionReport({ report }: { report: ReportData }) {
    const maxCategory = Math.max(
        1,
        ...report.collection.categories.map(
            (category) => category.revenue_cents,
        ),
    );

    return (
        <div className="space-y-12">
            <SimpleMetricRail
                items={[
                    {
                        label: 'Peças vendidas',
                        value: formatInteger(report.collection.units_sold),
                        icon: <ShoppingBag className="size-4" />,
                    },
                    {
                        label: 'Produtos ativos',
                        value: formatInteger(report.collection.active_products),
                        icon: <PackageCheck className="size-4" />,
                    },
                    {
                        label: 'Estoque disponível',
                        value: `${formatInteger(report.collection.stock_units)} un.`,
                        icon: <PackageOpen className="size-4" />,
                    },
                    {
                        label: 'Pontos de atenção',
                        value: formatInteger(
                            report.collection.low_stock +
                                report.collection.out_of_stock,
                        ),
                        icon: <AlertTriangle className="size-4" />,
                        attention:
                            report.collection.low_stock +
                                report.collection.out_of_stock >
                            0,
                    },
                ]}
            />
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(310px,0.9fr)]">
                <section>
                    <SectionHeading
                        eyebrow="Participação"
                        title="Categorias em movimento"
                    />
                    {report.collection.categories.length === 0 ? (
                        <EmptyReport>
                            Ainda não há categorias em movimento.
                        </EmptyReport>
                    ) : (
                        <div className="divide-y divide-[#cfcac1] border-b border-[#cfcac1]">
                            {report.collection.categories.map(
                                (category, index) => (
                                    <article
                                        key={category.name}
                                        className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-4 py-5"
                                    >
                                        <span className="font-zouth-display text-xs font-semibold text-[#98968d]">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <div>
                                            <div className="flex items-baseline justify-between gap-4">
                                                <h3 className="font-zouth-display text-base font-semibold text-[#18181f]">
                                                    {category.name}
                                                </h3>
                                                <span className="text-xs text-[#77736c]">
                                                    {category.units} un.
                                                </span>
                                            </div>
                                            <div className="mt-3 h-1.5 bg-[#e7e3dc]">
                                                <div
                                                    className="h-full bg-[#ff4d3d]"
                                                    style={{
                                                        width: `${Math.max(2, (category.revenue_cents / maxCategory) * 100)}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <strong className="font-zouth-display text-sm font-semibold text-[#18181f] tabular-nums">
                                            {formatMoney(
                                                category.revenue_cents,
                                            )}
                                        </strong>
                                    </article>
                                ),
                            )}
                        </div>
                    )}
                </section>
                <section>
                    <SectionHeading
                        eyebrow="Reposição"
                        title="Estoque que pede olhar"
                    />
                    {report.collection.inventory_risk.length === 0 ? (
                        <div className="border-b border-[#cfcac1] py-10 text-sm leading-6 text-[#77736c]">
                            Nenhuma peça vendida está em risco imediato de
                            ruptura.
                        </div>
                    ) : (
                        <div className="divide-y divide-[#cfcac1] border-b border-[#cfcac1]">
                            {report.collection.inventory_risk.map((product) => (
                                <article
                                    key={`${product.id}-${product.sku}`}
                                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-5"
                                >
                                    <span className="flex size-10 items-center justify-center bg-[#f0d8d4] text-[#b63329]">
                                        <AlertTriangle
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <div className="min-w-0">
                                        <h3 className="truncate font-zouth-display text-sm font-semibold text-[#18181f]">
                                            {product.name}
                                        </h3>
                                        <p className="mt-1 text-xs text-[#77736c]">
                                            {product.units} peças vendidas
                                        </p>
                                    </div>
                                    <strong className="font-zouth-display text-sm font-semibold text-[#b63329]">
                                        {product.stock ?? 0} un.
                                    </strong>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
            <ProductRanking products={report.top_products} />
        </div>
    );
}

function CustomersReport({ report }: { report: ReportData }) {
    const maxRegion = Math.max(
        1,
        ...report.customers.regions.map((region) => region.revenue_cents),
    );

    return (
        <div className="space-y-12">
            <SimpleMetricRail
                items={[
                    {
                        label: 'Lojistas no período',
                        value: formatInteger(report.customers.buyers_count),
                        icon: <Store className="size-4" />,
                    },
                    {
                        label: 'Novos compradores',
                        value: formatInteger(report.customers.new_buyers),
                        icon: <ArrowUpRight className="size-4" />,
                    },
                    {
                        label: 'Taxa de recompra',
                        value: `${report.customers.repeat_rate.toLocaleString('pt-BR')}%`,
                        icon: <ShoppingBag className="size-4" />,
                    },
                    {
                        label: 'Intervalo de recompra',
                        value:
                            report.customers.average_reorder_days === null
                                ? 'Em formação'
                                : `${report.customers.average_reorder_days} dias`,
                        icon: <CalendarRange className="size-4" />,
                    },
                ]}
            />
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.18fr)_minmax(300px,0.82fr)]">
                <section>
                    <SectionHeading
                        eyebrow="Relacionamento"
                        title="Lojistas que mais movimentaram"
                    />
                    {report.customers.top.length === 0 ? (
                        <EmptyReport>
                            Nenhum lojista comprou neste período.
                        </EmptyReport>
                    ) : (
                        <div className="divide-y divide-[#cfcac1] border-b border-[#cfcac1]">
                            {report.customers.top.map((customer, index) => (
                                <article
                                    key={`${customer.name}-${index}`}
                                    className="grid gap-3 py-5 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto_auto] sm:items-center sm:gap-6"
                                >
                                    <span className="font-zouth-display text-xs font-semibold text-[#98968d]">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <div className="min-w-0">
                                        <h3 className="truncate font-zouth-display text-base font-semibold text-[#18181f]">
                                            {customer.name}
                                        </h3>
                                        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[#77736c]">
                                            <MapPin
                                                className="size-3"
                                                aria-hidden="true"
                                            />
                                            {[customer.city, customer.state]
                                                .filter(Boolean)
                                                .join(' · ') ||
                                                'Praça não informada'}
                                        </p>
                                    </div>
                                    <span className="text-xs text-[#77736c]">
                                        {customer.orders}{' '}
                                        {customer.orders === 1
                                            ? 'pedido'
                                            : 'pedidos'}
                                    </span>
                                    <strong className="font-zouth-display text-sm font-semibold text-[#18181f] tabular-nums">
                                        {formatMoney(customer.revenue_cents)}
                                    </strong>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
                <section>
                    <SectionHeading
                        eyebrow="Praças"
                        title="Onde a coleção circula"
                    />
                    <div className="divide-y divide-[#cfcac1] border-b border-[#cfcac1]">
                        {report.customers.regions.map((region) => (
                            <article key={region.state} className="py-5">
                                <div className="flex items-baseline justify-between gap-5">
                                    <div>
                                        <h3 className="font-zouth-display text-base font-semibold text-[#18181f]">
                                            {region.state}
                                        </h3>
                                        <p className="mt-1 text-xs text-[#77736c]">
                                            {region.orders} pedidos
                                        </p>
                                    </div>
                                    <strong className="font-zouth-display text-sm font-semibold text-[#18181f]">
                                        {formatMoney(region.revenue_cents)}
                                    </strong>
                                </div>
                                <div className="mt-3 h-1 bg-[#e7e3dc]">
                                    <div
                                        className="h-full bg-[#18181f]"
                                        style={{
                                            width: `${Math.max(2, (region.revenue_cents / maxRegion) * 100)}%`,
                                        }}
                                    />
                                </div>
                            </article>
                        ))}
                        {report.customers.regions.length === 0 && (
                            <p className="py-10 text-sm text-[#77736c]">
                                As primeiras praças aparecerão aqui.
                            </p>
                        )}
                    </div>
                    <div className="mt-7 flex items-start gap-3 border-l-2 border-[#ff4d3d] pl-4 text-sm leading-6 text-[#77736c]">
                        <UsersRound
                            className="mt-1 size-4 shrink-0 text-[#ff4d3d]"
                            aria-hidden="true"
                        />
                        <p>
                            <strong className="font-semibold text-[#18181f]">
                                {report.customers.inactive_count} lojistas
                            </strong>{' '}
                            estão há mais de 60 dias sem comprar e podem merecer
                            uma retomada comercial.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}

function RepresentativesReport({ report }: { report: ReportData }) {
    return (
        <div className="space-y-12">
            <SimpleMetricRail
                items={[
                    {
                        label: 'Rede ativa',
                        value: formatInteger(
                            report.representatives.active_count,
                        ),
                        icon: <UsersRound className="size-4" />,
                    },
                    {
                        label: 'Pedidos atribuídos',
                        value: formatInteger(
                            report.representatives.attributed_orders,
                        ),
                        icon: <ShoppingBag className="size-4" />,
                    },
                    {
                        label: 'Faturamento da rede',
                        value: formatMoney(
                            report.representatives.attributed_revenue_cents,
                        ),
                        icon: <CircleDollarSign className="size-4" />,
                    },
                    {
                        label: 'Participação da rede',
                        value: `${report.representatives.share_percent.toLocaleString('pt-BR')}%`,
                        icon: <ChartNoAxesCombined className="size-4" />,
                    },
                ]}
            />
            <section>
                <SectionHeading
                    eyebrow="Rede comercial"
                    title="Quem está colocando a coleção em movimento"
                    description={`${report.representatives.unassigned_orders} pedidos do período ainda não têm representante atribuído.`}
                />
                {report.representatives.ranking.length === 0 ? (
                    <EmptyReport>
                        Nenhum pedido foi atribuído à rede neste período.
                    </EmptyReport>
                ) : (
                    <div className="divide-y divide-[#cfcac1] border-b border-[#cfcac1]">
                        {report.representatives.ranking.map(
                            (representative, index) => (
                                <article
                                    key={representative.id}
                                    className="grid gap-4 py-6 sm:grid-cols-[3rem_minmax(0,1fr)_auto_auto_auto] sm:items-center sm:gap-7"
                                >
                                    <span className="font-zouth-display text-2xl font-semibold text-[#ff4d3d] tabular-nums">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <div>
                                        <h3 className="font-zouth-display text-lg font-semibold tracking-[-0.03em] text-[#18181f]">
                                            {representative.name}
                                        </h3>
                                        <p className="mt-1 text-xs text-[#77736c]">
                                            Representante ativo no período
                                        </p>
                                    </div>
                                    <ProductFact
                                        label="Pedidos"
                                        value={String(representative.orders)}
                                    />
                                    <ProductFact
                                        label="Ticket médio"
                                        value={formatMoney(
                                            representative.average_order_value_cents,
                                        )}
                                    />
                                    <ProductFact
                                        label="Faturamento"
                                        value={formatMoney(
                                            representative.revenue_cents,
                                        )}
                                    />
                                </article>
                            ),
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}

function CatalogReport({ report }: { report: ReportData }) {
    return (
        <div className="space-y-12">
            <SimpleMetricRail
                items={[
                    {
                        label: 'Aberturas do catálogo',
                        value: formatInteger(report.catalog.visits),
                        icon: <Eye className="size-4" />,
                        delta: report.catalog.visits_change_percent,
                    },
                    {
                        label: 'Pedidos',
                        value: formatInteger(report.catalog.orders),
                        icon: <ShoppingBag className="size-4" />,
                    },
                    {
                        label: 'Conversão estimada',
                        value: `${report.catalog.conversion_rate.toLocaleString('pt-BR')}%`,
                        icon: <ChartNoAxesCombined className="size-4" />,
                    },
                    {
                        label: 'Período anterior',
                        value: `${report.catalog.previous_conversion_rate.toLocaleString('pt-BR')}%`,
                        icon: <CalendarRange className="size-4" />,
                    },
                ]}
            />
            <section>
                <SectionHeading
                    eyebrow="Origem da atenção"
                    title="Canais que trouxeram movimento"
                    description="A conversão é uma leitura estimada entre pedidos e aberturas do catálogo. Uma mesma pessoa pode abrir o link mais de uma vez."
                />
                {report.catalog.sources.length === 0 ? (
                    <EmptyReport>
                        O catálogo ainda não teve aberturas neste período.
                    </EmptyReport>
                ) : (
                    <div className="divide-y divide-[#cfcac1] border-b border-[#cfcac1]">
                        <div className="hidden grid-cols-[minmax(0,1fr)_repeat(4,minmax(95px,0.45fr))] gap-6 py-3 text-[0.6rem] font-bold tracking-[0.15em] text-[#77736c] uppercase md:grid">
                            <span>Canal</span>
                            <span>Aberturas</span>
                            <span>Pedidos</span>
                            <span>Conversão</span>
                            <span>Faturamento</span>
                        </div>
                        {report.catalog.sources.map((source) => (
                            <article
                                key={source.source}
                                className="grid grid-cols-2 gap-4 py-5 md:grid-cols-[minmax(0,1fr)_repeat(4,minmax(95px,0.45fr))] md:items-center md:gap-6"
                            >
                                <h3 className="col-span-2 font-zouth-display text-base font-semibold text-[#18181f] md:col-span-1">
                                    {source.source}
                                </h3>
                                <ProductFact
                                    label="Aberturas"
                                    value={formatInteger(source.visits)}
                                />
                                <ProductFact
                                    label="Pedidos"
                                    value={formatInteger(source.orders)}
                                />
                                <ProductFact
                                    label="Conversão"
                                    value={`${source.conversion_rate.toLocaleString('pt-BR')}%`}
                                />
                                <ProductFact
                                    label="Faturamento"
                                    value={formatMoney(source.revenue_cents)}
                                />
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

function SimpleMetricRail({
    items,
}: {
    items: Array<{
        label: string;
        value: string;
        icon: ReactNode;
        attention?: boolean;
        delta?: number | null;
    }>;
}) {
    return (
        <dl className="grid border-y border-[#cfcac1] sm:grid-cols-2 xl:grid-cols-4">
            {items.map((item, index) => (
                <div
                    key={item.label}
                    className={cn(
                        'relative min-h-32 px-5 py-6 sm:px-7',
                        index % 2 === 1 && 'border-l border-[#cfcac1]',
                        index > 1 && 'border-t border-[#cfcac1] xl:border-t-0',
                        index > 0 && 'xl:border-l',
                    )}
                >
                    <span
                        className={cn(
                            'absolute top-6 right-5 sm:right-7',
                            item.attention
                                ? 'text-[#b63329]'
                                : 'text-[#77736c]',
                        )}
                        aria-hidden="true"
                    >
                        {item.icon}
                    </span>
                    <dt className="pr-8 text-[0.63rem] font-bold tracking-[0.15em] text-[#77736c] uppercase">
                        {item.label}
                    </dt>
                    <dd
                        className={cn(
                            'mt-5 font-zouth-display text-[clamp(1.65rem,2.5vw,2.35rem)] leading-none font-semibold tracking-[-0.045em] tabular-nums',
                            item.attention
                                ? 'text-[#b63329]'
                                : 'text-[#18181f]',
                        )}
                    >
                        {item.value}
                    </dd>
                    {item.delta !== undefined && (
                        <dd className="mt-3">
                            <Delta value={item.delta} />
                        </dd>
                    )}
                </div>
            ))}
        </dl>
    );
}

export default function ReportsIndex({ report }: Props) {
    const [activeTab, setActiveTab] = useState<ReportTab>('overview');
    const [customOpen, setCustomOpen] = useState(
        report.period.key === 'custom',
    );
    const [customStart, setCustomStart] = useState(report.period.start);
    const [customEnd, setCustomEnd] = useState(report.period.end);
    const periodLabel = useMemo(
        () =>
            periodOptions.find((option) => option.value === report.period.key)
                ?.label ?? report.period.label,
        [report.period.key, report.period.label],
    );

    const changePeriod = (value: string) => {
        if (value === 'custom') {
            setCustomOpen(true);
            return;
        }
        setCustomOpen(false);
        router.get(
            manufacturer.reports.index({ query: { period: value } }).url,
            {},
            { preserveScroll: true, preserveState: true, only: ['report'] },
        );
    };
    const applyCustomPeriod = () => {
        router.get(
            manufacturer.reports.index({
                query: { period: 'custom', start: customStart, end: customEnd },
            }).url,
            {},
            { preserveScroll: true, preserveState: true, only: ['report'] },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Relatórios" />
            <main className="min-h-full bg-[#f6f4f0] font-zouth-body text-[#18181f]">
                <div className="mx-auto w-full max-w-[1560px] px-4 py-7 sm:px-7 sm:py-8 xl:px-10 xl:py-9">
                    <header className="grid gap-7 border-b border-[#cfcac1] pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                        <div>
                            <p className="text-[0.66rem] font-bold tracking-[0.24em] text-[#ff4d3d] uppercase">
                                Inteligência comercial
                            </p>
                            <h1 className="mt-4 font-zouth-display text-[clamp(2.8rem,4vw,4.35rem)] leading-[0.88] font-semibold tracking-[-0.06em] text-[#18181f]">
                                Relatórios
                                <span className="text-[#ff4d3d]">.</span>
                            </h1>
                            <p className="mt-4 max-w-2xl text-[clamp(0.95rem,1.35vw,1.15rem)] leading-7 text-[#77736c]">
                                Métricas para guiar suas decisões estratégicas.
                            </p>
                        </div>
                        <label className="relative block w-full lg:w-64">
                            <span className="mb-2 block text-[0.61rem] font-bold tracking-[0.16em] text-[#77736c] uppercase">
                                Período analisado
                            </span>
                            <CalendarRange
                                className="pointer-events-none absolute bottom-3.5 left-4 size-4 text-[#77736c]"
                                aria-hidden="true"
                            />
                            <select
                                value={report.period.key}
                                onChange={(event) =>
                                    changePeriod(event.target.value)
                                }
                                className="h-12 w-full appearance-none border border-[#cfcac1] bg-transparent pr-9 pl-11 text-sm font-semibold text-[#18181f] outline-none focus:border-[#18181f] focus:ring-2 focus:ring-[#ff4d3d]/25"
                            >
                                {periodOptions.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </header>

                    {customOpen && (
                        <div className="grid gap-4 border-b border-[#cfcac1] bg-[#e7e3dc]/45 px-4 py-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:px-6">
                            <label className="text-xs font-semibold text-[#77736c]">
                                Início
                                <input
                                    type="date"
                                    value={customStart}
                                    onChange={(event) =>
                                        setCustomStart(event.target.value)
                                    }
                                    className="mt-2 h-11 w-full border border-[#cfcac1] bg-[#f6f4f0] px-3 text-sm text-[#18181f] outline-none focus:border-[#18181f] focus:ring-2 focus:ring-[#ff4d3d]/25"
                                />
                            </label>
                            <label className="text-xs font-semibold text-[#77736c]">
                                Fim
                                <input
                                    type="date"
                                    max={new Date().toISOString().slice(0, 10)}
                                    value={customEnd}
                                    onChange={(event) =>
                                        setCustomEnd(event.target.value)
                                    }
                                    className="mt-2 h-11 w-full border border-[#cfcac1] bg-[#f6f4f0] px-3 text-sm text-[#18181f] outline-none focus:border-[#18181f] focus:ring-2 focus:ring-[#ff4d3d]/25"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={applyCustomPeriod}
                                disabled={
                                    !customStart ||
                                    !customEnd ||
                                    customStart > customEnd
                                }
                                className="h-11 bg-[#18181f] px-6 text-sm font-bold text-[#f6f4f0] transition-colors hover:bg-[#ff4d3d] hover:text-[#18181f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d] disabled:cursor-not-allowed disabled:opacity-45"
                            >
                                Analisar período
                            </button>
                        </div>
                    )}

                    <nav
                        aria-label="Áreas dos relatórios"
                        className="grid grid-cols-2 border-b border-[#cfcac1] sm:flex"
                    >
                        {tabs.map((tab) => (
                            <button
                                key={tab.value}
                                type="button"
                                onClick={() => setActiveTab(tab.value)}
                                className={cn(
                                    'relative min-h-12 px-3 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d] sm:px-5',
                                    activeTab === tab.value
                                        ? 'text-[#18181f]'
                                        : 'text-[#77736c] hover:text-[#18181f]',
                                )}
                                aria-current={
                                    activeTab === tab.value ? 'page' : undefined
                                }
                            >
                                {tab.label}
                                {activeTab === tab.value && (
                                    <span className="absolute inset-x-3 bottom-0 h-0.5 bg-[#ff4d3d] sm:inset-x-5" />
                                )}
                            </button>
                        ))}
                        <div className="col-span-2 flex items-center border-t border-[#cfcac1] px-3 py-3 text-[0.68rem] text-[#77736c] sm:ml-auto sm:border-t-0 sm:px-5 sm:py-0">
                            {periodLabel} · comparação equivalente
                        </div>
                    </nav>

                    <div>
                        {activeTab === 'overview' && (
                            <Overview
                                report={report}
                                onOpenTab={setActiveTab}
                            />
                        )}
                        {activeTab === 'collection' && (
                            <CollectionReport report={report} />
                        )}
                        {activeTab === 'customers' && (
                            <CustomersReport report={report} />
                        )}
                        {activeTab === 'representatives' && (
                            <RepresentativesReport report={report} />
                        )}
                        {activeTab === 'catalog' && (
                            <CatalogReport report={report} />
                        )}
                    </div>
                </div>
            </main>
        </AppLayout>
    );
}
