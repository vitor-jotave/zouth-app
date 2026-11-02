import { Loader2, RefreshCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import manufacturer from '@/routes/manufacturer';

export type CatalogSectionType = 'hero' | 'collections' | 'product_grid';

export interface CatalogSection {
    type: CatalogSectionType;
    enabled: boolean;
    props?: Record<string, string | number | boolean | null>;
}

interface CatalogPreviewProps {
    settings: Record<string, unknown>;
    viewport?: 'desktop' | 'mobile';
    height?: number;
    mode?: 'edit' | 'test';
    selectedSection?: CatalogSectionType | null;
    onSelectSection?: (section: CatalogSectionType) => void;
}

/** The studio embeds the public page itself, with an isolated shopping session. */
export default function CatalogPreview({
    settings,
    viewport = 'desktop',
    height,
    mode = 'edit',
    selectedSection = null,
    onSelectSection,
}: CatalogPreviewProps) {
    const frame = useRef<HTMLIFrameElement>(null);
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const message = useRef({ settings, mode, selectedSection });

    useEffect(() => {
        message.current = { settings, mode, selectedSection };
        if (ready) {
            frame.current?.contentWindow?.postMessage(
                { type: 'zouth:catalog-preview:update', ...message.current },
                window.location.origin,
            );
        }
    }, [settings, mode, selectedSection, ready]);

    useEffect(() => {
        const receive = (event: MessageEvent) => {
            if (
                event.origin !== window.location.origin ||
                event.source !== frame.current?.contentWindow ||
                !event.data ||
                typeof event.data !== 'object'
            ) {
                return;
            }
            if (event.data.type === 'zouth:catalog-preview:ready') {
                setReady(true);
                setFailed(false);
                frame.current?.contentWindow?.postMessage(
                    {
                        type: 'zouth:catalog-preview:update',
                        ...message.current,
                    },
                    window.location.origin,
                );
            }
            if (
                event.data.type === 'zouth:catalog-preview:select' &&
                ['hero', 'collections', 'product_grid'].includes(
                    event.data.section,
                )
            ) {
                onSelectSection?.(event.data.section);
            }
        };
        window.addEventListener('message', receive);
        return () => window.removeEventListener('message', receive);
    }, [onSelectSection]);

    useEffect(() => {
        if (ready) {
            return;
        }
        const timeout = window.setTimeout(() => setFailed(true), 20000);
        return () => window.clearTimeout(timeout);
    }, [ready, attempt]);

    return (
        <div
            className="relative bg-white"
            style={{ height: height ?? (viewport === 'mobile' ? 844 : 1024) }}
        >
            {!ready && (
                <div
                    role="status"
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#f6f4f0] p-8 text-center text-[#18181f]"
                >
                    {failed ? (
                        <>
                            <p>
                                Não foi possível abrir a prévia. Suas alterações
                                continuam aqui.
                            </p>
                            <button
                                type="button"
                                className="flex min-h-11 items-center gap-2 border border-current px-4"
                                onClick={() => {
                                    setFailed(false);
                                    setReady(false);
                                    setAttempt((value) => value + 1);
                                }}
                            >
                                <RefreshCcw className="size-4" /> Tentar
                                novamente
                            </button>
                        </>
                    ) : (
                        <>
                            <Loader2 className="size-6 animate-spin motion-reduce:animate-none" />
                            <p>Preparando sua vitrine…</p>
                        </>
                    )}
                </div>
            )}
            <iframe
                key={attempt}
                ref={frame}
                src={manufacturer.catalogSettings.preview.url()}
                title={`Prévia interativa do catálogo — ${viewport === 'mobile' ? 'celular' : 'computador'}`}
                data-testid="catalog-preview-frame"
                className="block h-full border-0"
                style={{ width: viewport === 'mobile' ? 390 : 1440 }}
                sandbox="allow-scripts allow-same-origin"
                onError={() => setFailed(true)}
            />
        </div>
    );
}
