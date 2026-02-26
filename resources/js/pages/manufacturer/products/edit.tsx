import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { ProductForm } from '@/components/product-form';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface Category {
    id: number;
    name: string;
}

interface VariationTypeOption {
    id: number;
    name: string;
    is_color_type: boolean;
    values: Array<{ id: number; value: string; hex?: string | null }>;
}

interface Product {
    id: number;
    name: string;
    sku: string;
    description?: string | null;
    product_category_id?: number | null;
    base_quantity: number;
    is_active: boolean;
    sort_order: number;
    price_cents?: number | null;
    media?: Array<{ id: number; type: 'image' | 'video'; path: string; url?: string; sort_order: number }>;
    variations?: Array<{
        id: number;
        variation_type_id: number;
        type?: {
            id: number;
            name: string;
            is_color_type: boolean;
            values: Array<{ id: number; value: string; hex?: string | null }>;
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

interface StockStructure {
    variations: Array<{
        id: number;
        type: {
            id: number;
            name: string;
            is_color_type: boolean;
        };
        values: Array<{ id: number; value: string; hex?: string | null }>;
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

interface Props {
    product: { data: Product } | Product;
    categories: Category[];
    variation_types: VariationTypeOption[];
    stock_structure: StockStructure;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Produtos', href: '/manufacturer/products' },
    { title: 'Editar produto', href: '#' },
];

export default function ProductsEdit({ product, categories, variation_types, stock_structure }: Props) {
    const resolvedProduct = 'data' in product ? product.data : product;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar produto - ${resolvedProduct.name}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Editar produto
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {resolvedProduct.name}
                        </p>
                    </div>
                    <Link href="/manufacturer/products">
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar
                        </Button>
                    </Link>
                </div>

                <ProductForm
                    mode="edit"
                    product={resolvedProduct}
                    categories={categories}
                    variationTypes={variation_types}
                    stockStructure={stock_structure}
                />
            </div>
        </AppLayout>
    );
}
