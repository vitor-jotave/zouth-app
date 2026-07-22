import { Link, type InertiaLinkProps } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type RecordListProps = {
    title: string;
    href?: NonNullable<InertiaLinkProps['href']>;
    actionLabel?: string;
    children: ReactNode;
    className?: string;
};

export function RecordList({
    title,
    href,
    actionLabel = 'Ver todos',
    children,
    className,
}: RecordListProps) {
    return (
        <section
            className={cn('border border-border bg-background', className)}
        >
            <div className="flex min-h-16 items-center justify-between gap-4 border-b border-border px-5 sm:px-6">
                <h2 className="font-zouth-display text-lg font-semibold tracking-[-0.025em] text-foreground">
                    {title}
                </h2>
                {href && (
                    <Link
                        href={href}
                        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-foreground transition-colors hover:text-[#e93d30] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]"
                    >
                        {actionLabel}
                        <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                )}
            </div>
            <div className="divide-y divide-border">{children}</div>
        </section>
    );
}

type RecordRowProps = {
    href: NonNullable<InertiaLinkProps['href']>;
    title: ReactNode;
    status?: ReactNode;
    description?: ReactNode;
    value?: ReactNode;
    meta?: ReactNode;
};

export function RecordRow({
    href,
    title,
    status,
    description,
    value,
    meta,
}: RecordRowProps) {
    return (
        <Link
            href={href}
            className="group grid min-h-20 gap-4 px-5 py-4 transition-colors hover:bg-[#e7e3dc]/35 focus-visible:bg-[#e7e3dc]/35 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"
        >
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="font-zouth-display text-base font-semibold tracking-[-0.02em] text-foreground">
                        {title}
                    </h3>
                    {status}
                </div>
                {description && (
                    <div className="mt-1.5 truncate text-sm text-muted-foreground">
                        {description}
                    </div>
                )}
            </div>
            {(value || meta) && (
                <div className="flex items-end justify-between gap-5 sm:block sm:text-right">
                    {value && (
                        <p className="font-zouth-display text-base font-semibold tracking-[-0.02em] text-foreground tabular-nums">
                            {value}
                        </p>
                    )}
                    {meta && (
                        <p className="mt-1 text-xs text-muted-foreground">
                            {meta}
                        </p>
                    )}
                </div>
            )}
        </Link>
    );
}
