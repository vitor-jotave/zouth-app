import type { ProductVariantStockValue } from '@/components/product-editor/types';

export function variationDraftKey(key: Record<string, string>): string {
    return JSON.stringify(
        Object.entries(key).sort(([a], [b]) => a.localeCompare(b)),
    );
}

export function rememberVariantDrafts(
    previous: ProductVariantStockValue[],
    current: ProductVariantStockValue[],
): ProductVariantStockValue[] {
    const drafts = new Map(
        previous.map((stock) => [
            variationDraftKey(stock.variation_key),
            stock,
        ]),
    );
    current.forEach((stock) =>
        drafts.set(variationDraftKey(stock.variation_key), {
            ...stock,
            variation_key: { ...stock.variation_key },
        }),
    );
    return [...drafts.values()];
}
