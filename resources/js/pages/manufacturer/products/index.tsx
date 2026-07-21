import { Head, Link, router } from '@inertiajs/react';
import {
    MoreHorizontal,
    PackagePlus,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppPageHeader } from '@/components/app-page-header';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { ResourceInspector } from '@/components/resource-inspector';
import { ResourceToolbar } from '@/components/resource-toolbar';
import { StatusLabel } from '@/components/status-label';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetTitle,
} from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import manufacturer from '@/routes/manufacturer';
import type { BreadcrumbItem } from '@/types';

type Category = {
    id: number;
    name: string;
};

type ProductMedia = {
    id: number;
    type: 'image' | 'video';
    path: string;
    url?: string;
    thumbnail_url?: string;
};

type Product = {
    id: number;
    product_type: 'product' | 'combo';
    name: string;
    sku: string;
    is_active: boolean;
    total_stock: number;
    price_cents?: number | null;
    category?: { id: number; name: string } | null;
    media?: ProductMedia[];
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Paginated<T> = {
    data: T[];
    links?: PaginationLink[];
    meta?: {
        total: number;
        from: number | null;
        to: number | null;
        current_page: number;
        last_page: number;
        links?: PaginationLink[];
    };
};

type Props = {
    products: Paginated<Product>;
    categories: Category[];
    product_counts: {
        total: number;
        products: number;
        combos: number;
    };
    filters: {
        search?: string | null;
        product_type?: 'product' | 'combo' | string | null;
        category_id?: string | number | null;
        is_active?: string | boolean | null;
    };
};

type FilterPayload = Record<
    string,
    string | number | boolean | null | undefined
>;

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Visão geral', href: dashboard().url },
    { title: 'Produtos', href: manufacturer.products.index().url },
];

function formatPrice(priceCents?: number | null): string {
    if (priceCents == null) {
        return 'Sob consulta';
    }

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(priceCents / 100);
}

function primaryImage(product: Product): ProductMedia | undefined {
    return product.media?.find(
        (media) => media.type === 'image' && Boolean(media.url),
    );
}

function productEditUrl(product: Product): string {
    return product.product_type === 'combo'
        ? manufacturer.products.combos.edit(product.id).url
        : manufacturer.products.edit(product.id).url;
}

function normalizedStatusFilter(
    value: Props['filters']['is_active'],
): 'all' | 'true' | 'false' {
    if (value === true || value === 'true') {
        return 'true';
    }

    if (value === false || value === 'false') {
        return 'false';
    }

    return 'all';
}

function ProductImage({
    product,
    variant = 'tile',
}: {
    product: Product;
    variant?: 'tile' | 'inspector';
}) {
    const image = primaryImage(product);
    const imageUrl =
        variant === 'tile'
            ? (image?.thumbnail_url ?? image?.url)
            : (image?.url ?? image?.thumbnail_url);

    if (!imageUrl) {
        return (
            <div
                role="img"
                aria-label={`${product.name} ainda não tem fotografia cadastrada`}
                className={cn(
                    'flex flex-col items-center justify-center bg-[#e7e3dc]/70 px-6 text-center',
                    variant === 'tile' ? 'aspect-[4/3]' : 'aspect-[4/5]',
                )}
            >
                <img
                    src="/brand/zouth/assets/symbol-duotone-dark.png"
                    alt=""
                    className="h-auto w-10 opacity-55"
                />
                <p className="mt-4 text-[0.68rem] font-bold tracking-[0.14em] text-[#6f6c65] uppercase">
                    Sem fotografia
                </p>
            </div>
        );
    }

    return (
        <img
            src={imageUrl}
            alt={product.name}
            loading={variant === 'tile' ? 'lazy' : 'eager'}
            decoding="async"
            className={cn(
                'size-full bg-[#e7e3dc] object-cover',
                variant === 'tile' ? 'aspect-[4/3]' : 'aspect-[4/5]',
            )}
        />
    );
}

function ProductTile({
    product,
    isSelected,
    onSelect,
    onDelete,
}: {
    product: Product;
    isSelected: boolean;
    onSelect: (product: Product) => void;
    onDelete: (product: Product) => void;
}) {
    const stockLabel =
        product.total_stock > 0 ? `${product.total_stock} un.` : 'Sem estoque';
    const category = product.category?.name ?? 'Sem categoria';

    return (
        <article
            className={cn(
                'group min-w-0 border bg-background transition-colors',
                isSelected
                    ? 'border-[#ff4d3d]'
                    : 'border-border hover:border-[#98968d]',
            )}
        >
            <div className="relative overflow-hidden bg-[#e7e3dc]">
                <ProductImage product={product} />
                <button
                    type="button"
                    onClick={() => onSelect(product)}
                    aria-label={`Ver detalhes de ${product.name}`}
                    aria-pressed={isSelected}
                    className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#ff4d3d]"
                />
            </div>

            <div className="px-3 py-3.5">
                <button
                    type="button"
                    onClick={() => onSelect(product)}
                    className="line-clamp-2 min-h-11 w-full text-left font-zouth-display text-sm leading-[1.2] font-semibold tracking-[-0.02em] text-foreground hover:text-[#c53024] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d] sm:text-base"
                >
                    {product.name}
                </button>

                <p className="mt-1.5 truncate text-xs text-muted-foreground">
                    {product.product_type === 'combo'
                        ? 'Combo'
                        : `SKU ${product.sku}`}
                    <span aria-hidden="true"> · </span>
                    {category}
                </p>

                <div className="mt-3 flex items-center justify-between gap-3 font-zouth-display text-sm font-semibold tracking-[-0.015em] text-foreground tabular-nums">
                    <span
                        className={cn(
                            product.price_cents == null &&
                                'font-zouth-body text-xs font-medium text-muted-foreground',
                        )}
                    >
                        {formatPrice(product.price_cents)}
                    </span>
                    <span
                        className={cn(
                            'shrink-0',
                            product.total_stock === 0 && 'text-[#c53024]',
                        )}
                    >
                        {stockLabel}
                    </span>
                </div>

                <div className="mt-3 flex min-h-11 items-center justify-between gap-3 border-t border-border pt-2.5">
                    <StatusLabel
                        tone={product.is_active ? 'mineral' : 'muted'}
                        className="bg-transparent px-0"
                    >
                        <span
                            aria-hidden="true"
                            className={cn(
                                'mr-2 size-1.5 rounded-full',
                                product.is_active
                                    ? 'bg-[#2e705a]'
                                    : 'bg-[#98968d]',
                            )}
                        />
                        {product.is_active ? 'Ativo' : 'Inativo'}
                    </StatusLabel>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="min-h-11 min-w-11 rounded-[2px] hover:bg-[#e7e3dc]"
                                aria-label={`Ações para ${product.name}`}
                            >
                                <MoreHorizontal
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-44">
                            <DropdownMenuItem asChild className="min-h-11">
                                <Link href={productEditUrl(product)}>
                                    <Pencil
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Editar
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                variant="destructive"
                                className="min-h-11"
                                onSelect={() => onDelete(product)}
                            >
                                <Trash2 className="size-4" aria-hidden="true" />
                                Excluir
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </article>
    );
}

function ProductInspector({
    product,
    onDelete,
    className,
}: {
    product: Product;
    onDelete: (product: Product) => void;
    className?: string;
}) {
    return (
        <ResourceInspector
            className={className}
            eyebrow={
                product.product_type === 'combo'
                    ? 'Combo selecionado'
                    : 'Peça selecionada'
            }
            media={
                <div className="overflow-hidden bg-[#e7e3dc]">
                    <ProductImage product={product} variant="inspector" />
                </div>
            }
            title={product.name}
            status={
                <StatusLabel tone={product.is_active ? 'mineral' : 'muted'}>
                    {product.is_active ? 'Ativo' : 'Inativo'}
                </StatusLabel>
            }
            details={[
                { label: 'SKU', value: product.sku },
                {
                    label: 'Categoria',
                    value: product.category?.name ?? 'Sem categoria',
                },
                { label: 'Preço', value: formatPrice(product.price_cents) },
                {
                    label: 'Estoque',
                    value:
                        product.total_stock === 1
                            ? '1 unidade'
                            : `${product.total_stock} unidades`,
                },
            ]}
            primaryAction={
                <Button
                    asChild
                    className="min-h-12 w-full rounded-[2px] bg-[#18181f] text-[#f6f4f0] hover:-translate-y-px hover:bg-[#18181f]"
                >
                    <Link href={productEditUrl(product)}>Editar produto</Link>
                </Button>
            }
            secondaryAction={
                <button
                    type="button"
                    onClick={() => onDelete(product)}
                    className="min-h-11 text-sm font-semibold text-foreground underline decoration-[#cac4ba] underline-offset-4 hover:text-[#b42318] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]"
                >
                    Excluir
                </button>
            }
        />
    );
}

export default function ProductsIndex({
    products,
    categories,
    product_counts,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedProductId, setSelectedProductId] = useState<number | null>(
        products.data[0]?.id ?? null,
    );
    const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
    const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
    const [isFiltering, setIsFiltering] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const statusFilter = normalizedStatusFilter(filters.is_active);
    const selectedProduct =
        products.data.find((product) => product.id === selectedProductId) ??
        products.data[0];
    const resultTotal = products.meta?.total ?? products.data.length;
    const hasActiveFilters = Boolean(
        search ||
        filters.product_type ||
        filters.category_id ||
        statusFilter !== 'all',
    );

    useEffect(() => {
        if (products.data.length === 0) {
            setSelectedProductId(null);
            setMobileInspectorOpen(false);
            return;
        }

        if (
            selectedProductId === null ||
            !products.data.some((product) => product.id === selectedProductId)
        ) {
            setSelectedProductId(products.data[0].id);
        }
    }, [products.data, selectedProductId]);

    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    const updateFilters = useCallback(
        (overrides: FilterPayload) => {
            const nextFilters: FilterPayload = {
                search,
                product_type: filters.product_type,
                category_id: filters.category_id,
                is_active: statusFilter === 'all' ? undefined : statusFilter,
                ...overrides,
            };
            const cleanFilters = Object.fromEntries(
                Object.entries(nextFilters).filter(
                    ([, value]) =>
                        value !== '' && value !== null && value !== undefined,
                ),
            );

            router.get(manufacturer.products.index().url, cleanFilters, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setIsFiltering(true),
                onFinish: () => setIsFiltering(false),
            });
        },
        [filters.category_id, filters.product_type, search, statusFilter],
    );

    const handleSearchChange = (value: string) => {
        setSearch(value);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            updateFilters({ search: value });
        }, 300);
    };

    const clearFilters = () => {
        setSearch('');
        router.get(
            manufacturer.products.index().url,
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setIsFiltering(true),
                onFinish: () => setIsFiltering(false),
            },
        );
    };

    const selectProduct = (product: Product) => {
        setSelectedProductId(product.id);

        if (!window.matchMedia('(min-width: 1280px)').matches) {
            setMobileInspectorOpen(true);
        }
    };

    const confirmDelete = () => {
        if (!deleteProduct) {
            return;
        }

        router.delete(manufacturer.products.destroy(deleteProduct.id).url, {
            preserveScroll: true,
            onSuccess: () => setMobileInspectorOpen(false),
            onFinish: () => setDeleteProduct(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Produtos" />

            <div className="mx-auto flex w-full max-w-[1560px] flex-1 flex-col px-5 py-8 sm:px-7 md:px-9 lg:pt-8 lg:pb-12 xl:px-12 2xl:px-14">
                <AppPageHeader
                    eyebrow="Coleção"
                    title={
                        <>
                            Seus produtos
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description={
                        <>
                            <p>
                                Crie, encontre, organize os produtos do catálogo
                                digital.
                            </p>
                            <p className="mt-3 font-zouth-display text-sm font-semibold tracking-[-0.01em] text-foreground tabular-nums">
                                {product_counts.total} itens
                                <span
                                    className="px-2 text-[#98968d]"
                                    aria-hidden="true"
                                >
                                    ·
                                </span>
                                {product_counts.products} produtos
                                <span
                                    className="px-2 text-[#98968d]"
                                    aria-hidden="true"
                                >
                                    ·
                                </span>
                                {product_counts.combos} combos
                            </p>
                        </>
                    }
                    aside={
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                            <Button
                                asChild
                                className="min-h-12 rounded-[2px] bg-[#ff4d3d] text-[#18181f] hover:-translate-y-px hover:bg-[#ff4d3d]"
                            >
                                <Link href={manufacturer.products.create().url}>
                                    <Plus
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Novo produto
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="outline"
                                className="min-h-12 rounded-[2px] border-[#18181f] bg-transparent hover:bg-[#e7e3dc]"
                            >
                                <Link
                                    href={
                                        manufacturer.products.combos.create()
                                            .url
                                    }
                                >
                                    <PackagePlus
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Criar combo
                                </Link>
                            </Button>
                        </div>
                    }
                />

                <ResourceToolbar
                    className="mt-6"
                    isBusy={isFiltering}
                    label="Buscar e filtrar produtos"
                    search={
                        <div className="relative">
                            <label htmlFor="product-search" className="sr-only">
                                Buscar por nome ou SKU
                            </label>
                            <Search
                                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <Input
                                id="product-search"
                                value={search}
                                onChange={(event) =>
                                    handleSearchChange(event.target.value)
                                }
                                placeholder="Buscar por nome ou SKU"
                                className="h-[52px] rounded-[2px] border-border bg-transparent pr-11 pl-12 text-base shadow-none focus-visible:border-[#18181f] focus-visible:ring-0"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        updateFilters({ search: undefined });
                                    }}
                                    className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d]"
                                    aria-label="Limpar busca"
                                >
                                    <X className="size-4" aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    }
                    views={
                        <div
                            className="grid grid-cols-3 border border-border"
                            aria-label="Tipo de item"
                        >
                            {[
                                {
                                    value: 'all',
                                    label: 'Todos',
                                    count: product_counts.total,
                                },
                                {
                                    value: 'product',
                                    label: 'Produtos',
                                    count: product_counts.products,
                                },
                                {
                                    value: 'combo',
                                    label: 'Combos',
                                    count: product_counts.combos,
                                },
                            ].map((item) => {
                                const isActive =
                                    item.value === 'all'
                                        ? !filters.product_type
                                        : filters.product_type === item.value;

                                return (
                                    <button
                                        key={item.value}
                                        type="button"
                                        onClick={() =>
                                            updateFilters({
                                                product_type:
                                                    item.value === 'all'
                                                        ? undefined
                                                        : item.value,
                                            })
                                        }
                                        aria-pressed={isActive}
                                        className={cn(
                                            'min-h-[50px] border-r border-border px-3 text-sm font-semibold last:border-r-0 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d]',
                                            isActive
                                                ? 'bg-[#18181f] text-[#f6f4f0]'
                                                : 'bg-transparent text-foreground hover:bg-[#e7e3dc]/60',
                                        )}
                                    >
                                        {item.label}{' '}
                                        <span className="ml-1 tabular-nums">
                                            {item.count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    }
                    filters={
                        <>
                            <Select
                                value={
                                    filters.category_id
                                        ? String(filters.category_id)
                                        : 'all'
                                }
                                onValueChange={(value) =>
                                    updateFilters({
                                        category_id:
                                            value === 'all' ? undefined : value,
                                    })
                                }
                            >
                                <SelectTrigger
                                    aria-label="Filtrar por categoria"
                                    className="h-[52px] min-w-full flex-1 rounded-[2px] bg-transparent shadow-none xl:w-[190px] xl:min-w-[190px] xl:flex-none"
                                >
                                    <SelectValue placeholder="Categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Todas as categorias
                                    </SelectItem>
                                    {categories.map((category) => (
                                        <SelectItem
                                            key={category.id}
                                            value={String(category.id)}
                                        >
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={statusFilter}
                                onValueChange={(value) =>
                                    updateFilters({
                                        is_active:
                                            value === 'all' ? undefined : value,
                                    })
                                }
                            >
                                <SelectTrigger
                                    aria-label="Filtrar por status"
                                    className="h-[52px] min-w-full flex-1 rounded-[2px] bg-transparent shadow-none xl:w-[165px] xl:min-w-[165px] xl:flex-none"
                                >
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        Todos os status
                                    </SelectItem>
                                    <SelectItem value="true">Ativos</SelectItem>
                                    <SelectItem value="false">
                                        Inativos
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </>
                    }
                    supporting={
                        hasActiveFilters ? (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-foreground underline decoration-[#cac4ba] underline-offset-4 hover:text-[#c53024] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]"
                            >
                                <X className="size-4" aria-hidden="true" />
                                Limpar filtros
                            </button>
                        ) : undefined
                    }
                />

                {products.data.length > 0 ? (
                    <div className="mt-5 grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.38fr)]">
                        <section
                            aria-labelledby="collection-gallery-title"
                            className="min-w-0"
                        >
                            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                                {/* <div>
                                    <p className="text-[0.68rem] font-bold tracking-[0.18em] text-[#e93d30] uppercase">
                                        Acervo visual
                                    </p>
                                    <h2
                                        id="collection-gallery-title"
                                        className="mt-2 font-zouth-display text-xl font-semibold tracking-[-0.03em] text-foreground"
                                    >
                                        Peças da coleção
                                    </h2>
                                </div> */}
                                <p
                                    className="text-sm text-muted-foreground tabular-nums"
                                    aria-live="polite"
                                >
                                    {products.meta?.from ?? 1}–
                                    {products.meta?.to ?? products.data.length}{' '}
                                    de {resultTotal}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
                                {products.data.map((product) => (
                                    <ProductTile
                                        key={product.id}
                                        product={product}
                                        isSelected={
                                            product.id === selectedProduct?.id
                                        }
                                        onSelect={selectProduct}
                                        onDelete={setDeleteProduct}
                                    />
                                ))}
                            </div>

                            <Pagination
                                links={products.meta?.links ?? products.links}
                            />
                        </section>

                        {selectedProduct && (
                            <div className="hidden border-l border-border pl-7 xl:block">
                                <ProductInspector
                                    product={selectedProduct}
                                    onDelete={setDeleteProduct}
                                    className="sticky top-20"
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <EmptyState
                        className="mt-5"
                        visual={
                            <span className="flex size-20 items-center justify-center bg-[#e7e3dc]/70">
                                <img
                                    src="/brand/zouth/assets/symbol-duotone-dark.png"
                                    alt=""
                                    className="h-auto w-10"
                                />
                            </span>
                        }
                        eyebrow={
                            product_counts.total === 0
                                ? 'Primeira peça'
                                : 'Nenhum resultado'
                        }
                        title={
                            product_counts.total === 0
                                ? 'Sua coleção começa com a primeira peça.'
                                : 'Nenhuma peça apareceu com esses filtros.'
                        }
                        description={
                            product_counts.total === 0
                                ? 'Cadastre um produto com boas fotos e as informações que o lojista precisa para desejar e comprar.'
                                : 'Tente outra busca ou limpe os filtros para voltar a ver o acervo completo.'
                        }
                        actions={
                            product_counts.total === 0 ? (
                                <Button
                                    asChild
                                    className="min-h-12 rounded-[2px]"
                                >
                                    <Link
                                        href={
                                            manufacturer.products.create().url
                                        }
                                    >
                                        <Plus
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        Cadastrar primeiro produto
                                    </Link>
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={clearFilters}
                                    className="min-h-12 rounded-[2px] border-[#18181f] bg-transparent"
                                >
                                    Limpar filtros
                                </Button>
                            )
                        }
                    />
                )}

                <Sheet
                    open={mobileInspectorOpen}
                    onOpenChange={setMobileInspectorOpen}
                >
                    <SheetContent
                        side="bottom"
                        className="max-h-[92vh] gap-0 overflow-y-auto border-border p-0 shadow-none xl:hidden"
                    >
                        <SheetTitle className="sr-only">
                            Detalhes do produto selecionado
                        </SheetTitle>
                        <SheetDescription className="sr-only">
                            Consulte as informações e abra a edição do produto.
                        </SheetDescription>
                        {selectedProduct && (
                            <ProductInspector
                                product={selectedProduct}
                                onDelete={setDeleteProduct}
                                className="px-5 pt-6 pb-8"
                            />
                        )}
                    </SheetContent>
                </Sheet>

                <AlertDialog
                    open={deleteProduct !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setDeleteProduct(null);
                        }
                    }}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>
                                Excluir {deleteProduct?.name}?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Isso remove o item e suas mídias da Zouth. Esta
                                ação não pode ser desfeita.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={confirmDelete}
                                className="bg-[#b42318] text-white hover:bg-[#b42318]"
                            >
                                Excluir
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AppLayout>
    );
}
