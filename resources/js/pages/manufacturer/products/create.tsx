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

interface Props {
    categories: Category[];
    sizes: string[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Produtos', href: '/manufacturer/products' },
    { title: 'Novo produto', href: '/manufacturer/products/create' },
];

export default function ProductsCreate({ categories, sizes }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Novo produto" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Novo produto
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Cadastre um novo item no catalogo
                        </p>
                    </div>
                    <Link href="/manufacturer/products">
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar
                        </Button>
                    </Link>
                </div>

                <ProductForm mode="create" categories={categories} sizes={sizes} />
            </div>
        </AppLayout>
    );
}
