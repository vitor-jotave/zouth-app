import { ImageOff, PackagePlus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { ComboComponentProductOption } from './combo-types';

type ComboProductPickerProps = {
    open: boolean;
    products: ComboComponentProductOption[];
    selectedProductIds: number[];
    onOpenChange: (open: boolean) => void;
    onSelect: (product: ComboComponentProductOption) => void;
};

function formatPrice(priceCents: number | null): string {
    if (priceCents == null) {
        return 'Sob consulta';
    }

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(priceCents / 100);
}

function totalStock(product: ComboComponentProductOption): number {
    if (!product.has_variations) {
        return product.base_quantity;
    }

    return product.variant_stocks.reduce(
        (total, stock) => total + stock.quantity,
        0,
    );
}

export function ComboProductPicker({
    open,
    products,
    selectedProductIds,
    onOpenChange,
    onSelect,
}: ComboProductPickerProps) {
    const [search, setSearch] = useState('');
    const selectedIds = useMemo(
        () => new Set(selectedProductIds),
        [selectedProductIds],
    );
    const filteredProducts = useMemo(() => {
        const query = search.trim().toLocaleLowerCase('pt-BR');

        if (query === '') {
            return products;
        }

        return products.filter((product) =>
            [product.name, product.sku, product.category_name]
                .filter(Boolean)
                .some((value) =>
                    String(value).toLocaleLowerCase('pt-BR').includes(query),
                ),
        );
    }, [products, search]);

    const handleOpenChange = (nextOpen: boolean) => {
        onOpenChange(nextOpen);

        if (!nextOpen) {
            setSearch('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[90vh] gap-0 overflow-hidden rounded-[2px] border-border bg-[#f6f4f0] p-0 shadow-none sm:max-w-4xl">
                <DialogHeader className="border-b border-border px-5 py-5 pr-14 sm:px-7 sm:py-6">
                    <div className="mb-2 flex items-center gap-2 text-[0.68rem] font-bold tracking-[0.2em] text-[#e93d30] uppercase">
                        <PackagePlus className="size-4" aria-hidden="true" />
                        Composição do combo
                    </div>
                    <DialogTitle className="font-zouth-display text-2xl leading-tight font-semibold tracking-[-0.04em] sm:text-3xl">
                        Escolha a próxima peça
                        <span className="text-[#ff4d3d]">.</span>
                    </DialogTitle>
                    <DialogDescription className="max-w-2xl pt-1 leading-6">
                        Procure pela coleção, pelo nome ou pelo SKU. Fotos e
                        vídeos da peça passam a compor a vitrine do combo.
                    </DialogDescription>
                </DialogHeader>

                <div className="border-b border-border px-5 py-4 sm:px-7">
                    <label className="relative block">
                        <span className="sr-only">Buscar peças</span>
                        <Search
                            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                        />
                        <input
                            autoFocus
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar peça, SKU ou categoria"
                            className="h-12 w-full rounded-[2px] border border-border bg-transparent pr-4 pl-11 text-sm outline-none placeholder:text-muted-foreground focus:border-[#18181f] focus:ring-2 focus:ring-[#ff4d3d]/25"
                        />
                    </label>
                </div>

                <div className="max-h-[56vh] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
                    {filteredProducts.length > 0 ? (
                        <div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
                            {filteredProducts.map((product) => {
                                const image = product.media.find(
                                    (media) =>
                                        media.type === 'image' && media.url,
                                );
                                const alreadySelected = selectedIds.has(
                                    product.id,
                                );

                                return (
                                    <button
                                        key={product.id}
                                        type="button"
                                        onClick={() => {
                                            onSelect(product);
                                            handleOpenChange(false);
                                        }}
                                        className="group min-w-0 bg-[#f6f4f0] text-left focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d]"
                                    >
                                        <div className="relative aspect-[4/3] overflow-hidden bg-[#e7e3dc]">
                                            {image?.url ? (
                                                <img
                                                    src={
                                                        image.thumbnail_url ??
                                                        image.url
                                                    }
                                                    alt=""
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025] motion-reduce:transition-none"
                                                />
                                            ) : (
                                                <div className="flex size-full items-center justify-center text-[#7a776f]">
                                                    <ImageOff
                                                        className="size-6"
                                                        aria-hidden="true"
                                                    />
                                                </div>
                                            )}
                                            {alreadySelected && (
                                                <span className="absolute top-3 left-3 bg-[#18181f] px-2.5 py-1 text-[0.62rem] font-bold tracking-[0.1em] text-[#f6f4f0] uppercase">
                                                    Já no combo
                                                </span>
                                            )}
                                            <span className="absolute right-3 bottom-3 bg-[#ff4d3d] px-3 py-1.5 text-xs font-bold text-[#18181f] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                                                Adicionar
                                            </span>
                                        </div>
                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="truncate font-zouth-display text-base font-semibold tracking-[-0.025em]">
                                                        {product.name}
                                                    </p>
                                                    <p className="mt-1 truncate text-xs text-muted-foreground">
                                                        {product.category_name ??
                                                            'Sem categoria'}{' '}
                                                        · {product.sku}
                                                    </p>
                                                </div>
                                                <span className="shrink-0 text-xs font-semibold">
                                                    {totalStock(product)} un.
                                                </span>
                                            </div>
                                            <p className="mt-4 text-sm font-bold">
                                                {formatPrice(
                                                    product.price_cents,
                                                )}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex min-h-64 flex-col items-center justify-center border border-dashed border-border px-6 text-center">
                            <Search
                                className="mb-4 size-6 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <p className="font-zouth-display text-lg font-semibold tracking-[-0.025em]">
                                Nenhuma peça encontrada
                            </p>
                            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                                Tente outro nome, SKU ou categoria da coleção.
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
