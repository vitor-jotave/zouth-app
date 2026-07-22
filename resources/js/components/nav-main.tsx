import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { RESTORE_SIDEBAR_AFTER_CHAT_KEY } from '@/lib/sidebar-state';
import type { NavItem } from '@/types';

export function NavMain({
    items = [],
    label,
}: {
    items: NavItem[];
    label?: string;
}) {
    const { isCurrentUrl } = useCurrentUrl();
    const { isMobile, open, setOpen, setOpenMobile } = useSidebar();

    if (items.length === 0) {
        return null;
    }

    return (
        <SidebarGroup className="border-b border-sidebar-border px-4 py-4 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:py-3 last:border-b-0">
            {label && (
                <SidebarGroupLabel className="h-auto px-2 pt-0 pb-2 font-zouth-display text-[0.625rem] font-semibold tracking-[0.16em] text-zouth-warm-gray uppercase group-data-[collapsible=icon]:hidden">
                    {label}
                </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                    {items.map((item) => {
                        const isActive = isCurrentUrl(item.href);

                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={isActive}
                                    tooltip={{ children: item.title }}
                                    className="relative h-11 gap-3 rounded-[2px] px-3 text-[0.9375rem] font-medium text-zouth-ivory/82 group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0! hover:bg-white/[0.06] hover:text-zouth-ivory focus-visible:ring-zouth-coral data-[active=true]:bg-zouth-coral data-[active=true]:font-semibold data-[active=true]:text-white data-[active=true]:hover:bg-zouth-coral data-[active=true]:hover:text-white [&>svg]:size-[1.125rem] [&>svg]:stroke-[1.6]"
                                >
                                    <Link
                                        href={item.href}
                                        prefetch
                                        onClick={() => {
                                            if (
                                                !item.collapseSidebarOnNavigate
                                            ) {
                                                return;
                                            }

                                            if (isMobile) {
                                                setOpenMobile(false);
                                            } else {
                                                if (open) {
                                                    sessionStorage.setItem(
                                                        RESTORE_SIDEBAR_AFTER_CHAT_KEY,
                                                        'true',
                                                    );
                                                } else {
                                                    sessionStorage.removeItem(
                                                        RESTORE_SIDEBAR_AFTER_CHAT_KEY,
                                                    );
                                                }

                                                setOpen(false);
                                            }
                                        }}
                                    >
                                        {item.icon && <item.icon />}
                                        <span className="group-data-[collapsible=icon]:hidden">
                                            {item.title}
                                        </span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}
