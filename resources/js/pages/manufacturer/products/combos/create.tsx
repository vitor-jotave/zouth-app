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

interface Props {
    categories: Category[];
    component_products: ComponentProduct[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Produtos', href: '/manufacturer/products' },
    { title: 'Novo combo', href: '/manufacturer/products/combos/create' },
];

export default function ProductCombosCreate({
    categories,
    component_products,
}: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Novo combo" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Novo combo
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Monte um combo vendável usando produtos cadastrados
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
                    mode="create"
                    categories={categories}
                    componentProducts={component_products}
                />
            </div>
        </AppLayout>
    );
}
