import { usePage } from '@inertiajs/react';
import {
    BookOpen,
    Building2,
    CreditCard,
    LayoutGrid,
    Layers,
    MessageSquare,
    Route,
    Package,
    Palette,
    ShoppingCart,
    Tags,
    UserCheck,
    Users,
} from 'lucide-react';
import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useActiveService } from '@/contexts/active-service-context';
import admin from '@/routes/admin';
import manufacturer from '@/routes/manufacturer';
import rep from '@/routes/rep';
import type { NavItem, SharedData } from '@/types';
import AppLogo from './app-logo';

function useDashboardUrl(): string {
    const { auth } = usePage<SharedData>().props;

    return auth.dashboard_url ?? '/dashboard';
}

function useNavItems() {
    const { auth } = usePage<SharedData>().props;
    const user = auth?.user;
    const dashboardUrl = useDashboardUrl();

    const common: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboardUrl,
            icon: LayoutGrid,
        },
    ];

    if (user?.user_type === 'superadmin') {
        return {
            common: [
                ...common,
                {
                    title: 'Fabricantes',
                    href: admin.manufacturers.index(),
                    icon: Building2,
                },
                {
                    title: 'Planos',
                    href: admin.plans.index(),
                    icon: CreditCard,
                },
            ],
            catalogo: [] as NavItem[],
            atendimento: [] as NavItem[],
        };
    }

    if (user?.user_type === 'sales_rep') {
        return {
            common: [
                ...common,
                {
                    title: 'Fabricantes',
                    href: rep.manufacturers.index(),
                    icon: Building2,
                },
                {
                    title: 'Pedidos',
                    href: rep.orders.index(),
                    icon: ShoppingCart,
                },
            ],
            catalogo: [] as NavItem[],
            atendimento: [] as NavItem[],
        };
    }

    if (user?.user_type === 'manufacturer_user') {
        return {
            common,
            catalogo: [
                { title: 'Usuários', href: '/users', icon: Users },
                {
                    title: 'Clientes',
                    href: '/manufacturer/customers',
                    icon: BookOpen,
                },
                {
                    title: 'Produtos',
                    href: '/manufacturer/products',
                    icon: Package,
                },
                {
                    title: 'Pedidos',
                    href: '/manufacturer/orders',
                    icon: ShoppingCart,
                },
                {
                    title: 'Categorias',
                    href: '/manufacturer/categories',
                    icon: Tags,
                },
                {
                    title: 'Variações',
                    href: '/manufacturer/variation-types',
                    icon: Layers,
                },
                {
                    title: 'Catálogo',
                    href:
                        manufacturer.catalogSettings?.index().url ??
                        '/manufacturer/catalog-settings',
                    icon: Palette,
                },
                { title: 'Afiliações', href: '/affiliations', icon: UserCheck },
                {
                    title: 'Assinatura',
                    href: '/manufacturer/billing',
                    icon: CreditCard,
                },
            ] as NavItem[],
            atendimento: [
                {
                    title: 'Atendimento',
                    href: '/manufacturer/atendimento',
                    icon: MessageSquare,
                },
                {
                    title: 'Funis',
                    href: '/manufacturer/atendimento/funis',
                    icon: Route,
                },
            ] as NavItem[],
        };
    }

    return { common, catalogo: [] as NavItem[], atendimento: [] as NavItem[] };
}

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const { common, catalogo, atendimento } = useNavItems();
    const { activeService } = useActiveService();

    const isManufacturerUser = catalogo.length > 0;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <div className="flex items-center px-2 py-1.5">
                            <AppLogo />
                        </div>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={common} />

                {isManufacturerUser && (
                    <NavMain
                        items={
                            activeService === 'atendimento'
                                ? atendimento
                                : catalogo
                        }
                    />
                )}
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
