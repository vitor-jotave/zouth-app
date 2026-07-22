import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ResourceToolbarProps = {
    search: ReactNode;
    views?: ReactNode;
    filters?: ReactNode;
    supporting?: ReactNode;
    isBusy?: boolean;
    label?: string;
    className?: string;
};

export function ResourceToolbar({
    search,
    views,
    filters,
    supporting,
    isBusy = false,
    label = 'Refinar conteúdo',
    className,
}: ResourceToolbarProps) {
    return (
        <section
            aria-label={label}
            aria-busy={isBusy}
            className={cn('relative border-y border-border py-3.5', className)}
        >
            <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(250px,0.9fr)_auto_minmax(330px,1fr)] xl:items-center">
                <div className="min-w-0">{search}</div>
                {views && <div className="min-w-0">{views}</div>}
                {filters && (
                    <div className="flex min-w-0 flex-wrap gap-2 xl:justify-end">
                        {filters}
                    </div>
                )}
            </div>

            {supporting && <div className="mt-3">{supporting}</div>}

            <span
                aria-hidden="true"
                className={cn(
                    'absolute -bottom-px left-0 h-px bg-[#ff4d3d] transition-[width,opacity] duration-300',
                    isBusy ? 'w-full opacity-100' : 'w-0 opacity-0',
                )}
            />
        </section>
    );
}
