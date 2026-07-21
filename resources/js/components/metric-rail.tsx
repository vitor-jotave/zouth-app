import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type MetricRailItem = {
    label: string;
    value: ReactNode;
    supportingText?: string;
    icon?: ReactNode;
    className?: string;
};

type MetricRailProps = {
    items: MetricRailItem[];
    className?: string;
    variant?: 'boxed' | 'open';
};

export function MetricRail({
    items,
    className,
    variant = 'boxed',
}: MetricRailProps) {
    const isOpen = variant === 'open';

    return (
        <dl
            className={cn(
                'grid grid-cols-2 bg-background',
                isOpen
                    ? 'border-y border-border xl:grid-cols-4'
                    : 'border border-border xl:grid-cols-3',
                className,
            )}
        >
            {items.map((item, index) => (
                <div
                    key={item.label}
                    className={cn(
                        'relative flex flex-col justify-center',
                        isOpen
                            ? 'min-h-20 px-4 py-4 sm:px-6'
                            : 'min-h-28 px-5 py-4 sm:px-7',
                        isOpen
                            ? [
                                  index % 2 === 1 && 'border-l border-border',
                                  index > 1 && 'border-t border-border',
                                  index > 0 && 'xl:border-l',
                                  index > 1 && 'xl:border-t-0',
                              ]
                            : [
                                  index > 0 &&
                                      'border-t border-border sm:border-t-0',
                                  index % 2 === 1 && 'sm:border-l',
                                  index > 1 && 'sm:border-t xl:border-t-0',
                                  index > 0 && 'xl:border-l',
                              ],
                        item.className,
                    )}
                >
                    {item.icon && (
                        <span className="absolute top-5 right-4 text-muted-foreground sm:right-6">
                            {item.icon}
                        </span>
                    )}
                    <dt className="order-2 mt-2 text-sm font-semibold text-foreground">
                        {item.label}
                    </dt>
                    <dd
                        className={cn(
                            'order-1 font-zouth-display leading-none font-semibold tracking-[-0.045em] text-foreground tabular-nums',
                            isOpen
                                ? 'text-[clamp(1.65rem,2.4vw,2.2rem)]'
                                : 'text-[clamp(2rem,3vw,2.75rem)]',
                        )}
                    >
                        {item.value}
                    </dd>
                    {item.supportingText && (
                        <dd className="order-3 mt-1 text-xs leading-4 text-muted-foreground">
                            {item.supportingText}
                        </dd>
                    )}
                </div>
            ))}
        </dl>
    );
}
