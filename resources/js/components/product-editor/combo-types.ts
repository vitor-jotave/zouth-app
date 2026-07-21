export interface ComboCategoryOption {
    id: number;
    name: string;
}

export interface ComboMediaItem {
    id: number;
    product_id?: number;
    type: 'image' | 'video';
    path: string;
    url?: string;
    thumbnail_url?: string;
    width?: number | null;
    height?: number | null;
    sort_order: number;
}

export interface ComboVariantStockOption {
    id: number;
    variation_key: Record<string, string>;
    quantity: number;
    price_cents?: number | null;
    sku_variant?: string | null;
}

export interface ComboComponentProductOption {
    id: number;
    name: string;
    sku: string;
    price_cents: number | null;
    base_quantity: number;
    category_name?: string | null;
    media: ComboMediaItem[];
    has_variations: boolean;
    variant_stocks: ComboVariantStockOption[];
}

export interface ComboItemValue {
    component_product_id: string | number;
    component_variant_stock_id: string | number | null;
    quantity: number;
}

export interface ProductComboPayload {
    id: number;
    name: string;
    sku: string;
    description?: string | null;
    product_category_id?: number | null;
    is_active: boolean;
    sort_order: number;
    price_cents?: number | null;
    media?: ComboMediaItem[];
    combo_items?: Array<{
        component_product_id: number;
        component_variant_stock_id: number | null;
        quantity: number;
    }>;
}

export interface ComboEditorData {
    name: string;
    sku: string;
    description: string;
    product_category_id: string | number;
    price: string;
    is_active: boolean;
    sort_order: number;
    combo_items: ComboItemValue[];
}

export interface InheritedComboMedia extends ComboMediaItem {
    sourceProductId: number;
    sourceProductName: string;
}
