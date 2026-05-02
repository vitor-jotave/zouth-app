import { Head, router } from '@inertiajs/react';
import {
    Box,
    Check,
    ClipboardCopy,
    Minus,
    Package,
    Plus,
    ShoppingCart,
    Sparkles,
    Star,
    Heart,
    Trash2,
    X,
    Zap,
} from 'lucide-react';
import { useCallback, useState } from 'react';
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
}

interface CartItem {
    product: Product;
    quantity: number;
    size?: string | null;
    color?: string | null;
}

type DocumentType = 'cpf' | 'cnpj';

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
                        {products.data.map((product) => (
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
                                <div className="aspect-square overflow-hidden bg-gray-100">
                                    {product.primary_image ? (
                                        <img
                                            src={product.primary_image}
                                            alt={product.name}
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center">
                                            <Box className="h-12 w-12 opacity-20" />
                                        </div>
                                    )}
                                </div>
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
                                            onClick={() => onAddToCart(product)}
                                            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-80"
                                            style={{
                                                backgroundColor:
                                                    'var(--brand-primary)',
                                            }}
                                        >
                                            <Plus className="h-3 w-3" />{' '}
                                            Adicionar
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
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
                        {products.data.map((product, index) => (
                            <article
                                key={product.id}
                                className="group overflow-hidden bg-white shadow-lg transition-all duration-300 hover:-translate-y-2"
                                style={{
                                    borderRadius: `calc(${tokens.radius} * 2)`,
                                    border: `3px solid ${index % 3 === 0 ? settings.primary_color : index % 3 === 1 ? settings.accent_color : settings.secondary_color}20`,
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                }}
                            >
                                <div className="relative aspect-square overflow-hidden">
                                    {product.primary_image ? (
                                        <img
                                            src={product.primary_image}
                                            alt={product.name}
                                            className="h-full w-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:rotate-2"
                                        />
                                    ) : (
                                        <div
                                            className="flex h-full items-center justify-center bg-gradient-to-br"
                                            style={{
                                                background: `linear-gradient(135deg, ${settings.primary_color}10, ${settings.accent_color}10)`,
                                            }}
                                        >
                                            <Box className="h-16 w-16 opacity-20" />
                                        </div>
                                    )}
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
                                </div>
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
                                        {product.variations.length > 0 && (
                                            <Badge variant="outline">
                                                {product.variations.reduce(
                                                    (sum, v) =>
                                                        sum + v.values.length,
                                                    0,
                                                )}{' '}
                                                variações
                                            </Badge>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onAddToCart(product)}
                                        className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-full px-4 py-2 text-sm font-bold text-white shadow-md transition-transform hover:scale-105"
                                        style={{
                                            backgroundColor:
                                                settings.accent_color,
                                        }}
                                    >
                                        <Plus className="h-4 w-4" /> Adicionar
                                    </button>
                                </div>
                            </article>
                        ))}
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
                        {products.data.map((product) => (
                            <article
                                key={product.id}
                                className="group space-y-4"
                            >
                                <div
                                    className="relative aspect-[3/4] overflow-hidden bg-gray-50 shadow-md transition-all duration-700 group-hover:shadow-2xl"
                                    style={{
                                        borderRadius: tokens.radius,
                                    }}
                                >
                                    {product.primary_image ? (
                                        <img
                                            src={product.primary_image}
                                            alt={product.name}
                                            className="h-full w-full object-cover transition-all duration-700 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center">
                                            <Box className="h-16 w-16 opacity-10" />
                                        </div>
                                    )}
                                    {product.total_stock === 0 && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                            <span className="font-serif text-sm tracking-widest text-white uppercase">
                                                Esgotado
                                            </span>
                                        </div>
                                    )}
                                </div>
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
                                            {formatPrice(product.price_cents)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs opacity-40">
                                            SKU {product.sku}
                                        </span>
                                        {product.variations
                                            .filter((v) => !v.is_color_type)
                                            .map((v) => (
                                                <span key={v.type_name}>
                                                    <span className="opacity-20">
                                                        •
                                                    </span>{' '}
                                                    <span className="text-xs opacity-60">
                                                        {v.values
                                                            .map(
                                                                (val) =>
                                                                    val.value,
                                                            )
                                                            .join(', ')}
                                                    </span>
                                                </span>
                                            ))}
                                    </div>
                                    {product.variations
                                        .filter((v) => v.is_color_type)
                                        .map((v) => (
                                            <div
                                                key={v.type_name}
                                                className="flex gap-2"
                                            >
                                                {v.values
                                                    .slice(0, 5)
                                                    .map((val, i) => (
                                                        <div
                                                            key={i}
                                                            className="h-6 w-6 rounded-full border-2 border-white shadow-sm"
                                                            style={{
                                                                backgroundColor:
                                                                    val.hex ??
                                                                    '#ccc',
                                                            }}
                                                            title={val.value}
                                                        />
                                                    ))}
                                            </div>
                                        ))}
                                    <button
                                        type="button"
                                        onClick={() => onAddToCart(product)}
                                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold tracking-wider uppercase opacity-60 transition-opacity hover:opacity-100"
                                        style={{
                                            color: 'var(--brand-primary)',
                                        }}
                                    >
                                        <Plus className="h-3 w-3" /> Adicionar
                                        ao pedido
                                    </button>
                                </div>
                            </article>
                        ))}
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

    const addToCart = useCallback((product: Product) => {
        setCart((prev) => {
            const existing = prev.find(
                (item) => item.product.id === product.id,
            );
            if (existing) {
                return prev.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item,
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    }, []);

    const updateQuantity = (productId: number, quantity: number) => {
        if (quantity <= 0) {
            setCart((prev) =>
                prev.filter((item) => item.product.id !== productId),
            );
            return;
        }
        setCart((prev) =>
            prev.map((item) =>
                item.product.id === productId ? { ...item, quantity } : item,
            ),
        );
    };

    const removeFromCart = (productId: number) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
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

    const backgroundStyle: React.CSSProperties = {};

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
                    />
                )}
                {preset === 'boutique' && (
                    <BoutiqueLayout
                        manufacturer={manufacturer}
                        settings={catalog_settings}
                        products={products}
                        tokens={tokens}
                        onAddToCart={addToCart}
                    />
                )}
                {preset === 'minimal' && (
                    <MinimalLayout
                        manufacturer={manufacturer}
                        settings={catalog_settings}
                        products={products}
                        tokens={tokens}
                        onAddToCart={addToCart}
                    />
                )}
            </div>

            {/* Floating cart button */}
            {cartTotal > 0 && (
                <button
                    type="button"
                    onClick={() => setCartOpen(true)}
                    className="fixed right-6 bottom-6 z-40 flex items-center gap-2 rounded-full px-5 py-3 text-white shadow-xl transition-transform hover:scale-105"
                    style={{ backgroundColor: catalog_settings.primary_color }}
                >
                    <ShoppingCart className="h-5 w-5" />
                    <span className="font-bold">{cartTotal}</span>
                </button>
            )}

            {/* Cart Sheet */}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                <SheetContent side="right" className="flex flex-col">
                    <SheetHeader>
                        <SheetTitle>Seu pedido ({cartTotal} itens)</SheetTitle>
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
                                        key={item.product.id}
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
                                            <p className="text-xs font-medium">
                                                {formatPrice(
                                                    item.product.price_cents,
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() =>
                                                    updateQuantity(
                                                        item.product.id,
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
                                                        item.product.id,
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
                                                removeFromCart(item.product.id)
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
