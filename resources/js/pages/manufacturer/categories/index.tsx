import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    LockKeyhole,
    MoreHorizontal,
    Pencil,
    Plus,
    Search,
    Tags,
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AppPageHeader } from '@/components/app-page-header';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { Pagination } from '@/components/pagination';
import { ResourceToolbar } from '@/components/resource-toolbar';
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
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
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
    slug: string;
    products_count?: number;
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

type CategorySummary = {
    total_categories: number;
    categorized_products: number;
    uncategorized_products: number;
};

type Props = {
    categories: Paginated<Category>;
    category_summary: CategorySummary;
    filters: {
        search?: string | null;
    };
};

type CategoryEditor = {
    mode: 'create' | 'edit';
    category?: Category;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Visão geral', href: dashboard().url },
    { title: 'Categorias', href: manufacturer.categories.index().url },
];

function formatCategoryOrdinal(value: number): string {
    return String(value).padStart(2, '0');
}

function categoryProductLabel(count: number): string {
    return count === 1 ? '1 peça' : `${count} peças`;
}

function organizedProductLabel(count: number): string {
    return count === 1 ? '1 peça organizada' : `${count} peças organizadas`;
}

function slugPreview(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

export default function CategoriesIndex({
    categories,
    category_summary,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
        categories.data[0]?.id ?? null,
    );
    const [editor, setEditor] = useState<CategoryEditor | null>(null);
    const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
    const [isFiltering, setIsFiltering] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const categoryForm = useForm({ name: '' });

    const selectedCategory =
        categories.data.find(
            (category) => category.id === selectedCategoryId,
        ) ?? categories.data[0];
    const selectedCategoryIndex = selectedCategory
        ? categories.data.findIndex(
              (category) => category.id === selectedCategory.id,
          )
        : -1;
    const pageStart = categories.meta?.from ?? 1;
    const resultTotal = categories.meta?.total ?? categories.data.length;
    const selectedProductCount = selectedCategory?.products_count ?? 0;
    const selectedShare =
        category_summary.categorized_products > 0
            ? Math.round(
                  (selectedProductCount /
                      category_summary.categorized_products) *
                      100,
              )
            : 0;

    useEffect(() => {
        if (categories.data.length === 0) {
            setSelectedCategoryId(null);
            return;
        }

        if (
            selectedCategoryId === null ||
            !categories.data.some(
                (category) => category.id === selectedCategoryId,
            )
        ) {
            setSelectedCategoryId(categories.data[0].id);
        }
    }, [categories.data, selectedCategoryId]);

    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    const handleSearchChange = (value: string) => {
        setSearch(value);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            const query = value ? { search: value } : {};

            router.get(manufacturer.categories.index().url, query, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onStart: () => setIsFiltering(true),
                onFinish: () => setIsFiltering(false),
            });
        }, 300);
    };

    const openCreateEditor = () => {
        categoryForm.reset();
        categoryForm.clearErrors();
        setEditor({ mode: 'create' });
    };

    const openEditEditor = (category: Category) => {
        categoryForm.setData('name', category.name);
        categoryForm.clearErrors();
        setSelectedCategoryId(category.id);
        setEditor({ mode: 'edit', category });
    };

    const closeEditor = () => {
        setEditor(null);
        categoryForm.reset();
        categoryForm.clearErrors();
    };

    const submitCategory = (event: React.FormEvent) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: closeEditor,
        };

        if (editor?.mode === 'edit' && editor.category) {
            categoryForm.put(
                manufacturer.categories.update(editor.category.id).url,
                options,
            );
            return;
        }

        categoryForm.post(manufacturer.categories.store().url, options);
    };

    const confirmDelete = () => {
        if (!deleteCategory || (deleteCategory.products_count ?? 0) > 0) {
            return;
        }

        router.delete(manufacturer.categories.destroy(deleteCategory.id).url, {
            preserveScroll: true,
            onFinish: () => setDeleteCategory(null),
        });
    };

    const editorSlug = slugPreview(categoryForm.data.name);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categorias" />

            <div className="mx-auto flex w-full max-w-[1560px] flex-1 flex-col px-5 py-8 sm:px-7 md:px-9 lg:pt-8 lg:pb-12 xl:px-12 2xl:px-14">
                <AppPageHeader
                    eyebrow="Organização da coleção"
                    title={
                        <>
                            Categorias
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description={
                        <p>
                            Categorias ajudam representantes e lojistas a
                            encontrar o que procuram rapidamente.
                        </p>
                    }
                    aside={
                        <div className="grid gap-4">
                            <Button
                                type="button"
                                onClick={openCreateEditor}
                                className="min-h-12 rounded-[2px] bg-[#ff4d3d] text-[#18181f] hover:-translate-y-px hover:bg-[#ff4d3d]"
                            >
                                <Plus className="size-4" aria-hidden="true" />
                                Nova categoria
                            </Button>
                            <p className="text-center font-zouth-display text-sm font-semibold tracking-[-0.01em] text-foreground tabular-nums">
                                {category_summary.total_categories}{' '}
                                {category_summary.total_categories === 1
                                    ? 'categoria'
                                    : 'categorias'}
                                <span
                                    className="px-2 text-[#98968d]"
                                    aria-hidden="true"
                                >
                                    ·
                                </span>
                                {organizedProductLabel(
                                    category_summary.categorized_products,
                                )}
                            </p>
                        </div>
                    }
                />

                <ResourceToolbar
                    className="mt-6"
                    isBusy={isFiltering}
                    label="Buscar categorias"
                    search={
                        <div className="relative">
                            <label
                                htmlFor="category-search"
                                className="sr-only"
                            >
                                Buscar categoria
                            </label>
                            <Search
                                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <Input
                                id="category-search"
                                value={search}
                                onChange={(event) =>
                                    handleSearchChange(event.target.value)
                                }
                                placeholder="Buscar categoria"
                                className="h-[52px] rounded-[2px] border-border bg-transparent pr-11 pl-12 text-base shadow-none focus-visible:border-[#18181f] focus-visible:ring-0"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => handleSearchChange('')}
                                    className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d]"
                                    aria-label="Limpar busca"
                                >
                                    <X className="size-4" aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    }
                    views={
                        <p
                            className="flex min-h-[52px] items-center border-l border-border px-5 text-sm font-semibold text-foreground tabular-nums"
                            aria-live="polite"
                        >
                            {resultTotal}{' '}
                            {resultTotal === 1 ? 'capítulo' : 'capítulos'} da
                            coleção
                        </p>
                    }
                    filters={
                        category_summary.uncategorized_products > 0 ? (
                            <p className="flex min-h-[52px] items-center gap-2 text-sm text-muted-foreground">
                                <span
                                    className="size-1.5 rounded-full bg-[#ff4d3d]"
                                    aria-hidden="true"
                                />
                                {categoryProductLabel(
                                    category_summary.uncategorized_products,
                                )}{' '}
                                sem categoria
                            </p>
                        ) : undefined
                    }
                />

                {categories.data.length > 0 ? (
                    <div className="mt-5 grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.36fr)]">
                        <section
                            aria-labelledby="category-map-title"
                            className="min-w-0"
                        >
                            <div className="mb-3 flex items-end justify-between gap-4">
                                <p
                                    id="category-map-title"
                                    className="text-[0.68rem] font-bold tracking-[0.2em] text-foreground uppercase"
                                >
                                    Mapa da coleção
                                </p>
                                <p className="text-xs text-muted-foreground tabular-nums">
                                    {pageStart}–
                                    {categories.meta?.to ??
                                        pageStart +
                                            categories.data.length -
                                            1}{' '}
                                    de {resultTotal}
                                </p>
                            </div>

                            <div className="border-t border-border">
                                {categories.data.map((category, index) => {
                                    const productCount =
                                        category.products_count ?? 0;
                                    const share =
                                        category_summary.categorized_products >
                                        0
                                            ? (productCount /
                                                  category_summary.categorized_products) *
                                              100
                                            : 0;
                                    const isSelected =
                                        category.id === selectedCategory?.id;

                                    return (
                                        <article
                                            key={category.id}
                                            className={cn(
                                                'group relative border-b border-border transition-colors hover:bg-[#e7e3dc]/35',
                                                isSelected && 'bg-[#e7e3dc]/18',
                                            )}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedCategoryId(
                                                        category.id,
                                                    )
                                                }
                                                aria-pressed={isSelected}
                                                className="grid min-h-[104px] w-full grid-cols-[2.5rem_minmax(0,1fr)_4.5rem] items-center gap-x-3 gap-y-3 py-4 pr-14 pl-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d] sm:grid-cols-[3rem_minmax(180px,0.85fr)_minmax(120px,1fr)_5rem] sm:gap-x-5 sm:px-5 sm:pr-16"
                                            >
                                                <span className="font-zouth-display text-xl font-medium tracking-[-0.035em] text-muted-foreground tabular-nums">
                                                    {formatCategoryOrdinal(
                                                        pageStart + index,
                                                    )}
                                                </span>

                                                <span className="min-w-0">
                                                    <span className="block truncate font-zouth-display text-lg font-semibold tracking-[-0.03em] text-foreground sm:text-xl">
                                                        {category.name}
                                                    </span>
                                                    <span className="mt-1 block truncate text-sm text-muted-foreground">
                                                        {category.slug}
                                                    </span>
                                                </span>

                                                <span className="col-start-2 flex h-px self-center bg-[#cac4ba] sm:col-start-3 sm:row-start-1">
                                                    <span
                                                        className="h-[3px] -translate-y-px bg-[#ff4d3d] transition-[width] duration-500 motion-reduce:transition-none"
                                                        style={{
                                                            width: `${share}%`,
                                                        }}
                                                    />
                                                </span>

                                                <span className="col-start-3 row-span-2 row-start-1 text-right sm:col-start-4">
                                                    <span className="block font-zouth-display text-xl leading-none font-semibold tracking-[-0.035em] text-foreground tabular-nums">
                                                        {productCount}
                                                    </span>
                                                    <span className="mt-1 block text-xs text-muted-foreground">
                                                        {productCount === 1
                                                            ? 'peça'
                                                            : 'peças'}
                                                    </span>
                                                </span>
                                            </button>

                                            {isSelected && (
                                                <span
                                                    aria-hidden="true"
                                                    className="absolute inset-y-0 left-0 w-1 bg-[#ff4d3d]"
                                                />
                                            )}

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute top-1/2 right-1 min-h-11 min-w-11 -translate-y-1/2 rounded-[2px] hover:bg-[#e7e3dc] sm:right-2"
                                                        aria-label={`Ações para ${category.name}`}
                                                    >
                                                        <MoreHorizontal
                                                            className="size-5"
                                                            aria-hidden="true"
                                                        />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    align="end"
                                                    className="min-w-52 rounded-[2px] shadow-none"
                                                >
                                                    <DropdownMenuItem
                                                        className="min-h-11 rounded-[2px]"
                                                        onSelect={() =>
                                                            openEditEditor(
                                                                category,
                                                            )
                                                        }
                                                    >
                                                        <Pencil
                                                            className="size-4"
                                                            aria-hidden="true"
                                                        />
                                                        Editar categoria
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        variant="destructive"
                                                        disabled={
                                                            productCount > 0
                                                        }
                                                        className="min-h-11 rounded-[2px]"
                                                        onSelect={() =>
                                                            setDeleteCategory(
                                                                category,
                                                            )
                                                        }
                                                    >
                                                        {productCount > 0 ? (
                                                            <LockKeyhole
                                                                className="size-4"
                                                                aria-hidden="true"
                                                            />
                                                        ) : (
                                                            <Trash2
                                                                className="size-4"
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                        {productCount > 0
                                                            ? 'Categoria em uso'
                                                            : 'Excluir categoria'}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </article>
                                    );
                                })}
                            </div>

                            <Pagination
                                links={
                                    categories.meta?.links ?? categories.links
                                }
                            />
                        </section>

                        {selectedCategory && (
                            <aside className="hidden border-l border-border pl-8 xl:block">
                                <p className="text-[0.68rem] font-bold tracking-[0.2em] text-foreground uppercase">
                                    Categoria em foco
                                </p>
                                <p className="mt-7 font-zouth-display text-[5.25rem] leading-[0.82] font-medium tracking-[-0.065em] text-[#ff4d3d] tabular-nums">
                                    {formatCategoryOrdinal(
                                        pageStart + selectedCategoryIndex,
                                    )}
                                </p>
                                <h2 className="mt-7 max-w-xs font-zouth-display text-[clamp(1.75rem,2.5vw,2.35rem)] leading-[0.98] font-semibold tracking-[-0.045em] text-balance text-foreground">
                                    {selectedCategory.name}
                                </h2>
                                <p className="mt-2 truncate text-sm text-muted-foreground">
                                    {selectedCategory.slug}
                                </p>

                                <div className="mt-6 border-t border-border pt-5">
                                    <p className="font-zouth-display text-xl font-semibold tracking-[-0.025em] text-foreground tabular-nums">
                                        {categoryProductLabel(
                                            selectedProductCount,
                                        )}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                                        {selectedShare}% da coleção
                                    </p>
                                </div>

                                <div className="mt-7 grid gap-3">
                                    <Button
                                        type="button"
                                        onClick={() =>
                                            openEditEditor(selectedCategory)
                                        }
                                        className="min-h-12 w-full rounded-[2px] bg-[#18181f] text-[#f6f4f0] hover:-translate-y-px hover:bg-[#18181f]"
                                    >
                                        <Pencil
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        Editar categoria
                                    </Button>
                                    <Link
                                        href={
                                            manufacturer.products.index({
                                                query: {
                                                    category_id:
                                                        selectedCategory.id,
                                                },
                                            }).url
                                        }
                                        className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-foreground underline decoration-[#cac4ba] underline-offset-4 hover:text-[#c53024] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]"
                                    >
                                        Ver peças
                                        <ArrowRight
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </div>

                                {selectedProductCount > 0 ? (
                                    <p className="mt-8 flex gap-3 text-xs leading-5 text-muted-foreground">
                                        <LockKeyhole
                                            className="mt-0.5 size-4 shrink-0"
                                            aria-hidden="true"
                                        />
                                        Categorias com peças não podem ser
                                        excluídas.
                                    </p>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setDeleteCategory(selectedCategory)
                                        }
                                        className="mt-7 min-h-11 text-sm font-semibold text-[#b42318] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]"
                                    >
                                        Excluir categoria vazia
                                    </button>
                                )}
                            </aside>
                        )}
                    </div>
                ) : (
                    <EmptyState
                        className="mt-5"
                        visual={
                            <span className="flex size-14 items-center justify-center border border-border bg-[#e7e3dc]/45">
                                <Tags
                                    className="size-6 text-foreground"
                                    aria-hidden="true"
                                />
                            </span>
                        }
                        eyebrow={
                            search ? 'Busca sem resultado' : 'Primeiro capítulo'
                        }
                        title={
                            search
                                ? 'Nenhuma categoria encontrou esse termo.'
                                : 'Dê o primeiro caminho para a sua coleção.'
                        }
                        description={
                            search
                                ? 'Tente outro nome ou limpe a busca para rever todas as categorias.'
                                : 'Crie categorias que façam sentido para quem apresenta, escolhe e compra suas peças.'
                        }
                        actions={
                            search ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => handleSearchChange('')}
                                    className="min-h-12 rounded-[2px] border-[#18181f] bg-transparent hover:bg-[#e7e3dc]"
                                >
                                    Limpar busca
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    onClick={openCreateEditor}
                                    className="min-h-12 rounded-[2px] bg-[#ff4d3d] text-[#18181f] hover:-translate-y-px hover:bg-[#ff4d3d]"
                                >
                                    <Plus
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Criar primeira categoria
                                </Button>
                            )
                        }
                    />
                )}
            </div>

            <Sheet
                open={Boolean(editor)}
                onOpenChange={(open) => {
                    if (!open) {
                        closeEditor();
                    }
                }}
            >
                <SheetContent className="w-full gap-0 border-l border-[#18181f] bg-[#f6f4f0] p-0 shadow-none sm:max-w-[32rem]">
                    <form
                        onSubmit={submitCategory}
                        className="flex h-full min-h-0 flex-col"
                    >
                        <SheetHeader className="border-b border-border px-7 pt-16 pb-8 text-left sm:px-10">
                            <p className="text-[0.68rem] font-bold tracking-[0.22em] text-[#e93d30] uppercase">
                                {editor?.mode === 'edit'
                                    ? 'Editar categoria'
                                    : 'Nova categoria'}
                            </p>
                            <SheetTitle className="mt-4 max-w-sm font-zouth-display text-[clamp(2rem,4vw,3rem)] leading-[0.98] font-semibold tracking-[-0.05em] text-balance">
                                Dê um nome fácil de encontrar.
                            </SheetTitle>
                            <SheetDescription className="mt-4 max-w-sm text-sm leading-6">
                                Esse nome orienta a navegação de representantes
                                e lojistas dentro da coleção.
                            </SheetDescription>
                        </SheetHeader>

                        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-8 sm:px-10">
                            <div className="grid gap-3">
                                <Label
                                    htmlFor="category-name"
                                    className="font-zouth-display text-[0.68rem] font-bold tracking-[0.18em] uppercase"
                                >
                                    Nome da categoria
                                </Label>
                                <Input
                                    id="category-name"
                                    value={categoryForm.data.name}
                                    onChange={(event) =>
                                        categoryForm.setData(
                                            'name',
                                            event.target.value,
                                        )
                                    }
                                    autoFocus
                                    autoComplete="off"
                                    placeholder="Ex.: Conjuntos"
                                    className="h-14 rounded-[2px] border-border bg-transparent px-4 font-zouth-display text-lg shadow-none focus-visible:border-[#18181f] focus-visible:ring-0"
                                />
                                <InputError
                                    message={categoryForm.errors.name}
                                />
                            </div>

                            <div className="mt-10 border-y border-border py-6">
                                <p className="text-[0.68rem] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                                    Como aparece no catálogo
                                </p>
                                <p className="mt-4 font-zouth-display text-2xl font-semibold tracking-[-0.035em] text-foreground">
                                    {categoryForm.data.name ||
                                        'Nome da categoria'}
                                </p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {editorSlug || 'nome-da-categoria'}
                                </p>
                            </div>

                            <p className="mt-6 text-xs leading-5 text-muted-foreground">
                                O endereço é criado automaticamente a partir do
                                nome. Você pode renomear a categoria depois sem
                                reenviar produtos.
                            </p>
                        </div>

                        <SheetFooter className="grid grid-cols-2 gap-3 border-t border-border px-7 py-5 sm:px-10">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeEditor}
                                className="min-h-12 rounded-[2px] border-[#18181f] bg-transparent hover:bg-[#e7e3dc]"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={categoryForm.processing}
                                className="min-h-12 rounded-[2px] bg-[#ff4d3d] text-[#18181f] hover:-translate-y-px hover:bg-[#ff4d3d]"
                            >
                                {categoryForm.processing
                                    ? 'Salvando...'
                                    : editor?.mode === 'edit'
                                      ? 'Salvar categoria'
                                      : 'Criar categoria'}
                            </Button>
                        </SheetFooter>
                    </form>
                </SheetContent>
            </Sheet>

            <AlertDialog
                open={Boolean(deleteCategory)}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleteCategory(null);
                    }
                }}
            >
                <AlertDialogContent className="rounded-[2px] border-[#18181f] bg-[#f6f4f0] shadow-none">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-zouth-display text-2xl tracking-[-0.035em]">
                            Excluir {deleteCategory?.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="leading-6">
                            Essa categoria está vazia e será removida da
                            organização da coleção. Essa ação não pode ser
                            desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="min-h-11 rounded-[2px] border-[#18181f] bg-transparent">
                            Manter categoria
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="min-h-11 rounded-[2px] bg-[#b42318] text-white hover:bg-[#b42318]"
                        >
                            Excluir categoria
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
