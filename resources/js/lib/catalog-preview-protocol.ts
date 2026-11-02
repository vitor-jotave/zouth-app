export type CatalogPreviewSection = 'hero' | 'collections' | 'product_grid';
export type CatalogPreviewMode = 'edit' | 'test';

export interface CatalogPreviewUpdate {
    type: 'zouth:catalog-preview:update';
    settings: Record<string, unknown>;
    mode: CatalogPreviewMode;
    selectedSection: CatalogPreviewSection | null;
}

export function isCatalogPreviewSection(
    value: unknown,
): value is CatalogPreviewSection {
    return (
        value === 'hero' || value === 'collections' || value === 'product_grid'
    );
}

export function isCatalogPreviewUpdate(
    value: unknown,
): value is CatalogPreviewUpdate {
    if (!value || typeof value !== 'object') return false;
    const message = value as Record<string, unknown>;

    return (
        message.type === 'zouth:catalog-preview:update' &&
        (message.mode === 'edit' || message.mode === 'test') &&
        (message.selectedSection === null ||
            isCatalogPreviewSection(message.selectedSection)) &&
        Boolean(message.settings) &&
        typeof message.settings === 'object' &&
        !Array.isArray(message.settings)
    );
}

export interface PreviewFilters {
    search: string;
    category_id?: string | null;
    variations: Record<string, string[]>;
}

interface PreviewProduct {
    id: number;
    name: string;
    sku: string;
    category_id?: number | null;
    product_type: 'product' | 'combo';
    allow_quote_when_out_of_stock: boolean;
    total_stock: number;
    price_cents?: number | null;
    variant_stocks: Array<{
        variation_key: Record<string, string>;
        quantity: number;
        price_cents?: number | null;
    }>;
    variations: Array<{
        type_name: string;
        values: Array<{ value: string }>;
    }>;
}

interface PreviewCartLine {
    product: PreviewProduct;
    quantity: number;
    selected_variations?: Record<string, string>;
    unit_price_cents?: number | null;
}

export function reconcileCatalogPreviewCart<T extends PreviewCartLine>(
    items: T[],
    products: T['product'][],
    allowOrdersWithoutStock: boolean,
): T[] {
    return items.flatMap((item) => {
        const product = products.find(
            (candidate) => candidate.id === item.product.id,
        );
        if (!product) return [];
        const selectedValues = item.selected_variations ?? {};
        const selectedEntries = Object.entries(selectedValues);
        const stock = product.variant_stocks.find((option) => {
            const entries = Object.entries(option.variation_key);
            return (
                entries.length === selectedEntries.length &&
                entries.every(([name, value]) => selectedValues[name] === value)
            );
        });
        if (product.variant_stocks.length > 0 && !stock) return [];

        const available = stock?.quantity ?? product.total_stock;
        const maximum =
            allowOrdersWithoutStock || product.allow_quote_when_out_of_stock
                ? 9999
                : available;
        if (maximum <= 0) return [];

        return [
            {
                ...item,
                product,
                quantity: Math.max(1, Math.min(item.quantity, maximum)),
                unit_price_cents: stock?.price_cents ?? product.price_cents,
            },
        ];
    });
}

function normalizeSearch(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR');
}

export function matchesCatalogPreviewFilters(
    product: PreviewProduct,
    filters: PreviewFilters,
    variationTypes: Array<{ id: number; name: string }>,
    allowOrdersWithoutStock: boolean,
): boolean {
    const search = normalizeSearch(filters.search.trim());
    if (
        search &&
        ![product.name, product.sku].some((value) =>
            normalizeSearch(value).includes(search),
        )
    )
        return false;
    if (
        filters.category_id &&
        String(product.category_id) !== filters.category_id
    )
        return false;
    if (product.product_type === 'combo') return true;

    return Object.entries(filters.variations).every(([typeId, values]) => {
        const name = variationTypes.find(
            (type) => String(type.id) === typeId,
        )?.name;
        if (!name || values.length === 0) return true;

        return product.variant_stocks.some(
            (stock) =>
                (allowOrdersWithoutStock ||
                    product.allow_quote_when_out_of_stock ||
                    stock.quantity > 0) &&
                values.includes(stock.variation_key[name]),
        );
    });
}

export function catalogPreviewPageNumbers(
    page: number,
    pages: number,
): Array<number | null> {
    const range = (first: number, last: number): number[] =>
        Array.from({ length: last - first + 1 }, (_, index) => first + index);
    if (pages < 14) return range(1, pages);
    if (page <= 7) return [...range(1, 10), null, pages - 1, pages];
    if (page > pages - 7) return [1, 2, null, ...range(pages - 9, pages)];
    return [1, 2, null, ...range(page - 3, page + 3), null, pages - 1, pages];
}

export function catalogPreviewProduct<T extends PreviewProduct>(
    product: T,
    allowOrdersWithoutStock: boolean,
): T {
    if (allowOrdersWithoutStock || product.allow_quote_when_out_of_stock)
        return product;

    return {
        ...product,
        variations: product.variations
            .map((type) => ({
                ...type,
                values: type.values.filter((value) =>
                    product.variant_stocks.some(
                        (stock) =>
                            stock.quantity > 0 &&
                            stock.variation_key[type.type_name] === value.value,
                    ),
                ),
            }))
            .filter((type) => type.values.length > 0),
    };
}
