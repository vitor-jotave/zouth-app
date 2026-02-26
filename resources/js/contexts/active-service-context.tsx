import { usePage } from '@inertiajs/react';
import { createContext, useContext, useEffect, useState } from 'react';

export type ServiceKey = 'catalogo' | 'atendimento' | 'membros';

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
    return (localStorage.getItem(STORAGE_KEY) as ServiceKey | null) ?? 'catalogo';
}

interface ActiveServiceContextValue {
    activeService: ServiceKey;
    setActiveService: (service: ServiceKey) => void;
}

const ActiveServiceContext = createContext<ActiveServiceContextValue>({
    activeService: 'catalogo',
    setActiveService: () => {},
});

export function ActiveServiceProvider({ children }: { children: React.ReactNode }) {
    const { url } = usePage();
    const [activeService, setActiveServiceState] = useState<ServiceKey>(initialService);

    // React to Inertia soft-navigations: keep the service in sync with the URL
    useEffect(() => {
        const fromUrl = serviceFromPath(url);
        if (fromUrl) {
            setActiveServiceState(fromUrl);
            localStorage.setItem(STORAGE_KEY, fromUrl);
        }
    }, [url]);

    function setActiveService(service: ServiceKey) {
        setActiveServiceState(service);
        localStorage.setItem(STORAGE_KEY, service);
    }

    return <ActiveServiceContext.Provider value={{ activeService, setActiveService }}>{children}</ActiveServiceContext.Provider>;
}

export function useActiveService() {
    return useContext(ActiveServiceContext);
}
