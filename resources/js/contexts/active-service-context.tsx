import { usePage } from '@inertiajs/react';
import { createContext, useContext, useEffect, useState } from 'react';

export type ServiceKey = 'catalogo' | 'atendimento';

const STORAGE_KEY = 'zouth_active_service';

/**
 * Derive the active service from a URL path.
 * Returns null when the URL doesn't belong to any specific service
 * (e.g. /dashboard, /users) so we don't override a manual choice.
 */
function serviceFromPath(path: string): ServiceKey | null {
    if (path.startsWith('/manufacturer/atendimento')) return 'atendimento';
    // Any other /manufacturer/* route belongs to the catálogo service
    if (path.startsWith('/manufacturer/')) return 'catalogo';
    return null;
}

function initialService(): ServiceKey {
    // SSR safety: window may not exist
    if (typeof window === 'undefined') return 'catalogo';
    const fromUrl = serviceFromPath(window.location.pathname);
    if (fromUrl) return fromUrl;
    return (
        (localStorage.getItem(STORAGE_KEY) as ServiceKey | null) ?? 'catalogo'
    );
}

interface ActiveServiceContextValue {
    activeService: ServiceKey;
    setActiveService: (service: ServiceKey) => void;
}

const ActiveServiceContext = createContext<ActiveServiceContextValue>({
    activeService: 'catalogo',
    setActiveService: () => {},
});

export function ActiveServiceProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const { url } = usePage();
    const [selection, setSelection] = useState(() => ({
        service: initialService(),
        url,
    }));
    const routeService = serviceFromPath(url);
    const activeService =
        selection.url === url
            ? selection.service
            : (routeService ?? selection.service);

    useEffect(() => {
        setSelection((currentSelection) => {
            if (currentSelection.url === url) {
                return currentSelection;
            }

            return {
                service: routeService ?? currentSelection.service,
                url,
            };
        });

        if (routeService) {
            localStorage.setItem(STORAGE_KEY, routeService);
        }
    }, [routeService, url]);

    function setActiveService(service: ServiceKey) {
        setSelection({ service, url });
        localStorage.setItem(STORAGE_KEY, service);
    }

    return (
        <ActiveServiceContext.Provider
            value={{ activeService, setActiveService }}
        >
            {children}
        </ActiveServiceContext.Provider>
    );
}

export function useActiveService() {
    return useContext(ActiveServiceContext);
}
