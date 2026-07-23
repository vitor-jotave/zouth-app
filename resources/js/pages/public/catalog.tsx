import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowRight,
    Box,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Circle,
    ClipboardCopy,
    Filter,
    Heart,
    Maximize2,
    MessageCircle,
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
import { CatalogHero } from '@/components/catalog-hero';
import { Pagination } from '@/components/pagination';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import {
    CATALOG_LOGO_SIZE,
    catalogCoverImageUrl,
    catalogLogoStyle,
    GRADIENTS,
    LAYOUT_TOKENS,
    PATTERNS,
} from '@/lib/catalog-theming';
import {
    evaluateOrderRules,
    pendingRuleProgress,
    type OrderRuleContract,
} from '@/lib/order-rules';
import { cn } from '@/lib/utils';

interface Manufacturer {
    id: number;
    name: string;
    slug: string;
}

interface CatalogSettings {
    brand_name: string;
    show_brand_name: boolean;
    show_logo: boolean;
    hide_prices: boolean;
    tagline?: string | null;
    description?: string | null;
    logo_url?: string | null;
    cover_image_url?: string | null;
    cover_thumbnail_url?: string | null;
    cover_image_focal_x?: number | null;
    cover_image_focal_y?: number | null;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    background_color: string;
    font_family: string;
    heading_font_family?: string | null;
    body_font_family?: string | null;
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
        props: Record<string, unknown>;
    }>;
}

interface Product {
    id: number;
    product_type: 'product' | 'combo';
    name: string;
    sku: string;
    description?: string | null;
    category_id?: number | null;
    category?: string | null;
    primary_image?: string | null;
    primary_thumbnail?: string | null;
    images: string[];
    thumbnails?: string[];
    videos?: string[];
    variations: Array<{
        type_name: string;
        is_color_type: boolean;
        values: Array<{
            value: string;
            hex?: string | null;
            image_url?: string | null;
        }>;
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
    allow_quote_when_out_of_stock: boolean;
    price_cents?: number | null;
}

interface Paginated<T> {
    data: T[];
    links?: Array<{ url: string | null; label: string; active: boolean }>;
    meta?: {
        current_page: number;
        last_page: number;
        total?: number;
        links?: Array<{ url: string | null; label: string; active: boolean }>;
    };
}

type ProductPresentation = 'editorial' | 'commercial';

interface ProductDisplayOptions {
    presentation: ProductPresentation;
    showPrice: boolean;
    showSku: boolean;
    showStock: boolean;
    showVariations: boolean;
    showAction: boolean;
    showBadges: boolean;
}

interface Props {
    manufacturer: Manufacturer;
    catalog_settings: CatalogSettings;
    products: Paginated<Product>;
    combos: Product[];
    catalog_token: string;
    filters: CatalogFilters;
    filter_options: CatalogFilterOptions;
    order_rules: OrderRuleContract[];
    whatsapp_checkout: {
        enabled: boolean;
        available: boolean;
        base_url?: string | null;
    };
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
            image_url?: string | null;
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
    unit_price_cents?: number | null;
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
    combos: Product[];
    tokens: typeof LAYOUT_TOKENS.minimal;
    onAddToCart: (product: Product) => void;
    onOpenQuickView: (product: Product) => void;
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

function orderRuleBenefitLabel(rule: OrderRuleContract): string {
    if (rule.action.type === 'percentage_discount') {
        return `${new Intl.NumberFormat('pt-BR', {
            maximumFractionDigits: 2,
        }).format((rule.action.value ?? 0) / 100)}% de desconto`;
    }

    return `${formatPrice(rule.action.value)} de desconto`;
}

function orderRuleRemainingLabel(
    rule: OrderRuleContract,
    remaining: number,
): string {
    const metric = rule.conditions[0]?.metric;

    if (metric === 'subtotal_cents') {
        return formatPrice(remaining);
    }

    if (metric === 'distinct_products') {
        return `${remaining} ${remaining === 1 ? 'modelo' : 'modelos'}`;
    }

    return `${remaining} ${remaining === 1 ? 'peça' : 'peças'}`;
}

function orderRuleRequirementLabel(
    rule: OrderRuleContract,
    remaining: number,
): string {
    const metric = rule.conditions[0]?.metric;

    if (metric === 'subtotal_cents') {
        return `${formatPrice(remaining)} para alcançar o pedido mínimo`;
    }

    if (metric === 'distinct_products') {
        return `${remaining} ${remaining === 1 ? 'modelo' : 'modelos'} para completar a variedade`;
    }

    if (metric === 'total_quantity') {
        return `${remaining} ${remaining === 1 ? 'peça' : 'peças'} para completar o mínimo`;
    }

    return (
        rule.public_message ??
        'Este pedido ainda não atende a uma condição comercial.'
    );
}

function blockingRuleRemaining(
    rule: OrderRuleContract,
    currentValues: number[],
): number | null {
    if (rule.conditions.length !== 1) {
        return null;
    }

    const condition = rule.conditions[0];
    const current = currentValues[0] ?? 0;

    if (condition.operator === 'lte') {
        return Math.max(0, condition.value + 1 - current);
    }

    return null;
}

function booleanSetting(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
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

function selectedVariantStock(
    product: Product,
    selectedValues: Record<string, string>,
): Product['variant_stocks'][number] | null {
    if (!productHasRequiredSelection(product, selectedValues)) {
        return null;
    }

    return (
        product.variant_stocks.find((stock) => {
            const stockEntries = Object.entries(stock.variation_key);
            const selectedEntries = Object.entries(selectedValues);

            return (
                stockEntries.length === selectedEntries.length &&
                stockEntries.every(
                    ([name, value]) => selectedValues[name] === value,
                )
            );
        }) ?? null
    );
}

function availableStockForSelection(
    product: Product,
    selectedValues: Record<string, string>,
): number | null {
    if (!productHasRequiredSelection(product, selectedValues)) {
        return null;
    }

    if (product.variations.length === 0) {
        return product.total_stock;
    }

    return selectedVariantStock(product, selectedValues)?.quantity ?? 0;
}

function priceForSelection(
    product: Product,
    selectedValues: Record<string, string>,
): number | null | undefined {
    return (
        selectedVariantStock(product, selectedValues)?.price_cents ??
        product.price_cents
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
                                        value.image_url ? (
                                            <img
                                                src={value.image_url}
                                                alt=""
                                                className="h-full w-full rounded-full border border-black/10 object-cover"
                                            />
                                        ) : (
                                            <span
                                                className="h-full w-full rounded-full border border-black/10"
                                                style={{
                                                    backgroundColor:
                                                        value.hex ?? '#e5e7eb',
                                                }}
                                            />
                                        )
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
    onOpen,
    useThumbnails = true,
}: {
    product: Product;
    className: string;
    imageClassName: string;
    placeholderClassName?: string;
    placeholderIconClassName?: string;
    placeholderStyle?: CSSProperties;
    style?: CSSProperties;
    children?: ReactNode;
    onOpen?: () => void;
    useThumbnails?: boolean;
}) {
    const productImages = useThumbnails
        ? (product.thumbnails ?? product.images ?? [])
        : (product.images ?? []);
    const primaryImage = useThumbnails
        ? (product.primary_thumbnail ?? product.primary_image)
        : product.primary_image;
    const images =
        productImages.length > 0
            ? productImages
            : primaryImage
              ? [primaryImage]
              : [];
    const [currentIndex, setCurrentIndex] = useState(0);
    const currentImage = images[currentIndex] ?? null;
    const [failedImages, setFailedImages] = useState<string[]>([]);
    const currentOriginalImage =
        product.images?.[currentIndex] ?? product.primary_image ?? null;
    const visibleImage = [
        currentImage,
        currentOriginalImage,
        product.primary_image,
    ].find(
        (image): image is string =>
            Boolean(image) && !failedImages.includes(image as string),
    );
    const hasMultipleImages = images.length > 1;

    useEffect(() => {
        setCurrentIndex(0);
        setFailedImages([]);
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
        <div
            className={`relative overflow-hidden ${onOpen ? 'cursor-zoom-in' : ''} ${className}`}
            style={style}
            role={onOpen ? 'button' : undefined}
            tabIndex={onOpen ? 0 : undefined}
            onClick={onOpen}
            onKeyDown={(event) => {
                if (!onOpen) {
                    return;
                }

                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen();
                }
            }}
            aria-label={onOpen ? `Ver detalhes de ${product.name}` : undefined}
        >
            {visibleImage ? (
                <img
                    src={visibleImage}
                    alt={product.name}
                    loading={useThumbnails ? 'lazy' : 'eager'}
                    decoding="async"
                    className={imageClassName}
                    onError={() =>
                        setFailedImages((current) =>
                            current.includes(visibleImage)
                                ? current
                                : [...current, visibleImage],
                        )
                    }
                />
            ) : (
                <div className={placeholderClassName} style={placeholderStyle}>
                    <Box className={placeholderIconClassName} />
                </div>
            )}

            {children}

            {onOpen && (
                <div className="pointer-events-none absolute top-3 left-3 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-900 opacity-0 shadow-sm transition group-hover:opacity-100">
                    <Maximize2 className="h-3.5 w-3.5" />
                    Ver detalhes
                </div>
            )}

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

function ComboImageMosaic({
    product,
    className,
    onOpen,
}: {
    product: Product;
    className: string;
    onOpen: () => void;
}) {
    const productImages = product.thumbnails ?? product.images ?? [];
    const primaryImage = product.primary_thumbnail ?? product.primary_image;
    const images = (
        productImages.length > 0
            ? productImages
            : primaryImage
              ? [primaryImage]
              : []
    ).slice(0, 4);

    if (images.length === 0) {
        return (
            <button
                type="button"
                onClick={onOpen}
                className={`flex items-center justify-center bg-white/40 ${className}`}
                aria-label={`Ver detalhes de ${product.name}`}
            >
                <Box className="h-12 w-12 opacity-20" />
            </button>
        );
    }

    if (images.length === 1) {
        return (
            <button
                type="button"
                onClick={onOpen}
                className={`block overflow-hidden ${className}`}
                aria-label={`Ver detalhes de ${product.name}`}
            >
                <img
                    src={images[0]}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={onOpen}
            className={`grid overflow-hidden bg-white/40 ${className} ${
                images.length === 2 ? 'grid-cols-2' : 'grid-cols-2 grid-rows-2'
            }`}
            aria-label={`Ver detalhes de ${product.name}`}
        >
            {images.map((image, index) => (
                <img
                    key={`${image}-${index}`}
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                    className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                        images.length === 3 && index === 0 ? 'row-span-2' : ''
                    }`}
                />
            ))}
        </button>
    );
}

function ProductQuickViewModal({
    product,
    selectedValues,
    isAdded,
    primaryColor,
    accentColor,
    showPrice,
    onClose,
    onSelectVariation,
    onAddToCart,
    headingFont,
    bodyFont,
}: {
    product: Product | null;
    selectedValues: Record<string, string>;
    isAdded: boolean;
    primaryColor: string;
    accentColor: string;
    showPrice: boolean;
    onClose: () => void;
    onSelectVariation: (variationName: string, value: string) => void;
    onAddToCart: (product: Product) => void;
    headingFont?: string;
    bodyFont?: string;
}) {
    if (!product) {
        return null;
    }

    const availableStock = availableStockForSelection(product, selectedValues);
    const canAdd =
        availableStock !== null &&
        (availableStock > 0 || product.allow_quote_when_out_of_stock);

    return (
        <Dialog
            open={Boolean(product)}
            onOpenChange={(open) => !open && onClose()}
        >
            <DialogContent
                className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-5xl"
                style={{ fontFamily: bodyFont }}
            >
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
                    <ProductImageSlider
                        product={product}
                        useThumbnails={false}
                        className="aspect-4/5 bg-gray-100 lg:min-h-[620px]"
                        imageClassName="h-full w-full object-cover"
                    />

                    <div className="flex flex-col gap-5 p-6 sm:p-8">
                        <DialogHeader className="space-y-2 text-left">
                            <div className="flex flex-wrap items-center gap-2">
                                {product.category && (
                                    <Badge variant="outline">
                                        {product.category}
                                    </Badge>
                                )}
                                {product.product_type === 'combo' && (
                                    <Badge variant="outline">Combo</Badge>
                                )}
                            </div>
                            <DialogTitle
                                className="text-2xl font-semibold tracking-tight"
                                style={{ fontFamily: headingFont }}
                            >
                                {product.name}
                            </DialogTitle>
                            <DialogDescription className="text-sm">
                                SKU {product.sku}
                            </DialogDescription>
                        </DialogHeader>

                        {showPrice && (
                            <p
                                className={`text-lg font-semibold ${product.price_cents == null ? 'italic opacity-55' : ''}`}
                                style={
                                    product.price_cents != null
                                        ? { color: primaryColor }
                                        : {}
                                }
                            >
                                {formatPrice(product.price_cents)}
                            </p>
                        )}

                        {product.description && (
                            <div className="space-y-2 border-t pt-5">
                                <h3 className="text-sm font-semibold">
                                    Descrição
                                </h3>
                                <p className="text-sm leading-relaxed text-gray-600">
                                    {product.description}
                                </p>
                            </div>
                        )}

                        <ComboSummary product={product} />

                        {product.variations.length > 0 && (
                            <div className="space-y-3 border-t pt-5">
                                <h3 className="text-sm font-semibold">
                                    Opções
                                </h3>
                                <ProductVariations
                                    product={product}
                                    selectedValues={selectedValues}
                                    onSelect={onSelectVariation}
                                />
                            </div>
                        )}

                        <div className="mt-auto grid gap-3 border-t pt-5">
                            <p className="text-xs text-gray-500">
                                {availableStock === null
                                    ? `${product.total_stock} unidade(s) disponíveis`
                                    : availableStock > 0
                                      ? `${availableStock} unidade(s) nesta opção`
                                      : product.allow_quote_when_out_of_stock
                                        ? 'Sem estoque imediato · disponível para orçamento'
                                        : 'Opção sem estoque disponível'}
                            </p>
                            <Button
                                type="button"
                                disabled={!canAdd}
                                onClick={() => onAddToCart(product)}
                                className="h-11 w-full gap-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                style={{
                                    backgroundColor: isAdded
                                        ? accentColor
                                        : primaryColor,
                                }}
                            >
                                <AddToCartContent
                                    isAdded={isAdded}
                                    availableStock={availableStock}
                                    acceptsQuote={
                                        product.allow_quote_when_out_of_stock
                                    }
                                />
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
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
    compact = false,
    headingFont,
    bodyFont,
}: {
    catalogToken: string;
    filters: CatalogFilters;
    filterOptions: CatalogFilterOptions;
    compact?: boolean;
    headingFont?: string;
    bodyFont?: string;
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
        <div
            data-testid="catalog-filters-drawer"
            className={cn(
                'flex flex-wrap items-center gap-3',
                compact
                    ? 'mb-0 justify-end'
                    : 'mb-6 justify-between rounded-xl bg-white/55 p-3 shadow-sm ring-1 ring-black/5 backdrop-blur-md',
            )}
        >
            {!compact && (
                <div className="flex items-center gap-2 text-sm font-medium opacity-80">
                    <Filter className="h-4 w-4" />
                    <span>
                        {appliedCount > 0
                            ? `${appliedCount} filtros ativos`
                            : 'Filtros'}
                    </span>
                </div>
            )}
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
                <SheetContent
                    side="left"
                    className="w-[92vw] sm:max-w-md"
                    style={{ fontFamily: bodyFont }}
                >
                    <SheetHeader>
                        <SheetTitle style={{ fontFamily: headingFont }}>
                            Filtros
                        </SheetTitle>
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
                                                            {value.image_url ? (
                                                                <img
                                                                    src={
                                                                        value.image_url
                                                                    }
                                                                    alt=""
                                                                    className="h-full w-full rounded-full border border-black/10 object-cover"
                                                                />
                                                            ) : (
                                                                <span
                                                                    className="h-full w-full rounded-full border border-black/10"
                                                                    style={{
                                                                        backgroundColor:
                                                                            value.hex ??
                                                                            '#e5e7eb',
                                                                    }}
                                                                />
                                                            )}
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

function CatalogCollections({
    catalogToken,
    filters,
    categories,
    variant,
    display = 'chips',
    trailingAction,
}: {
    catalogToken: string;
    filters: CatalogFilters;
    categories: CatalogFilterOptions['categories'];
    variant: 'minimal' | 'playful' | 'boutique';
    display?: string;
    trailingAction?: ReactNode;
}) {
    if (categories.length === 0 && !trailingAction) {
        return null;
    }

    const selectCategory = (categoryId: number) => {
        const nextCategoryId =
            filters.category_id === String(categoryId)
                ? null
                : String(categoryId);
        const payload: Record<string, string | Record<string, string[]>> = {};

        if (filters.search) {
            payload.search = filters.search;
        }

        if (nextCategoryId) {
            payload.category_id = nextCategoryId;
        }

        if (Object.keys(filters.variations ?? {}).length > 0) {
            payload.variations = filters.variations;
        }

        router.get(`/catalog/${catalogToken}`, payload, {
            preserveState: false,
            preserveScroll: true,
            replace: true,
        });
    };

    if (variant === 'boutique') {
        return (
            <section className="mb-8 flex flex-wrap items-center justify-center gap-3 border-y border-black/10 py-5">
                {categories.map((category) => {
                    const active = filters.category_id === String(category.id);

                    return (
                        <button
                            key={category.id}
                            type="button"
                            onClick={() => selectCategory(category.id)}
                            className={`rounded-none border-b-2 px-1 py-1 font-serif text-sm tracking-wide transition ${
                                active
                                    ? 'border-[var(--brand-primary)] opacity-100'
                                    : 'border-transparent opacity-55 hover:opacity-90'
                            }`}
                        >
                            {category.name}
                        </button>
                    );
                })}
            </section>
        );
    }

    if (variant === 'playful') {
        return (
            <section className="mb-6 flex flex-wrap items-center justify-center gap-2">
                {categories.map((category) => {
                    const active = filters.category_id === String(category.id);

                    return (
                        <button
                            key={category.id}
                            type="button"
                            onClick={() => selectCategory(category.id)}
                            className={`rounded-full border-2 px-4 py-2 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 ${
                                active
                                    ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white'
                                    : 'border-[var(--brand-accent)] bg-white/75'
                            }`}
                        >
                            {category.name}
                        </button>
                    );
                })}
            </section>
        );
    }

    return (
        <section
            data-testid="catalog-collection-navigation"
            className={cn(
                'mb-6 flex flex-col gap-3 sm:flex-row sm:items-center',
                display === 'tabs' && 'border-b border-black/10',
            )}
        >
            <div
                className={cn(
                    'flex min-w-0 flex-1 flex-wrap items-center',
                    display === 'tabs' ? 'gap-x-6 gap-y-1' : 'gap-2',
                )}
            >
                {categories.map((category) => {
                    const active = filters.category_id === String(category.id);

                    return (
                        <button
                            key={category.id}
                            type="button"
                            onClick={() => selectCategory(category.id)}
                            className={cn(
                                'text-sm font-medium transition',
                                display === 'tabs'
                                    ? '-mb-px border-b-2 px-0 py-3'
                                    : 'rounded-full px-4 py-2 shadow-sm ring-1',
                                display === 'tabs'
                                    ? active
                                        ? 'border-[var(--brand-primary)] opacity-100'
                                        : 'border-transparent opacity-50 hover:opacity-80'
                                    : active
                                      ? 'bg-[var(--brand-primary)] text-white ring-[var(--brand-primary)]'
                                      : 'bg-white/65 ring-black/10 hover:bg-white',
                            )}
                        >
                            {category.name}
                        </button>
                    );
                })}
            </div>
            {trailingAction && (
                <div className="shrink-0 self-end py-2 sm:self-center">
                    {trailingAction}
                </div>
            )}
        </section>
    );
}

function AddToCartContent({
    isAdded,
    availableStock,
    acceptsQuote = false,
}: {
    isAdded: boolean;
    availableStock: number | null;
    acceptsQuote?: boolean;
}) {
    if (isAdded) {
        return (
            <>
                <Check className="h-4 w-4" />
                Adicionado
            </>
        );
    }

    if (availableStock === null) {
        return <>Selecione opções</>;
    }

    if (availableStock === 0) {
        return acceptsQuote ? (
            <>
                <MessageCircle className="h-4 w-4" />
                Pedir orçamento
            </>
        ) : (
            <>Esgotado</>
        );
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

function comboPieceCount(product: Product): number {
    if (product.product_type !== 'combo') {
        return 1;
    }

    return product.combo_items.reduce(
        (total, comboItem) => total + comboItem.quantity,
        0,
    );
}

function comboModelCount(product: Product): number {
    return new Set(product.combo_items.map((comboItem) => comboItem.product_id))
        .size;
}

function buildWhatsappCartMessage(
    brandName: string,
    cart: CartItem[],
    cartSelectionLabel: string,
    cartPieceLabel: string,
    catalogUrl: string,
): string {
    const itemLines = cart.map((item) => {
        const details = [
            `SKU ${item.product.sku}`,
            variationSummary(item.selected_variations ?? null),
            item.product.product_type === 'combo'
                ? `${comboPieceCount(item.product)} peças · ${comboModelCount(item.product)} modelos`
                : null,
        ].filter(Boolean);

        return `• ${item.quantity}x ${item.product.name} — ${details.join(' · ')}`;
    });

    return [
        `Olá! Montei uma seleção no catálogo da ${brandName} e gostaria de falar com o comercial.`,
        '',
        ...itemLines,
        '',
        `${cartSelectionLabel} · ${cartPieceLabel}`,
        `Catálogo: ${catalogUrl}`,
    ].join('\n');
}

function catalogUrlForWhatsapp(): string {
    if (typeof window === 'undefined') {
        return '';
    }

    const currentUrl = new URL(window.location.href);
    const representativeReference = currentUrl.searchParams.get('ref');

    currentUrl.search = '';
    currentUrl.hash = '';

    if (representativeReference) {
        currentUrl.searchParams.set('ref', representativeReference);
    }

    return currentUrl.toString();
}

function CartComboSummary({ product }: { product: Product }) {
    if (product.product_type !== 'combo' || product.combo_items.length === 0) {
        return null;
    }

    return (
        <details className="group mt-4 border-t border-[#d8d3cb] pt-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-[#18181f] transition-colors outline-none hover:text-[#ff4d3d] focus-visible:ring-1 focus-visible:ring-[#ff4d3d] focus-visible:ring-offset-1 [&::-webkit-details-marker]:hidden">
                <span>Ver composição</span>
                <span className="flex items-center gap-2 text-xs font-normal text-[#716f68]">
                    <span className="hidden sm:inline">
                        {comboPieceCount(product)} peças ·{' '}
                        {comboModelCount(product)} modelos
                    </span>
                    <ChevronDown className="size-4 transition-transform duration-200 group-open:rotate-180" />
                </span>
            </summary>
            <ul className="grid gap-2 pt-2 pb-1 text-xs leading-5 text-[#716f68]">
                {product.combo_items.map((comboItem, index) => (
                    <li
                        key={`${comboItem.product_id}-${index}`}
                        className="flex justify-between gap-4 border-t border-[#e7e3dc] pt-2 first:border-0 first:pt-0"
                    >
                        <span>
                            {comboItem.quantity}x {comboItem.product_name}
                        </span>
                        {variationSummary(comboItem.variation_key) && (
                            <span className="shrink-0 text-right">
                                {variationSummary(comboItem.variation_key)}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </details>
    );
}

function ComboGridSection({
    combos,
    settings,
    variant,
    onAddToCart,
    onOpenQuickView,
    addedProductId,
    displayOptions,
    headingFont,
}: {
    combos: Product[];
    settings: CatalogSettings;
    variant: 'minimal' | 'playful' | 'boutique';
    onAddToCart: (product: Product) => void;
    onOpenQuickView: (product: Product) => void;
    addedProductId: number | null;
    displayOptions?: ProductDisplayOptions;
    headingFont?: string;
}) {
    if (combos.length === 0) {
        return null;
    }

    const options: ProductDisplayOptions = displayOptions ?? {
        presentation: 'commercial',
        showPrice: !settings.hide_prices,
        showSku: true,
        showStock: true,
        showVariations: true,
        showAction: true,
        showBadges: true,
    };

    if (variant === 'minimal' && options.presentation === 'editorial') {
        return (
            <section className="mb-12 border-b border-black/10 pb-12">
                <div className="mb-6 flex items-end justify-between gap-6">
                    <div>
                        <p className="text-xs font-semibold tracking-[0.16em] uppercase opacity-45">
                            Composições coordenadas
                        </p>
                        <h3
                            className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl"
                            style={{ fontFamily: headingFont }}
                        >
                            Looks completos
                        </h3>
                    </div>
                    <span className="text-xs opacity-45">
                        {combos.length}{' '}
                        {combos.length === 1 ? 'composição' : 'composições'}
                    </span>
                </div>

                <div
                    className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 md:grid-cols-3"
                    style={{
                        gap:
                            settings.layout_density === 'compact'
                                ? '1.5rem'
                                : undefined,
                    }}
                >
                    {combos.map((combo) => {
                        const isAdded = addedProductId === combo.id;
                        const availableStock = combo.total_stock;

                        return (
                            <article key={combo.id} className="group min-w-0">
                                <ComboImageMosaic
                                    product={combo}
                                    className="aspect-4/5 bg-black/5"
                                    onOpen={() => onOpenQuickView(combo)}
                                />

                                <div className="pt-4">
                                    {options.showBadges && combo.category && (
                                        <p className="mb-2 text-[0.67rem] font-semibold tracking-[0.14em] uppercase opacity-45">
                                            {combo.category}
                                        </p>
                                    )}
                                    <div className="flex items-start justify-between gap-4">
                                        <h4
                                            className="text-lg leading-tight font-semibold tracking-[-0.03em]"
                                            style={{ fontFamily: headingFont }}
                                        >
                                            {combo.name}
                                        </h4>
                                        {options.showPrice && (
                                            <p
                                                className={cn(
                                                    'shrink-0 text-sm font-semibold',
                                                    combo.price_cents == null &&
                                                        'italic opacity-50',
                                                )}
                                            >
                                                {formatPrice(combo.price_cents)}
                                            </p>
                                        )}
                                    </div>

                                    {(options.showSku || options.showStock) && (
                                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.7rem] opacity-50">
                                            {options.showSku && (
                                                <span>SKU {combo.sku}</span>
                                            )}
                                            {options.showStock && (
                                                <span>
                                                    {combo.total_stock}{' '}
                                                    {combo.total_stock === 1
                                                        ? 'unidade'
                                                        : 'unidades'}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {options.showAction && (
                                        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-black/10 pt-3 text-xs font-semibold">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onAddToCart(combo)
                                                }
                                                disabled={availableStock === 0}
                                                aria-live="polite"
                                                className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-60 disabled:cursor-not-allowed disabled:opacity-35"
                                                style={{
                                                    color: isAdded
                                                        ? settings.accent_color
                                                        : settings.primary_color,
                                                }}
                                            >
                                                <AddToCartContent
                                                    isAdded={isAdded}
                                                    availableStock={
                                                        availableStock
                                                    }
                                                />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onOpenQuickView(combo)
                                                }
                                                className="opacity-55 transition-opacity hover:opacity-100"
                                            >
                                                Ver composição
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>
        );
    }

    const sectionClasses = {
        minimal:
            'bg-white/55 shadow-sm ring-1 ring-[var(--brand-primary)]/20 backdrop-blur-sm',
        playful:
            'border-4 bg-white/85 shadow-xl ring-4 ring-[var(--brand-accent)]/10',
        boutique:
            'bg-white/35 shadow-sm ring-1 ring-[var(--brand-primary)]/25 backdrop-blur-md',
    };

    const cardClasses = {
        minimal:
            'bg-white/70 shadow-sm ring-1 ring-black/5 transition hover:bg-white/85',
        playful:
            'bg-white shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl',
        boutique:
            'bg-white/45 shadow-sm ring-1 ring-black/10 transition hover:bg-white/60',
    };

    return (
        <section
            className={`relative mb-8 overflow-hidden ${sectionClasses[variant]}`}
            style={{
                borderRadius:
                    variant === 'playful'
                        ? `calc(var(--radius) * 3)`
                        : 'var(--radius)',
                borderColor:
                    variant === 'playful'
                        ? settings.accent_color
                        : 'transparent',
            }}
        >
            {variant === 'playful' && (
                <>
                    <div className="absolute -top-8 right-8 opacity-10">
                        <Sparkles
                            className="h-24 w-24"
                            style={{ color: settings.primary_color }}
                        />
                    </div>
                    <div className="absolute -bottom-8 left-8 opacity-10">
                        <Heart
                            className="h-24 w-24"
                            style={{ color: settings.accent_color }}
                        />
                    </div>
                </>
            )}

            <div className="relative space-y-5 p-5 md:p-6">
                <div
                    className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                    style={{
                        gap:
                            settings.layout_density === 'compact'
                                ? '1rem'
                                : '1.5rem',
                    }}
                >
                    {combos.map((combo) => {
                        const isAdded = addedProductId === combo.id;
                        const availableStock = combo.total_stock;

                        return (
                            <article
                                key={combo.id}
                                className={`group overflow-hidden ${cardClasses[variant]}`}
                                style={{
                                    borderRadius:
                                        variant === 'playful'
                                            ? `calc(var(--radius) * 2)`
                                            : 'var(--radius)',
                                    border:
                                        variant === 'playful'
                                            ? `2px solid ${settings.accent_color}35`
                                            : '1px solid rgba(0,0,0,0.06)',
                                }}
                            >
                                <ComboImageMosaic
                                    product={combo}
                                    className="aspect-4/5 bg-gray-100"
                                    onOpen={() => onOpenQuickView(combo)}
                                />

                                <div className="space-y-3 p-4">
                                    <div className="space-y-1">
                                        <h3
                                            className={
                                                variant === 'boutique'
                                                    ? 'font-serif text-lg font-light tracking-wide'
                                                    : 'text-base font-semibold'
                                            }
                                            style={{ fontFamily: headingFont }}
                                        >
                                            {combo.name}
                                        </h3>
                                        {options.showSku && (
                                            <p className="text-xs opacity-55">
                                                SKU {combo.sku}
                                            </p>
                                        )}
                                    </div>

                                    {options.showPrice && (
                                        <p
                                            className={`text-sm font-semibold ${combo.price_cents == null ? 'italic opacity-50' : ''}`}
                                            style={
                                                combo.price_cents != null
                                                    ? {
                                                          color: settings.primary_color,
                                                      }
                                                    : {}
                                            }
                                        >
                                            {formatPrice(combo.price_cents)}
                                        </p>
                                    )}

                                    {(options.showBadges ||
                                        options.showStock) && (
                                        <div className="flex flex-wrap items-center gap-2 text-xs opacity-65">
                                            {options.showBadges &&
                                                combo.category && (
                                                    <Badge variant="outline">
                                                        {combo.category}
                                                    </Badge>
                                                )}
                                            {options.showStock && (
                                                <span>
                                                    {combo.total_stock}{' '}
                                                    disponível(is)
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {options.showAction && (
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onAddToCart(combo)
                                                }
                                                disabled={availableStock === 0}
                                                aria-live="polite"
                                                className="inline-flex min-w-28 items-center justify-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                                style={{
                                                    backgroundColor: isAdded
                                                        ? settings.accent_color
                                                        : settings.primary_color,
                                                }}
                                            >
                                                <AddToCartContent
                                                    isAdded={isAdded}
                                                    availableStock={
                                                        availableStock
                                                    }
                                                />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    onOpenQuickView(combo)
                                                }
                                                className="inline-flex min-w-24 items-center justify-center rounded-md bg-white/70 px-3 py-1.5 text-xs font-semibold shadow-sm ring-1 ring-black/10 transition hover:bg-white"
                                            >
                                                Ver combo
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
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
    sora: '"Sora", "Helvetica Neue", Arial, sans-serif',
    manrope: '"Manrope", "Helvetica Neue", Arial, sans-serif',
    'space-grotesk': '"Space Grotesk", "Helvetica Neue", Arial, sans-serif',
    fraunces: '"Fraunces", "Times New Roman", serif',
    'ibm-plex': '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
};

// Layout Minimal: Moderno, limpo, espaçoso
function MinimalLayout({
    manufacturer,
    settings,
    products,
    combos,
    tokens,
    onAddToCart,
    onOpenQuickView,
    addedProductId,
    selectedVariations,
    catalogToken,
    filters,
    filterOptions,
    onSelectVariation,
}: LayoutProps) {
    const heroSection = settings.sections?.find((s) => s.type === 'hero');
    const collectionsSection = settings.sections?.find(
        (s) => s.type === 'collections',
    );
    const productGridSection = settings.sections?.find(
        (s) => s.type === 'product_grid',
    );
    const heroEnabled = heroSection?.enabled ?? true;
    const productGridEnabled = productGridSection?.enabled ?? true;
    const collectionsEnabled = collectionsSection?.enabled ?? true;
    const showBrandName = settings.show_brand_name;
    const showLogo = settings.show_logo && Boolean(settings.logo_url);
    const logoSize = heroSection?.props?.logo_size ?? CATALOG_LOGO_SIZE.default;
    const headingFont =
        fontMap[settings.heading_font_family ?? settings.font_family] ??
        fontMap['space-grotesk'];
    const bodyFont =
        fontMap[settings.body_font_family ?? settings.font_family] ??
        fontMap['manrope'];
    const heroHeadline =
        (heroSection?.props?.headline as string | undefined) ||
        settings.tagline ||
        settings.brand_name ||
        manufacturer.name;
    const heroSubtitle =
        (heroSection?.props?.subtitle as string | undefined) ||
        settings.description;
    const heroAlign =
        (heroSection?.props?.align as string | undefined) ?? 'left';
    const heroEyebrow =
        (heroSection?.props?.eyebrow as string | undefined) ?? 'Nova coleção';
    const showProductCount = booleanSetting(
        heroSection?.props?.show_product_count,
        false,
    );
    const showHeroCta = booleanSetting(heroSection?.props?.show_cta, true);
    const heroCtaText =
        (heroSection?.props?.cta_text as string | undefined) ||
        'Conheça a coleção';
    const collectionsDisplay =
        (collectionsSection?.props?.display as string | undefined) ?? 'tabs';
    const productColumns = Number(
        productGridSection?.props?.columns_desktop ?? 3,
    );
    const productColumnsMobile = Number(
        productGridSection?.props?.columns_mobile ?? 1,
    );
    const productPresentation: ProductPresentation =
        productGridSection?.props?.presentation === 'editorial'
            ? 'editorial'
            : 'commercial';
    const productDisplayOptions: ProductDisplayOptions = {
        presentation: productPresentation,
        showPrice:
            !settings.hide_prices &&
            booleanSetting(productGridSection?.props?.show_price, true),
        showSku: booleanSetting(productGridSection?.props?.show_sku, true),
        showStock: booleanSetting(productGridSection?.props?.show_stock, false),
        showVariations: booleanSetting(
            productGridSection?.props?.show_variations,
            true,
        ),
        showAction: booleanSetting(
            productGridSection?.props?.show_action,
            true,
        ),
        showBadges: booleanSetting(
            productGridSection?.props?.show_badges,
            true,
        ),
    };
    const comboDisplayOptions: ProductDisplayOptions = {
        ...productDisplayOptions,
        showStock: booleanSetting(productGridSection?.props?.show_stock, true),
    };
    const heroImage = catalogCoverImageUrl(settings);
    const productCount = products.meta?.total ?? products.data.length;
    const sectionOrder = (type: string): number => {
        const index = settings.sections?.findIndex(
            (section) => section.type === type,
        );

        if (index === undefined || index < 0) {
            return type === 'hero' ? 0 : type === 'collections' ? 1 : 2;
        }

        return index;
    };

    return (
        <div
            className="flex flex-col"
            style={{
                fontFamily: bodyFont,
                gap: settings.layout_density === 'compact' ? '2.5rem' : '4rem',
            }}
        >
            {heroEnabled && (
                <header
                    className="relative -mx-6 -mt-12"
                    style={{ order: sectionOrder('hero') }}
                >
                    <CatalogHero
                        brandName={settings.brand_name ?? manufacturer.name}
                        brandTagline={settings.tagline}
                        showBrandName={showBrandName}
                        showLogo={showLogo}
                        logoUrl={settings.logo_url}
                        logoSize={logoSize}
                        showProductCount={showProductCount}
                        productCount={productCount}
                        coverImage={heroImage}
                        coverImageFit={heroSection?.props?.image_fit}
                        coverImageScale={heroSection?.props?.image_scale}
                        coverImageFocalX={settings.cover_image_focal_x}
                        coverImageFocalY={settings.cover_image_focal_y}
                        alignment={heroAlign}
                        eyebrow={heroEyebrow}
                        headline={heroHeadline}
                        subtitle={heroSubtitle}
                        showCta={showHeroCta && productGridEnabled}
                        ctaText={heroCtaText}
                        ctaHref="#catalog-products"
                        headingFont={headingFont}
                        accentColor={settings.accent_color}
                    />
                </header>
            )}

            {collectionsEnabled && (
                <section style={{ order: sectionOrder('collections') }}>
                    <CatalogCollections
                        catalogToken={catalogToken}
                        filters={filters}
                        categories={filterOptions.categories}
                        variant="minimal"
                        display={collectionsDisplay}
                        trailingAction={
                            productGridEnabled ? (
                                <CatalogFiltersDrawer
                                    catalogToken={catalogToken}
                                    filters={filters}
                                    filterOptions={filterOptions}
                                    compact
                                    headingFont={headingFont}
                                    bodyFont={bodyFont}
                                />
                            ) : undefined
                        }
                    />
                </section>
            )}

            {productGridEnabled && (
                <section
                    id="catalog-products"
                    style={{ order: sectionOrder('product_grid') }}
                >
                    {!collectionsEnabled && (
                        <div className="mb-6 flex justify-end border-b border-black/10 pb-4">
                            <CatalogFiltersDrawer
                                catalogToken={catalogToken}
                                filters={filters}
                                filterOptions={filterOptions}
                                compact
                                headingFont={headingFont}
                                bodyFont={bodyFont}
                            />
                        </div>
                    )}

                    <ComboGridSection
                        combos={combos}
                        settings={settings}
                        variant="minimal"
                        onAddToCart={onAddToCart}
                        onOpenQuickView={onOpenQuickView}
                        addedProductId={addedProductId}
                        displayOptions={comboDisplayOptions}
                        headingFont={headingFont}
                    />

                    {products.data.length === 0 ? (
                        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 border border-black/10 bg-white/30 opacity-60">
                            <Package className="h-16 w-16" />
                            <p className="text-lg">Nenhum produto disponível</p>
                        </div>
                    ) : (
                        <div
                            className={cn(
                                'grid',
                                productPresentation === 'editorial'
                                    ? 'grid-cols-1'
                                    : productColumnsMobile === 2
                                      ? 'grid-cols-2'
                                      : 'grid-cols-1',
                                productColumns === 4
                                    ? 'md:grid-cols-3 lg:grid-cols-4'
                                    : 'md:grid-cols-3',
                                productPresentation === 'editorial'
                                    ? settings.layout_density === 'compact'
                                        ? 'gap-x-3 gap-y-7 sm:gap-x-5 sm:gap-y-9'
                                        : 'gap-x-4 gap-y-10 sm:gap-x-8 sm:gap-y-14'
                                    : settings.layout_density === 'compact'
                                      ? 'gap-5'
                                      : 'gap-7 lg:gap-10',
                            )}
                        >
                            {products.data.map((product) => {
                                const isAdded = addedProductId === product.id;
                                const selectedValues =
                                    selectedVariations[product.id] ?? {};
                                const availableStock =
                                    availableStockForSelection(
                                        product,
                                        selectedValues,
                                    );
                                const canAdd =
                                    availableStock !== null &&
                                    (availableStock > 0 ||
                                        product.allow_quote_when_out_of_stock);
                                const visibleStock =
                                    availableStock ?? product.total_stock;
                                const openOptionsInsteadOfAdding =
                                    productPresentation === 'editorial' &&
                                    product.variations.length > 0 &&
                                    !canAdd;

                                return (
                                    <article
                                        key={product.id}
                                        className={cn(
                                            'group min-w-0',
                                            productPresentation ===
                                                'commercial' &&
                                                'overflow-hidden bg-white/50 backdrop-blur-sm transition-all hover:bg-white/70',
                                        )}
                                        style={
                                            productPresentation === 'commercial'
                                                ? {
                                                      border:
                                                          settings.card_style ===
                                                          'flat'
                                                              ? '1px solid rgba(0,0,0,0.14)'
                                                              : '1px solid rgba(0,0,0,0.05)',
                                                      boxShadow:
                                                          settings.card_style ===
                                                          'soft'
                                                              ? '0 10px 24px rgba(0,0,0,0.08)'
                                                              : 'none',
                                                  }
                                                : undefined
                                        }
                                    >
                                        <ProductImageSlider
                                            product={product}
                                            className="aspect-4/5 bg-black/5"
                                            imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            onOpen={() =>
                                                onOpenQuickView(product)
                                            }
                                        />
                                        <div
                                            style={
                                                productPresentation ===
                                                'commercial'
                                                    ? {
                                                          padding:
                                                              settings.layout_density ===
                                                              'compact'
                                                                  ? '1rem'
                                                                  : tokens.cardPadding,
                                                      }
                                                    : undefined
                                            }
                                            className={cn(
                                                'space-y-2',
                                                productPresentation ===
                                                    'editorial' && 'pt-4',
                                            )}
                                        >
                                            {productDisplayOptions.showBadges &&
                                                product.category &&
                                                productPresentation ===
                                                    'editorial' && (
                                                    <p className="text-[0.67rem] font-semibold tracking-[0.14em] uppercase opacity-45">
                                                        {product.category}
                                                    </p>
                                                )}
                                            <h3
                                                className={cn(
                                                    'font-semibold tracking-[-0.025em]',
                                                    productPresentation ===
                                                        'editorial' &&
                                                        'text-base leading-tight sm:text-lg',
                                                )}
                                                style={{
                                                    fontFamily: headingFont,
                                                }}
                                            >
                                                {product.name}
                                            </h3>
                                            {productDisplayOptions.showSku && (
                                                <p className="text-xs opacity-50">
                                                    SKU {product.sku}
                                                </p>
                                            )}
                                            {productDisplayOptions.showPrice && (
                                                <p
                                                    className={`text-sm font-semibold ${product.price_cents == null ? 'italic opacity-50' : ''}`}
                                                    style={
                                                        product.price_cents !=
                                                        null
                                                            ? {
                                                                  color:
                                                                      productPresentation ===
                                                                      'editorial'
                                                                          ? 'inherit'
                                                                          : 'var(--brand-primary)',
                                                              }
                                                            : {}
                                                    }
                                                >
                                                    {formatPrice(
                                                        product.price_cents,
                                                    )}
                                                </p>
                                            )}
                                            {productDisplayOptions.showBadges &&
                                                product.product_type ===
                                                    'combo' && (
                                                    <Badge variant="outline">
                                                        Combo
                                                    </Badge>
                                                )}
                                            {productPresentation ===
                                                'commercial' && (
                                                <ComboSummary
                                                    product={product}
                                                />
                                            )}
                                            {productDisplayOptions.showVariations && (
                                                <ProductVariations
                                                    product={product}
                                                    selectedValues={
                                                        selectedValues
                                                    }
                                                    onSelect={(
                                                        variationName,
                                                        value,
                                                    ) =>
                                                        onSelectVariation(
                                                            product.id,
                                                            variationName,
                                                            value,
                                                        )
                                                    }
                                                />
                                            )}
                                            {(productDisplayOptions.showStock ||
                                                productDisplayOptions.showAction ||
                                                (productDisplayOptions.showBadges &&
                                                    product.category &&
                                                    productPresentation ===
                                                        'commercial')) && (
                                                <div
                                                    className={cn(
                                                        'flex items-center justify-between gap-3',
                                                        productPresentation ===
                                                            'editorial' &&
                                                            'mt-4 border-t border-black/10 pt-3',
                                                    )}
                                                >
                                                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                        {productDisplayOptions.showBadges &&
                                                            product.category &&
                                                            productPresentation ===
                                                                'commercial' && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-xs"
                                                                >
                                                                    {
                                                                        product.category
                                                                    }
                                                                </Badge>
                                                            )}
                                                        {productDisplayOptions.showStock && (
                                                            <span className="text-[0.7rem] opacity-50">
                                                                {visibleStock}{' '}
                                                                {visibleStock ===
                                                                1
                                                                    ? 'unidade'
                                                                    : 'unidades'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {productDisplayOptions.showAction &&
                                                        (productPresentation ===
                                                        'editorial' ? (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    openOptionsInsteadOfAdding
                                                                        ? onOpenQuickView(
                                                                              product,
                                                                          )
                                                                        : canAdd &&
                                                                          onAddToCart(
                                                                              product,
                                                                          )
                                                                }
                                                                disabled={
                                                                    availableStock ===
                                                                    0
                                                                }
                                                                aria-live="polite"
                                                                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold transition-opacity hover:opacity-60 disabled:cursor-not-allowed disabled:opacity-35"
                                                                style={{
                                                                    color: isAdded
                                                                        ? 'var(--brand-accent)'
                                                                        : 'var(--brand-primary)',
                                                                }}
                                                            >
                                                                {openOptionsInsteadOfAdding ? (
                                                                    'Ver opções'
                                                                ) : (
                                                                    <AddToCartContent
                                                                        isAdded={
                                                                            isAdded
                                                                        }
                                                                        availableStock={
                                                                            availableStock
                                                                        }
                                                                        acceptsQuote={
                                                                            product.allow_quote_when_out_of_stock
                                                                        }
                                                                    />
                                                                )}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    canAdd &&
                                                                    onAddToCart(
                                                                        product,
                                                                    )
                                                                }
                                                                disabled={
                                                                    !canAdd
                                                                }
                                                                aria-live="polite"
                                                                className={`inline-flex min-w-28 items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${isAdded ? 'scale-[1.02]' : ''}`}
                                                                style={{
                                                                    backgroundColor:
                                                                        isAdded
                                                                            ? 'var(--brand-accent)'
                                                                            : 'var(--brand-primary)',
                                                                }}
                                                            >
                                                                <AddToCartContent
                                                                    isAdded={
                                                                        isAdded
                                                                    }
                                                                    availableStock={
                                                                        availableStock
                                                                    }
                                                                    acceptsQuote={
                                                                        product.allow_quote_when_out_of_stock
                                                                    }
                                                                />
                                                            </button>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    <Pagination
                        links={products.meta?.links ?? products.links}
                    />
                </section>
            )}
        </div>
    );
}

// Layout Playful: Divertido, colorido, dinâmico
function PlayfulLayout({
    manufacturer,
    settings,
    products,
    combos,
    tokens,
    onAddToCart,
    onOpenQuickView,
    addedProductId,
    selectedVariations,
    catalogToken,
    filters,
    filterOptions,
    onSelectVariation,
}: LayoutProps) {
    const heroSection = settings.sections?.find((s) => s.type === 'hero');
    const heroEnabled = heroSection?.enabled ?? true;
    const logoSize = heroSection?.props?.logo_size ?? CATALOG_LOGO_SIZE.default;
    const productGridEnabled =
        settings.sections?.find((s) => s.type === 'product_grid')?.enabled ??
        true;
    const collectionsEnabled =
        settings.sections?.find((s) => s.type === 'collections')?.enabled ??
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
                        {settings.show_logo && settings.logo_url && (
                            <div
                                className="mx-auto inline-flex max-w-full items-center justify-center"
                                style={{ borderRadius: tokens.radius }}
                            >
                                <img
                                    src={settings.logo_url}
                                    alt={
                                        settings.brand_name ?? manufacturer.name
                                    }
                                    className="h-auto object-contain"
                                    style={catalogLogoStyle(logoSize, 320, 128)}
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
                            {settings.show_brand_name && (
                                <h1
                                    className="text-5xl font-black tracking-tight"
                                    style={{ color: settings.primary_color }}
                                >
                                    {settings.brand_name ?? manufacturer.name}
                                </h1>
                            )}
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
                        {settings.show_brand_name && (
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
                        )}
                    </div>
                </header>
            )}

            {collectionsEnabled && (
                <CatalogCollections
                    catalogToken={catalogToken}
                    filters={filters}
                    categories={filterOptions.categories}
                    variant="playful"
                />
            )}

            {productGridEnabled && (
                <CatalogFiltersDrawer
                    catalogToken={catalogToken}
                    filters={filters}
                    filterOptions={filterOptions}
                />
            )}

            <ComboGridSection
                combos={combos}
                settings={settings}
                variant="playful"
                onAddToCart={onAddToCart}
                onOpenQuickView={onOpenQuickView}
                addedProductId={addedProductId}
            />

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
                            const availableStock = availableStockForSelection(
                                product,
                                selectedValues,
                            );
                            const canAdd =
                                availableStock !== null &&
                                (availableStock > 0 ||
                                    product.allow_quote_when_out_of_stock);

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
                                        onOpen={() => onOpenQuickView(product)}
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
                                        {!settings.hide_prices && (
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
                                                {formatPrice(
                                                    product.price_cents,
                                                )}
                                            </p>
                                        )}
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
                                                availableStock={availableStock}
                                                acceptsQuote={
                                                    product.allow_quote_when_out_of_stock
                                                }
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
    combos,
    tokens,
    onAddToCart,
    onOpenQuickView,
    addedProductId,
    selectedVariations,
    catalogToken,
    filters,
    filterOptions,
    onSelectVariation,
}: LayoutProps) {
    const heroSection = settings.sections?.find((s) => s.type === 'hero');
    const heroEnabled = heroSection?.enabled ?? true;
    const logoSize = heroSection?.props?.logo_size ?? CATALOG_LOGO_SIZE.default;
    const productGridEnabled =
        settings.sections?.find((s) => s.type === 'product_grid')?.enabled ??
        true;
    const collectionsEnabled =
        settings.sections?.find((s) => s.type === 'collections')?.enabled ??
        true;
    return (
        <>
            {/* Hero elegante tipo magazine */}
            {heroEnabled && (
                <header
                    className="relative mb-16 overflow-hidden bg-white/40 backdrop-blur-md"
                    style={{ borderRadius: tokens.radius }}
                >
                    <div
                        className={`grid items-center gap-12 p-16 ${
                            settings.show_brand_name
                                ? 'lg:grid-cols-2'
                                : 'justify-items-center text-center'
                        }`}
                    >
                        <div
                            className={`space-y-6 ${
                                settings.show_brand_name
                                    ? ''
                                    : 'flex max-w-2xl flex-col items-center'
                            }`}
                        >
                            <div
                                className="inline-flex items-center gap-2 border-b-2 pb-2 text-xs font-semibold tracking-[0.2em] uppercase"
                                style={{ borderColor: settings.primary_color }}
                            >
                                <Sparkles className="h-3 w-3" />
                                <span>Coleção Exclusiva</span>
                            </div>
                            {settings.show_brand_name && (
                                <h1
                                    className="font-serif text-6xl leading-tight font-light tracking-tight"
                                    style={{ color: settings.secondary_color }}
                                >
                                    {settings.brand_name ?? manufacturer.name}
                                </h1>
                            )}
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
                            {settings.show_brand_name && (
                                <div className="flex items-center gap-4 pt-4">
                                    <div
                                        className="h-px flex-1"
                                        style={{
                                            backgroundColor:
                                                settings.primary_color,
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
                                        {products.data.length} Peças
                                        Selecionadas
                                    </Badge>
                                </div>
                            )}
                        </div>
                        {settings.show_logo && settings.logo_url && (
                            <div className="flex justify-center">
                                <div
                                    className="inline-flex max-w-full items-center justify-center"
                                    style={{ borderRadius: tokens.radius }}
                                >
                                    <img
                                        src={settings.logo_url}
                                        alt={
                                            settings.brand_name ??
                                            manufacturer.name
                                        }
                                        className="h-auto object-contain"
                                        style={catalogLogoStyle(
                                            logoSize,
                                            448,
                                            160,
                                        )}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </header>
            )}

            {collectionsEnabled && (
                <CatalogCollections
                    catalogToken={catalogToken}
                    filters={filters}
                    categories={filterOptions.categories}
                    variant="boutique"
                />
            )}

            {productGridEnabled && (
                <CatalogFiltersDrawer
                    catalogToken={catalogToken}
                    filters={filters}
                    filterOptions={filterOptions}
                />
            )}

            <ComboGridSection
                combos={combos}
                settings={settings}
                variant="boutique"
                onAddToCart={onAddToCart}
                onOpenQuickView={onOpenQuickView}
                addedProductId={addedProductId}
            />

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
                            const availableStock = availableStockForSelection(
                                product,
                                selectedValues,
                            );
                            const canAdd =
                                availableStock !== null &&
                                (availableStock > 0 ||
                                    product.allow_quote_when_out_of_stock);

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
                                        onOpen={() => onOpenQuickView(product)}
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
                                            {!settings.hide_prices && (
                                                <p
                                                    className={`mt-1 text-base font-semibold ${product.price_cents == null ? 'font-light italic opacity-50' : ''}`}
                                                    style={
                                                        product.price_cents !=
                                                        null
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
                                            )}
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
                                                availableStock={availableStock}
                                                acceptsQuote={
                                                    product.allow_quote_when_out_of_stock
                                                }
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
    combos,
    catalog_token,
    filters,
    filter_options,
    order_rules,
    whatsapp_checkout,
}: Props) {
    const headingFont =
        fontMap[
            catalog_settings.heading_font_family ?? catalog_settings.font_family
        ] ?? fontMap['space-grotesk'];
    const bodyFont =
        fontMap[
            catalog_settings.body_font_family ?? catalog_settings.font_family
        ] ?? fontMap['manrope'];
    const preset: string = 'minimal';
    const tokens = LAYOUT_TOKENS.minimal;

    // Cart state
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(
        null,
    );
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
    const cartPieceTotal = cart.reduce(
        (sum, item) => sum + comboPieceCount(item.product) * item.quantity,
        0,
    );
    const cartCompositionTotal = cart.reduce(
        (sum, item) =>
            item.product.product_type === 'combo' ? sum + item.quantity : sum,
        0,
    );
    const hasOnlyCompositions =
        cart.length > 0 &&
        cart.every((item) => item.product.product_type === 'combo');
    const cartSelectionLabel = hasOnlyCompositions
        ? `${cartCompositionTotal} ${cartCompositionTotal === 1 ? 'composição' : 'composições'}`
        : `${cartTotal} ${cartTotal === 1 ? 'seleção' : 'seleções'}`;
    const cartPieceLabel = `${cartPieceTotal} ${cartPieceTotal === 1 ? 'peça' : 'peças'}`;
    const cartRequiresQuote = cart.some((item) => {
        const availableStock = availableStockForSelection(
            item.product,
            item.selected_variations ?? {},
        );

        return (
            item.product.allow_quote_when_out_of_stock &&
            availableStock !== null &&
            item.quantity > availableStock
        );
    });
    const whatsappMessage = whatsapp_checkout.enabled
        ? buildWhatsappCartMessage(
              catalog_settings.brand_name ?? manufacturer.name,
              cart,
              cartSelectionLabel,
              cartPieceLabel,
              catalogUrlForWhatsapp(),
          )
        : '';
    const whatsappCheckoutUrl =
        whatsapp_checkout.enabled &&
        whatsapp_checkout.available &&
        whatsapp_checkout.base_url
            ? `${whatsapp_checkout.base_url}?text=${encodeURIComponent(whatsappMessage)}`
            : null;

    const hasAnyPriced =
        !whatsapp_checkout.enabled &&
        cart.some((item) => item.unit_price_cents != null);
    const hasItemsUnderConsultation = cart.some(
        (item) => item.unit_price_cents == null,
    );
    const orderRuleEvaluation = evaluateOrderRules(
        order_rules,
        cart.map((item) => ({
            product_id: item.product.id,
            product_category_id: item.product.category_id ?? null,
            quantity: item.quantity,
            unit_price_cents: item.unit_price_cents ?? null,
        })),
    );
    const pendingBenefit = orderRuleEvaluation.evaluations
        .filter(
            (evaluation) =>
                evaluation.rule.action.type !== 'block_checkout' &&
                !evaluation.matched,
        )
        .map((evaluation) => ({
            evaluation,
            progress: pendingRuleProgress(evaluation),
        }))
        .filter(
            (
                candidate,
            ): candidate is typeof candidate & {
                progress: NonNullable<typeof candidate.progress>;
            } => candidate.progress !== null,
        )
        .sort(
            (a, b) =>
                a.progress.remaining / a.progress.target -
                b.progress.remaining / b.progress.target,
        )[0];
    const pendingRequirements = orderRuleEvaluation.evaluations
        .filter(
            (evaluation) =>
                evaluation.rule.action.type === 'block_checkout' &&
                evaluation.matched,
        )
        .map((evaluation) => ({
            evaluation,
            remaining: blockingRuleRemaining(
                evaluation.rule,
                evaluation.current_values,
            ),
        }));

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
            const availableStock = availableStockForSelection(
                product,
                selectedValues,
            );

            if (
                availableStock === null ||
                (availableStock === 0 && !product.allow_quote_when_out_of_stock)
            ) {
                return;
            }

            setAddedProductId(product.id);

            setCart((prev) => {
                const existing = prev.find((item) => item.key === key);

                if (existing) {
                    return prev.map((item) =>
                        item.key === key
                            ? {
                                  ...item,
                                  quantity:
                                      product.allow_quote_when_out_of_stock
                                          ? Math.min(item.quantity + 1, 9999)
                                          : Math.min(
                                                item.quantity + 1,
                                                availableStock,
                                            ),
                              }
                            : item,
                    );
                }

                return [
                    ...prev,
                    {
                        key,
                        product,
                        quantity: 1,
                        unit_price_cents: priceForSelection(
                            product,
                            selectedValues,
                        ),
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
            prev.map((item) => {
                if (item.key !== itemKey) {
                    return item;
                }

                const availableStock =
                    availableStockForSelection(
                        item.product,
                        item.selected_variations ?? {},
                    ) ?? 0;

                return {
                    ...item,
                    quantity: item.product.allow_quote_when_out_of_stock
                        ? Math.min(quantity, 9999)
                        : Math.min(quantity, availableStock),
                };
            }),
        );
    };

    const removeFromCart = (itemKey: string) => {
        setCart((prev) => prev.filter((item) => item.key !== itemKey));
    };

    const handleCheckout = () => {
        if (whatsapp_checkout.enabled) {
            return;
        }

        setCheckoutErrors({});
        setSubmitting(true);

        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);

        router.post(
            `/catalog/${catalog_token}/orders`,
            {
                customer_name: customerName,
                request_quote: cartRequiresQuote,
                customer_phone: customerPhone || null,
                customer_email: customerEmail || null,
                customer_document_type: cartRequiresQuote
                    ? null
                    : customerDocumentType,
                customer_document: cartRequiresQuote
                    ? null
                    : onlyDigits(customerDocument),
                customer_zip_code: cartRequiresQuote
                    ? null
                    : onlyDigits(customerZipCode),
                customer_state: cartRequiresQuote ? null : customerState,
                customer_city: cartRequiresQuote ? null : customerCity,
                customer_neighborhood: cartRequiresQuote
                    ? null
                    : customerNeighborhood,
                customer_street: cartRequiresQuote ? null : customerStreet,
                customer_address_number: cartRequiresQuote
                    ? null
                    : customerAddressNumber,
                customer_address_complement: cartRequiresQuote
                    ? null
                    : customerAddressComplement || null,
                customer_address_reference: cartRequiresQuote
                    ? null
                    : customerAddressReference || null,
                customer_notes: customerNotes || null,
                items: cart.map((item) => ({
                    product_id: item.product.id,
                    quantity: item.quantity,
                    size: item.size ?? null,
                    color: item.color ?? null,
                    selected_variations: item.selected_variations ?? null,
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
                fontFamily: bodyFont,
                ['--brand-primary' as string]: catalog_settings.primary_color,
                ['--brand-secondary' as string]:
                    catalog_settings.secondary_color,
                ['--brand-accent' as string]: catalog_settings.accent_color,
                ['--brand-bg' as string]: catalog_settings.background_color,
                ['--radius' as string]: tokens.radius,
                ['--gap' as string]: tokens.gap,
                ['--card-padding' as string]: tokens.cardPadding,
                ['--shadow' as string]: tokens.shadow,
                ['--brand-heading-font' as string]: headingFont,
                ['--brand-body-font' as string]: bodyFont,
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
                                filter: `blur(${catalog_settings.background_blur ?? 0}px)`,
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
                    href="https://fonts.bunny.net/css?family=sora:400,500,600,700|manrope:400,500,600,700|space-grotesk:400,500,600,700|fraunces:400,600,700|ibm-plex-sans:400,500,600,700"
                    rel="stylesheet"
                />
            </Head>

            <div className="relative mx-auto w-full max-w-7xl px-6 py-12">
                {preset === 'playful' && (
                    <PlayfulLayout
                        manufacturer={manufacturer}
                        settings={catalog_settings}
                        products={products}
                        combos={combos}
                        tokens={tokens}
                        onAddToCart={addToCart}
                        onOpenQuickView={setQuickViewProduct}
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
                        combos={combos}
                        tokens={tokens}
                        onAddToCart={addToCart}
                        onOpenQuickView={setQuickViewProduct}
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
                        combos={combos}
                        tokens={tokens}
                        onAddToCart={addToCart}
                        onOpenQuickView={setQuickViewProduct}
                        addedProductId={addedProductId}
                        selectedVariations={selectedVariations}
                        catalogToken={catalog_token}
                        filters={filters}
                        filterOptions={filter_options}
                        onSelectVariation={selectVariation}
                    />
                )}
            </div>

            <ProductQuickViewModal
                product={quickViewProduct}
                selectedValues={
                    quickViewProduct
                        ? (selectedVariations[quickViewProduct.id] ?? {})
                        : {}
                }
                isAdded={
                    quickViewProduct
                        ? addedProductId === quickViewProduct.id
                        : false
                }
                primaryColor={catalog_settings.primary_color}
                accentColor={catalog_settings.accent_color}
                showPrice={!whatsapp_checkout.enabled}
                onClose={() => setQuickViewProduct(null)}
                onSelectVariation={(variationName, value) => {
                    if (!quickViewProduct) {
                        return;
                    }

                    selectVariation(quickViewProduct.id, variationName, value);
                }}
                onAddToCart={addToCart}
                headingFont={headingFont}
                bodyFont={bodyFont}
            />

            {/* Floating cart button */}
            {cartTotal > 0 && (
                <button
                    type="button"
                    onClick={() => setCartOpen(true)}
                    className="fixed right-6 bottom-6 z-40 flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-xl transition-transform hover:scale-105"
                    style={{ backgroundColor: catalog_settings.primary_color }}
                >
                    <ShoppingCart className="h-5 w-5" />
                    <span>
                        {whatsapp_checkout.enabled
                            ? 'Ver seleção'
                            : cartRequiresQuote
                              ? 'Ver orçamento'
                              : 'Ver pedido'}
                    </span>
                    <span className="rounded-full bg-white/20 px-2 py-0.5 font-bold">
                        {cartTotal}
                    </span>
                </button>
            )}

            {/* Cart Sheet */}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                <SheetContent
                    side="right"
                    overlayClassName="bg-[#18181f]/72 backdrop-blur-[1px]"
                    className="flex w-full gap-0 border-l border-[#cac4ba] bg-[#f6f4f0] shadow-none ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:duration-200 data-[state=open]:duration-300 sm:max-w-[34rem] [&_[data-slot=sheet-close]]:top-5 [&_[data-slot=sheet-close]]:right-4 sm:[&_[data-slot=sheet-close]]:top-7 sm:[&_[data-slot=sheet-close]]:right-6"
                    style={{
                        fontFamily: bodyFont,
                        color: '#18181f',
                    }}
                >
                    <SheetHeader className="sticky top-0 z-20 gap-2 border-b border-[#d8d3cb] bg-[#f6f4f0]/96 px-6 pt-7 pb-6 backdrop-blur-sm sm:px-8 sm:pt-9 sm:pb-7">
                        <p
                            className="pr-12 text-[11px] font-semibold tracking-[0.18em] uppercase"
                            style={{ color: catalog_settings.accent_color }}
                        >
                            {whatsapp_checkout.enabled
                                ? 'Seleção em construção'
                                : cartRequiresQuote
                                  ? 'Orçamento em construção'
                                  : 'Pedido em construção'}
                        </p>
                        <SheetTitle
                            className="pr-12 text-[2.35rem] leading-[0.98] font-semibold tracking-[-0.04em] sm:text-[2.75rem]"
                            style={{ fontFamily: headingFont }}
                        >
                            Sua seleção
                            <span
                                aria-hidden="true"
                                style={{ color: catalog_settings.accent_color }}
                            >
                                .
                            </span>
                        </SheetTitle>
                        <SheetDescription className="text-sm text-[#716f68]">
                            {cartSelectionLabel} · {cartPieceLabel}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                        {cart.length === 0 ? (
                            <div className="grid min-h-72 place-items-center px-6 text-center">
                                <div className="max-w-64">
                                    <Package className="mx-auto size-6 text-[#98968d]" />
                                    <p
                                        className="mt-4 text-xl font-semibold"
                                        style={{ fontFamily: headingFont }}
                                    >
                                        Sua seleção começa no catálogo.
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-[#716f68]">
                                        Escolha as peças e composições que fazem
                                        sentido para a sua loja.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#d8d3cb] px-6 sm:px-8">
                                {cart.map((item) => {
                                    const availableStock =
                                        availableStockForSelection(
                                            item.product,
                                            item.selected_variations ?? {},
                                        );

                                    return (
                                        <article
                                            key={item.key}
                                            className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 py-6 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-5 sm:py-7"
                                        >
                                            <div className="h-[112px] w-[88px] overflow-hidden bg-[#e7e3dc] sm:h-[120px] sm:w-[96px]">
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
                                                        <Package className="size-5 text-[#98968d]" />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="min-w-0">
                                                <h3
                                                    className="text-lg leading-6 font-semibold tracking-[-0.02em]"
                                                    style={{
                                                        fontFamily: headingFont,
                                                    }}
                                                >
                                                    {item.product.name}
                                                </h3>
                                                <p className="mt-1 text-[11px] tracking-[0.08em] text-[#98968d] uppercase">
                                                    {item.product.sku}
                                                </p>
                                                {!whatsapp_checkout.enabled && (
                                                    <p
                                                        className="mt-3 text-base font-semibold"
                                                        style={{
                                                            fontFamily:
                                                                headingFont,
                                                        }}
                                                    >
                                                        {formatPrice(
                                                            item.unit_price_cents,
                                                        )}
                                                    </p>
                                                )}

                                                {item.product
                                                    .allow_quote_when_out_of_stock &&
                                                    availableStock !== null &&
                                                    item.quantity >
                                                        availableStock && (
                                                        <span className="mt-3 inline-flex min-h-7 items-center gap-2 bg-[#ff4d3d]/10 px-2.5 text-[0.65rem] font-bold tracking-[0.08em] text-[#b52e24] uppercase">
                                                            <MessageCircle className="size-3.5" />
                                                            Vai para orçamento
                                                        </span>
                                                    )}

                                                {item.product.product_type ===
                                                'combo' ? (
                                                    <p className="mt-1 text-xs text-[#716f68]">
                                                        {comboPieceCount(
                                                            item.product,
                                                        )}{' '}
                                                        peças ·{' '}
                                                        {comboModelCount(
                                                            item.product,
                                                        )}{' '}
                                                        modelos
                                                    </p>
                                                ) : (
                                                    item.selected_variations && (
                                                        <p className="mt-1 text-xs text-[#716f68]">
                                                            {variationSummary(
                                                                item.selected_variations,
                                                            )}
                                                        </p>
                                                    )
                                                )}

                                                <CartComboSummary
                                                    product={item.product}
                                                />

                                                <div className="mt-4 flex items-center justify-between gap-3">
                                                    <div
                                                        className="flex h-11 items-center border border-[#cac4ba] bg-[#f6f4f0]"
                                                        aria-label={`Quantidade de ${item.product.name}`}
                                                    >
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-10 rounded-none hover:bg-[#e7e3dc]"
                                                            disabled={
                                                                item.quantity <=
                                                                1
                                                            }
                                                            aria-label={`Diminuir quantidade de ${item.product.name}`}
                                                            onClick={() =>
                                                                updateQuantity(
                                                                    item.key,
                                                                    item.quantity -
                                                                        1,
                                                                )
                                                            }
                                                        >
                                                            <Minus className="size-4" />
                                                        </Button>
                                                        <span
                                                            className="w-10 text-center text-sm font-semibold"
                                                            aria-live="polite"
                                                        >
                                                            {item.quantity}
                                                        </span>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-10 rounded-none hover:bg-[#e7e3dc]"
                                                            disabled={
                                                                availableStock !==
                                                                    null &&
                                                                item.quantity >=
                                                                    availableStock
                                                            }
                                                            aria-label={`Aumentar quantidade de ${item.product.name}`}
                                                            onClick={() =>
                                                                updateQuantity(
                                                                    item.key,
                                                                    item.quantity +
                                                                        1,
                                                                )
                                                            }
                                                        >
                                                            <Plus className="size-4" />
                                                        </Button>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-11 rounded-none text-[#716f68] hover:bg-[#e7e3dc] hover:text-[#ff4d3d]"
                                                        aria-label={`Remover ${item.product.name} do pedido`}
                                                        onClick={() =>
                                                            removeFromCart(
                                                                item.key,
                                                            )
                                                        }
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}

                        {cart.length > 0 && (
                            <div className="border-t border-[#d8d3cb] px-6 py-6 sm:px-8 sm:py-7">
                                {whatsapp_checkout.enabled ? (
                                    <p className="mb-6 border-l-2 border-[#ff4d3d] pl-4 text-xs leading-5 text-[#716f68]">
                                        Nenhum valor aparece nesta seleção. O
                                        comercial confirma preços, condições e
                                        disponibilidade durante a conversa.
                                    </p>
                                ) : hasItemsUnderConsultation ? (
                                    <p className="mb-6 border-l-2 border-[#98968d] pl-4 text-xs leading-5 text-[#716f68]">
                                        Itens sob consulta entram no pedido, mas
                                        não participam do total estimado nem dos
                                        descontos por valor.
                                    </p>
                                ) : null}

                                {pendingRequirements.length > 0 && (
                                    <section aria-labelledby="cart-requirements-title">
                                        <h3
                                            id="cart-requirements-title"
                                            className="text-xl font-semibold tracking-[-0.025em]"
                                            style={{ fontFamily: headingFont }}
                                        >
                                            {whatsapp_checkout.enabled
                                                ? 'Antes de conversar'
                                                : 'O que falta para fechar'}
                                        </h3>
                                        <div className="mt-3 divide-y divide-[#d8d3cb] border-y border-[#d8d3cb]">
                                            {pendingRequirements.map(
                                                ({ evaluation, remaining }) => (
                                                    <div
                                                        key={evaluation.rule.id}
                                                        className="flex min-h-14 items-center gap-3 py-3 text-sm leading-5"
                                                        role="status"
                                                    >
                                                        <Circle
                                                            className="size-4 shrink-0"
                                                            style={{
                                                                color: catalog_settings.accent_color,
                                                            }}
                                                            aria-hidden="true"
                                                        />
                                                        <span>
                                                            {remaining !== null
                                                                ? orderRuleRequirementLabel(
                                                                      evaluation.rule,
                                                                      remaining,
                                                                  )
                                                                : (evaluation
                                                                      .rule
                                                                      .public_message ??
                                                                  'Este pedido ainda não atende a uma condição comercial.')}
                                                        </span>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </section>
                                )}

                                {orderRuleEvaluation.best_discount_rule &&
                                    orderRuleEvaluation.discount_cents > 0 && (
                                        <div
                                            className="mt-6 flex gap-3 border-l-2 px-4 py-3 text-sm leading-5"
                                            style={{
                                                borderColor:
                                                    catalog_settings.accent_color,
                                                backgroundColor: `${catalog_settings.accent_color}12`,
                                            }}
                                            role="status"
                                        >
                                            <Check className="mt-0.5 size-4 shrink-0" />
                                            <span>
                                                {orderRuleEvaluation
                                                    .best_discount_rule
                                                    .public_message ??
                                                    `${orderRuleEvaluation.best_discount_rule.name} liberado neste pedido.`}
                                            </span>
                                        </div>
                                    )}

                                {pendingBenefit && (
                                    <section className="mt-7">
                                        <div className="flex items-center justify-between gap-4 text-[11px] font-semibold tracking-[0.14em] text-[#98968d] uppercase">
                                            <span>Próxima vantagem</span>
                                            <span>
                                                {Math.round(
                                                    pendingBenefit.progress
                                                        .ratio * 100,
                                                )}
                                                %
                                            </span>
                                        </div>
                                        <progress
                                            value={
                                                pendingBenefit.progress.current
                                            }
                                            max={pendingBenefit.progress.target}
                                            className="order-rule-progress mt-3 h-[3px] w-full"
                                            style={
                                                {
                                                    '--order-rule-progress-color':
                                                        catalog_settings.accent_color,
                                                } as CSSProperties
                                            }
                                            aria-label={`Progresso para ${pendingBenefit.evaluation.rule.name}`}
                                        />
                                        <p className="mt-3 text-sm leading-6 font-medium">
                                            Faltam{' '}
                                            {orderRuleRemainingLabel(
                                                pendingBenefit.evaluation.rule,
                                                pendingBenefit.progress
                                                    .remaining,
                                            )}{' '}
                                            para liberar{' '}
                                            {orderRuleBenefitLabel(
                                                pendingBenefit.evaluation.rule,
                                            )}
                                            .
                                        </p>
                                    </section>
                                )}
                            </div>
                        )}
                    </div>

                    {cart.length > 0 && (
                        <SheetFooter className="mt-0 shrink-0 gap-4 border-t border-[#cac4ba] bg-[#f6f4f0] px-6 py-5 sm:px-8 sm:py-6">
                            {hasAnyPriced && (
                                <div className="grid w-full gap-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[#716f68]">
                                            Subtotal
                                        </span>
                                        <span>
                                            {formatPrice(
                                                orderRuleEvaluation.subtotal_cents,
                                            )}
                                        </span>
                                    </div>
                                    {orderRuleEvaluation.discount_cents > 0 && (
                                        <div className="flex items-center justify-between text-green-700">
                                            <span>Desconto liberado</span>
                                            <span>
                                                −{' '}
                                                {formatPrice(
                                                    orderRuleEvaluation.discount_cents,
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    <div
                                        className="flex items-baseline justify-between border-t border-[#d8d3cb] pt-3 text-xl font-semibold tracking-[-0.025em]"
                                        style={{ fontFamily: headingFont }}
                                    >
                                        <span className="text-lg">
                                            {cartRequiresQuote
                                                ? 'Estimativa atual'
                                                : 'Total estimado'}
                                        </span>
                                        <span className="text-2xl">
                                            {formatPrice(
                                                orderRuleEvaluation.total_cents,
                                            )}
                                        </span>
                                    </div>
                                </div>
                            )}
                            {whatsapp_checkout.enabled && (
                                <div className="w-full border-l-2 border-[#ff4d3d] pl-4 text-sm leading-6">
                                    <p
                                        className="font-semibold"
                                        style={{ fontFamily: headingFont }}
                                    >
                                        Sua seleção está pronta para conversar.
                                    </p>
                                    <p className="mt-1 text-xs text-[#716f68]">
                                        O WhatsApp abre com todos os itens
                                        preenchidos. Revise e toque em enviar.
                                    </p>
                                </div>
                            )}

                            {cartRequiresQuote &&
                                !whatsapp_checkout.enabled && (
                                    <div className="w-full border-l-2 border-[#ff4d3d] pl-4 text-sm leading-6">
                                        <p
                                            className="font-semibold"
                                            style={{ fontFamily: headingFont }}
                                        >
                                            Esta seleção será enviada como
                                            orçamento.
                                        </p>
                                        <p className="mt-1 text-xs text-[#716f68]">
                                            O comercial confirma prazo, saldo e
                                            condição final. Nenhuma peça será
                                            reservada agora.
                                        </p>
                                    </div>
                                )}

                            {whatsapp_checkout.enabled ? (
                                whatsappCheckoutUrl ? (
                                    <Button
                                        asChild
                                        className="h-[52px] w-full rounded-[2px] text-sm font-semibold shadow-none transition-transform duration-200 hover:-translate-y-px"
                                        style={{
                                            backgroundColor:
                                                catalog_settings.primary_color,
                                        }}
                                    >
                                        <a
                                            href={whatsappCheckoutUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={() => setCartOpen(false)}
                                        >
                                            <MessageCircle className="mr-2 size-4" />
                                            Falar com o comercial
                                            <ArrowRight className="ml-2 size-4" />
                                        </a>
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        disabled
                                        className="h-[52px] w-full rounded-[2px] text-sm font-semibold shadow-none"
                                    >
                                        Atendimento temporariamente indisponível
                                    </Button>
                                )
                            ) : (
                                <Button
                                    type="button"
                                    className="h-[52px] w-full rounded-[2px] text-sm font-semibold shadow-none transition-transform duration-200 hover:-translate-y-px"
                                    onClick={() => {
                                        if (
                                            orderRuleEvaluation.is_blocked &&
                                            !cartRequiresQuote
                                        ) {
                                            setCartOpen(false);

                                            return;
                                        }

                                        setCartOpen(false);
                                        setCheckoutOpen(true);
                                    }}
                                    style={{
                                        backgroundColor:
                                            catalog_settings.primary_color,
                                    }}
                                >
                                    {orderRuleEvaluation.is_blocked &&
                                    !cartRequiresQuote
                                        ? 'Continuar escolhendo peças'
                                        : cartRequiresQuote
                                          ? 'Solicitar orçamento'
                                          : 'Finalizar pedido'}
                                    <ArrowRight className="ml-2 size-4" />
                                </Button>
                            )}

                            {whatsapp_checkout.enabled &&
                            !whatsapp_checkout.available ? (
                                <p className="text-center text-xs leading-5 text-[#716f68]">
                                    O canal comercial está offline. Sua seleção
                                    permanece salva neste navegador.
                                </p>
                            ) : !whatsapp_checkout.enabled &&
                              orderRuleEvaluation.is_blocked &&
                              !cartRequiresQuote ? (
                                <p className="text-center text-xs leading-5 text-[#716f68]">
                                    Sua seleção fica salva enquanto você
                                    continua no catálogo.
                                </p>
                            ) : null}
                        </SheetFooter>
                    )}
                </SheetContent>
            </Sheet>

            {/* Checkout Dialog */}
            <Dialog
                open={!whatsapp_checkout.enabled && checkoutOpen}
                onOpenChange={setCheckoutOpen}
            >
                <DialogContent
                    className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
                    style={{ fontFamily: bodyFont }}
                >
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: headingFont }}>
                            {cartRequiresQuote
                                ? 'Solicitar orçamento'
                                : 'Finalizar pedido'}
                        </DialogTitle>
                        <DialogDescription>
                            {cartRequiresQuote
                                ? 'Deixe seu contato. O comercial confirmará disponibilidade, condições e prazo.'
                                : 'Preencha seus dados para enviar o pedido.'}
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

                        {!cartRequiresQuote && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold">
                                    Documento
                                </h3>
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
                                                    Pessoa física
                                                </SelectItem>
                                                <SelectItem value="cnpj">
                                                    Pessoa jurídica
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
                                                    customerDocumentType ===
                                                        'cpf'
                                                        ? formatCpf(
                                                              e.target.value,
                                                          )
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
                                                {
                                                    checkoutErrors.customer_document
                                                }
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!cartRequiresQuote && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold">
                                    Endereço de entrega
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
                                                    formatZipCode(
                                                        e.target.value,
                                                    ),
                                                )
                                            }
                                            placeholder="00000-000"
                                            inputMode="numeric"
                                        />
                                        {checkoutErrors.customer_zip_code && (
                                            <p className="text-xs text-destructive">
                                                {
                                                    checkoutErrors.customer_zip_code
                                                }
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2 sm:col-span-2">
                                        <Label htmlFor="customer_state">
                                            UF *
                                        </Label>
                                        <Select
                                            value={customerState}
                                            onValueChange={setCustomerState}
                                        >
                                            <SelectTrigger id="customer_state">
                                                <SelectValue placeholder="Selecione" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {BRAZILIAN_STATES.map(
                                                    (state) => (
                                                        <SelectItem
                                                            key={state}
                                                            value={state}
                                                        >
                                                            {state}
                                                        </SelectItem>
                                                    ),
                                                )}
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
                                                setCustomerStreet(
                                                    e.target.value,
                                                )
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
                                            Número *
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
                                            Referência
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
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="customer_notes">Observações</Label>
                            <textarea
                                id="customer_notes"
                                value={customerNotes}
                                onChange={(e) =>
                                    setCustomerNotes(e.target.value)
                                }
                                placeholder={
                                    cartRequiresQuote
                                        ? 'Conte ao comercial o que precisa, se quiser.'
                                        : 'Alguma observação sobre o pedido?'
                                }
                                rows={3}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                            />
                        </div>

                        {checkoutErrors.items && (
                            <p className="text-xs text-destructive">
                                {checkoutErrors.items}
                            </p>
                        )}

                        {checkoutErrors.limit && (
                            <Alert variant="destructive">
                                <AlertCircle className="size-4" />
                                <AlertDescription>
                                    {checkoutErrors.limit}
                                </AlertDescription>
                            </Alert>
                        )}

                        {checkoutErrors.order_rules && (
                            <Alert variant="destructive">
                                <AlertCircle className="size-4" />
                                <AlertDescription>
                                    {checkoutErrors.order_rules}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="rounded-md bg-muted p-3">
                            <p className="text-xs text-muted-foreground">
                                {cart.length} produto(s) - {cartTotal} item(ns)
                                no total
                            </p>
                            {hasAnyPriced && (
                                <div className="mt-3 grid gap-1.5 text-sm">
                                    <p className="flex justify-between">
                                        <span>Subtotal</span>
                                        <span>
                                            {formatPrice(
                                                orderRuleEvaluation.subtotal_cents,
                                            )}
                                        </span>
                                    </p>
                                    {orderRuleEvaluation.discount_cents > 0 && (
                                        <p className="flex justify-between text-green-700">
                                            <span>Desconto</span>
                                            <span>
                                                −{' '}
                                                {formatPrice(
                                                    orderRuleEvaluation.discount_cents,
                                                )}
                                            </span>
                                        </p>
                                    )}
                                    <p className="flex justify-between border-t pt-1.5 font-semibold">
                                        <span>Total estimado</span>
                                        <span>
                                            {formatPrice(
                                                orderRuleEvaluation.total_cents,
                                            )}
                                        </span>
                                    </p>
                                </div>
                            )}
                            <p className="mt-2 text-xs text-muted-foreground">
                                {cartRequiresQuote
                                    ? 'Esta é uma estimativa. Nenhuma peça será reservada até o comercial confirmar o orçamento.'
                                    : 'O estoque é reservado quando o pedido é enviado.'}
                            </p>
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
                            disabled={
                                submitting ||
                                !customerName.trim() ||
                                (!customerPhone.trim() &&
                                    !customerEmail.trim()) ||
                                (!cartRequiresQuote &&
                                    orderRuleEvaluation.is_blocked)
                            }
                            style={{
                                backgroundColor: catalog_settings.primary_color,
                            }}
                        >
                            {submitting
                                ? 'Enviando...'
                                : cartRequiresQuote
                                  ? 'Solicitar orçamento'
                                  : 'Enviar pedido'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Order Success Dialog */}
            <Dialog
                open={!!orderSuccess}
                onOpenChange={() => setOrderSuccess(null)}
            >
                <DialogContent
                    className="sm:max-w-md"
                    style={{ fontFamily: bodyFont }}
                >
                    <DialogHeader>
                        <DialogTitle
                            className="flex items-center gap-2"
                            style={{ fontFamily: headingFont }}
                        >
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
