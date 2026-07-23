export type ProductEditorMode = 'create' | 'edit';

export interface ProductCategoryOption {
    id: number;
    name: string;
}

export interface ProductMediaItem {
    id: number;
    type: 'image' | 'video';
    path: string;
    url?: string;
    thumbnail_url?: string;
    width?: number | null;
    height?: number | null;
    sort_order: number;
}

export interface ProductVariationValue {
    id: number;
    value: string;
    hex?: string | null;
    image_url?: string | null;
}

export interface ProductVariationTypeOption {
    id: number;
    name: string;
    is_color_type: boolean;
    values: ProductVariationValue[];
}

export interface ProductVariationSelection {
    variation_type_id: number;
    values: string[];
}

export interface ProductVariantStockValue {
    variation_key: Record<string, string>;
    quantity: number;
    price: string;
    sku_variant?: string | null;
}

export interface ProductEditorPayload {
    id: number;
    name: string;
    sku: string;
    description?: string | null;
    video_url?: string | null;
    product_category_id?: number | null;
    base_quantity: number;
    is_active: boolean;
    allow_quote_when_out_of_stock: boolean;
    sort_order: number;
    price_cents?: number | null;
    media?: ProductMediaItem[];
    variations?: Array<{
        id: number;
        variation_type_id: number;
        type?: {
            id: number;
            name: string;
            is_color_type: boolean;
            values: ProductVariationValue[];
        } | null;
    }>;
    variant_stocks?: Array<{
        id: number;
        variation_key: Record<string, string>;
        quantity: number;
        price_cents?: number | null;
        sku_variant?: string | null;
    }>;
}

export interface ProductStockStructure {
    variations: Array<{
        id: number;
        type: {
            id: number;
            name: string;
            is_color_type: boolean;
        };
        values: ProductVariationValue[];
    }>;
    base_quantity: number;
    stocks: Array<{
        id: number;
        variation_key: Record<string, string>;
        quantity: number;
        price_cents?: number | null;
        sku_variant?: string | null;
    }>;
}

export interface ProductEditorData {
    name: string;
    sku: string;
    description: string;
    product_category_id: string | number;
    base_quantity: number;
    is_active: boolean;
    allow_quote_when_out_of_stock: boolean;
    sort_order: number;
    price: string;
    video_url: string;
    variations: ProductVariationSelection[];
    variant_stocks: ProductVariantStockValue[];
    images: File[];
}

export type ProductEditorErrors = Partial<Record<string, string>>;
