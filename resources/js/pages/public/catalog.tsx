import { Head, router } from '@inertiajs/react';
import {
    Box,
    Check,
    ChevronLeft,
    ChevronRight,
    ClipboardCopy,
    Filter,
    Heart,
    Minus,
    Package,
    Plus,
    RotateCcw,
    Search,
    SlidersHorizontal,
    ShoppingCart,
    Sparkles,
    Star,
    Trash2,
    X,
    Zap,
} from 'lucide-react';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type FormEvent,
    type MouseEvent,
    type ReactNode,
} from 'react';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { LAYOUT_TOKENS, PATTERNS, GRADIENTS } from '@/lib/catalog-theming';

interface Manufacturer {
    id: number;
    name: string;
    slug: string;
}

interface CatalogSettings {
    brand_name: string;
    tagline?: string | null;
    description?: string | null;
    logo_url?: string | null;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    background_color: string;
    font_family: string;
    // Premium fields
    layout_preset: string;
    layout_density: string;
    card_style: string;
    background_mode: string;
    background_image_url?: string | null;
    background_image_opacity: number;
    background_overlay_color: string;
    background_overlay_opacity: number;
    background_blur: number;
    pattern_id?: string | null;
    pattern_color?: string | null;
    pattern_opacity: number;
    gradient_id?: string | null;
    sections: Array<{
        type: string;
        enabled: boolean;
        props: Record<string, any>;
    }>;
}

interface Product {
    id: number;
    product_type: 'product' | 'combo';
    name: string;
    sku: string;
    category?: string | null;
    primary_image?: string | null;
    images: string[];
    variations: Array<{
        type_name: string;
        is_color_type: boolean;
        values: Array<{ value: string; hex?: string | null }>;
    }>;
    variant_stocks: Array<{
        variation_key: Record<string, string>;
        quantity: number;
        price_cents?: number | null;
    }>;
    combo_items: Array<{
        product_id: number;
        product_name: string | null;
        product_sku: string | null;
        variation_key: Record<string, string> | null;
        quantity: number;
    }>;
    total_stock: number;
    price_cents?: number | null;
}

interface Paginated<T> {
    data: T[];
    links?: Array<{ url: string | null; label: string; active: boolean }>;
    meta?: {
        current_page: number;
        last_page: number;
        links?: Array<{ url: string | null; label: string; active: boolean }>;
    };
}

interface Props {
    manufacturer: Manufacturer;
    catalog_settings: CatalogSettings;
    products: Paginated<Product>;
    catalog_token: string;
    filters: CatalogFilters;
    filter_options: CatalogFilterOptions;
}

interface CatalogFilters {
    search: string;
    category_id?: string | null;
    variations: Record<string, string[]>;
}

interface CatalogFilterOptions {
    categories: Array<{
        id: number;
        name: string;
    }>;
    variation_types: Array<{
        id: number;
        name: string;
        is_color_type: boolean;
        values: Array<{
            value: string;
            hex?: string | null;
        }>;
    }>;
}

interface CartItem {
    key: string;
    product: Product;
    quantity: number;
    size?: string | null;
    color?: string | null;
    selected_variations?: Record<string, string>;
}

type DocumentType = 'cpf' | 'cnpj';
type SelectedVariations = Record<number, Record<string, string>>;

const BRAZILIAN_STATES = [
    'AC',
    'AL',
    'AP',
    'AM',
    'BA',
    'CE',
    'DF',
    'ES',
    'GO',
    'MA',
    'MT',
    'MS',
    'MG',
    'PA',
    'PB',
    'PR',
    'PE',
    'PI',
    'RJ',
    'RN',
    'RS',
    'RO',
    'RR',
    'SC',
    'SP',
    'SE',
    'TO',
];

interface LayoutProps {
    manufacturer: Manufacturer;
    settings: CatalogSettings;
    products: Paginated<Product>;
    tokens: typeof LAYOUT_TOKENS.minimal;
    onAddToCart: (product: Product) => void;
    addedProductId: number | null;
    selectedVariations: SelectedVariations;
    catalogToken: string;
    filters: CatalogFilters;
    filterOptions: CatalogFilterOptions;
    onSelectVariation: (
        productId: number,
        variationName: string,
        value: string,
    ) => void;
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

function variationSummary(key: Record<string, string> | null): string | null {
    if (!key) {
        return null;
    }

    return Object.entries(key)
        .map(([name, value]) => `${name}: ${value}`)
        .join(' / ');
}

function productHasRequiredSelection(
    product: Product,
    selectedValues: Record<string, string>,
): boolean {
    return product.variations.every((variation) =>
        Boolean(selectedValues[variation.type_name]),
    );
}

function cartOptionsFromSelection(
    product: Product,
    selectedValues: Record<string, string>,
): Pick<CartItem, 'size' | 'color' | 'selected_variations'> {
    const selected_variations =
        product.variations.length > 0 ? selectedValues : undefined;
    const colorVariation = product.variations.find(
        (variation) => variation.is_color_type,
    );
    const sizeVariation = product.variations.find(
        (variation) => !variation.is_color_type,
    );

    return {
        color: colorVariation
            ? (selectedValues[colorVariation.type_name] ?? null)
            : null,
        size: sizeVariation
            ? (selectedValues[sizeVariation.type_name] ?? null)
            : null,
        selected_variations,
    };
}

function cartItemKey(
    productId: number,
    selectedVariations?: Record<string, string>,
): string {
    if (!selectedVariations || Object.keys(selectedVariations).length === 0) {
        return String(productId);
    }

    const variationKey = Object.entries(selectedVariations)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, value]) => `${name}:${value}`)
        .join('|');

    return `${productId}:${variationKey}`;
}

function ProductVariations({
    product,
    selectedValues,
    onSelect,
}: {
    product: Product;
    selectedValues: Record<string, string>;
    onSelect: (variationName: string, value: string) => void;
}) {
    if (product.variations.length === 0) {
        return null;
    }

    return (
        <div className="space-y-2">
            {product.variations.map((variation) => {
                const visibleValues = variation.values.slice(0, 6);
                const remainingCount =
                    variation.values.length - visibleValues.length;

                return (
                    <div key={variation.type_name}>
                        <div className="flex flex-wrap gap-1.5">
                            {visibleValues.map((value) => (
                                <button
                                    type="button"
                                    key={`${variation.type_name}-${value.value}`}
                                    aria-label={`${variation.type_name}: ${value.value}`}
                                    title={`${variation.type_name}: ${value.value}`}
                                    onClick={() =>
                                        onSelect(
                                            variation.type_name,
                                            value.value,
                                        )
                                    }
                                    className={`inline-flex h-8 min-w-8 items-center justify-center border bg-white/75 text-[11px] font-semibold transition-all hover:scale-105 hover:bg-white ${
                                        selectedValues[variation.type_name] ===
                                        value.value
                                            ? 'border-black shadow-md ring-2 ring-black/20'
                                            : 'border-black/10 ring-1 ring-black/5'
                                    } ${
                                        variation.is_color_type
                                            ? 'rounded-full p-1'
                                            : 'rounded-md px-2'
                                    }`}
                                >
                                    {variation.is_color_type ? (
                                        <span
                                            className="h-full w-full rounded-full border border-black/10"
                                            style={{
                                                backgroundColor:
                                                    value.hex ?? '#e5e7eb',
                                            }}
                                        />
                                    ) : (
                                        value.value
                                    )}
                                </button>
                            ))}
                            {remainingCount > 0 && (
                                <span className="inline-flex min-h-6 items-center rounded-full bg-white/50 px-2 py-0.5 text-[11px] font-medium opacity-70 ring-1 ring-black/10">
                                    +{remainingCount}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function ProductImageSlider({
    product,
    className,
    imageClassName,
    placeholderClassName = 'flex h-full items-center justify-center',
    placeholderIconClassName = 'h-12 w-12 opacity-20',
    placeholderStyle,
    style,
    children,
}: {
    product: Product;
    className: string;
    imageClassName: string;
    placeholderClassName?: string;
    placeholderIconClassName?: string;
    placeholderStyle?: CSSProperties;
    style?: CSSProperties;
    children?: ReactNode;
}) {
    const productImages = product.images ?? [];
    const images =
        productImages.length > 0
            ? productImages
            : product.primary_image
              ? [product.primary_image]
              : [];
    const [currentIndex, setCurrentIndex] = useState(0);
    const currentImage = images[currentIndex] ?? null;
    const hasMultipleImages = images.length > 1;

    useEffect(() => {
        setCurrentIndex(0);
    }, [product.id, images.length]);

    const showPrevious = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        setCurrentIndex((current) =>
            current === 0 ? images.length - 1 : current - 1,
        );
    };

    const showNext = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();

        setCurrentIndex((current) =>
            current === images.length - 1 ? 0 : current + 1,
        );
    };

    const selectImage = (
        event: MouseEvent<HTMLButtonElement>,
        index: number,
    ) => {
        event.preventDefault();
        event.stopPropagation();

        setCurrentIndex(index);
    };

    return (
        <div className={`relative overflow-hidden ${className}`} style={style}>
            {currentImage ? (
                <img
                    src={currentImage}
                    alt={product.name}
                    className={imageClassName}
                />
            ) : (
                <div className={placeholderClassName} style={placeholderStyle}>
                    <Box className={placeholderIconClassName} />
                </div>
            )}

            {children}

            {hasMultipleImages && (
                <>
                    <button
                        type="button"
                        onClick={showPrevious}
                        className="absolute top-1/2 left-2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-gray-900 shadow-md transition hover:bg-white"
                        aria-label="Imagem anterior"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={showNext}
                        className="absolute top-1/2 right-2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-gray-900 shadow-md transition hover:bg-white"
                        aria-label="Próxima imagem"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
                        {images.map((image, index) => (
                            <button
                                type="button"
                                key={`${image}-${index}`}
                                onClick={(event) => selectImage(event, index)}
                                className={`h-2 rounded-full shadow-sm transition-all ${
                                    index === currentIndex
                                        ? 'w-5 bg-white'
                                        : 'w-2 bg-white/60 hover:bg-white/90'
                                }`}
                                aria-label={`Ver imagem ${index + 1}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function normalizeSelectedFilterVariations(
    variations: Record<string, string[]> | undefined,
): Record<string, string[]> {
    return Object.fromEntries(
        Object.entries(variations ?? {})
            .map(([typeId, values]) => [
                typeId,
                Array.isArray(values) ? values.filter(Boolean) : [],
            ])
            .filter(([, values]) => values.length > 0),
    );
}

function countActiveFilters(filters: CatalogFilters): number {
    const variationCount = Object.values(filters.variations ?? {}).reduce(
        (total, values) => total + values.length,
        0,
    );

    return (
        (filters.search?.trim() ? 1 : 0) +
        (filters.category_id ? 1 : 0) +
        variationCount
    );
}

function CatalogFiltersDrawer({
    catalogToken,
    filters,
    filterOptions,
}: {
    catalogToken: string;
    filters: CatalogFilters;
    filterOptions: CatalogFilterOptions;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(filters.search ?? '');
    const [categoryId, setCategoryId] = useState(filters.category_id ?? null);
    const [selectedVariations, setSelectedVariations] = useState<
        Record<string, string[]>
    >(normalizeSelectedFilterVariations(filters.variations));
    const selectedVariationsRef = useRef<Record<string, string[]>>(
        normalizeSelectedFilterVariations(filters.variations),
    );

    useEffect(() => {
        setSearch(filters.search ?? '');
        setCategoryId(filters.category_id ?? null);
        const normalizedVariations = normalizeSelectedFilterVariations(
            filters.variations,
        );
        selectedVariationsRef.current = normalizedVariations;
        setSelectedVariations(normalizedVariations);
    }, [filters.search, filters.category_id, filters.variations]);

    const appliedCount = countActiveFilters(filters);
    const draftCount = countActiveFilters({
        search,
        category_id: categoryId,
        variations: selectedVariations,
    });

    const toggleVariationValue = (typeId: number, value: string) => {
        const key = String(typeId);
        const current = selectedVariationsRef.current;
        const currentValues = current[key] ?? [];
        const nextValues = currentValues.includes(value)
            ? currentValues.filter((item) => item !== value)
            : [...currentValues, value];
        let nextState: Record<string, string[]>;

        if (nextValues.length === 0) {
            const remaining = { ...current };
            delete remaining[key];

            nextState = remaining;
        } else {
            nextState = {
                ...current,
                [key]: nextValues,
            };
        }

        selectedVariationsRef.current = nextState;
        setSelectedVariations(nextState);
    };

    const applyFilters = (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault();

        const payload: Record<string, string | Record<string, string[]>> = {};
        const trimmedSearch = search.trim();
        const variations = normalizeSelectedFilterVariations(
            selectedVariationsRef.current,
        );

        if (trimmedSearch) {
            payload.search = trimmedSearch;
        }

        if (categoryId) {
            payload.category_id = categoryId;
        }

        if (Object.keys(variations).length > 0) {
            payload.variations = variations;
        }

        router.get(`/catalog/${catalogToken}`, payload, {
            preserveState: false,
            preserveScroll: true,
            replace: true,
            onSuccess: () => setOpen(false),
        });
    };

    const clearFilters = () => {
        setSearch('');
        setCategoryId(null);
        selectedVariationsRef.current = {};
        setSelectedVariations({});

        router.get(
            `/catalog/${catalogToken}`,
            {},
            {
                preserveState: false,
                preserveScroll: true,
                replace: true,
                onSuccess: () => setOpen(false),
            },
        );
    };

    return (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/55 p-3 shadow-sm ring-1 ring-black/5 backdrop-blur-md">
            <div className="flex items-center gap-2 text-sm font-medium opacity-80">
                <Filter className="h-4 w-4" />
                <span>
                    {appliedCount > 0
                        ? `${appliedCount} filtros ativos`
                        : 'Filtros'}
                </span>
            </div>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:scale-[1.02]"
                style={{ backgroundColor: 'var(--brand-primary)' }}
            >
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
                {appliedCount > 0 && (
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                        {appliedCount}
                    </span>
                )}
            </button>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent side="left" className="w-[92vw] sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Filtros</SheetTitle>
                        <SheetDescription>
                            Refine os produtos do catálogo
                        </SheetDescription>
                    </SheetHeader>

                    <form
                        id="catalog-filter-form"
                        onSubmit={applyFilters}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-24">
                            <div className="space-y-2">
                                <Label htmlFor="catalog-search">Buscar</Label>
                                <div className="relative">
                                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 opacity-45" />
                                    <Input
                                        id="catalog-search"
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        placeholder="Nome ou SKU"
                                        className="pl-9"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Categoria</Label>
                                <Select
                                    value={categoryId ?? 'all'}
                                    onValueChange={(value) =>
                                        setCategoryId(
                                            value === 'all' ? null : value,
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todas categorias" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">
                                            Todas categorias
                                        </SelectItem>
                                        {filterOptions.categories.map(
                                            (category) => (
                                                <SelectItem
                                                    key={category.id}
                                                    value={String(category.id)}
                                                >
                                                    {category.name}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {filterOptions.variation_types.map((type) => {
                                const selectedValues =
                                    selectedVariations[String(type.id)] ?? [];

                                return (
                                    <div key={type.id} className="space-y-3">
                                        <Label>{type.name}</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {type.values.map((value) => {
                                                const isSelected =
                                                    selectedValues.includes(
                                                        value.value,
                                                    );

                                                if (type.is_color_type) {
                                                    return (
                                                        <button
                                                            type="button"
                                                            key={value.value}
                                                            onClick={() =>
                                                                toggleVariationValue(
                                                                    type.id,
                                                                    value.value,
                                                                )
                                                            }
                                                            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white p-1 transition hover:scale-105 ${
                                                                isSelected
                                                                    ? 'border-black shadow-md ring-2 ring-black/20'
                                                                    : 'border-black/10 ring-1 ring-black/5'
                                                            }`}
                                                            aria-label={`${type.name}: ${value.value}`}
                                                            title={value.value}
                                                        >
                                                            <span
                                                                className="h-full w-full rounded-full border border-black/10"
                                                                style={{
                                                                    backgroundColor:
                                                                        value.hex ??
                                                                        '#e5e7eb',
                                                                }}
                                                            />
                                                        </button>
                                                    );
                                                }

                                                return (
                                                    <button
                                                        type="button"
                                                        key={value.value}
                                                        onClick={() =>
                                                            toggleVariationValue(
                                                                type.id,
                                                                value.value,
                                                            )
                                                        }
                                                        className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
                                                            isSelected
                                                                ? 'border-black bg-black text-white shadow-sm'
                                                                : 'border-black/10 bg-white/70 hover:bg-white'
                                                        }`}
                                                    >
                                                        {value.value}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="sticky bottom-0 grid gap-2 border-t bg-white/95 p-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
                            <Button
                                type="submit"
                                className="w-full bg-[#0F766E] text-white shadow-sm hover:bg-[#115E59]"
                            >
                                Aplicar filtros
                                {draftCount > 0 && (
                                    <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                                        {draftCount}
                                    </span>
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full gap-2"
                                onClick={clearFilters}
                            >
                                <RotateCcw className="h-4 w-4" />
                                Limpar filtros
                            </Button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
        </div>
    );
}

function AddToCartContent({
    isAdded,
    canAdd,
}: {
    isAdded: boolean;
    canAdd: boolean;
}) {
    if (isAdded) {
        return (
            <>
                <Check className="h-4 w-4" />
                Adicionado
            </>
        );
    }

    if (!canAdd) {
        return <>Selecione opções</>;
    }

    return (
        <>
            <Plus className="h-4 w-4" />
            Adicionar
        </>
    );
}

function ComboSummary({ product }: { product: Product }) {
    if (product.product_type !== 'combo' || product.combo_items.length === 0) {
        return null;
    }

    return (
        <div className="rounded-md bg-black/5 p-2 text-xs">
            <div className="mb-1 font-semibold">Itens do combo</div>
            <ul className="space-y-0.5">
                {product.combo_items.map((item, index) => (
                    <li key={`${item.product_id}-${index}`}>
                        {item.quantity}x {item.product_name}
                        {variationSummary(item.variation_key) && (
                            <span className="opacity-70">
                                {' '}
                                ({variationSummary(item.variation_key)})
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function onlyDigits(value: string): string {
    return value.replace(/\D/g, '');
}

function formatCpf(value: string): string {
    const digits = onlyDigits(value).slice(0, 11);

    return digits
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

function formatCnpj(value: string): string {
    const digits = onlyDigits(value).slice(0, 14);

    return digits
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
        .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

function formatZipCode(value: string): string {
    const digits = onlyDigits(value).slice(0, 8);

    return digits.replace(/^(\d{5})(\d)/, '$1-$2');
}

const fontMap: Record<string, string> = {
    'space-grotesk': '"Space Grotesk", "Helvetica Neue", Arial, sans-serif',
    fraunces: '"Fraunces", "Times New Roman", serif',
    'ibm-plex': '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
};

// Layout Minimal: Moderno, limpo, espaçoso
function MinimalLayout({
    manufacturer,
    settings,
    products,
    tokens,
    onAddToCart,
    addedProductId,
    selectedVariations,
    catalogToken,
    filters,
    filterOptions,
    onSelectVariation,
}: LayoutProps) {
    const heroEnabled =
        settings.sections?.find((s) => s.type === 'hero')?.enabled ?? true;
    const productGridEnabled =
        settings.sections?.find((s) => s.type === 'product_grid')?.enabled ??
        true;

    return (
        <>
            {/* Header compacto e minimalista */}
            {heroEnabled && (
                <header className="relative">
                    <div className="flex items-center justify-between pb-8">
                        <div className="flex items-center gap-4">
                            {settings.logo_url && (
                                <div
                                    className="h-16 w-16 overflow-hidden"
                                    style={{ borderRadius: tokens.radius }}
                                >
                                    <img
                                        src={settings.logo_url}
                                        alt={
                                            settings.brand_name ??
                                            manufacturer.name
                                        }
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            )}
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">
                                    {settings.brand_name ?? manufacturer.name}
                                </h1>
                                {settings.tagline && (
                                    <p className="mt-1 text-sm opacity-70">
                                        {settings.tagline}
                                    </p>
                                )}
                            </div>
                        </div>
                        <Badge className="bg-[var(--brand-primary)] text-white">
                            {products.data.length} produtos
                        </Badge>
                    </div>
                    {settings.description && (
                        <p className="max-w-3xl text-base opacity-80">
                            {settings.description}
                        </p>
                    )}
                </header>
            )}

            {productGridEnabled && (
                <CatalogFiltersDrawer
                    catalogToken={catalogToken}
                    filters={filters}
                    filterOptions={filterOptions}
                />
            )}

            {/* Grid de produtos minimalista */}
            {productGridEnabled &&
                (products.data.length === 0 ? (
                    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 opacity-60">
                        <Package className="h-16 w-16" />
                        <p className="text-lg">Nenhum produto disponível</p>
                    </div>
                ) : (
                    <div
                        className="grid md:grid-cols-2 lg:grid-cols-3"
                        style={{
                            gap:
                                settings.layout_density === 'compact'
                                    ? '1.5rem'
                                    : '2.5rem',
                        }}
                    >
                        {products.data.map((product) => {
                            const isAdded = addedProductId === product.id;
                            const selectedValues =
                                selectedVariations[product.id] ?? {};
                            const canAdd = productHasRequiredSelection(
                                product,
                                selectedValues,
                            );

                            return (
                                <article
                                    key={product.id}
                                    className="group overflow-hidden bg-white/50 backdrop-blur-sm transition-all hover:bg-white/70"
                                    style={{
                                        borderRadius: tokens.radius,
                                        border:
                                            settings.card_style === 'flat'
                                                ? '2px solid rgba(0,0,0,0.08)'
                                                : '1px solid rgba(0,0,0,0.05)',
                                        boxShadow:
                                            settings.card_style === 'soft'
                                                ? '0 2px 8px rgba(0,0,0,0.04)'
                                                : 'none',
                                    }}
                                >
                                    <ProductImageSlider
                                        product={product}
                                        className="aspect-4/5 bg-gray-100"
                                        imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                    <div
                                        style={{ padding: tokens.cardPadding }}
                                        className="space-y-2"
                                    >
                                        <h3 className="font-semibold">
                                            {product.name}
                                        </h3>
                                        <p className="text-xs opacity-60">
                                            SKU {product.sku}
                                        </p>
                                        <p
                                            className={`text-sm font-semibold ${product.price_cents == null ? 'italic opacity-50' : ''}`}
                                            style={
                                                product.price_cents != null
                                                    ? {
                                                          color: 'var(--brand-primary)',
                                                      }
                                                    : {}
                                            }
                                        >
                                            {formatPrice(product.price_cents)}
                                        </p>
                                        {product.product_type === 'combo' && (
                                            <Badge variant="outline">
                                                Combo
                                            </Badge>
                                        )}
                                        <ComboSummary product={product} />
                                        <ProductVariations
                                            product={product}
                                            selectedValues={selectedValues}
                                            onSelect={(variationName, value) =>
                                                onSelectVariation(
                                                    product.id,
                                                    variationName,
                                                    value,
                                                )
                                            }
                                        />
                                        <div className="flex items-center justify-between">
                                            {product.category && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs"
                                                >
                                                    {product.category}
                                                </Badge>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    canAdd &&
                                                    onAddToCart(product)
                                                }
                                                disabled={!canAdd}
                                                aria-live="polite"
                                                className={`inline-flex min-w-28 items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${isAdded ? 'scale-[1.02] shadow-md' : ''}`}
                                                style={{
                                                    backgroundColor: isAdded
                                                        ? 'var(--brand-accent)'
                                                        : 'var(--brand-primary)',
                                                }}
                                            >
                                                <AddToCartContent
                                                    isAdded={isAdded}
                                                    canAdd={canAdd}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ))}

            {productGridEnabled && (
                <Pagination links={products.meta?.links ?? products.links} />
            )}
        </>
    );
}

// Layout Playful: Divertido, colorido, dinâmico
function PlayfulLayout({
    manufacturer,
    settings,
    products,
    tokens,
    onAddToCart,
    addedProductId,
    selectedVariations,
    catalogToken,
    filters,
    filterOptions,
    onSelectVariation,
}: LayoutProps) {
    const heroEnabled =
        settings.sections?.find((s) => s.type === 'hero')?.enabled ?? true;
    const productGridEnabled =
        settings.sections?.find((s) => s.type === 'product_grid')?.enabled ??
        true;

    return (
        <>
            {/* Header colorido e divertido */}
            {heroEnabled && (
                <header
                    className="relative overflow-hidden border-4 bg-white/80 p-12 text-center backdrop-blur"
                    style={{
                        borderRadius: `calc(${tokens.radius} * 4)`,
                        borderColor: settings.primary_color,
                        background: `linear-gradient(135deg, ${settings.accent_color}15 0%, ${settings.primary_color}10 100%)`,
                    }}
                >
                    <div className="absolute -top-8 -right-8 opacity-10">
                        <Star
                            className="h-32 w-32"
                            style={{ color: settings.accent_color }}
                        />
                    </div>
                    <div className="absolute -bottom-8 -left-8 opacity-10">
                        <Heart
                            className="h-32 w-32"
                            style={{ color: settings.primary_color }}
                        />
                    </div>

                    <div className="relative space-y-4">
                        {settings.logo_url && (
                            <div
                                className="mx-auto h-24 w-24 overflow-hidden shadow-xl"
                                style={{ borderRadius: '50%' }}
                            >
                                <img
                                    src={settings.logo_url}
                                    alt={
                                        settings.brand_name ?? manufacturer.name
                                    }
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        )}
                        <div>
                            <div
                                className="mb-3 inline-flex items-center gap-2 rounded-full px-6 py-2"
                                style={{
                                    backgroundColor: settings.accent_color,
                                }}
                            >
                                <Sparkles className="h-4 w-4 text-white" />
                                <span className="text-sm font-bold tracking-wider text-white uppercase">
                                    Catálogo Oficial
                                </span>
                            </div>
                            <h1
                                className="text-5xl font-black tracking-tight"
                                style={{ color: settings.primary_color }}
                            >
                                {settings.brand_name ?? manufacturer.name}
                            </h1>
                            {settings.tagline && (
                                <p className="mt-3 text-xl font-semibold opacity-80">
                                    {settings.tagline}
                                </p>
                            )}
                            {settings.description && (
                                <p className="mx-auto mt-4 max-w-2xl opacity-70">
                                    {settings.description}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center justify-center gap-3">
                            <Badge
                                className="text-white shadow-lg"
                                style={{
                                    backgroundColor: settings.primary_color,
                                }}
                            >
                                ⭐ {products.data.length} produtos incríveis
                            </Badge>
                        </div>
                    </div>
                </header>
            )}

            {productGridEnabled && (
                <CatalogFiltersDrawer
                    catalogToken={catalogToken}
                    filters={filters}
                    filterOptions={filterOptions}
                />
            )}

            {/* Grid de produtos colorido */}
            {productGridEnabled &&
                (products.data.length === 0 ? (
                    <div
                        className="flex min-h-[400px] flex-col items-center justify-center gap-4 border-4 border-dashed p-12"
                        style={{
                            borderRadius: `calc(${tokens.radius} * 3)`,
                            borderColor: settings.accent_color + '40',
                        }}
                    >
                        <Package
                            className="h-20 w-20 opacity-30"
                            style={{ color: settings.primary_color }}
                        />
                        <p
                            className="text-xl font-bold"
                            style={{ color: settings.primary_color }}
                        >
                            Em breve produtos novos!
                        </p>
                    </div>
                ) : (
                    <div
                        className="mt-8 grid md:grid-cols-2 lg:grid-cols-3"
                        style={{
                            gap:
                                settings.layout_density === 'compact'
                                    ? '1.25rem'
                                    : '2rem',
                        }}
                    >
                        {products.data.map((product, index) => {
                            const isAdded = addedProductId === product.id;
                            const selectedValues =
                                selectedVariations[product.id] ?? {};
                            const canAdd = productHasRequiredSelection(
                                product,
                                selectedValues,
                            );

                            return (
                                <article
                                    key={product.id}
                                    className="group overflow-hidden bg-white shadow-lg transition-all duration-300 hover:-translate-y-2"
                                    style={{
                                        borderRadius: `calc(${tokens.radius} * 2)`,
                                        border: `3px solid ${index % 3 === 0 ? settings.primary_color : index % 3 === 1 ? settings.accent_color : settings.secondary_color}20`,
                                        boxShadow:
                                            '0 8px 24px rgba(0,0,0,0.12)',
                                    }}
                                >
                                    <ProductImageSlider
                                        product={product}
                                        className="aspect-4/5"
                                        imageClassName="h-full w-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:rotate-2"
                                        placeholderClassName="flex h-full items-center justify-center bg-gradient-to-br"
                                        placeholderIconClassName="h-16 w-16 opacity-20"
                                        placeholderStyle={{
                                            background: `linear-gradient(135deg, ${settings.primary_color}10, ${settings.accent_color}10)`,
                                        }}
                                    >
                                        <div className="absolute top-3 right-3">
                                            <div
                                                className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg"
                                                style={{
                                                    backgroundColor:
                                                        settings.accent_color,
                                                }}
                                            >
                                                <Zap className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </ProductImageSlider>
                                    <div
                                        style={{
                                            padding: `calc(${tokens.cardPadding} * 1.2)`,
                                        }}
                                        className="space-y-3"
                                    >
                                        <h3
                                            className="text-lg font-bold"
                                            style={{
                                                color: settings.primary_color,
                                            }}
                                        >
                                            {product.name}
                                        </h3>
                                        <p className="text-xs font-semibold tracking-wide uppercase opacity-50">
                                            SKU {product.sku}
                                        </p>
                                        <p
                                            className={`text-base font-bold ${product.price_cents == null ? 'italic opacity-50' : ''}`}
                                            style={
                                                product.price_cents != null
                                                    ? {
                                                          color: settings.accent_color,
                                                      }
                                                    : {}
                                            }
                                        >
                                            {formatPrice(product.price_cents)}
                                        </p>
                                        {product.product_type === 'combo' && (
                                            <Badge variant="outline">
                                                Combo
                                            </Badge>
                                        )}
                                        <ComboSummary product={product} />
                                        <ProductVariations
                                            product={product}
                                            selectedValues={selectedValues}
                                            onSelect={(variationName, value) =>
                                                onSelectVariation(
                                                    product.id,
                                                    variationName,
                                                    value,
                                                )
                                            }
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            {product.category && (
                                                <Badge
                                                    className="text-white"
                                                    style={{
                                                        backgroundColor:
                                                            settings.secondary_color,
                                                    }}
                                                >
                                                    {product.category}
                                                </Badge>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                canAdd && onAddToCart(product)
                                            }
                                            disabled={!canAdd}
                                            aria-live="polite"
                                            className={`mt-2 inline-flex w-full items-center justify-center gap-1 rounded-full px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 ${isAdded ? 'scale-[1.02] ring-2 ring-black/10' : ''}`}
                                            style={{
                                                backgroundColor: isAdded
                                                    ? settings.primary_color
                                                    : settings.accent_color,
                                            }}
                                        >
                                            <AddToCartContent
                                                isAdded={isAdded}
                                                canAdd={canAdd}
                                            />
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ))}

            {productGridEnabled && (
                <Pagination links={products.meta?.links ?? products.links} />
            )}
        </>
    );
}

// Layout Boutique: Elegante, sofisticado, tipo magazine
function BoutiqueLayout({
    manufacturer,
    settings,
    products,
    tokens,
    onAddToCart,
    addedProductId,
    selectedVariations,
    catalogToken,
    filters,
    filterOptions,
    onSelectVariation,
}: LayoutProps) {
    const heroEnabled =
        settings.sections?.find((s) => s.type === 'hero')?.enabled ?? true;
    const productGridEnabled =
        settings.sections?.find((s) => s.type === 'product_grid')?.enabled ??
        true;
    return (
        <>
            {/* Hero elegante tipo magazine */}
            {heroEnabled && (
                <header
                    className="relative mb-16 overflow-hidden bg-white/40 backdrop-blur-md"
                    style={{ borderRadius: tokens.radius }}
                >
                    <div className="grid items-center gap-12 p-16 lg:grid-cols-2">
                        <div className="space-y-6">
                            <div
                                className="inline-flex items-center gap-2 border-b-2 pb-2 text-xs font-semibold tracking-[0.2em] uppercase"
                                style={{ borderColor: settings.primary_color }}
                            >
                                <Sparkles className="h-3 w-3" />
                                <span>Coleção Exclusiva</span>
                            </div>
                            <h1
                                className="font-serif text-6xl leading-tight font-light tracking-tight"
                                style={{ color: settings.secondary_color }}
                            >
                                {settings.brand_name ?? manufacturer.name}
                            </h1>
                            {settings.tagline && (
                                <p className="text-2xl font-light italic opacity-80">
                                    {settings.tagline}
                                </p>
                            )}
                            {settings.description && (
                                <p className="max-w-lg text-base leading-relaxed opacity-70">
                                    {settings.description}
                                </p>
                            )}
                            <div className="flex items-center gap-4 pt-4">
                                <div
                                    className="h-px flex-1"
                                    style={{
                                        backgroundColor: settings.primary_color,
                                        opacity: 0.3,
                                    }}
                                />
                                <Badge
                                    variant="outline"
                                    className="border-2 px-6 py-2 text-sm font-semibold"
                                    style={{
                                        borderColor: settings.primary_color,
                                    }}
                                >
                                    {products.data.length} Peças Selecionadas
                                </Badge>
                            </div>
                        </div>
                        {settings.logo_url && (
                            <div className="flex justify-center">
                                <div
                                    className="h-64 w-64 overflow-hidden shadow-2xl"
                                    style={{ borderRadius: tokens.radius }}
                                >
                                    <img
                                        src={settings.logo_url}
                                        alt={
                                            settings.brand_name ??
                                            manufacturer.name
                                        }
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </header>
            )}

            {productGridEnabled && (
                <CatalogFiltersDrawer
                    catalogToken={catalogToken}
                    filters={filters}
                    filterOptions={filterOptions}
                />
            )}

            {/* Grid de produtos elegante */}
            {productGridEnabled &&
                (products.data.length === 0 ? (
                    <div
                        className="flex min-h-[500px] flex-col items-center justify-center gap-6 border bg-white/20 p-20"
                        style={{ borderRadius: tokens.radius }}
                    >
                        <Package className="h-20 w-20 opacity-20" />
                        <p className="font-serif text-2xl font-light opacity-60">
                            Novidades em preparação
                        </p>
                    </div>
                ) : (
                    <div
                        className="grid gap-12 md:grid-cols-2 lg:grid-cols-3"
                        style={{
                            gap:
                                settings.layout_density === 'compact'
                                    ? '2rem'
                                    : '3rem',
                        }}
                    >
                        {products.data.map((product) => {
                            const isAdded = addedProductId === product.id;
                            const selectedValues =
                                selectedVariations[product.id] ?? {};
                            const canAdd = productHasRequiredSelection(
                                product,
                                selectedValues,
                            );

                            return (
                                <article
                                    key={product.id}
                                    className="group space-y-4"
                                >
                                    <ProductImageSlider
                                        product={product}
                                        className="aspect-4/5 bg-gray-50 shadow-md transition-all duration-700 group-hover:shadow-2xl"
                                        imageClassName="h-full w-full object-cover transition-all duration-700 group-hover:scale-105"
                                        placeholderIconClassName="h-16 w-16 opacity-10"
                                        style={{
                                            borderRadius: tokens.radius,
                                        }}
                                    >
                                        {product.total_stock === 0 && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                                <span className="font-serif text-sm tracking-widest text-white uppercase">
                                                    Esgotado
                                                </span>
                                            </div>
                                        )}
                                    </ProductImageSlider>
                                    <div className="space-y-3">
                                        <div>
                                            {product.category && (
                                                <p className="mb-1 text-xs font-semibold tracking-wider uppercase opacity-50">
                                                    {product.category}
                                                </p>
                                            )}
                                            <h3 className="font-serif text-xl font-light tracking-wide">
                                                {product.name}
                                            </h3>
                                            <p
                                                className={`mt-1 text-base font-semibold ${product.price_cents == null ? 'font-light italic opacity-50' : ''}`}
                                                style={
                                                    product.price_cents != null
                                                        ? {
                                                              color: 'var(--brand-primary)',
                                                          }
                                                        : {}
                                                }
                                            >
                                                {formatPrice(
                                                    product.price_cents,
                                                )}
                                            </p>
                                        </div>
                                        {product.product_type === 'combo' && (
                                            <Badge variant="outline">
                                                Combo
                                            </Badge>
                                        )}
                                        <ComboSummary product={product} />
                                        <ProductVariations
                                            product={product}
                                            selectedValues={selectedValues}
                                            onSelect={(variationName, value) =>
                                                onSelectVariation(
                                                    product.id,
                                                    variationName,
                                                    value,
                                                )
                                            }
                                        />
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs opacity-40">
                                                SKU {product.sku}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                canAdd && onAddToCart(product)
                                            }
                                            disabled={!canAdd}
                                            aria-live="polite"
                                            className={`mt-1 inline-flex w-fit items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold tracking-wider uppercase transition-all hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40 ${isAdded ? 'opacity-100 shadow-sm ring-1 ring-current/20' : 'opacity-60'}`}
                                            style={{
                                                color: isAdded
                                                    ? 'var(--brand-accent)'
                                                    : 'var(--brand-primary)',
                                            }}
                                        >
                                            <AddToCartContent
                                                isAdded={isAdded}
                                                canAdd={canAdd}
                                            />
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ))}

            {productGridEnabled && (
                <Pagination links={products.meta?.links ?? products.links} />
            )}
        </>
    );
}

export default function PublicCatalog({
    manufacturer,
    catalog_settings,
    products,
    catalog_token,
    filters,
    filter_options,
}: Props) {
    const brandFont =
        fontMap[catalog_settings.font_family] ?? fontMap['space-grotesk'];
    const preset = catalog_settings.layout_preset ?? 'minimal';
    const tokens =
        LAYOUT_TOKENS[preset as keyof typeof LAYOUT_TOKENS] ??
        LAYOUT_TOKENS.minimal;

    // Cart state
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [addedProductId, setAddedProductId] = useState<number | null>(null);
    const [selectedVariations, setSelectedVariations] =
        useState<SelectedVariations>({});
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState<{
        token: string;
        url: string;
    } | null>(null);
    const [checkoutErrors, setCheckoutErrors] = useState<
        Record<string, string>
    >({});
    const [submitting, setSubmitting] = useState(false);

    // Checkout form
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerDocumentType, setCustomerDocumentType] =
        useState<DocumentType>('cpf');
    const [customerDocument, setCustomerDocument] = useState('');
    const [customerZipCode, setCustomerZipCode] = useState('');
    const [customerState, setCustomerState] = useState('');
    const [customerCity, setCustomerCity] = useState('');
    const [customerNeighborhood, setCustomerNeighborhood] = useState('');
    const [customerStreet, setCustomerStreet] = useState('');
    const [customerAddressNumber, setCustomerAddressNumber] = useState('');
    const [customerAddressComplement, setCustomerAddressComplement] =
        useState('');
    const [customerAddressReference, setCustomerAddressReference] =
        useState('');
    const [customerNotes, setCustomerNotes] = useState('');
    const [copied, setCopied] = useState(false);

    const cartTotal = cart.reduce((sum, item) => sum + item.quantity, 0);

    const cartPriceTotal = cart.reduce((sum, item) => {
        if (item.product.price_cents == null) return sum;
        return sum + item.product.price_cents * item.quantity;
    }, 0);

    const hasAnyPriced = cart.some((item) => item.product.price_cents != null);

    useEffect(() => {
        if (addedProductId === null) {
            return;
        }

        const timeout = window.setTimeout(() => {
            setAddedProductId(null);
        }, 2200);

        return () => window.clearTimeout(timeout);
    }, [addedProductId]);

    const selectVariation = useCallback(
        (productId: number, variationName: string, value: string) => {
            setSelectedVariations((current) => ({
                ...current,
                [productId]: {
                    ...(current[productId] ?? {}),
                    [variationName]: value,
                },
            }));
        },
        [],
    );

    const addToCart = useCallback(
        (product: Product) => {
            const selectedValues = selectedVariations[product.id] ?? {};

            if (!productHasRequiredSelection(product, selectedValues)) {
                return;
            }

            const options = cartOptionsFromSelection(product, selectedValues);
            const key = cartItemKey(product.id, options.selected_variations);

            setAddedProductId(product.id);

            setCart((prev) => {
                const existing = prev.find((item) => item.key === key);

                if (existing) {
                    return prev.map((item) =>
                        item.key === key
                            ? { ...item, quantity: item.quantity + 1 }
                            : item,
                    );
                }

                return [
                    ...prev,
                    {
                        key,
                        product,
                        quantity: 1,
                        ...options,
                    },
                ];
            });
        },
        [selectedVariations],
    );

    const updateQuantity = (itemKey: string, quantity: number) => {
        if (quantity <= 0) {
            setCart((prev) => prev.filter((item) => item.key !== itemKey));
            return;
        }
        setCart((prev) =>
            prev.map((item) =>
                item.key === itemKey ? { ...item, quantity } : item,
            ),
        );
    };

    const removeFromCart = (itemKey: string) => {
        setCart((prev) => prev.filter((item) => item.key !== itemKey));
    };

    const handleCheckout = () => {
        setCheckoutErrors({});
        setSubmitting(true);

        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);

        router.post(
            `/catalog/${catalog_token}/orders`,
            {
                customer_name: customerName,
                customer_phone: customerPhone || null,
                customer_email: customerEmail || null,
                customer_document_type: customerDocumentType,
                customer_document: onlyDigits(customerDocument),
                customer_zip_code: onlyDigits(customerZipCode),
                customer_state: customerState,
                customer_city: customerCity,
                customer_neighborhood: customerNeighborhood,
                customer_street: customerStreet,
                customer_address_number: customerAddressNumber,
                customer_address_complement: customerAddressComplement || null,
                customer_address_reference: customerAddressReference || null,
                customer_notes: customerNotes || null,
                items: cart.map((item) => ({
                    product_id: item.product.id,
                    quantity: item.quantity,
                    size: item.size ?? null,
                    color: item.color ?? null,
                })),
                utm_source: params.get('utm_source'),
                utm_medium: params.get('utm_medium'),
                utm_campaign: params.get('utm_campaign'),
                utm_content: params.get('utm_content'),
                utm_term: params.get('utm_term'),
            },
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: (page) => {
                    // The controller returns Inertia::location, so on success we get redirected
                    // But if we get a flash, it means the order was created
                },
                onError: (errors) => {
                    setCheckoutErrors(errors);
                    setSubmitting(false);
                },
                onFinish: () => {
                    setSubmitting(false);
                },
            },
        );
    };

    const copyTrackingLink = () => {
        if (orderSuccess?.url) {
            navigator.clipboard.writeText(orderSuccess.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const backgroundStyle: CSSProperties = {};

    if (
        catalog_settings.background_mode === 'gradient' &&
        catalog_settings.gradient_id
    ) {
        backgroundStyle.background =
            GRADIENTS[catalog_settings.gradient_id as keyof typeof GRADIENTS];
    } else if (
        catalog_settings.background_mode === 'pattern' &&
        catalog_settings.pattern_id
    ) {
        const patternColor =
            catalog_settings.pattern_color ?? catalog_settings.primary_color;
        const patternOpacity = catalog_settings.pattern_opacity ?? 10;
        const patternFn =
            PATTERNS[catalog_settings.pattern_id as keyof typeof PATTERNS];
        backgroundStyle.background = patternFn
            ? patternFn(patternColor, patternOpacity)
            : catalog_settings.background_color;
    } else {
        backgroundStyle.backgroundColor = catalog_settings.background_color;
    }

    return (
        <div
            className="relative min-h-screen text-[var(--brand-secondary)]"
            style={{
                fontFamily: brandFont,
                ['--brand-primary' as string]: catalog_settings.primary_color,
                ['--brand-secondary' as string]:
                    catalog_settings.secondary_color,
                ['--brand-accent' as string]: catalog_settings.accent_color,
                ['--brand-bg' as string]: catalog_settings.background_color,
                ['--radius' as string]: tokens.radius,
                ['--gap' as string]: tokens.gap,
                ['--card-padding' as string]: tokens.cardPadding,
                ['--shadow' as string]: tokens.shadow,
                ...backgroundStyle,
            }}
        >
            {catalog_settings.background_mode === 'image' &&
                catalog_settings.background_image_url && (
                    <>
                        <div
                            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                            style={{
                                backgroundImage: `url(${catalog_settings.background_image_url})`,
                                opacity:
                                    (catalog_settings.background_image_opacity ??
                                        100) / 100,
                                filter: `blur(${(catalog_settings.background_blur ?? 0) * 0.5}px)`,
                            }}
                        />
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundColor:
                                    catalog_settings.background_overlay_color,
                                opacity:
                                    (catalog_settings.background_overlay_opacity ??
                                        0) / 100,
                            }}
                        />
                    </>
                )}

            <Head
                title={`Catalogo - ${catalog_settings.brand_name ?? manufacturer.name}`}
            >
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=space-grotesk:400,500,600,700|fraunces:400,600,700|ibm-plex-sans:400,500,600,700"
                    rel="stylesheet"
                />
            </Head>

            <div className="relative mx-auto w-full max-w-7xl px-6 py-12">
                {preset === 'playful' && (
                    <PlayfulLayout
                        manufacturer={manufacturer}
                        settings={catalog_settings}
                        products={products}
                        tokens={tokens}
                        onAddToCart={addToCart}
                        addedProductId={addedProductId}
                        selectedVariations={selectedVariations}
                        catalogToken={catalog_token}
                        filters={filters}
                        filterOptions={filter_options}
                        onSelectVariation={selectVariation}
                    />
                )}
                {preset === 'boutique' && (
                    <BoutiqueLayout
                        manufacturer={manufacturer}
                        settings={catalog_settings}
                        products={products}
                        tokens={tokens}
                        onAddToCart={addToCart}
                        addedProductId={addedProductId}
                        selectedVariations={selectedVariations}
                        catalogToken={catalog_token}
                        filters={filters}
                        filterOptions={filter_options}
                        onSelectVariation={selectVariation}
                    />
                )}
                {preset === 'minimal' && (
                    <MinimalLayout
                        manufacturer={manufacturer}
                        settings={catalog_settings}
                        products={products}
                        tokens={tokens}
                        onAddToCart={addToCart}
                        addedProductId={addedProductId}
                        selectedVariations={selectedVariations}
                        catalogToken={catalog_token}
                        filters={filters}
                        filterOptions={filter_options}
                        onSelectVariation={selectVariation}
                    />
                )}
            </div>

            {/* Floating cart button */}
            {cartTotal > 0 && (
                <button
                    type="button"
                    onClick={() => setCartOpen(true)}
                    className="fixed right-6 bottom-6 z-40 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-xl transition-transform hover:scale-105"
                    style={{ backgroundColor: catalog_settings.primary_color }}
                >
                    <ShoppingCart className="h-5 w-5" />
                    <span>Ver pedido</span>
                    <span className="rounded-full bg-white/20 px-2 py-0.5 font-bold">
                        {cartTotal}
                    </span>
                </button>
            )}

            {/* Cart Sheet */}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                <SheetContent side="right" className="flex flex-col">
                    <SheetHeader>
                        <SheetTitle>Seu pedido ({cartTotal} itens)</SheetTitle>
                        <SheetDescription>
                            Revise os itens selecionados antes de finalizar o
                            pedido.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 overflow-y-auto">
                        {cart.length === 0 ? (
                            <p className="px-4 text-sm text-muted-foreground">
                                Nenhum item adicionado.
                            </p>
                        ) : (
                            <div className="space-y-3 px-4">
                                {cart.map((item) => (
                                    <div
                                        key={item.key}
                                        className="flex items-center gap-3 rounded-lg border p-3"
                                    >
                                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                                            {item.product.primary_image ? (
                                                <img
                                                    src={
                                                        item.product
                                                            .primary_image
                                                    }
                                                    alt={item.product.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center">
                                                    <Package className="h-4 w-4 text-gray-400" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium">
                                                {item.product.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                SKU {item.product.sku}
                                            </p>
                                            {item.selected_variations && (
                                                <p className="text-xs text-muted-foreground">
                                                    {variationSummary(
                                                        item.selected_variations,
                                                    )}
                                                </p>
                                            )}
                                            <p className="text-xs font-medium">
                                                {formatPrice(
                                                    item.product.price_cents,
                                                )}
                                            </p>
                                            <ComboSummary
                                                product={item.product}
                                            />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() =>
                                                    updateQuantity(
                                                        item.key,
                                                        item.quantity - 1,
                                                    )
                                                }
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="w-8 text-center text-sm font-medium">
                                                {item.quantity}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() =>
                                                    updateQuantity(
                                                        item.key,
                                                        item.quantity + 1,
                                                    )
                                                }
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive"
                                            onClick={() =>
                                                removeFromCart(item.key)
                                            }
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {cart.length > 0 && (
                        <SheetFooter className="flex-col gap-2">
                            {hasAnyPriced && (
                                <div className="flex w-full items-center justify-between px-1 text-sm">
                                    <span className="font-medium">
                                        Total estimado:
                                    </span>
                                    <span className="font-bold">
                                        {formatPrice(cartPriceTotal)}
                                    </span>
                                </div>
                            )}
                            <Button
                                className="w-full"
                                onClick={() => {
                                    setCartOpen(false);
                                    setCheckoutOpen(true);
                                }}
                                style={{
                                    backgroundColor:
                                        catalog_settings.primary_color,
                                }}
                            >
                                Finalizar pedido
                            </Button>
                        </SheetFooter>
                    )}
                </SheetContent>
            </Sheet>

            {/* Checkout Dialog */}
            <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Finalizar pedido</DialogTitle>
                        <DialogDescription>
                            Preencha seus dados para enviar o pedido.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="customer_name">Nome *</Label>
                            <Input
                                id="customer_name"
                                value={customerName}
                                onChange={(e) =>
                                    setCustomerName(e.target.value)
                                }
                                placeholder="Seu nome completo"
                            />
                            {checkoutErrors.customer_name && (
                                <p className="text-xs text-destructive">
                                    {checkoutErrors.customer_name}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="customer_phone">Telefone</Label>
                            <Input
                                id="customer_phone"
                                value={customerPhone}
                                onChange={(e) =>
                                    setCustomerPhone(e.target.value)
                                }
                                placeholder="(XX) XXXXX-XXXX"
                            />
                            {checkoutErrors.customer_phone && (
                                <p className="text-xs text-destructive">
                                    {checkoutErrors.customer_phone}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="customer_email">E-mail</Label>
                            <Input
                                id="customer_email"
                                type="email"
                                value={customerEmail}
                                onChange={(e) =>
                                    setCustomerEmail(e.target.value)
                                }
                                placeholder="seu@email.com"
                            />
                            {checkoutErrors.customer_email && (
                                <p className="text-xs text-destructive">
                                    {checkoutErrors.customer_email}
                                </p>
                            )}
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold">Documento</h3>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="customer_document_type">
                                        Tipo *
                                    </Label>
                                    <Select
                                        value={customerDocumentType}
                                        onValueChange={(value) => {
                                            setCustomerDocumentType(
                                                value as DocumentType,
                                            );
                                            setCustomerDocument('');
                                        }}
                                    >
                                        <SelectTrigger id="customer_document_type">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cpf">
                                                Pessoa fisica
                                            </SelectItem>
                                            <SelectItem value="cnpj">
                                                Pessoa juridica
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {checkoutErrors.customer_document_type && (
                                        <p className="text-xs text-destructive">
                                            {
                                                checkoutErrors.customer_document_type
                                            }
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="customer_document">
                                        {customerDocumentType === 'cpf'
                                            ? 'CPF *'
                                            : 'CNPJ *'}
                                    </Label>
                                    <Input
                                        id="customer_document"
                                        value={customerDocument}
                                        onChange={(e) =>
                                            setCustomerDocument(
                                                customerDocumentType === 'cpf'
                                                    ? formatCpf(e.target.value)
                                                    : formatCnpj(
                                                          e.target.value,
                                                      ),
                                            )
                                        }
                                        placeholder={
                                            customerDocumentType === 'cpf'
                                                ? '000.000.000-00'
                                                : '00.000.000/0000-00'
                                        }
                                        inputMode="numeric"
                                    />
                                    {checkoutErrors.customer_document && (
                                        <p className="text-xs text-destructive">
                                            {checkoutErrors.customer_document}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold">
                                Endereco de entrega
                            </h3>
                            <div className="grid gap-3 sm:grid-cols-4">
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="customer_zip_code">
                                        CEP *
                                    </Label>
                                    <Input
                                        id="customer_zip_code"
                                        value={customerZipCode}
                                        onChange={(e) =>
                                            setCustomerZipCode(
                                                formatZipCode(e.target.value),
                                            )
                                        }
                                        placeholder="00000-000"
                                        inputMode="numeric"
                                    />
                                    {checkoutErrors.customer_zip_code && (
                                        <p className="text-xs text-destructive">
                                            {checkoutErrors.customer_zip_code}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="customer_state">UF *</Label>
                                    <Select
                                        value={customerState}
                                        onValueChange={setCustomerState}
                                    >
                                        <SelectTrigger id="customer_state">
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {BRAZILIAN_STATES.map((state) => (
                                                <SelectItem
                                                    key={state}
                                                    value={state}
                                                >
                                                    {state}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {checkoutErrors.customer_state && (
                                        <p className="text-xs text-destructive">
                                            {checkoutErrors.customer_state}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="customer_city">
                                        Cidade *
                                    </Label>
                                    <Input
                                        id="customer_city"
                                        value={customerCity}
                                        onChange={(e) =>
                                            setCustomerCity(e.target.value)
                                        }
                                        placeholder="Cidade"
                                    />
                                    {checkoutErrors.customer_city && (
                                        <p className="text-xs text-destructive">
                                            {checkoutErrors.customer_city}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="customer_neighborhood">
                                        Bairro *
                                    </Label>
                                    <Input
                                        id="customer_neighborhood"
                                        value={customerNeighborhood}
                                        onChange={(e) =>
                                            setCustomerNeighborhood(
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Bairro"
                                    />
                                    {checkoutErrors.customer_neighborhood && (
                                        <p className="text-xs text-destructive">
                                            {
                                                checkoutErrors.customer_neighborhood
                                            }
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2 sm:col-span-3">
                                    <Label htmlFor="customer_street">
                                        Rua *
                                    </Label>
                                    <Input
                                        id="customer_street"
                                        value={customerStreet}
                                        onChange={(e) =>
                                            setCustomerStreet(e.target.value)
                                        }
                                        placeholder="Rua"
                                    />
                                    {checkoutErrors.customer_street && (
                                        <p className="text-xs text-destructive">
                                            {checkoutErrors.customer_street}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="customer_address_number">
                                        Numero *
                                    </Label>
                                    <Input
                                        id="customer_address_number"
                                        value={customerAddressNumber}
                                        onChange={(e) =>
                                            setCustomerAddressNumber(
                                                e.target.value,
                                            )
                                        }
                                        placeholder="100"
                                    />
                                    {checkoutErrors.customer_address_number && (
                                        <p className="text-xs text-destructive">
                                            {
                                                checkoutErrors.customer_address_number
                                            }
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="customer_address_complement">
                                        Complemento
                                    </Label>
                                    <Input
                                        id="customer_address_complement"
                                        value={customerAddressComplement}
                                        onChange={(e) =>
                                            setCustomerAddressComplement(
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Apto, sala, bloco"
                                    />
                                    {checkoutErrors.customer_address_complement && (
                                        <p className="text-xs text-destructive">
                                            {
                                                checkoutErrors.customer_address_complement
                                            }
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="customer_address_reference">
                                        Referencia
                                    </Label>
                                    <Input
                                        id="customer_address_reference"
                                        value={customerAddressReference}
                                        onChange={(e) =>
                                            setCustomerAddressReference(
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Referência para Entrega"
                                    />
                                    {checkoutErrors.customer_address_reference && (
                                        <p className="text-xs text-destructive">
                                            {
                                                checkoutErrors.customer_address_reference
                                            }
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="customer_notes">Observacoes</Label>
                            <textarea
                                id="customer_notes"
                                value={customerNotes}
                                onChange={(e) =>
                                    setCustomerNotes(e.target.value)
                                }
                                placeholder="Alguma observacao sobre o pedido?"
                                rows={3}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                            />
                        </div>

                        {checkoutErrors.items && (
                            <p className="text-xs text-destructive">
                                {checkoutErrors.items}
                            </p>
                        )}

                        <div className="rounded-md bg-muted p-3">
                            <p className="text-xs text-muted-foreground">
                                {cart.length} produto(s) - {cartTotal} item(ns)
                                no total
                            </p>
                            {hasAnyPriced && (
                                <p className="mt-1 text-sm font-semibold">
                                    Total estimado:{' '}
                                    {formatPrice(cartPriceTotal)}
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCheckoutOpen(false)}
                        >
                            Voltar
                        </Button>
                        <Button
                            onClick={handleCheckout}
                            disabled={submitting || !customerName.trim()}
                            style={{
                                backgroundColor: catalog_settings.primary_color,
                            }}
                        >
                            {submitting ? 'Enviando...' : 'Enviar pedido'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Order Success Dialog */}
            <Dialog
                open={!!orderSuccess}
                onOpenChange={() => setOrderSuccess(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-green-600" />
                            Pedido enviado!
                        </DialogTitle>
                        <DialogDescription>
                            Seu pedido foi recebido com sucesso. Use o link
                            abaixo para acompanhar o status.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div className="flex items-center gap-2 rounded-md border p-3">
                            <Input
                                readOnly
                                value={orderSuccess?.url ?? ''}
                                className="flex-1 text-xs"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={copyTrackingLink}
                            >
                                {copied ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <ClipboardCopy className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            onClick={() => {
                                if (orderSuccess?.url) {
                                    window.location.href = orderSuccess.url;
                                }
                            }}
                            style={{
                                backgroundColor: catalog_settings.primary_color,
                            }}
                        >
                            Acompanhar pedido
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
