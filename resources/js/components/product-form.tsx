import { arrayMove } from '@dnd-kit/sortable';
import { router, useForm } from '@inertiajs/react';
import {
    Check,
    CircleAlert,
    Eye,
    Loader2,
    RotateCcw,
    Save,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ImageCropDialog } from '@/components/image-crop-dialog';
import {
    EditorField,
    EditorSection,
} from '@/components/product-editor/editor-section';
import { ProductLivePreview } from '@/components/product-editor/product-live-preview';
import { ProductMediaStudio } from '@/components/product-editor/product-media-studio';
import { ProductVariationStudio } from '@/components/product-editor/product-variation-studio';
import type {
    ProductCategoryOption,
    ProductEditorData,
    ProductEditorErrors,
    ProductEditorMode,
    ProductEditorPayload,
    ProductMediaItem,
    ProductStockStructure,
    ProductVariantStockValue,
    ProductVariationSelection,
    ProductVariationTypeOption,
} from '@/components/product-editor/types';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import manufacturer from '@/routes/manufacturer';

export const PRODUCT_EDITOR_FORM_ID = 'product-editor-form';

const MAX_IMAGES = 10;

type ProductFormProps = {
    mode: ProductEditorMode;
    categories: ProductCategoryOption[];
    variationTypes: ProductVariationTypeOption[];
    product?: ProductEditorPayload;
    stockStructure?: ProductStockStructure;
};

type EditorSectionKey =
    | 'presentation'
    | 'variations'
    | 'availability'
    | 'images';

const sectionLinks: Array<{
    key: EditorSectionKey;
    label: string;
    errorPrefixes: string[];
}> = [
    {
        key: 'presentation',
        label: 'Apresentação',
        errorPrefixes: [
            'name',
            'sku',
            'description',
            'product_category_id',
            'price',
            'sort_order',
            'is_active',
        ],
    },
    {
        key: 'variations',
        label: 'Variações',
        errorPrefixes: ['variations'],
    },
    {
        key: 'availability',
        label: 'Disponibilidade',
        errorPrefixes: ['variant_stocks', 'base_quantity'],
    },
    {
        key: 'images',
        label: 'Imagens',
        errorPrefixes: ['images', 'files', 'video', 'file', 'type'],
    },
];

const fieldClassName =
    'h-[52px] w-full rounded-[2px] border border-border bg-transparent px-3 font-zouth-body text-sm text-foreground shadow-none outline-none placeholder:text-muted-foreground focus:border-[#18181f] focus:ring-2 focus:ring-[#ff4d3d]/25';

function centsToDisplay(cents: number | null | undefined): string {
    if (cents == null) {
        return '';
    }

    return String(cents / 100).replace('.', ',');
}

function normalizeVariationKey(key: Record<string, string>): string {
    return JSON.stringify(
        Object.entries(key).sort(([a], [b]) => a.localeCompare(b)),
    );
}

function buildVariantStocks(
    variations: ProductVariationSelection[],
    variationTypes: ProductVariationTypeOption[],
    currentStocks: ProductVariantStockValue[],
): ProductVariantStockValue[] {
    if (variations.length === 0) {
        return [];
    }

    const resolvedSets = variations
        .map((variation) => {
            const type = variationTypes.find(
                (item) => item.id === variation.variation_type_id,
            );

            return type ? { name: type.name, values: variation.values } : null;
        })
        .filter(Boolean) as Array<{ name: string; values: string[] }>;

    if (
        resolvedSets.length === 0 ||
        resolvedSets.some((set) => set.values.length === 0)
    ) {
        return [];
    }

    let combinations: Array<Record<string, string>> = [{}];

    resolvedSets.forEach((set) => {
        combinations = combinations.flatMap((combination) =>
            set.values.map((value) => ({
                ...combination,
                [set.name]: value,
            })),
        );
    });

    const stockMap = new Map(
        currentStocks.map((stock) => [
            normalizeVariationKey(stock.variation_key),
            stock,
        ]),
    );

    return combinations.map((variationKey) => {
        const existing = stockMap.get(normalizeVariationKey(variationKey));

        return {
            variation_key: variationKey,
            quantity: existing?.quantity ?? 0,
            price: existing?.price ?? '',
            sku_variant: existing?.sku_variant ?? null,
        };
    });
}

function firstSectionWithErrors(
    errors: ProductEditorErrors,
): EditorSectionKey | null {
    const errorKeys = Object.keys(errors);

    return (
        sectionLinks.find((section) =>
            errorKeys.some((errorKey) =>
                section.errorPrefixes.some(
                    (prefix) =>
                        errorKey === prefix ||
                        errorKey.startsWith(`${prefix}.`),
                ),
            ),
        )?.key ?? null
    );
}

function sectionHasError(
    section: (typeof sectionLinks)[number],
    errors: ProductEditorErrors,
): boolean {
    return Object.keys(errors).some((errorKey) =>
        section.errorPrefixes.some(
            (prefix) =>
                errorKey === prefix || errorKey.startsWith(`${prefix}.`),
        ),
    );
}

export function ProductForm({
    mode,
    categories,
    variationTypes = [],
    product,
    stockStructure,
}: ProductFormProps) {
    const initialVariations: ProductVariationSelection[] =
        stockStructure?.variations
            ? stockStructure.variations.map((variation) => ({
                  variation_type_id: variation.type.id,
                  values: variation.values.map((value) => value.value),
              }))
            : (product?.variations
                  ?.filter((variation) => variation.type)
                  .map((variation) => ({
                      variation_type_id: variation.variation_type_id,
                      values:
                          variation.type?.values.map((value) => value.value) ??
                          [],
                  })) ?? []);
    const initialStocksSource =
        stockStructure?.stocks ?? product?.variant_stocks ?? [];
    const initialStocks: ProductVariantStockValue[] = initialStocksSource.map(
        (stock) => ({
            variation_key: stock.variation_key,
            quantity: stock.quantity,
            price: centsToDisplay(stock.price_cents),
            sku_variant: stock.sku_variant ?? null,
        }),
    );

    const {
        data,
        setData,
        post,
        put,
        processing,
        progress,
        errors,
        setError,
        clearErrors,
        reset,
        setDefaults,
        isDirty,
        recentlySuccessful,
    } = useForm<ProductEditorData>({
        name: product?.name ?? '',
        sku: product?.sku ?? '',
        description: product?.description ?? '',
        product_category_id: product?.product_category_id ?? '',
        base_quantity: product?.base_quantity ?? 0,
        is_active: product?.is_active ?? true,
        allow_quote_when_out_of_stock:
            product?.allow_quote_when_out_of_stock ?? false,
        sort_order: product?.sort_order ?? 0,
        price: centsToDisplay(product?.price_cents),
        variations: initialVariations,
        variant_stocks: initialStocks,
        images: [],
        video: null,
    });
    const formErrors = errors as ProductEditorErrors;
    const [activeSection, setActiveSection] =
        useState<EditorSectionKey>('presentation');
    const [mediaItems, setMediaItems] = useState<ProductMediaItem[]>(
        product?.media ?? [],
    );
    const [pendingVideo, setPendingVideo] = useState<File | null>(null);
    const [cropQueue, setCropQueue] = useState<File[]>([]);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);

    const computedStocks = useMemo(
        () =>
            buildVariantStocks(
                data.variations,
                variationTypes,
                data.variant_stocks,
            ),
        [data.variations, data.variant_stocks, variationTypes],
    );
    const errorCount = Object.keys(formErrors).length;
    const currentCropFile = cropQueue[0] ?? null;

    useEffect(() => {
        setMediaItems(product?.media ?? []);
    }, [product?.media]);

    useEffect(() => {
        const section = firstSectionWithErrors(formErrors);

        if (!section) {
            return;
        }

        setActiveSection(section);
        window.requestAnimationFrame(() => {
            document.getElementById(section)?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        });
    }, [formErrors]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!isDirty) {
                return;
            }

            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visibleSection = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort(
                        (first, second) =>
                            Math.abs(first.boundingClientRect.top) -
                            Math.abs(second.boundingClientRect.top),
                    )[0];

                if (visibleSection) {
                    setActiveSection(
                        visibleSection.target.id as EditorSectionKey,
                    );
                }
            },
            {
                rootMargin: '-80px 0px -58% 0px',
                threshold: 0,
            },
        );

        sectionLinks.forEach((section) => {
            const element = document.getElementById(section.key);

            if (element) {
                observer.observe(element);
            }
        });

        return () => observer.disconnect();
    }, []);

    const scrollToSection = (section: EditorSectionKey) => {
        setActiveSection(section);
        document.getElementById(section)?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        clearErrors();

        let hasClientError = false;

        if (data.name.trim() === '') {
            setError('name', 'Dê um nome para a peça antes de salvar.');
            hasClientError = true;
        }

        if (data.sku.trim() === '') {
            setError('sku', 'Informe o SKU que identifica esta peça.');
            hasClientError = true;
        }

        if (hasClientError) {
            scrollToSection('presentation');
            return;
        }

        if (mode === 'create') {
            post(manufacturer.products.store().url, {
                forceFormData: true,
                preserveScroll: true,
            });
            return;
        }

        if (!product) {
            return;
        }

        put(manufacturer.products.update(product.id).url, {
            preserveScroll: true,
            onSuccess: () => setDefaults(),
        });
    };

    const rebuildStocks = (nextVariations: ProductVariationSelection[]) => {
        setData('variations', nextVariations);
        setData(
            'variant_stocks',
            buildVariantStocks(
                nextVariations,
                variationTypes,
                data.variant_stocks,
            ),
        );
    };

    const toggleVariationType = (typeId: number, checked: boolean) => {
        if (checked) {
            if (
                data.variations.some(
                    (variation) => variation.variation_type_id === typeId,
                )
            ) {
                return;
            }

            if (data.variations.length === 0 && data.base_quantity > 0) {
                setData('base_quantity', 0);
            }

            rebuildStocks([
                ...data.variations,
                { variation_type_id: typeId, values: [] },
            ]);
            return;
        }

        rebuildStocks(
            data.variations.filter(
                (variation) => variation.variation_type_id !== typeId,
            ),
        );
    };

    const toggleVariationValue = (typeId: number, value: string) => {
        const nextVariations = data.variations.map((variation) => {
            if (variation.variation_type_id !== typeId) {
                return variation;
            }

            const isSelected = variation.values.includes(value);

            return {
                ...variation,
                values: isSelected
                    ? variation.values.filter((item) => item !== value)
                    : [...variation.values, value],
            };
        });

        rebuildStocks(nextVariations);
    };

    const updateStockField = (
        variationKey: Record<string, string>,
        field: 'quantity' | 'price' | 'sku_variant',
        value: number | string | null,
    ) => {
        const targetKey = normalizeVariationKey(variationKey);
        const nextStocks = computedStocks.map((stock) =>
            normalizeVariationKey(stock.variation_key) === targetKey
                ? { ...stock, [field]: value }
                : stock,
        );

        setData('variant_stocks', nextStocks);
    };

    const handleFilesSelected = useCallback((files: File[]) => {
        if (files.length === 0) {
            return;
        }

        setCropQueue(files);
        setCropDialogOpen(true);
    }, []);

    const handleCropped = useCallback(
        (croppedFile: File) => {
            if (mode === 'create') {
                setData('images', [...data.images, croppedFile]);
            } else if (product) {
                setUploadingMedia(true);
                router.post(
                    manufacturer.products.media.store(product.id).url,
                    { type: 'image', files: [croppedFile] },
                    {
                        forceFormData: true,
                        preserveScroll: true,
                        preserveState: true,
                        onFinish: () => setUploadingMedia(false),
                    },
                );
            }

            setCropQueue((queue) => {
                const nextQueue = queue.slice(1);

                if (nextQueue.length === 0) {
                    setCropDialogOpen(false);
                }

                return nextQueue;
            });
        },
        [data.images, mode, product, setData],
    );

    const handleCropSkip = useCallback(() => {
        setCropQueue((queue) => {
            const nextQueue = queue.slice(1);

            if (nextQueue.length === 0) {
                setCropDialogOpen(false);
            }

            return nextQueue;
        });
    }, []);

    const handleVideoUpload = useCallback(() => {
        if (!product || !pendingVideo) {
            return;
        }

        setUploadingMedia(true);
        router.post(
            manufacturer.products.media.store(product.id).url,
            { type: 'video', file: pendingVideo },
            {
                forceFormData: true,
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setPendingVideo(null),
                onFinish: () => setUploadingMedia(false),
            },
        );
    }, [pendingVideo, product]);

    const reorderMedia = (activeId: number, overId: number) => {
        if (!product) {
            return;
        }

        const oldIndex = mediaItems.findIndex((media) => media.id === activeId);
        const newIndex = mediaItems.findIndex((media) => media.id === overId);

        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        const previousItems = mediaItems;
        const nextItems = arrayMove(mediaItems, oldIndex, newIndex);
        setMediaItems(nextItems);

        router.put(
            manufacturer.products.media.order(product.id).url,
            { media_order: nextItems.map((item) => item.id) },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => setMediaItems(previousItems),
            },
        );
    };

    const deleteMedia = (media: ProductMediaItem) => {
        if (!product) {
            return;
        }

        router.delete(
            manufacturer.products.media.destroy({
                product: product.id,
                media: media.id,
            }).url,
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setMediaItems((items) =>
                        items.filter((item) => item.id !== media.id),
                    );
                },
            },
        );
    };

    const saveLabel = mode === 'create' ? 'Criar produto' : 'Salvar alterações';

    return (
        <form
            id={PRODUCT_EDITOR_FORM_ID}
            onSubmit={handleSubmit}
            className="min-w-0"
        >
            <nav
                aria-label="Seções do editor de produto"
                className="sticky top-0 z-20 -mx-5 border-b border-border bg-[#f6f4f0]/95 px-5 backdrop-blur-sm sm:-mx-7 sm:px-7 md:-mx-9 md:px-9 xl:-mx-12 xl:px-12 2xl:-mx-14 2xl:px-14"
            >
                <div className="flex min-w-0 gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {sectionLinks.map((section) => {
                        const hasError = sectionHasError(section, formErrors);
                        const isActive = activeSection === section.key;

                        return (
                            <button
                                key={section.key}
                                type="button"
                                onClick={() => scrollToSection(section.key)}
                                aria-current={isActive ? 'location' : undefined}
                                className={`relative min-h-14 shrink-0 border-b-2 px-0 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#ff4d3d] ${
                                    isActive
                                        ? 'border-[#ff4d3d] text-[#e93d30]'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                <span className="inline-flex items-center gap-2">
                                    {section.label}
                                    {hasError && (
                                        <CircleAlert
                                            className="size-4 text-[#b42318]"
                                            aria-label="Esta seção contém erros"
                                        />
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            {errorCount > 0 && (
                <div
                    className="mt-6 flex items-start gap-3 border border-[#b42318]/30 bg-[#b42318]/5 px-4 py-3 text-sm text-[#8f1d14]"
                    role="alert"
                >
                    <CircleAlert
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden="true"
                    />
                    <div>
                        <p className="font-semibold">
                            A peça precisa de {errorCount}{' '}
                            {errorCount === 1 ? 'ajuste' : 'ajustes'} antes de
                            seguir.
                        </p>
                        <p className="mt-1 text-xs leading-5">
                            Já levamos você para a primeira seção que pede
                            atenção.
                        </p>
                    </div>
                </div>
            )}

            <details className="group mt-6 border border-border lg:hidden">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 font-zouth-display text-sm font-semibold tracking-[-0.01em] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d] [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-2">
                        <Eye className="size-4" aria-hidden="true" />
                        Prévia no catálogo
                    </span>
                    <span className="text-xs font-medium text-muted-foreground group-open:hidden">
                        Abrir
                    </span>
                    <span className="hidden text-xs font-medium text-muted-foreground group-open:inline">
                        Fechar
                    </span>
                </summary>
                <div className="border-t border-border p-3">
                    <ProductLivePreview
                        data={data}
                        categories={categories}
                        mediaItems={mediaItems}
                        variationCount={computedStocks.length}
                        compact
                    />
                </div>
            </details>

            <div className="grid min-w-0 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.39fr)] xl:gap-16">
                <div className="min-w-0">
                    <EditorSection
                        id="presentation"
                        eyebrow="01 · Apresentação"
                        description="Informações que o lojista precisa ver para fazer o pedido."
                        marker={
                            <span
                                className={`inline-flex min-h-8 items-center gap-2 px-3 text-[0.68rem] font-bold tracking-[0.08em] uppercase ${
                                    data.is_active
                                        ? 'bg-[#2e705a]/12 text-[#245845]'
                                        : 'bg-[#e7e3dc] text-[#5f5d57]'
                                }`}
                            >
                                <span
                                    className={`size-2 rounded-full ${
                                        data.is_active
                                            ? 'bg-[#2e705a]'
                                            : 'bg-[#98968d]'
                                    }`}
                                    aria-hidden="true"
                                />
                                {data.is_active ? 'Visível' : 'Oculta'}
                            </span>
                        }
                    >
                        <div className="space-y-6">
                            <EditorField
                                label="Nome da peça"
                                htmlFor="name"
                                required
                                error={formErrors.name}
                            >
                                <input
                                    id="name"
                                    value={data.name}
                                    onChange={(event) =>
                                        setData('name', event.target.value)
                                    }
                                    placeholder="Ex.: Macacão Aconchego Verde"
                                    autoComplete="off"
                                    className={`${fieldClassName} h-[64px] px-4 font-zouth-display text-[clamp(1.25rem,2vw,1.65rem)] font-semibold tracking-[-0.035em]`}
                                />
                            </EditorField>

                            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                <EditorField
                                    label="SKU"
                                    htmlFor="sku"
                                    required
                                    hint="O código interno desta peça."
                                    error={formErrors.sku}
                                >
                                    <input
                                        id="sku"
                                        value={data.sku}
                                        onChange={(event) =>
                                            setData('sku', event.target.value)
                                        }
                                        placeholder="ACON-001"
                                        autoComplete="off"
                                        className={fieldClassName}
                                    />
                                </EditorField>

                                <EditorField
                                    label="Categoria"
                                    error={formErrors.product_category_id}
                                >
                                    <Select
                                        value={
                                            data.product_category_id
                                                ? String(
                                                      data.product_category_id,
                                                  )
                                                : 'none'
                                        }
                                        onValueChange={(value) =>
                                            setData(
                                                'product_category_id',
                                                value === 'none'
                                                    ? ''
                                                    : Number(value),
                                            )
                                        }
                                    >
                                        <SelectTrigger className="h-[52px] rounded-[2px] border-border bg-transparent shadow-none focus:ring-2 focus:ring-[#ff4d3d]/25">
                                            <SelectValue placeholder="Sem categoria" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                Sem categoria
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
                                </EditorField>

                                <EditorField
                                    label="Preço geral"
                                    htmlFor="price"
                                    hint="Vazio aparece como Sob consulta."
                                    error={formErrors.price}
                                    className="sm:col-span-2 xl:col-span-1"
                                >
                                    <input
                                        id="price"
                                        inputMode="decimal"
                                        value={data.price}
                                        onChange={(event) =>
                                            setData('price', event.target.value)
                                        }
                                        placeholder="R$ 189,90"
                                        className={fieldClassName}
                                    />
                                </EditorField>
                            </div>

                            <EditorField
                                label="Descrição da peça"
                                htmlFor="description"
                                hint="Fale de caimento, materiais e detalhes que ajudam a vender."
                                error={formErrors.description}
                            >
                                <textarea
                                    id="description"
                                    value={data.description}
                                    onChange={(event) =>
                                        setData(
                                            'description',
                                            event.target.value,
                                        )
                                    }
                                    rows={5}
                                    placeholder="Conte o que torna esta peça especial para a coleção."
                                    className="min-h-32 w-full resize-y rounded-[2px] border border-border bg-transparent px-4 py-3 font-zouth-body text-sm leading-6 text-foreground shadow-none outline-none placeholder:text-muted-foreground focus:border-[#18181f] focus:ring-2 focus:ring-[#ff4d3d]/25"
                                />
                            </EditorField>

                            <div className="grid gap-6 border-t border-border pt-6 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.5fr)]">
                                <EditorField label="Presença no catálogo">
                                    <div
                                        className="grid grid-cols-2 border border-border"
                                        role="group"
                                        aria-label="Presença no catálogo"
                                    >
                                        {[
                                            {
                                                value: true,
                                                label: 'Visível',
                                                detail: 'Pode ser apresentada',
                                            },
                                            {
                                                value: false,
                                                label: 'Oculta',
                                                detail: 'Fica fora da vitrine',
                                            },
                                        ].map((option) => {
                                            const isSelected =
                                                data.is_active === option.value;

                                            return (
                                                <button
                                                    key={String(option.value)}
                                                    type="button"
                                                    aria-pressed={isSelected}
                                                    onClick={() =>
                                                        setData(
                                                            'is_active',
                                                            option.value,
                                                        )
                                                    }
                                                    className={`min-h-[64px] border-r border-border px-3 text-left last:border-r-0 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d] ${
                                                        isSelected
                                                            ? 'bg-[#18181f] text-[#f6f4f0]'
                                                            : 'bg-transparent text-foreground hover:bg-[#e7e3dc]/45'
                                                    }`}
                                                >
                                                    <span className="flex items-center gap-2 font-zouth-display text-sm font-semibold">
                                                        {isSelected && (
                                                            <Check
                                                                className="size-4"
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                        {option.label}
                                                    </span>
                                                    <span
                                                        className={`mt-1 block text-[0.68rem] ${
                                                            isSelected
                                                                ? 'text-[#f6f4f0]/65'
                                                                : 'text-muted-foreground'
                                                        }`}
                                                    >
                                                        {option.detail}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </EditorField>

                                <EditorField
                                    label="Posição na coleção"
                                    htmlFor="sort_order"
                                    hint="Números menores aparecem primeiro."
                                    error={formErrors.sort_order}
                                >
                                    <input
                                        id="sort_order"
                                        type="number"
                                        min={0}
                                        value={data.sort_order}
                                        onChange={(event) =>
                                            setData(
                                                'sort_order',
                                                Number(event.target.value),
                                            )
                                        }
                                        className={fieldClassName}
                                    />
                                </EditorField>
                            </div>
                        </div>
                    </EditorSection>

                    <ProductVariationStudio
                        variationTypes={variationTypes}
                        variations={data.variations}
                        stocks={computedStocks}
                        baseQuantity={data.base_quantity}
                        allowQuoteWhenOutOfStock={
                            data.allow_quote_when_out_of_stock
                        }
                        errors={formErrors}
                        onToggleType={toggleVariationType}
                        onToggleValue={toggleVariationValue}
                        onBaseQuantityChange={(quantity) =>
                            setData('base_quantity', quantity)
                        }
                        onAllowQuoteWhenOutOfStockChange={(enabled) =>
                            setData('allow_quote_when_out_of_stock', enabled)
                        }
                        onStockChange={updateStockField}
                    />

                    <ProductMediaStudio
                        mode={mode}
                        mediaItems={mediaItems}
                        stagedImages={data.images}
                        stagedVideo={data.video}
                        pendingVideo={pendingVideo}
                        maxImages={MAX_IMAGES}
                        uploadingMedia={uploadingMedia}
                        errors={formErrors}
                        onFilesSelected={handleFilesSelected}
                        onRemoveStagedImage={(index) =>
                            setData(
                                'images',
                                data.images.filter(
                                    (_, imageIndex) => imageIndex !== index,
                                ),
                            )
                        }
                        onStagedVideoChange={(file) => setData('video', file)}
                        onPendingVideoChange={setPendingVideo}
                        onUploadVideo={handleVideoUpload}
                        onReorder={reorderMedia}
                        onDelete={deleteMedia}
                    />
                </div>

                <aside className="hidden min-w-0 border-l border-border pl-7 lg:block xl:pl-9">
                    <div className="sticky top-36">
                        <p className="mb-4 text-[0.68rem] font-bold tracking-[0.2em] text-foreground uppercase">
                            Prévia no catálogo
                        </p>
                        <ProductLivePreview
                            data={data}
                            categories={categories}
                            mediaItems={mediaItems}
                            variationCount={computedStocks.length}
                        />
                        <p className="mt-4 text-xs leading-5 text-muted-foreground">
                            Uma aproximação da vitrine. A identidade final segue
                            as escolhas do catálogo da sua marca.
                        </p>
                    </div>
                </aside>
            </div>

            <div className="sticky bottom-0 z-30 -mx-5 mt-12 border-t border-border bg-[#f6f4f0]/96 px-5 py-3 backdrop-blur-sm sm:-mx-7 sm:px-7 md:-mx-9 md:px-9 xl:-mx-12 xl:px-12 2xl:-mx-14 2xl:px-14">
                {progress && (
                    <div
                        className="absolute top-0 left-0 h-0.5 bg-[#ff4d3d] transition-[width]"
                        style={{ width: `${progress.percentage}%` }}
                        aria-hidden="true"
                    />
                )}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div
                        className="inline-flex min-h-8 items-center gap-2 text-xs font-semibold text-muted-foreground"
                        role="status"
                    >
                        {processing || uploadingMedia ? (
                            <Loader2
                                className="size-4 animate-spin text-[#e93d30]"
                                aria-hidden="true"
                            />
                        ) : isDirty ? (
                            <CircleAlert
                                className="size-4 text-[#e93d30]"
                                aria-hidden="true"
                            />
                        ) : (
                            <Check
                                className="size-4 text-[#2e705a]"
                                aria-hidden="true"
                            />
                        )}
                        {processing
                            ? mode === 'create'
                                ? 'Criando a peça…'
                                : 'Salvando a peça…'
                            : uploadingMedia
                              ? 'Atualizando imagens…'
                              : recentlySuccessful
                                ? 'Alterações salvas agora'
                                : isDirty
                                  ? 'Alterações ainda não salvas'
                                  : mode === 'create'
                                    ? 'Comece pela apresentação da peça'
                                    : 'Tudo salvo por aqui'}
                    </div>

                    <div className="ml-auto flex items-center gap-2 sm:gap-3">
                        {isDirty && (
                            <button
                                type="button"
                                onClick={() => {
                                    reset();
                                    clearErrors();
                                }}
                                className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-semibold text-foreground underline decoration-[#cac4ba] underline-offset-4 hover:text-[#c53024] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]"
                            >
                                <RotateCcw
                                    className="hidden size-4 sm:block"
                                    aria-hidden="true"
                                />
                                Descartar
                            </button>
                        )}
                        <Button
                            type="submit"
                            disabled={processing || uploadingMedia}
                            className="min-h-12 rounded-[2px] bg-[#ff4d3d] px-5 text-[#18181f] shadow-none hover:-translate-y-px hover:bg-[#ff4d3d] sm:px-7"
                        >
                            {processing ? (
                                <Loader2
                                    className="size-4 animate-spin"
                                    aria-hidden="true"
                                />
                            ) : (
                                <Save className="size-4" aria-hidden="true" />
                            )}
                            {saveLabel}
                        </Button>
                    </div>
                </div>
            </div>

            <ImageCropDialog
                open={cropDialogOpen}
                onOpenChange={setCropDialogOpen}
                imageFile={currentCropFile}
                onCropped={handleCropped}
                onSkip={handleCropSkip}
                title="Prepare a foto para a vitrine"
                description="Ajuste o recorte 4:5 que será usado na apresentação da peça."
            />
        </form>
    );
}
