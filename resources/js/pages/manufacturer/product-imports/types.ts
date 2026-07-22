export type ImportStatus =
    | 'uploaded'
    | 'mapping'
    | 'validating'
    | 'ready'
    | 'processing'
    | 'completed'
    | 'completed_with_errors'
    | 'failed'
    | 'cancelled';

export type ImportSummary = {
    rows?: number;
    products?: number;
    create?: number;
    update?: number;
    unchanged?: number;
    errors?: number;
    warnings?: number;
    images?: number;
    new_taxonomies?: number;
    processed?: number;
    failed?: number;
};

export type ImportRow = {
    id: number;
    row_number: number;
    product_sku: string | null;
    variant_identity: string | null;
    action: string;
    source: Record<string, unknown>;
    normalized: {
        sku: string;
        name: string;
        description: string;
        category: string;
        is_active: boolean | null;
        price_cents: number | null;
        stock: number | null;
        variant_sku: string;
        variant_price_cents: number | null;
        variant_stock: number | null;
        variations: Array<{ type: string; value: string }>;
        image_urls: string[];
    };
    errors: string[];
    warnings: string[];
    product_id: number | null;
    processed_at: string | null;
};

export type ProductImport = {
    id: number;
    status: ImportStatus;
    status_label: string;
    source_name: string;
    source_extension: string;
    has_image_archive: boolean;
    headers: string[];
    mapping: Record<string, string>;
    summary: ImportSummary;
    taxonomy_preview: {
        categories: string[];
        variation_types: string[];
        variation_values: Array<{ type: string; value: string }>;
    };
    errors: string[];
    preview_signature: string | null;
    progress: number;
    error_message: string | null;
    created_at: string | null;
    created_at_label: string | null;
    validated_at: string | null;
    completed_at: string | null;
    rows?: ImportRow[];
};

export type MappingField = {
    key: string;
    label: string;
    group: string;
    required?: boolean;
};

export type Paginated<T> = {
    data: T[];
    links?: Array<{ url: string | null; label: string; active: boolean }>;
    meta?: {
        total: number;
        from: number | null;
        to: number | null;
        current_page: number;
        last_page: number;
        links?: Array<{ url: string | null; label: string; active: boolean }>;
    };
};
