import { ImageIcon, Layers3 } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { StatusLabel } from '@/components/status-label';
import { cn } from '@/lib/utils';
import type {
    ProductCategoryOption,
    ProductEditorData,
    ProductMediaItem,
} from './types';

type ProductLivePreviewProps = {
    data: ProductEditorData;
    categories: ProductCategoryOption[];
    mediaItems: ProductMediaItem[];
    variationCount: number;
    compact?: boolean;
};

function formatPrice(value: string): string {
    const normalized = Number(
        value
            .replace(/\./g, '')
            .replace(',', '.')
            .replace(/[^0-9.-]/g, ''),
    );

    if (!Number.isFinite(normalized) || value.trim() === '') {
        return 'Sob consulta';
    }

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(normalized);
}

export function ProductLivePreview({
    data,
    categories,
    mediaItems,
    variationCount,
    compact = false,
}: ProductLivePreviewProps) {
    const stagedImage = data.images[0];
    const stagedImageUrl = useMemo(
        () => (stagedImage ? URL.createObjectURL(stagedImage) : null),
        [stagedImage],
    );

    useEffect(() => {
        return () => {
            if (stagedImageUrl) {
                URL.revokeObjectURL(stagedImageUrl);
            }
        };
    }, [stagedImageUrl]);

    const existingImage = mediaItems.find(
        (media) => media.type === 'image' && media.url,
    );
    const previewUrl =
        stagedImageUrl ??
        (compact ? existingImage?.thumbnail_url : existingImage?.url) ??
        existingImage?.url;
    const categoryName =
        categories.find(
            (category) =>
                String(category.id) === String(data.product_category_id),
        )?.name ?? 'Sem categoria';
    const imageCount =
        data.images.length +
        mediaItems.filter((media) => media.type === 'image').length;

    return (
        <article
            className={cn(
                'overflow-hidden border border-border bg-[#f6f4f0]',
                compact && 'grid grid-cols-[104px_minmax(0,1fr)]',
            )}
        >
            <div
                className={cn(
                    'relative overflow-hidden bg-[#e7e3dc]',
                    compact ? 'min-h-36' : 'aspect-[4/5]',
                )}
            >
                {previewUrl ? (
                    <img
                        src={previewUrl}
                        alt={`Prévia de ${data.name || 'produto sem nome'}`}
                        decoding="async"
                        fetchPriority={compact ? 'auto' : 'high'}
                        className="size-full object-cover"
                    />
                ) : (
                    <div className="flex size-full min-h-56 flex-col items-center justify-center px-6 text-center">
                        <img
                            src="/brand/zouth/assets/symbol-duotone-dark.png"
                            alt=""
                            className="h-auto w-11 opacity-55"
                        />
                        <p className="mt-4 text-[0.65rem] font-bold tracking-[0.14em] text-[#6f6c65] uppercase">
                            A primeira foto vira capa
                        </p>
                    </div>
                )}
            </div>

            <div className={cn('p-5 sm:p-6', compact && 'p-4 sm:p-4')}>
                <h3
                    className={cn(
                        'font-zouth-display text-xl leading-tight font-semibold tracking-[-0.035em] text-foreground',
                        compact && 'text-base',
                    )}
                >
                    {data.name.trim() || 'Nome da peça'}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    {categoryName}
                </p>
                <p
                    className={cn(
                        'mt-4 font-zouth-display text-xl font-bold tracking-[-0.03em] text-foreground tabular-nums',
                        compact && 'mt-3 text-base',
                    )}
                >
                    {formatPrice(data.price)}
                </p>

                {!compact && (
                    <>
                        <div className="my-5 border-t border-border" />
                        <StatusLabel
                            tone={data.is_active ? 'mineral' : 'muted'}
                        >
                            {data.is_active
                                ? 'Disponível no catálogo'
                                : 'Oculto no catálogo'}
                        </StatusLabel>
                        {data.allow_quote_when_out_of_stock && (
                            <p className="mt-3 border-l-2 border-[#ff4d3d] pl-3 text-xs leading-5 text-muted-foreground">
                                Continua disponível para orçamento quando o
                                estoque terminar.
                            </p>
                        )}
                        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
                            <span className="inline-flex items-center gap-2">
                                <ImageIcon
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                {imageCount}{' '}
                                {imageCount === 1 ? 'foto' : 'fotos'}
                            </span>
                            <span className="inline-flex items-center gap-2">
                                <Layers3
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                {variationCount > 0
                                    ? `${variationCount} combinações`
                                    : 'Peça única'}
                            </span>
                        </div>
                    </>
                )}
            </div>
        </article>
    );
}
