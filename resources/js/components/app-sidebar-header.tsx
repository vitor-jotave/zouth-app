import { usePage } from '@inertiajs/react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { NavUser } from '@/components/nav-user';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { url } = usePage();
    const today = new Date();
    const isAtendimento = url
        .split('?')[0]
        .startsWith('/manufacturer/atendimento');
    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(today);

    return (
        <header
            data-theme={isAtendimento ? 'dark' : 'light'}
            className={cn(
                'zouth-app-header flex h-16 shrink-0 items-center border-b px-3 sm:px-5 lg:px-8',
                isAtendimento
                    ? 'border-white/12 bg-zouth-charcoal text-zouth-ivory'
                    : 'border-zouth-stone bg-zouth-ivory text-zouth-charcoal',
            )}
        >
            <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger
                    className={cn(
                        'size-11 shrink-0 rounded-[2px] focus-visible:ring-2 focus-visible:ring-zouth-coral [&>svg]:size-5',
                        isAtendimento
                            ? 'text-zouth-ivory hover:bg-white/[0.06] hover:text-zouth-ivory'
                            : 'text-zouth-charcoal hover:bg-zouth-sand',
                    )}
                />
                <span
                    aria-hidden="true"
                    className={cn(
                        'hidden h-6 w-px sm:block',
                        isAtendimento ? 'bg-white/14' : 'bg-zouth-stone',
                    )}
                />
                <div className="min-w-0 overflow-hidden">
                    <Breadcrumbs breadcrumbs={breadcrumbs} />
                </div>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-5">
                <time
                    dateTime={today.toISOString()}
                    suppressHydrationWarning
                    className="hidden text-sm text-zouth-warm-gray lg:block"
                >
                    {formattedDate}
                </time>
                <span
                    aria-hidden="true"
                    className={cn(
                        'hidden h-6 w-px sm:block',
                        isAtendimento ? 'bg-white/14' : 'bg-zouth-stone',
                    )}
                />
                <NavUser variant="header" dark={isAtendimento} />
            </div>
        </header>
    );
}
