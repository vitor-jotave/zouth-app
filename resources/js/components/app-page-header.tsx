import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AppPageHeaderProps = {
    eyebrow?: string;
    title: ReactNode;
    description?: ReactNode;
    aside?: ReactNode;
    className?: string;
};

export function AppPageHeader({
    eyebrow,
    title,
    description,
    aside,
    className,
}: AppPageHeaderProps) {
    return (
        <header
            className={cn(
                'grid gap-8 border-b border-border pb-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:items-start lg:gap-12 lg:pb-4',
                className,
            )}
        >
            <div className="min-w-0">
                {eyebrow && (
                    <p className="mb-4 text-[0.68rem] font-bold tracking-[0.24em] text-[#ff4d3d] uppercase">
                        {eyebrow}
                    </p>
                )}
                <h1 className="max-w-3xl font-zouth-display text-[clamp(2.55rem,4vw,4rem)] leading-[0.94] font-semibold tracking-[-0.05em] text-balance text-foreground">
                    {title}
                </h1>
                {description && (
                    <div className="mt-6 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                        {description}
                    </div>
                )}
            </div>
            {aside && <div className="min-w-0 lg:pt-7">{aside}</div>}
        </header>
    );
}
