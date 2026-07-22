import { usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';

export function NavUser({
    variant = 'sidebar',
    dark = false,
}: {
    variant?: 'sidebar' | 'header';
    dark?: boolean;
}) {
    const { auth } = usePage<SharedData>().props;
    const { state } = useSidebar();
    const isMobile = useIsMobile();

    const trigger =
        variant === 'header' ? (
            <button
                type="button"
                aria-label={`Abrir menu de ${auth.user.name}`}
                className={cn(
                    'flex min-h-11 items-center gap-2 rounded-[2px] px-1.5 outline-none focus-visible:ring-2 focus-visible:ring-zouth-coral [&_[data-slot=avatar-fallback]]:font-zouth-display [&_[data-slot=avatar-fallback]]:font-semibold [&>div]:hidden sm:[&>div]:grid',
                    dark
                        ? 'text-zouth-ivory hover:bg-white/[0.06] [&_[data-slot=avatar-fallback]]:bg-zouth-ivory [&_[data-slot=avatar-fallback]]:text-zouth-charcoal'
                        : 'text-zouth-charcoal hover:bg-zouth-sand/70 [&_[data-slot=avatar-fallback]]:bg-zouth-sand',
                )}
            >
                <UserInfo user={auth.user} />
                <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
            </button>
        ) : (
            <SidebarMenuButton
                size="lg"
                className="group min-h-12 rounded-[2px] text-zouth-ivory group-data-[collapsible=icon]:size-10! hover:bg-white/[0.06] hover:text-zouth-ivory focus-visible:ring-zouth-coral data-[state=open]:bg-white/[0.06] data-[state=open]:text-zouth-ivory [&_[data-slot=avatar-fallback]]:bg-zouth-ivory [&_[data-slot=avatar-fallback]]:font-zouth-display [&_[data-slot=avatar-fallback]]:font-semibold [&_[data-slot=avatar-fallback]]:text-zouth-charcoal"
                data-test="sidebar-menu-button"
                aria-label={`Abrir menu de ${auth.user.name}`}
            >
                <UserInfo user={auth.user} />
                <ChevronDown
                    className="ml-auto size-4 shrink-0 opacity-70"
                    aria-hidden="true"
                />
            </SidebarMenuButton>
        );

    return (
        <SidebarMenu className={variant === 'header' ? 'w-auto' : undefined}>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-[2px] border-zouth-stone p-2"
                        align="end"
                        sideOffset={8}
                        side={
                            variant === 'header' || isMobile
                                ? 'bottom'
                                : state === 'collapsed'
                                  ? 'left'
                                  : 'bottom'
                        }
                    >
                        <UserMenuContent user={auth.user} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
