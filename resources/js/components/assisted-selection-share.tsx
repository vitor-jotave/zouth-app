import { Link2 } from 'lucide-react';
import { useState } from 'react';
import { RepresentativeShareLink } from '@/components/representative-share-link';
import { Button } from '@/components/ui/button';
import type { SavedCatalogSelection } from '@/lib/catalog-selection';
import rep from '@/routes/rep';

export function AssistedSelectionShare({
    catalogToken,
    items,
}: {
    catalogToken: string;
    items: SavedCatalogSelection[];
}) {
    const [url, setUrl] = useState<string>();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState('');

    async function createLink() {
        if (pending) return;
        setPending(true);
        setError('');

        try {
            const csrfCookie = document.cookie
                .split('; ')
                .find((cookie) => cookie.startsWith('XSRF-TOKEN='));
            const response = await fetch(
                rep.assistedSelections.store.url(catalogToken),
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-XSRF-TOKEN': decodeURIComponent(
                            csrfCookie?.slice('XSRF-TOKEN='.length) ?? '',
                        ),
                    },
                    body: JSON.stringify({ items }),
                },
            );
            if (response.status === 422) {
                const payload = await response.json();
                const errors: string[][] = Object.values(payload.errors ?? {});
                setError(
                    errors.flat()[0] ?? 'Revise a seleção e tente novamente.',
                );
                return;
            }
            if (!response.ok) throw new Error();
            const payload = (await response.json()) as { url: string };
            setUrl(payload.url);
        } catch {
            setError(
                'Não foi possível gerar o link. Confira se a parceria e o catálogo estão ativos e tente novamente.',
            );
        } finally {
            setPending(false);
        }
    }

    return (
        <div className="grid w-full gap-3">
            <p className="text-sm leading-5 text-[#55514a]">
                O lojista revisa e finaliza a seleção. O link vale por 14 dias e
                não reserva estoque.
            </p>
            {url ? (
                <div
                    role="group"
                    aria-label="Link da seleção pronto"
                    className="grid gap-2"
                >
                    <p role="status" className="text-sm font-semibold">
                        Link pronto para compartilhar.
                    </p>
                    <RepresentativeShareLink
                        url={url}
                        label="Copiar link da seleção"
                        compact
                    />
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-fit text-sm font-semibold underline underline-offset-4 focus-visible:outline-2"
                    >
                        Abrir como lojista
                    </a>
                </div>
            ) : (
                <Button
                    type="button"
                    className="min-h-12 w-full rounded-[2px] bg-[#18181f] text-white hover:bg-[#303039]"
                    disabled={pending}
                    onClick={createLink}
                >
                    <Link2 className="size-4" aria-hidden="true" />
                    {pending ? 'Gerando link…' : 'Gerar link para o lojista'}
                </Button>
            )}
            {error && (
                <p role="alert" className="text-sm text-[#b52e24]">
                    {error}
                </p>
            )}
        </div>
    );
}
