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
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
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
        const access = auth.access;
        const canAccess = (capability: string) =>
            Boolean(
                access?.is_owner || access?.capabilities.includes(capability),
            );
        const catalogo: NavItem[] = [];
        const atendimento: NavItem[] = [];

        if (canAccess('collection.manage')) {
            catalogo.push(
                {
                    title: 'Produtos',
                    href: '/manufacturer/products',
                    icon: Package,
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
            );
        }

        if (canAccess('catalog.manage')) {
            catalogo.push({
                title: 'Catálogo',
                href:
                    manufacturer.catalogSettings?.index().url ??
                    '/manufacturer/catalog-settings',
                icon: Palette,
            });
        }

        if (canAccess('orders.manage')) {
            catalogo.push({
                title: 'Pedidos',
                href: '/manufacturer/orders',
                icon: ShoppingCart,
            });
        }

        if (canAccess('customers.manage')) {
            catalogo.push({
                title: 'Clientes',
                href: '/manufacturer/customers',
                icon: BookOpen,
            });
        }

        if (canAccess('affiliations.manage')) {
            catalogo.push({
                title: 'Afiliações',
                href: '/affiliations',
                icon: UserCheck,
            });
        }

        if (access?.is_owner) {
            catalogo.push(
                { title: 'Usuários', href: '/users', icon: Users },
                {
                    title: 'Assinatura',
                    href: '/manufacturer/billing',
                    icon: CreditCard,
                },
            );
        }

        if (canAccess('whatsapp.manage')) {
            atendimento.push(
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
            );
        }

        return {
            common,
            catalogo,
            atendimento,
        };
    }

    return { common, catalogo: [] as NavItem[], atendimento: [] as NavItem[] };
}

function orderItems(items: NavItem[], titles: string[]): NavItem[] {
    return titles.flatMap((title) => {
        const item = items.find((candidate) => candidate.title === title);

        return item ? [item] : [];
    });
}

export function AppSidebar() {
    const { common, catalogo, atendimento } = useNavItems();
    const { activeService } = useActiveService();
    const { auth } = usePage<SharedData>().props;

    const isManufacturerUser = auth.user.user_type === 'manufacturer_user';
    const visibleService =
        activeService === 'atendimento' && atendimento.length === 0
            ? 'catalogo'
            : activeService === 'catalogo' && catalogo.length === 0
              ? 'atendimento'
              : activeService;
    const collectionItems = orderItems(catalogo, [
        'Produtos',
        'Categorias',
        'Variações',
        'Catálogo',
    ]);
    const commercialItems = orderItems(catalogo, [
        'Pedidos',
        'Clientes',
        'Afiliações',
    ]);
    const managementItems = orderItems(catalogo, ['Usuários', 'Assinatura']);

    return (
        <Sidebar collapsible="icon" variant="sidebar" className="border-r-0">
            <SidebarHeader className="gap-0 px-5 pt-7 pb-2 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-5">
                <AppLogo />
            </SidebarHeader>

            <SidebarContent className="gap-0">
                <NavMain items={common} label="Visão geral" />

                {isManufacturerUser && visibleService === 'atendimento' && (
                    <NavMain items={atendimento} label="Atendimento" />
                )}

                {isManufacturerUser && visibleService === 'catalogo' && (
                    <>
                        <NavMain items={collectionItems} label="Coleção" />
                        <NavMain items={commercialItems} label="Comercial" />
                        <NavMain items={managementItems} label="Gestão" />
                    </>
                )}
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border p-3 group-data-[collapsible=icon]:p-1.5">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
