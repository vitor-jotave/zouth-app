import {
    useEffect,
    useRef,
    useState,
    type PointerEvent as ReactPointerEvent,
} from 'react';

export type ChartMode = 'revenue' | 'orders';

export interface SeriesPoint {
    date: string;
    label: string;
    tooltip_label?: string | null;
    revenue_cents: number;
    orders: number;
    previous_revenue_cents: number;
    previous_orders: number;
}

function formatMoney(cents: number, compact = false): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        notation: compact ? 'compact' : 'standard',
        maximumFractionDigits: compact ? 1 : 2,
    }).format(cents / 100);
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
    })
        .format(new Date(`${value}T12:00:00`))
        .replace('.', '');
}

export function TrendChart({
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
                        left: `clamp(0px, ${(hoverIndex / Math.max(1, series.length - 1)) * 100}%, calc(100% - 9rem))`,
                    }}
                >
                    <p className="text-[0.61rem] font-bold tracking-[0.14em] text-[#cac4ba] uppercase">
                        {hovered.tooltip_label ?? formatDate(hovered.date)}
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
                <caption>Dados do ritmo da coleção por período</caption>
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
