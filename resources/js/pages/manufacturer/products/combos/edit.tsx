import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { ProductComboForm } from '@/components/product-combo-form';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface Category {
    id: number;
    name: string;
}

interface ComponentProduct {
    id: number;
    name: string;
    sku: string;
    price_cents: number | null;
    base_quantity: number;
    has_variations: boolean;
    variant_stocks: Array<{
        id: number;
        variation_key: Record<string, string>;
        quantity: number;
        price_cents?: number | null;
        sku_variant?: string | null;
    }>;
}

interface Product {
    id: number;
    name: string;
    sku: string;
    description?: string | null;
    product_category_id?: number | null;
    is_active: boolean;
    sort_order: number;
    price_cents?: number | null;
    media?: Array<{
        id: number;
        type: 'image' | 'video';
        url?: string;
        path: string;
        sort_order: number;
    }>;
    combo_items?: Array<{
        component_product_id: number;
        component_variant_stock_id: number | null;
        quantity: number;
    }>;
}

interface Props {
    product: { data: Product } | Product;
    categories: Category[];
    component_products: ComponentProduct[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Produtos', href: '/manufacturer/products' },
    { title: 'Editar combo', href: '#' },
];

export default function ProductCombosEdit({
    product,
    categories,
    component_products,
}: Props) {
    const resolvedProduct = 'data' in product ? product.data : product;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar combo - ${resolvedProduct.name}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Editar combo
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {resolvedProduct.name}
                        </p>
                    </div>
                    <Link href="/manufacturer/products">
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 size-4" />
                            Voltar
                        </Button>
                    </Link>
                </div>

                <ProductComboForm
                    mode="edit"
                    product={resolvedProduct}
                    categories={categories}
                    componentProducts={component_products}
                />
            </div>
        </AppLayout>
    );
}
