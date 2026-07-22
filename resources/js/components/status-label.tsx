import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type StatusLabelTone = 'neutral' | 'coral' | 'mineral' | 'plum' | 'muted';

const tones: Record<StatusLabelTone, string> = {
    neutral: 'bg-[#18181f]/[0.07] text-[#18181f]',
    coral: 'bg-[#ff4d3d]/10 text-[#b52a20]',
    mineral: 'bg-[#2e705a]/[0.11] text-[#245845]',
    plum: 'bg-[#5a2a4f]/10 text-[#5a2a4f]',
    muted: 'bg-[#e7e3dc] text-[#5f5d57]',
};

type StatusLabelProps = {
    children: ReactNode;
    tone?: StatusLabelTone;
    className?: string;
};

export function StatusLabel({
    children,
    tone = 'neutral',
    className,
}: StatusLabelProps) {
    return (
        <span
            className={cn(
                'inline-flex min-h-6 items-center px-2.5 text-[0.68rem] leading-none font-bold tracking-[0.04em] uppercase',
                tones[tone],
                className,
            )}
        >
            {children}
        </span>
    );
}

export type { StatusLabelTone };
