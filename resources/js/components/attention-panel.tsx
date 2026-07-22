import { Link, type InertiaLinkProps } from '@inertiajs/react';
import { ArrowRight, type LucideIcon } from 'lucide-react';

type AttentionPanelProps = {
    icon: LucideIcon;
    value: string | number;
    label: string;
    href: NonNullable<InertiaLinkProps['href']>;
    actionLabel: string;
    tone?: 'coral' | 'mineral';
};

const toneClasses = {
    coral: {
        panel: 'border-[#ff4d3d] bg-[#ff4d3d]/[0.025]',
        icon: 'bg-[#ff4d3d]/10 text-[#f43f2f]',
        value: 'text-[#f43f2f]',
        action: 'bg-[#ff4d3d] text-[#18181f] hover:bg-[#f23c2e] focus-visible:outline-[#ff4d3d]',
    },
    mineral: {
        panel: 'border-[#2e705a] bg-[#2e705a]/[0.035]',
        icon: 'bg-[#2e705a]/10 text-[#2e705a]',
        value: 'text-[#2e705a]',
        action: 'bg-[#2e705a] text-white hover:bg-[#245c49] focus-visible:outline-[#2e705a]',
    },
};

export function AttentionPanel({
    icon: Icon,
    value,
    label,
    href,
    actionLabel,
    tone = 'coral',
}: AttentionPanelProps) {
    const classes = toneClasses[tone];

    return (
        <div className={`border p-5 sm:p-6 ${classes.panel}`}>
            <div className="flex items-start gap-4">
                <span
                    className={`flex size-12 shrink-0 items-center justify-center ${classes.icon}`}
                >
                    <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                    <p
                        className={`font-zouth-display text-4xl leading-none font-semibold tracking-[-0.04em] tabular-nums ${classes.value}`}
                    >
                        {value}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                        {label}
                    </p>
                </div>
            </div>
            <Link
                href={href}
                className={`mt-6 flex min-h-12 w-full items-center justify-between px-5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 sm:ml-auto sm:w-fit sm:min-w-48 ${classes.action}`}
            >
                {actionLabel}
                <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
        </div>
    );
}
