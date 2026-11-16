import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function copyWithSelection(text: string): boolean {
    const focused = document.activeElement;
    const field = document.createElement('textarea');
    field.value = text;
    field.readOnly = true;
    field.tabIndex = -1;
    field.style.cssText =
        'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    document.body.append(field);

    try {
        field.focus({ preventScroll: true });
        field.select();
        field.setSelectionRange(0, text.length);

        return document.execCommand('copy');
    } catch {
        return false;
    } finally {
        field.remove();
        if (focused instanceof HTMLElement) {
            focused.focus({ preventScroll: true });
        }
    }
}

export function RepresentativeShareLink({
    url,
    compact = false,
    label,
}: {
    url: string;
    compact?: boolean;
    label?: string;
}) {
    const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

    useEffect(() => {
        if (status !== 'copied') return;

        const timer = window.setTimeout(() => setStatus('idle'), 2000);

        return () => window.clearTimeout(timer);
    }, [status]);

    return (
        <div className="min-w-0">
            <Button
                type="button"
                variant="outline"
                className={cn(
                    compact &&
                        'min-h-11 w-full rounded-[2px] px-2 shadow-none sm:px-3',
                )}
                onClick={async () => {
                    if (navigator.clipboard?.writeText) {
                        try {
                            await navigator.clipboard.writeText(url);
                            setStatus('copied');
                            return;
                        } catch {
                            // The browser may deny the Clipboard API but allow copying a selection.
                        }
                    }

                    setStatus(copyWithSelection(url) ? 'copied' : 'failed');
                }}
            >
                {status === 'copied' ? (
                    <Check aria-hidden="true" />
                ) : (
                    <Copy aria-hidden="true" />
                )}
                <span
                    aria-live="polite"
                    className={cn(
                        label && 'text-center leading-tight whitespace-normal',
                    )}
                >
                    {status === 'copied'
                        ? 'Link copiado'
                        : (label ??
                          (compact ? 'Copiar link' : 'Copiar meu link'))}
                </span>
            </Button>
            {status === 'failed' && (
                <>
                    <p
                        role="status"
                        className="mt-1.5 text-xs text-muted-foreground"
                    >
                        Não foi possível copiar. Selecione o link abaixo.
                    </p>
                    <input
                        aria-label="Seu link rastreável"
                        className="w-full border p-1"
                        readOnly
                        value={url}
                        onFocus={(event) => event.currentTarget.select()}
                    />
                </>
            )}
        </div>
    );
}
