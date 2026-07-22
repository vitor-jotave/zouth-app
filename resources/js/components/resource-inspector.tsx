import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ResourceInspectorDetail = {
    label: ReactNode;
    value: ReactNode;
};

type ResourceInspectorProps = {
    eyebrow: ReactNode;
    media: ReactNode;
    title: ReactNode;
    status?: ReactNode;
    details: ResourceInspectorDetail[];
    primaryAction?: ReactNode;
    secondaryAction?: ReactNode;
    className?: string;
};

export function ResourceInspector({
    eyebrow,
    media,
    title,
    status,
    details,
    primaryAction,
    secondaryAction,
    className,
}: ResourceInspectorProps) {
    return (
        <aside className={cn('min-w-0', className)}>
            <p className="text-[0.68rem] font-bold tracking-[0.2em] text-foreground uppercase">
                {eyebrow}
            </p>

            <div className="mt-4">{media}</div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
                <h2 className="min-w-0 font-zouth-display text-2xl leading-tight font-semibold tracking-[-0.035em] text-foreground">
                    {title}
                </h2>
                {status}
            </div>

            <dl className="mt-7 grid gap-3 text-sm">
                {details.map((detail, index) => (
                    <div
                        key={index}
                        className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-4"
                    >
                        <dt className="text-muted-foreground">
                            {detail.label}
                        </dt>
                        <dd className="min-w-0 text-right font-medium text-foreground tabular-nums">
                            {detail.value}
                        </dd>
                    </div>
                ))}
            </dl>

            {(primaryAction || secondaryAction) && (
                <div className="mt-8 grid gap-3">
                    {primaryAction}
                    {secondaryAction}
                </div>
            )}
        </aside>
    );
}

export type { ResourceInspectorDetail };
