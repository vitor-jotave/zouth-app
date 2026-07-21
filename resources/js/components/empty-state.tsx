import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type EmptyStateProps = {
    visual?: ReactNode;
    eyebrow?: string;
    title: ReactNode;
    description: ReactNode;
    actions?: ReactNode;
    className?: string;
};

export function EmptyState({
    visual,
    eyebrow,
    title,
    description,
    actions,
    className,
}: EmptyStateProps) {
    return (
        <section
            className={cn(
                'flex min-h-[26rem] flex-col items-center justify-center border-y border-border px-6 py-16 text-center',
                className,
            )}
        >
            {visual && <div className="mb-7">{visual}</div>}
            {eyebrow && (
                <p className="text-[0.68rem] font-bold tracking-[0.22em] text-[#e93d30] uppercase">
                    {eyebrow}
                </p>
            )}
            <h2 className="mt-4 max-w-xl font-zouth-display text-[clamp(1.8rem,3.2vw,2.75rem)] leading-[1.04] font-semibold tracking-[-0.045em] text-balance text-foreground">
                {title}
            </h2>
            <div className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
                {description}
            </div>
            {actions && <div className="mt-8">{actions}</div>}
        </section>
    );
}
