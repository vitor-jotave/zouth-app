import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ArrowUpDown } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useActiveService } from '@/contexts/active-service-context';

gsap.registerPlugin(useGSAP);

const SERVICES = [
    { key: 'catalogo', label: 'Catálogo', color: '#C1564B' },
    { key: 'atendimento', label: 'Atendimento', color: '#2D9E6A' },
    { key: 'membros', label: 'Membros', color: '#3B7DD8' },
] as const;

type ServiceKey = (typeof SERVICES)[number]['key'];

export default function ZouthLogoPicker() {
    const { activeService: activeKey, setActiveService } = useActiveService();
    const [open, setOpen] = useState(false);
    const labelRef = useRef<HTMLSpanElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const itemsRef = useRef<HTMLButtonElement[]>([]);
    const prevKeyRef = useRef<ServiceKey>(activeKey);

    const activeService = SERVICES.find((s) => s.key === activeKey)!;

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Menu open/close animation
    useGSAP(
        () => {
            if (!menuRef.current) return;
            const items = itemsRef.current.filter(Boolean);
            if (open) {
                gsap.set(menuRef.current, { display: 'flex' });
                gsap.fromTo(menuRef.current, { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.15, ease: 'power2.out' });
                gsap.fromTo(items, { y: 10, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.07, duration: 0.25, ease: 'power2.out' });
            } else {
                gsap.to(items, {
                    y: 6,
                    opacity: 0,
                    stagger: 0.04,
                    duration: 0.12,
                    ease: 'power1.in',
                    onComplete: () => {
                        if (menuRef.current) {
                            gsap.set(menuRef.current, { display: 'none' });
                        }
                    },
                });
            }
        },
        { dependencies: [open], scope: containerRef },
    );

    // Animate the label whenever the active service changes (from picker, URL, or reload)
    useEffect(() => {
        if (prevKeyRef.current === activeKey) return;
        prevKeyRef.current = activeKey;
        gsap.fromTo(labelRef.current, { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.28, ease: 'power2.out' });
    }, [activeKey]);

    const handleSelect = useCallback(
        (key: ServiceKey) => {
            setOpen(false);
            if (key === activeKey) return;
            gsap.to(labelRef.current, {
                y: -8,
                opacity: 0,
                duration: 0.18,
                ease: 'power2.in',
                onComplete: () => setActiveService(key),
            });
        },
        [activeKey, setActiveService],
    );

    return (
        <div ref={containerRef} className="relative inline-block">
            <span
                style={{ fontSize: '25px', letterSpacing: '-1px', paddingRight: '1px', paddingBottom: '2px' }}
                className="inline-block select-none font-bold leading-tight overflow-visible"
            >
                Zouth
                <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex cursor-pointer items-center gap-1 focus:outline-none">
                    <span ref={labelRef} style={{ color: activeService.color }} className="font-normal">
                        {activeService.label}
                    </span>
                    <ArrowUpDown
                        size={12}
                        style={{ marginTop: '3px' }}
                        className="shrink-0 opacity-30"
                    />
                </button>
            </span>

            <div
                ref={menuRef}
                style={{ display: 'none' }}
                className="absolute left-0 top-full z-50 mt-2 flex min-w-max flex-col gap-0.5 rounded-xl border border-gray-100 bg-white p-2 shadow-lg"
            >
                {SERVICES.map((service, i) => (
                    <button
                        key={service.key}
                        ref={(el) => {
                            if (el) itemsRef.current[i] = el;
                        }}
                        type="button"
                        onClick={() => handleSelect(service.key)}
                        className={`rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-50 ${activeKey === service.key ? 'bg-gray-50' : ''}`}
                    >
                        <span
                            style={{
                                fontSize: '18px',
                                letterSpacing: '-0.5px',
                                fontWeight: 700,
                                lineHeight: 1.2,
                                paddingBottom: '1px',
                                display: 'inline-block',
                            }}
                        >
                            Zouth<span style={{ color: service.color, fontWeight: 400 }}>{service.label}</span>
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
