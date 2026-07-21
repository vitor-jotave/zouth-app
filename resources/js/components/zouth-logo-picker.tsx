import { usePage } from '@inertiajs/react';
import {
    Check,
    ChevronDown,
    LayoutPanelTop,
    MessagesSquare,
} from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useActiveService } from '@/contexts/active-service-context';
import type { SharedData } from '@/types';
import AppLogoIcon from './app-logo-icon';
import ZouthLogo from './zouth-logo';

const SERVICES = [
    { key: 'catalogo', label: 'Catálogo', icon: LayoutPanelTop },
    { key: 'atendimento', label: 'Atendimento', icon: MessagesSquare },
] as const;

type ServiceKey = (typeof SERVICES)[number]['key'];

export default function ZouthLogoPicker() {
    const { auth } = usePage<SharedData>().props;
    const { activeService: activeKey, setActiveService } = useActiveService();
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const menuId = useId();

    const catalogCapabilities = [
        'collection.manage',
        'catalog.manage',
        'orders.manage',
        'customers.manage',
        'affiliations.manage',
    ];
    const availableServices = SERVICES.filter((service) => {
        if (auth.access?.is_owner) {
            return true;
        }

        if (service.key === 'atendimento') {
            return auth.access?.capabilities.includes('whatsapp.manage');
        }

        return catalogCapabilities.some((capability) =>
            auth.access?.capabilities.includes(capability),
        );
    });
    const activeService =
        availableServices.find((service) => service.key === activeKey) ??
        availableServices[0] ??
        SERVICES[0];
    const ActiveServiceIcon = activeService.icon;

    useEffect(() => {
        if (activeService.key !== activeKey) {
            setActiveService(activeService.key);
        }
    }, [activeKey, activeService.key, setActiveService]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    const handleSelect = useCallback(
        (key: ServiceKey) => {
            setOpen(false);

            if (key !== activeKey) {
                setActiveService(key);
            }
        },
        [activeKey, setActiveService],
    );

    return (
        <div ref={containerRef} className="relative flex w-full flex-col gap-7">
            <div className="flex min-h-8 items-center px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                <ZouthLogo
                    tone="light"
                    className="w-[8.75rem] group-data-[collapsible=icon]:hidden"
                />
                <AppLogoIcon
                    tone="light"
                    className="hidden size-6 group-data-[collapsible=icon]:block"
                />
            </div>

            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-[2px] border border-white/20 px-3.5 text-left text-sm font-medium text-zouth-ivory outline-none group-data-[collapsible=icon]:hidden hover:border-white/35 hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-zouth-coral focus-visible:ring-offset-2 focus-visible:ring-offset-zouth-charcoal"
                aria-label="Selecionar módulo do Zouth"
                aria-expanded={open}
                aria-haspopup="menu"
                aria-controls={menuId}
            >
                <ActiveServiceIcon
                    className="size-[1.125rem] shrink-0 stroke-[1.6]"
                    aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">
                    {activeService.label}
                </span>
                <ChevronDown
                    className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                />
            </button>

            {open && (
                <div
                    id={menuId}
                    role="menu"
                    aria-label="Módulos da Zouth"
                    className="absolute top-full right-0 left-0 z-50 mt-2 flex min-w-max flex-col gap-1 rounded-[2px] border border-white/20 bg-zouth-charcoal p-1.5 text-zouth-ivory group-data-[collapsible=icon]:hidden"
                >
                    {availableServices.map((service) => {
                        const ServiceIcon = service.icon;
                        const isActive = activeKey === service.key;

                        return (
                            <button
                                key={service.key}
                                type="button"
                                role="menuitemradio"
                                aria-checked={isActive}
                                onClick={() => handleSelect(service.key)}
                                className="flex min-h-11 w-full items-center gap-3 rounded-[2px] px-3 text-left text-sm outline-none hover:bg-white/[0.07] focus-visible:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-zouth-coral"
                            >
                                <ServiceIcon
                                    className={`size-[1.125rem] stroke-[1.6] ${isActive ? 'text-zouth-coral' : 'text-zouth-ivory/70'}`}
                                    aria-hidden="true"
                                />
                                <span className="flex-1">{service.label}</span>
                                {isActive && (
                                    <Check
                                        className="size-4 text-zouth-coral"
                                        aria-hidden="true"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
