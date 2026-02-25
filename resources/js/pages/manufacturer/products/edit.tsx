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

interface Product {
    id: number;
    name: string;
    sku: string;
    description?: string | null;
    product_category_id?: number | null;
    has_size_variants: boolean;
    has_color_variants: boolean;
    base_quantity: number;
    is_active: boolean;
    sort_order: number;
    colors?: Array<{ id: number; name: string; hex?: string | null }>;
    media?: Array<{ id: number; type: 'image' | 'video'; path: string; sort_order: number }>;
    variant_stocks?: Array<{
        id: number;
        size?: string | null;
        product_color_id?: number | null;
        quantity: number;
        sku_variant?: string | null;
    }>;
}

interface StockStructure {
    has_size_variants: boolean;
    has_color_variants: boolean;
    base_quantity: number;
    sizes: string[];
    colors: Array<{ id: number; name: string; hex?: string | null }>;
    stocks: Array<{
        id: number;
        size?: string | null;
        color?: { id: number; name: string; hex?: string | null } | null;
        quantity: number;
        sku_variant?: string | null;
    }>;
}

interface Props {
    product: { data: Product } | Product;
    categories: Category[];
    sizes: string[];
    stock_structure: StockStructure;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Produtos', href: '/manufacturer/products' },
    { title: 'Editar produto', href: '#' },
];

export default function ProductsEdit({ product, categories, sizes, stock_structure }: Props) {
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
                    sizes={sizes}
                    stockStructure={stock_structure}
                />
            </div>
        </AppLayout>
    );
}
