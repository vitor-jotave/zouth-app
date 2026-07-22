import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Save } from 'lucide-react';
import { AppPageHeader } from '@/components/app-page-header';
import {
    PRODUCT_COMBO_EDITOR_FORM_ID,
    ProductComboForm,
} from '@/components/product-combo-form';
import type {
    ComboCategoryOption,
    ComboComponentProductOption,
    ProductComboPayload,
} from '@/components/product-editor/combo-types';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import manufacturer from '@/routes/manufacturer';
import type { BreadcrumbItem } from '@/types';

interface Props {
    product: { data: ProductComboPayload } | ProductComboPayload;
    categories: ComboCategoryOption[];
    component_products: ComboComponentProductOption[];
}

export default function ProductCombosEdit({
    product,
    categories,
    component_products,
}: Props) {
    const resolvedProduct = 'data' in product ? product.data : product;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Visão geral', href: dashboard().url },
        { title: 'Produtos', href: manufacturer.products.index().url },
        {
            title: resolvedProduct.name,
            href: manufacturer.products.combos.edit(resolvedProduct.id).url,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${resolvedProduct.name}`} />

            <div className="mx-auto flex w-full max-w-[1560px] flex-1 flex-col px-5 py-8 sm:px-7 md:px-9 lg:pt-8 lg:pb-12 xl:px-12 2xl:px-14">
                <AppPageHeader
                    eyebrow="Edição do combo"
                    title={
                        <>
                            {resolvedProduct.name}
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description="Refine a seleção, as quantidades e as informações do conjunto. O catálogo atualiza automaticamente."
                    aside={
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                            <Button
                                type="submit"
                                form={PRODUCT_COMBO_EDITOR_FORM_ID}
                                className="min-h-12 rounded-[2px] bg-[#ff4d3d] text-[#18181f] shadow-none hover:-translate-y-px hover:bg-[#ff4d3d]"
                            >
                                <Save className="size-4" aria-hidden="true" />
                                Salvar alterações
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="min-h-12 rounded-[2px] border-[#18181f] bg-transparent shadow-none hover:bg-[#e7e3dc]"
                            >
                                <Link href={manufacturer.products.index().url}>
                                    <ArrowLeft
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Voltar para produtos
                                </Link>
                            </Button>
                        </div>
                    }
                />

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
