import { useGSAP } from '@gsap/react';
import { usePage } from '@inertiajs/react';
import gsap from 'gsap';
import {
    BookOpen,
    Building2,
    CreditCard,
    Folder,
    LayoutGrid,
    Layers,
    MessageSquare,
    Package,
    Palette,
    ShoppingCart,
    Tags,
    UserCheck,
    Users,
} from 'lucide-react';
import { useRef } from 'react';
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

function useNavItems() {
    const { auth } = usePage().props as any;
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
                    href: '/admin/manufacturers',
                    icon: Building2,
                },
                { title: 'Planos', href: '/admin/plans', icon: CreditCard },
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
                    href: '/rep/manufacturers',
                    icon: Building2,
                },
                { title: 'Pedidos', href: '/rep/orders', icon: ShoppingCart },
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
            ] as NavItem[],
        };
    }

    return { common, catalogo: [] as NavItem[], atendimento: [] as NavItem[] };
}

const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const { common, catalogo, atendimento } = useNavItems();
    const { activeService } = useActiveService();
    const catalogoRef = useRef<HTMLDivElement>(null);
    const atendimentoRef = useRef<HTMLDivElement>(null);
    const prevServiceRef = useRef<string>(activeService);
    const isInitialRenderRef = useRef(true);

    const isManufacturerUser = catalogo.length > 0;

    useGSAP(
        () => {
            if (!isManufacturerUser) return;

            // On every mount: set correct visibility instantly, no animation
            if (isInitialRenderRef.current) {
                isInitialRenderRef.current = false;
                gsap.set(catalogoRef.current, {
                    display: activeService === 'atendimento' ? 'none' : 'block',
                });
                gsap.set(atendimentoRef.current, {
                    display: activeService === 'atendimento' ? 'block' : 'none',
                });
                return;
            }

            // Service actually changed — animate
            const prev = prevServiceRef.current;
            if (prev === activeService) return;

            const outRef =
                prev === 'atendimento' ? atendimentoRef : catalogoRef;
            const inRef =
                activeService === 'atendimento' ? atendimentoRef : catalogoRef;
            const outItems = outRef.current
                ? Array.from(outRef.current.querySelectorAll('li'))
                : [];
            const inEl = inRef.current;

            const revealIn = () => {
                if (!inEl) return;
                gsap.set(inEl, { display: 'block' });
                gsap.fromTo(
                    Array.from(inEl.querySelectorAll('li')),
                    { x: 14, opacity: 0 },
                    {
                        x: 0,
                        opacity: 1,
                        stagger: 0.05,
                        duration: 0.22,
                        ease: 'power2.out',
                    },
                );
                prevServiceRef.current = activeService;
            };

            if (outItems.length > 0) {
                gsap.to(outItems, {
                    x: -14,
                    opacity: 0,
                    stagger: 0.03,
                    duration: 0.16,
                    ease: 'power2.in',
                    onComplete: () => {
                        gsap.set(outRef.current, { display: 'none' });
                        revealIn();
                    },
                });
            } else {
                gsap.set(outRef.current, { display: 'none' });
                revealIn();
            }
        },
        { dependencies: [activeService] },
    );

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
                    <>
                        <div ref={catalogoRef}>
                            <NavMain items={catalogo} />
                        </div>
                        <div ref={atendimentoRef} style={{ display: 'none' }}>
                            <NavMain items={atendimento} />
                        </div>
                    </>
                )}
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
