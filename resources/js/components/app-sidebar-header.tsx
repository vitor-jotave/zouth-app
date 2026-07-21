import { Breadcrumbs } from '@/components/breadcrumbs';
import { NavUser } from '@/components/nav-user';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const today = new Date();
    const formattedDate = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(today);

    return (
        <header className="zouth-app-header flex h-16 shrink-0 items-center border-b border-zouth-stone bg-zouth-ivory px-3 sm:px-5 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger className="size-11 shrink-0 rounded-[2px] text-zouth-charcoal hover:bg-zouth-sand focus-visible:ring-2 focus-visible:ring-zouth-coral [&>svg]:size-5" />
                <span
                    aria-hidden="true"
                    className="hidden h-6 w-px bg-zouth-stone sm:block"
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
                    className="hidden h-6 w-px bg-zouth-stone sm:block"
                />
                <NavUser variant="header" />
            </div>
        </header>
    );
}
