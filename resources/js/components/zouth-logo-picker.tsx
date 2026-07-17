import { ArrowUpDown } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useActiveService } from '@/contexts/active-service-context';

const SERVICES = [
    { key: 'catalogo', label: 'Catálogo', color: '#C1564B' },
    { key: 'atendimento', label: 'Atendimento', color: '#2D9E6A' },
] as const;

type ServiceKey = (typeof SERVICES)[number]['key'];

export default function ZouthLogoPicker() {
    const { activeService: activeKey, setActiveService } = useActiveService();
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const activeService = SERVICES.find(
        (service) => service.key === activeKey,
    )!;

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
        <div ref={containerRef} className="relative inline-block">
            <span className="inline-block text-2xl leading-none font-bold select-none">
                Zouth
                <button
                    type="button"
                    onClick={() => setOpen((value) => !value)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                    aria-label="Selecionar módulo do Zouth"
                    aria-expanded={open}
                    aria-haspopup="menu"
                >
                    <span
                        style={{ color: activeService.color }}
                        className="font-normal transition-colors"
                    >
                        {activeService.label}
                    </span>
                    <ArrowUpDown
                        size={12}
                        className="mt-0.5 shrink-0 opacity-40"
                        aria-hidden="true"
                    />
                </button>
            </span>

            {open && (
                <div
                    role="menu"
                    className="absolute top-full left-0 z-50 mt-2 flex min-w-max flex-col gap-0.5 rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg"
                >
                    {SERVICES.map((service) => (
                        <button
                            key={service.key}
                            type="button"
                            role="menuitemradio"
                            aria-checked={activeKey === service.key}
                            onClick={() => handleSelect(service.key)}
                            className={`rounded-md px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-2 ${activeKey === service.key ? 'bg-muted' : ''}`}
                        >
                            <span className="inline-block text-lg leading-tight font-bold">
                                Zouth
                                <span
                                    style={{ color: service.color }}
                                    className="font-normal"
                                >
                                    {service.label}
                                </span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
