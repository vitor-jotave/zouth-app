import { ImageOff, Play } from 'lucide-react';
import type {
    ComboCategoryOption,
    ComboComponentProductOption,
    ComboEditorData,
    InheritedComboMedia,
} from './combo-types';

type ComboLivePreviewProps = {
    data: ComboEditorData;
    categories: ComboCategoryOption[];
    selectedProducts: ComboComponentProductOption[];
    inheritedMedia: InheritedComboMedia[];
    compact?: boolean;
};

function formatDisplayPrice(value: string): string {
    const normalized = Number.parseFloat(value.replace(',', '.'));

    if (Number.isNaN(normalized)) {
        return 'Sob consulta';
    }

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(normalized);
}

export function ComboLivePreview({
    data,
    categories,
    selectedProducts,
    inheritedMedia,
    compact = false,
}: ComboLivePreviewProps) {
    const images = inheritedMedia.filter(
        (media) => media.type === 'image' && media.url,
    );
    const videos = inheritedMedia.filter((media) => media.type === 'video');
    const category = categories.find(
        (item) => item.id === Number(data.product_category_id),
    );
    const visibleImages = images.slice(0, 3);

    return (
        <article className="overflow-hidden border border-border bg-[#fffdf9]">
            <div
                className={`relative grid overflow-hidden bg-[#e7e3dc] ${
                    compact ? 'aspect-[4/3]' : 'aspect-[4/5]'
                } ${
                    visibleImages.length === 2
                        ? 'grid-cols-2'
                        : visibleImages.length > 2
                          ? 'grid-cols-2 grid-rows-2'
                          : ''
                }`}
            >
                {visibleImages.length === 0 ? (
                    <div className="flex size-full flex-col items-center justify-center px-6 text-center text-[#6f6c64]">
                        <ImageOff className="mb-3 size-6" aria-hidden="true" />
                        <p className="font-zouth-display text-sm font-semibold">
                            A vitrine aparece com as peças
                        </p>
                        <p className="mt-1 text-xs leading-5">
                            Adicione produtos com fotos ao combo.
                        </p>
                    </div>
                ) : (
                    visibleImages.map((media, index) => (
                        <div
                            key={media.id}
                            className={
                                visibleImages.length === 1
                                    ? 'size-full'
                                    : visibleImages.length > 2 && index === 0
                                      ? 'row-span-2 min-h-0'
                                      : index > 0
                                        ? 'min-h-0 border-l border-[#fffdf9]'
                                        : 'min-h-0'
                            }
                        >
                            <img
                                src={media.thumbnail_url ?? media.url}
                                alt=""
                                decoding="async"
                                className="size-full object-cover"
                            />
                        </div>
                    ))
                )}

                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    <span
                        className={`inline-flex items-center gap-2 px-2.5 py-1 text-[0.62rem] font-bold tracking-[0.1em] uppercase ${
                            data.is_active
                                ? 'bg-[#f6f4f0] text-[#245845]'
                                : 'bg-[#18181f] text-[#f6f4f0]'
                        }`}
                    >
                        <span
                            className={`size-1.5 rounded-full ${
                                data.is_active ? 'bg-[#2e705a]' : 'bg-[#98968d]'
                            }`}
                            aria-hidden="true"
                        />
                        {data.is_active ? 'Ativo' : 'Oculto'}
                    </span>
                    {videos.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 bg-[#18181f] px-2.5 py-1 text-[0.62rem] font-bold tracking-[0.1em] text-[#f6f4f0] uppercase">
                            <Play
                                className="size-3 fill-current"
                                aria-hidden="true"
                            />
                            {videos.length}{' '}
                            {videos.length === 1 ? 'vídeo' : 'vídeos'}
                        </span>
                    )}
                </div>
            </div>

            <div className={compact ? 'p-4' : 'p-5'}>
                <p className="text-[0.62rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                    Combo · {category?.name ?? 'Coleção'}
                </p>
                <h3
                    className={`mt-3 font-zouth-display font-semibold tracking-[-0.045em] text-foreground ${
                        compact ? 'text-xl' : 'text-[1.65rem] leading-[1.05]'
                    }`}
                >
                    {data.name.trim() || 'Nome do combo'}
                </h3>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
                    {data.description.trim() ||
                        'Uma seleção coordenada, pronta para entrar no pedido.'}
                </p>

                <div className="mt-5 flex items-end justify-between gap-4 border-t border-border pt-4">
                    <div>
                        <p className="text-[0.6rem] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                            Combo completo
                        </p>
                        <p className="mt-1 font-zouth-display text-xl font-bold tracking-[-0.03em]">
                            {formatDisplayPrice(data.price)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="font-zouth-display text-lg font-bold tracking-[-0.025em]">
                            {selectedProducts.length}
                        </p>
                        <p className="text-[0.62rem] font-bold tracking-[0.1em] text-muted-foreground uppercase">
                            {selectedProducts.length === 1 ? 'peça' : 'peças'}
                        </p>
                    </div>
                </div>

                {selectedProducts.length > 0 && !compact && (
                    <div className="mt-5 border-t border-border pt-4">
                        <p className="mb-3 text-[0.6rem] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                            O que vem no combo
                        </p>
                        <ol className="space-y-2">
                            {selectedProducts
                                .slice(0, 4)
                                .map((product, index) => (
                                    <li
                                        key={`${product.id}-${index}`}
                                        className="flex items-center justify-between gap-3 text-xs"
                                    >
                                        <span className="min-w-0 truncate">
                                            {product.name}
                                        </span>
                                        <span className="shrink-0 text-muted-foreground">
                                            ×{' '}
                                            {data.combo_items[index]
                                                ?.quantity ?? 1}
                                        </span>
                                    </li>
                                ))}
                        </ol>
                    </div>
                )}
            </div>
        </article>
    );
}
