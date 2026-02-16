import { Link, usePage } from '@inertiajs/react';
import { BookOpen, Building2, Folder, LayoutGrid, Package, Palette, Tags, UserCheck, Users } from 'lucide-react';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import manufacturer from '@/routes/manufacturer';
import type { NavItem } from '@/types';
import AppLogo from './app-logo';

function useDashboardUrl(): string {
    const { auth } = usePage().props as any;
    const user = auth?.user;

    if (user?.user_type === 'superadmin') {
        return '/admin/dashboard';
    } else if (user?.user_type === 'sales_rep') {
        return '/rep/dashboard';
    }
    
    return '/dashboard';
}

function useMainNavItems(): NavItem[] {
    const { auth } = usePage().props as any;
    const user = auth?.user;
    const dashboardUrl = useDashboardUrl();

    const items: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboardUrl,
            icon: LayoutGrid,
        },
    ];

    // Add Fabricantes menu item for superadmins
    if (user?.user_type === 'superadmin') {
        items.push({
            title: 'Fabricantes',
            href: '/admin/manufacturers',
            icon: Building2,
        });
    }

    // Add Usuários menu item for manufacturer users
    if (user?.user_type === 'manufacturer_user') {
        items.push({
            title: 'Usuários',
            href: '/users',
            icon: Users,
        });
        items.push({
            title: 'Produtos',
            href: '/manufacturer/products',
            icon: Package,
        });
        items.push({
            title: 'Categorias',
            href: '/manufacturer/categories',
            icon: Tags,
        });
        items.push({
            title: 'Catalogo',
            href: manufacturer.catalogSettings?.index().url ?? '/manufacturer/catalog-settings',
            icon: Palette,
        });
        items.push({
            title: 'Afiliações',
            href: '/affiliations',
            icon: UserCheck,
        });
    }

    // Add Fabricantes menu item for sales reps
    if (user?.user_type === 'sales_rep') {
        items.push({
            title: 'Fabricantes',
            href: '/rep/manufacturers',
            icon: Building2,
        });
    }

    return items;
}

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const mainNavItems = useMainNavItems();
    const dashboardUrl = useDashboardUrl();

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboardUrl} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
