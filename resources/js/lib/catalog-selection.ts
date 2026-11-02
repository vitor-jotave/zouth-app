export interface SavedCatalogSelection {
    product_id: number;
    quantity: number;
    selected_variations: Record<string, string>;
}

export function catalogSelectionCountLabel(lines: number): string {
    return `${lines} ${lines === 1 ? 'seleção' : 'seleções'}`;
}

export function mergeRestoredCatalogSelection<
    T extends { key: string; quantity: number },
>(restored: T[], additions: T[], maximum: (item: T) => number): T[] {
    const merged = new Map(restored.map((item) => [item.key, { ...item }]));
    for (const addition of additions) {
        const existing = merged.get(addition.key);
        if (existing) {
            existing.quantity = Math.min(
                existing.quantity + addition.quantity,
                maximum(existing),
            );
        } else {
            merged.set(addition.key, { ...addition });
        }
    }
    return [...merged.values()];
}

export function parseCatalogSelection(
    raw: string | null,
): SavedCatalogSelection[] {
    if (!raw) return [];
    try {
        const data: unknown = JSON.parse(raw);
        if (!Array.isArray(data)) return [];
        return data.slice(0, 200).flatMap((item) => {
            if (
                !item ||
                !Number.isSafeInteger(item.product_id) ||
                item.product_id < 1 ||
                !Number.isSafeInteger(item.quantity) ||
                item.quantity < 1 ||
                item.quantity > 9999
            )
                return [];
            const values = item.selected_variations;
            if (
                values !== undefined &&
                (!values ||
                    typeof values !== 'object' ||
                    Array.isArray(values) ||
                    Object.entries(values).some(
                        ([key, value]) =>
                            key.length > 255 ||
                            typeof value !== 'string' ||
                            value.length > 255,
                    ))
            )
                return [];
            return [
                {
                    product_id: item.product_id,
                    quantity: item.quantity,
                    selected_variations: values ?? {},
                },
            ];
        });
    } catch {
        return [];
    }
}
