import { useForm } from '@inertiajs/react';
import {
    Check,
    CircleAlert,
    Eye,
    ImageIcon,
    Loader2,
    Minus,
    PackageOpen,
    Play,
    Plus,
    RefreshCw,
    RotateCcw,
    Save,
    Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ComboLivePreview } from '@/components/product-editor/combo-live-preview';
import { ComboProductPicker } from '@/components/product-editor/combo-product-picker';
import type {
    ComboCategoryOption,
    ComboComponentProductOption,
    ComboEditorData,
    ComboItemValue,
    InheritedComboMedia,
    ProductComboPayload,
} from '@/components/product-editor/combo-types';
import {
    EditorField,
    EditorSection,
} from '@/components/product-editor/editor-section';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import manufacturer from '@/routes/manufacturer';

export const PRODUCT_COMBO_EDITOR_FORM_ID = 'product-combo-editor-form';

type ComboEditorSectionKey = 'presentation' | 'composition' | 'showcase';

type Props = {
    mode: 'create' | 'edit';
    categories: ComboCategoryOption[];
    componentProducts: ComboComponentProductOption[];
    product?: ProductComboPayload;
};

const sectionLinks: Array<{
    key: ComboEditorSectionKey;
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
            'is_active',
            'sort_order',
        ],
    },
    {
        key: 'composition',
        label: 'Composição',
        errorPrefixes: ['combo_items'],
    },
    {
        key: 'showcase',
        label: 'Imagens e vídeos',
        errorPrefixes: [],
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

function formatPrice(priceCents?: number | null): string {
    if (priceCents == null) {
        return 'Sob consulta';
    }

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(priceCents / 100);
}

function variationLabel(key: Record<string, string>): string {
    return Object.values(key).join('/');
}

function sectionHasError(
    section: (typeof sectionLinks)[number],
    errors: Record<string, string | undefined>,
): boolean {
    return Object.keys(errors).some((key) =>
        section.errorPrefixes.some(
            (prefix) => key === prefix || key.startsWith(`${prefix}.`),
        ),
    );
}

function firstSectionWithErrors(
    errors: Record<string, string | undefined>,
): ComboEditorSectionKey | null {
    return (
        sectionLinks.find((section) => sectionHasError(section, errors))?.key ??
        null
    );
}

function availableStock(
    product: ComboComponentProductOption,
    variantStockId: string | number | null,
): number | null {
    if (!product.has_variations) {
        return product.base_quantity;
    }

    if (!variantStockId) {
        return null;
    }

    return (
        product.variant_stocks.find(
            (stock) => stock.id === Number(variantStockId),
        )?.quantity ?? null
    );
}

function mediaForCombo(
    items: ComboItemValue[],
    productsById: Map<number, ComboComponentProductOption>,
): InheritedComboMedia[] {
    const seenIds = new Set<number>();

    return items.flatMap((item) => {
        const componentProduct = productsById.get(
            Number(item.component_product_id),
        );

        if (!componentProduct) {
            return [];
        }

        return componentProduct.media.flatMap((media) => {
            if (seenIds.has(media.id)) {
                return [];
            }

            seenIds.add(media.id);

            return [
                {
                    ...media,
                    sourceProductId: componentProduct.id,
                    sourceProductName: componentProduct.name,
                },
            ];
        });
    });
}

export function ProductComboForm({
    mode,
    categories,
    componentProducts,
    product,
}: Props) {
    const initialItems =
        product?.combo_items?.map((item) => ({
            component_product_id: item.component_product_id,
            component_variant_stock_id: item.component_variant_stock_id,
            quantity: item.quantity,
        })) ?? [];
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
    } = useForm<ComboEditorData>({
        name: product?.name ?? '',
        sku: product?.sku ?? '',
        description: product?.description ?? '',
        product_category_id: product?.product_category_id ?? '',
        price: centsToDisplay(product?.price_cents),
        is_active: product?.is_active ?? true,
        sort_order: product?.sort_order ?? 0,
        combo_items: initialItems,
    });
    const formErrors = errors as Record<string, string | undefined>;
    const [activeSection, setActiveSection] =
        useState<ComboEditorSectionKey>('presentation');
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerTarget, setPickerTarget] = useState<number | 'new'>('new');

    const productsById = useMemo(
        () =>
            new Map(
                componentProducts.map((componentProduct) => [
                    componentProduct.id,
                    componentProduct,
                ]),
            ),
        [componentProducts],
    );
    const selectedProducts = useMemo(
        () =>
            data.combo_items.flatMap((item) => {
                const componentProduct = productsById.get(
                    Number(item.component_product_id),
                );

                return componentProduct ? [componentProduct] : [];
            }),
        [data.combo_items, productsById],
    );
    const inheritedMedia = useMemo(
        () => mediaForCombo(data.combo_items, productsById),
        [data.combo_items, productsById],
    );
    const errorCount = Object.keys(formErrors).length;

    useUnsavedChangesGuard(isDirty);

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
                        visibleSection.target.id as ComboEditorSectionKey,
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

    const scrollToSection = (section: ComboEditorSectionKey) => {
        setActiveSection(section);
        document.getElementById(section)?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };

    const openPicker = (target: number | 'new') => {
        setPickerTarget(target);
        setPickerOpen(true);
    };

    const selectProduct = (selectedProduct: ComboComponentProductOption) => {
        const onlyVariant =
            selectedProduct.has_variations &&
            selectedProduct.variant_stocks.length === 1
                ? selectedProduct.variant_stocks[0].id
                : null;
        const nextItem: ComboItemValue = {
            component_product_id: selectedProduct.id,
            component_variant_stock_id: onlyVariant,
            quantity: 1,
        };

        if (pickerTarget === 'new') {
            setData('combo_items', [...data.combo_items, nextItem]);
            return;
        }

        setData(
            'combo_items',
            data.combo_items.map((item, index) =>
                index === pickerTarget ? nextItem : item,
            ),
        );
    };

    const updateItem = (index: number, patch: Partial<ComboItemValue>) => {
        setData(
            'combo_items',
            data.combo_items.map((item, currentIndex) =>
                currentIndex === index ? { ...item, ...patch } : item,
            ),
        );
    };

    const removeItem = (index: number) => {
        setData(
            'combo_items',
            data.combo_items.filter(
                (_, currentIndex) => currentIndex !== index,
            ),
        );
    };

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        clearErrors();

        let hasClientError = false;
        let firstErrorSection: ComboEditorSectionKey | null = null;

        if (data.name.trim() === '') {
            setError('name', 'Dê um nome ao combo antes de salvar.');
            hasClientError = true;
            firstErrorSection ??= 'presentation';
        }

        if (data.sku.trim() === '') {
            setError('sku', 'Informe o SKU que identifica este combo.');
            hasClientError = true;
            firstErrorSection ??= 'presentation';
        }

        if (data.price.trim() === '') {
            setError('price', 'Defina o preço do combo.');
            hasClientError = true;
            firstErrorSection ??= 'presentation';
        }

        if (data.combo_items.length === 0) {
            setError('combo_items', 'Adicione pelo menos uma peça ao combo.');
            hasClientError = true;
            firstErrorSection ??= 'composition';
        }

        if (hasClientError) {
            scrollToSection(firstErrorSection ?? 'presentation');
            return;
        }

        if (mode === 'create') {
            post(manufacturer.products.combos.store().url, {
                preserveScroll: true,
            });
            return;
        }

        if (!product) {
            return;
        }

        put(manufacturer.products.combos.update(product.id).url, {
            preserveScroll: true,
            onSuccess: () => setDefaults(),
        });
    };

    const saveLabel = mode === 'create' ? 'Criar combo' : 'Salvar alterações';

    return (
        <form
            id={PRODUCT_COMBO_EDITOR_FORM_ID}
            onSubmit={handleSubmit}
            className="min-w-0"
        >
            <nav
                aria-label="Seções do editor de combo"
                className="sticky top-0 z-20 -mx-5 border-b border-border bg-[#f6f4f0] px-5 sm:-mx-7 sm:px-7 md:-mx-9 md:px-9 xl:-mx-12 xl:px-12 2xl:-mx-14 2xl:px-14"
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
                            O combo precisa de {errorCount}{' '}
                            {errorCount === 1 ? 'ajuste' : 'ajustes'} antes de
                            seguir.
                        </p>
                        <p className="mt-1 text-xs leading-5">
                            A seção que pede atenção está marcada acima.
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
                    <ComboLivePreview
                        data={data}
                        categories={categories}
                        selectedProducts={selectedProducts}
                        inheritedMedia={inheritedMedia}
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
                                {data.is_active ? 'Visível' : 'Oculto'}
                            </span>
                        }
                    >
                        <div className="space-y-6">
                            <EditorField
                                label="Nome do combo"
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
                                    placeholder="Ex.: Combo Aconchego Essencial"
                                    autoComplete="off"
                                    className={`${fieldClassName} h-[64px] px-4 font-zouth-display text-[clamp(1.25rem,2vw,1.65rem)] font-semibold tracking-[-0.035em]`}
                                />
                            </EditorField>

                            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                <EditorField
                                    label="SKU"
                                    htmlFor="sku"
                                    required
                                    hint="O código interno deste conjunto."
                                    error={formErrors.sku}
                                >
                                    <input
                                        id="sku"
                                        value={data.sku}
                                        onChange={(event) =>
                                            setData('sku', event.target.value)
                                        }
                                        placeholder="COMBO-001"
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
                                    label="Preço do combo"
                                    htmlFor="price"
                                    required
                                    hint="O valor do conjunto completo."
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
                                        placeholder="R$ 229,90"
                                        className={fieldClassName}
                                    />
                                </EditorField>
                            </div>

                            <EditorField
                                label="História do conjunto"
                                htmlFor="description"
                                hint="Explique por que essas peças funcionam melhor juntas."
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
                                    placeholder="Conte o que torna esta combinação especial para a coleção."
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
                                                detail: 'Pronto para vender',
                                            },
                                            {
                                                value: false,
                                                label: 'Oculto',
                                                detail: 'Ainda em montagem',
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

                    <EditorSection
                        id="composition"
                        eyebrow="02 · Composição"
                        description="Monte o conjunto com as peças, variações e quantidades. O estoque é atualizado automaticamente."
                        marker={
                            <span className="inline-flex min-h-8 items-center gap-2 bg-[#18181f] px-3 text-[0.68rem] font-bold tracking-[0.08em] text-[#f6f4f0] uppercase">
                                {data.combo_items.length}{' '}
                                {data.combo_items.length === 1
                                    ? 'peça'
                                    : 'peças'}
                            </span>
                        }
                    >
                        <div className="space-y-5">
                            {formErrors.combo_items && (
                                <p
                                    className="flex items-center gap-2 border border-[#b42318]/30 bg-[#b42318]/5 px-4 py-3 text-sm font-medium text-[#8f1d14]"
                                    role="alert"
                                >
                                    <CircleAlert
                                        className="size-4 shrink-0"
                                        aria-hidden="true"
                                    />
                                    {formErrors.combo_items}
                                </p>
                            )}

                            {data.combo_items.length === 0 ? (
                                <button
                                    type="button"
                                    onClick={() => openPicker('new')}
                                    className="group flex min-h-72 w-full flex-col items-center justify-center border border-dashed border-[#bcb7ad] px-6 text-center transition-colors hover:border-[#18181f] hover:bg-[#e7e3dc]/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]"
                                >
                                    <span className="mb-5 flex size-14 items-center justify-center bg-[#ff4d3d] text-[#18181f] transition-transform group-hover:-translate-y-1 motion-reduce:transition-none">
                                        <PackageOpen
                                            className="size-6"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <span className="font-zouth-display text-xl font-semibold tracking-[-0.035em]">
                                        Comece pela primeira peça
                                    </span>
                                    <span className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                                        Escolha um produto da coleção. Depois,
                                        defina variação e quantidade sem perder
                                        a composição de vista.
                                    </span>
                                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#c53024]">
                                        <Plus
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        Escolher peça
                                    </span>
                                </button>
                            ) : (
                                <div className="border-y border-border">
                                    {data.combo_items.map((item, index) => {
                                        const selectedProduct =
                                            productsById.get(
                                                Number(
                                                    item.component_product_id,
                                                ),
                                            );
                                        const selectedVariant =
                                            selectedProduct?.variant_stocks.find(
                                                (stock) =>
                                                    stock.id ===
                                                    Number(
                                                        item.component_variant_stock_id,
                                                    ),
                                            );
                                        const stock = selectedProduct
                                            ? availableStock(
                                                  selectedProduct,
                                                  item.component_variant_stock_id,
                                              )
                                            : null;
                                        const comboCapacity =
                                            stock == null
                                                ? null
                                                : Math.floor(
                                                      stock /
                                                          Math.max(
                                                              item.quantity,
                                                              1,
                                                          ),
                                                  );
                                        const image =
                                            selectedProduct?.media.find(
                                                (media) =>
                                                    media.type === 'image' &&
                                                    media.url,
                                            );
                                        const itemPrefix = `combo_items.${index}`;

                                        if (!selectedProduct) {
                                            return null;
                                        }

                                        return (
                                            <article
                                                key={`${selectedProduct.id}-${index}`}
                                                className="grid gap-5 border-b border-border py-6 last:border-b-0 xl:grid-cols-[116px_minmax(0,1.15fr)_minmax(210px,0.72fr)_minmax(170px,0.52fr)] xl:items-center"
                                            >
                                                <div className="relative aspect-[4/5] w-[116px] overflow-hidden bg-[#e7e3dc]">
                                                    {image?.url ? (
                                                        <img
                                                            src={
                                                                image.thumbnail_url ??
                                                                image.url
                                                            }
                                                            alt=""
                                                            loading="lazy"
                                                            decoding="async"
                                                            className="size-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex size-full items-center justify-center text-muted-foreground">
                                                            <ImageIcon
                                                                className="size-5"
                                                                aria-hidden="true"
                                                            />
                                                        </div>
                                                    )}
                                                    <span className="absolute top-2 left-2 bg-[#18181f] px-2 py-1 text-[0.58rem] font-bold tracking-[0.1em] text-[#f6f4f0] uppercase">
                                                        {String(
                                                            index + 1,
                                                        ).padStart(2, '0')}
                                                    </span>
                                                </div>

                                                <div className="min-w-0">
                                                    <p className="text-[0.62rem] font-bold tracking-[0.14em] text-[#e93d30] uppercase">
                                                        {selectedProduct.category_name ??
                                                            'Peça da coleção'}
                                                    </p>
                                                    <h3 className="mt-2 font-zouth-display text-xl font-semibold tracking-[-0.035em]">
                                                        {selectedProduct.name}
                                                    </h3>
                                                    <p className="mt-2 text-xs text-muted-foreground">
                                                        SKU{' '}
                                                        {selectedProduct.sku} ·{' '}
                                                        {formatPrice(
                                                            selectedProduct.price_cents,
                                                        )}
                                                    </p>
                                                    <div className="mt-4 flex flex-wrap items-center gap-4">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openPicker(
                                                                    index,
                                                                )
                                                            }
                                                            className="inline-flex min-h-9 items-center gap-2 text-xs font-bold text-foreground underline decoration-[#cac4ba] underline-offset-4 hover:text-[#c53024] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]"
                                                        >
                                                            <RefreshCw
                                                                className="size-3.5"
                                                                aria-hidden="true"
                                                            />
                                                            Trocar peça
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeItem(
                                                                    index,
                                                                )
                                                            }
                                                            className="inline-flex min-h-9 items-center gap-2 text-xs font-bold text-[#8f1d14] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]"
                                                        >
                                                            <Trash2
                                                                className="size-3.5"
                                                                aria-hidden="true"
                                                            />
                                                            Remover
                                                        </button>
                                                    </div>
                                                    {formErrors[
                                                        `${itemPrefix}.component_product_id`
                                                    ] && (
                                                        <p className="mt-2 text-xs font-medium text-[#b42318]">
                                                            {
                                                                formErrors[
                                                                    `${itemPrefix}.component_product_id`
                                                                ]
                                                            }
                                                        </p>
                                                    )}
                                                </div>

                                                <EditorField
                                                    label="Escolha desta peça"
                                                    error={
                                                        formErrors[
                                                            `${itemPrefix}.component_variant_stock_id`
                                                        ]
                                                    }
                                                >
                                                    {selectedProduct.has_variations ? (
                                                        <Select
                                                            value={
                                                                item.component_variant_stock_id
                                                                    ? String(
                                                                          item.component_variant_stock_id,
                                                                      )
                                                                    : ''
                                                            }
                                                            onValueChange={(
                                                                value,
                                                            ) =>
                                                                updateItem(
                                                                    index,
                                                                    {
                                                                        component_variant_stock_id:
                                                                            Number(
                                                                                value,
                                                                            ),
                                                                    },
                                                                )
                                                            }
                                                        >
                                                            <SelectTrigger className="h-[52px] rounded-[2px] border-border bg-transparent shadow-none focus:ring-2 focus:ring-[#ff4d3d]/25">
                                                                <SelectValue placeholder="Selecione a variação" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {selectedProduct.variant_stocks.map(
                                                                    (
                                                                        variant,
                                                                    ) => (
                                                                        <SelectItem
                                                                            key={
                                                                                variant.id
                                                                            }
                                                                            value={String(
                                                                                variant.id,
                                                                            )}
                                                                        >
                                                                            {variationLabel(
                                                                                variant.variation_key,
                                                                            )}{' '}
                                                                            ·{' '}
                                                                            {
                                                                                variant.quantity
                                                                            }{' '}
                                                                            un.
                                                                        </SelectItem>
                                                                    ),
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <div className="flex h-[52px] items-center border border-border px-3 text-sm text-muted-foreground">
                                                            Peça única, sem
                                                            variação
                                                        </div>
                                                    )}
                                                    {selectedVariant?.sku_variant && (
                                                        <p className="mt-2 text-xs text-muted-foreground">
                                                            SKU da opção{' '}
                                                            {
                                                                selectedVariant.sku_variant
                                                            }
                                                        </p>
                                                    )}
                                                </EditorField>

                                                <div className="min-w-0">
                                                    <p className="mb-2 font-zouth-display text-[0.68rem] font-bold tracking-[0.12em] text-foreground uppercase">
                                                        Em cada combo
                                                    </p>
                                                    <div className="grid h-[52px] grid-cols-[44px_minmax(50px,1fr)_44px] border border-border">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                updateItem(
                                                                    index,
                                                                    {
                                                                        quantity:
                                                                            Math.max(
                                                                                1,
                                                                                item.quantity -
                                                                                    1,
                                                                            ),
                                                                    },
                                                                )
                                                            }
                                                            disabled={
                                                                item.quantity <=
                                                                1
                                                            }
                                                            className="flex items-center justify-center border-r border-border hover:bg-[#e7e3dc]/45 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d] disabled:cursor-not-allowed disabled:opacity-35"
                                                            aria-label={`Diminuir quantidade de ${selectedProduct.name}`}
                                                        >
                                                            <Minus
                                                                className="size-4"
                                                                aria-hidden="true"
                                                            />
                                                        </button>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={9999}
                                                            value={
                                                                item.quantity
                                                            }
                                                            onChange={(event) =>
                                                                updateItem(
                                                                    index,
                                                                    {
                                                                        quantity:
                                                                            Math.max(
                                                                                1,
                                                                                Number(
                                                                                    event
                                                                                        .target
                                                                                        .value,
                                                                                ) ||
                                                                                    1,
                                                                            ),
                                                                    },
                                                                )
                                                            }
                                                            aria-label={`Quantidade de ${selectedProduct.name} em cada combo`}
                                                            className="min-w-0 [appearance:textfield] bg-transparent text-center font-zouth-display text-base font-bold outline-none focus:ring-2 focus:ring-[#ff4d3d]/25 focus:ring-inset [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                updateItem(
                                                                    index,
                                                                    {
                                                                        quantity:
                                                                            item.quantity +
                                                                            1,
                                                                    },
                                                                )
                                                            }
                                                            className="flex items-center justify-center border-l border-border hover:bg-[#e7e3dc]/45 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d]"
                                                            aria-label={`Aumentar quantidade de ${selectedProduct.name}`}
                                                        >
                                                            <Plus
                                                                className="size-4"
                                                                aria-hidden="true"
                                                            />
                                                        </button>
                                                    </div>
                                                    <div className="mt-3 flex items-start justify-between gap-3 text-xs">
                                                        <span className="text-muted-foreground">
                                                            {stock == null
                                                                ? 'Escolha uma variação'
                                                                : `${stock} un. disponíveis`}
                                                        </span>
                                                        {comboCapacity !=
                                                            null && (
                                                            <span className="font-bold text-[#245845]">
                                                                rende{' '}
                                                                {comboCapacity}{' '}
                                                                {comboCapacity ===
                                                                1
                                                                    ? 'combo'
                                                                    : 'combos'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {formErrors[
                                                        `${itemPrefix}.quantity`
                                                    ] && (
                                                        <p className="mt-2 text-xs font-medium text-[#b42318]">
                                                            {
                                                                formErrors[
                                                                    `${itemPrefix}.quantity`
                                                                ]
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}

                            {data.combo_items.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => openPicker('new')}
                                    className="flex min-h-14 w-full items-center justify-center gap-2 border border-dashed border-[#bcb7ad] text-sm font-bold text-foreground hover:border-[#18181f] hover:bg-[#e7e3dc]/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]"
                                >
                                    <Plus
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Adicionar outra peça
                                </button>
                            )}
                        </div>
                    </EditorSection>

                    <EditorSection
                        id="showcase"
                        eyebrow="03 · Imagens e vídeos"
                        description="A apresentação do combo acompanha as fotos e os vídeos cadastradas nas peças escolhidas."
                        marker={
                            <span className="inline-flex min-h-8 items-center gap-2 bg-[#ff4d3d] px-3 text-[0.68rem] font-bold tracking-[0.08em] text-[#18181f] uppercase">
                                {inheritedMedia.length}{' '}
                                {inheritedMedia.length === 1
                                    ? 'mídia'
                                    : 'mídias'}
                            </span>
                        }
                    >
                        <div className="space-y-6">
                            {/* <div className="grid gap-4 border border-[#ff4d3d]/45 bg-[#ff4d3d]/6 p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
                                <span className="flex size-10 items-center justify-center bg-[#ff4d3d] text-[#18181f]">
                                    <ImageIcon
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                </span>
                                <div>
                                    <h3 className="font-zouth-display text-lg font-semibold tracking-[-0.03em]">
                                        A vitrine nasce das peças
                                        <span className="text-[#ff4d3d]">
                                            .
                                        </span>
                                    </h3>
                                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                                        Nada de reenviar arquivos. Quando uma
                                        foto ou vídeo muda no produto, o combo
                                        acompanha a atualização.
                                    </p>
                                </div>
                            </div> */}

                            {inheritedMedia.length > 0 ? (
                                <div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 xl:grid-cols-3">
                                    {inheritedMedia.map((media) => (
                                        <figure
                                            key={media.id}
                                            className="group min-w-0 bg-[#f6f4f0]"
                                        >
                                            <div className="relative aspect-[4/5] overflow-hidden bg-[#e7e3dc]">
                                                {media.type === 'image' &&
                                                media.url ? (
                                                    <img
                                                        src={
                                                            media.thumbnail_url ??
                                                            media.url
                                                        }
                                                        alt=""
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
                                                    />
                                                ) : media.url ? (
                                                    <>
                                                        <video
                                                            src={media.url}
                                                            muted
                                                            playsInline
                                                            preload="metadata"
                                                            className="size-full object-cover"
                                                        />
                                                        <span className="absolute inset-0 flex items-center justify-center bg-[#18181f]/20">
                                                            <span className="flex size-11 items-center justify-center bg-[#f6f4f0] text-[#18181f]">
                                                                <Play
                                                                    className="ml-0.5 size-4 fill-current"
                                                                    aria-hidden="true"
                                                                />
                                                            </span>
                                                        </span>
                                                    </>
                                                ) : (
                                                    <div className="flex size-full items-center justify-center text-muted-foreground">
                                                        <ImageIcon
                                                            className="size-6"
                                                            aria-hidden="true"
                                                        />
                                                    </div>
                                                )}
                                                <span className="absolute top-3 left-3 bg-[#18181f] px-2.5 py-1 text-[0.6rem] font-bold tracking-[0.1em] text-[#f6f4f0] uppercase">
                                                    {media.type === 'video'
                                                        ? 'Vídeo'
                                                        : 'Foto'}
                                                </span>
                                            </div>
                                            <figcaption className="truncate border-t border-border px-3 py-3 text-xs font-medium text-muted-foreground">
                                                De {media.sourceProductName}
                                            </figcaption>
                                        </figure>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex min-h-60 flex-col items-center justify-center border border-dashed border-[#bcb7ad] px-6 text-center">
                                    <ImageIcon
                                        className="mb-4 size-6 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <p className="font-zouth-display text-lg font-semibold tracking-[-0.025em]">
                                        A vitrine ainda está vazia
                                    </p>
                                    <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                                        Escolha peças que já tenham fotos ou
                                        vídeos. Elas aparecem aqui
                                        automaticamente.
                                    </p>
                                </div>
                            )}
                        </div>
                    </EditorSection>
                </div>

                <aside className="hidden min-w-0 border-l border-border pl-7 lg:block xl:pl-9">
                    <div className="sticky top-20">
                        <p className="mb-4 text-[0.68rem] font-bold tracking-[0.2em] text-foreground uppercase">
                            Prévia no catálogo
                        </p>
                        <ComboLivePreview
                            data={data}
                            categories={categories}
                            selectedProducts={selectedProducts}
                            inheritedMedia={inheritedMedia}
                        />
                        <p className="mt-4 text-xs leading-5 text-muted-foreground">
                            A composição usa a identidade e as mídias das peças
                            selecionadas. Nenhum arquivo é duplicado.
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
                        {processing ? (
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
                                ? 'Criando o combo…'
                                : 'Salvando o combo…'
                            : recentlySuccessful
                              ? 'Alterações salvas agora'
                              : isDirty
                                ? 'Alterações ainda não salvas'
                                : mode === 'create'
                                  ? 'Comece pela apresentação do combo'
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
                            disabled={processing}
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

            <ComboProductPicker
                open={pickerOpen}
                products={componentProducts}
                selectedProductIds={data.combo_items.map((item) =>
                    Number(item.component_product_id),
                )}
                onOpenChange={setPickerOpen}
                onSelect={selectProduct}
            />
        </form>
    );
}
