import { Head } from '@inertiajs/react';
import { Box, Package, Sparkles, Star, Heart, Zap } from 'lucide-react';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
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
    has_size_variants: boolean;
    has_color_variants: boolean;
    sizes: string[];
    colors: Array<{ name: string; hex?: string | null }>;
    variant_stocks: Array<{ size?: string | null; color?: string | null; quantity: number }>;
    total_stock: number;
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
}

interface LayoutProps {
    manufacturer: Manufacturer;
    settings: CatalogSettings;
    products: Paginated<Product>;
    tokens: typeof LAYOUT_TOKENS.minimal;
}

const fontMap: Record<string, string> = {
    'space-grotesk': '"Space Grotesk", "Helvetica Neue", Arial, sans-serif',
    fraunces: '"Fraunces", "Times New Roman", serif',
    'ibm-plex': '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
};

// Layout Minimal: Moderno, limpo, espaçoso
function MinimalLayout({ manufacturer, settings, products, tokens }: LayoutProps) {
    const heroEnabled = settings.sections?.find(s => s.type === 'hero')?.enabled ?? true;
    const productGridEnabled = settings.sections?.find(s => s.type === 'product_grid')?.enabled ?? true;

    return (
        <>
            {/* Header compacto e minimalista */}
            {heroEnabled && (
            <header className="relative">
                <div className="flex items-center justify-between pb-8">
                    <div className="flex items-center gap-4">
                        {settings.logo_url && (
                            <div className="h-16 w-16 overflow-hidden" style={{ borderRadius: tokens.radius }}>
                                <img
                                    src={settings.logo_url}
                                    alt={settings.brand_name ?? manufacturer.name}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        )}
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">
                                {settings.brand_name ?? manufacturer.name}
                            </h1>
                            {settings.tagline && (
                                <p className="mt-1 text-sm opacity-70">{settings.tagline}</p>
                            )}
                        </div>
                    </div>
                    <Badge className="bg-[var(--brand-primary)] text-white">
                        {products.data.length} produtos
                    </Badge>
                </div>
                {settings.description && (
                    <p className="max-w-3xl text-base opacity-80">{settings.description}</p>
                )}
            </header>
            )}

            {/* Grid de produtos minimalista */}
            {productGridEnabled && (products.data.length === 0 ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 opacity-60">
                    <Package className="h-16 w-16" />
                    <p className="text-lg">Nenhum produto disponível</p>
                </div>
            ) : (
                <div
                    className="grid md:grid-cols-2 lg:grid-cols-3"
                    style={{
                        gap: settings.layout_density === 'compact' ? '1.5rem' : '2.5rem',
                    }}
                >
                    {products.data.map((product) => (
                        <article
                            key={product.id}
                            className="group overflow-hidden bg-white/50 backdrop-blur-sm transition-all hover:bg-white/70"
                            style={{
                                borderRadius: tokens.radius,
                                border: settings.card_style === 'flat' ? '2px solid rgba(0,0,0,0.08)' : '1px solid rgba(0,0,0,0.05)',
                                boxShadow: settings.card_style === 'soft' ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                            }}
                        >
                            <div className="aspect-square overflow-hidden bg-gray-100">
                                {product.primary_image ? (
                                    <img
                                        src={`/storage/${product.primary_image}`}
                                        alt={product.name}
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center">
                                        <Box className="h-12 w-12 opacity-20" />
                                    </div>
                                )}
                            </div>
                            <div style={{ padding: tokens.cardPadding }} className="space-y-2">
                                <h3 className="font-semibold">{product.name}</h3>
                                <p className="text-xs opacity-60">SKU {product.sku}</p>
                                {product.category && (
                                    <Badge variant="outline" className="text-xs">
                                        {product.category}
                                    </Badge>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            ))}

            {productGridEnabled && <Pagination links={products.meta?.links ?? products.links} />}
        </>
    );
}

// Layout Playful: Divertido, colorido, dinâmico
function PlayfulLayout({ manufacturer, settings, products, tokens }: LayoutProps) {
    const heroEnabled = settings.sections?.find(s => s.type === 'hero')?.enabled ?? true;
    const productGridEnabled = settings.sections?.find(s => s.type === 'product_grid')?.enabled ?? true;

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
                <div className="absolute -right-8 -top-8 opacity-10">
                    <Star className="h-32 w-32" style={{ color: settings.accent_color }} />
                </div>
                <div className="absolute -bottom-8 -left-8 opacity-10">
                    <Heart className="h-32 w-32" style={{ color: settings.primary_color }} />
                </div>

                <div className="relative space-y-4">
                    {settings.logo_url && (
                        <div className="mx-auto h-24 w-24 overflow-hidden shadow-xl" style={{ borderRadius: '50%' }}>
                            <img
                                src={settings.logo_url}
                                alt={settings.brand_name ?? manufacturer.name}
                                className="h-full w-full object-cover"
                            />
                        </div>
                    )}
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full px-6 py-2" style={{ backgroundColor: settings.accent_color }}>
                            <Sparkles className="h-4 w-4 text-white" />
                            <span className="text-sm font-bold uppercase tracking-wider text-white">
                                Catálogo Oficial
                            </span>
                        </div>
                        <h1 className="text-5xl font-black tracking-tight" style={{ color: settings.primary_color }}>
                            {settings.brand_name ?? manufacturer.name}
                        </h1>
                        {settings.tagline && (
                            <p className="mt-3 text-xl font-semibold opacity-80">{settings.tagline}</p>
                        )}
                        {settings.description && (
                            <p className="mx-auto mt-4 max-w-2xl opacity-70">{settings.description}</p>
                        )}
                    </div>
                    <div className="flex items-center justify-center gap-3">
                        <Badge
                            className="text-white shadow-lg"
                            style={{ backgroundColor: settings.primary_color }}
                        >
                            ⭐ {products.data.length} produtos incríveis
                        </Badge>
                    </div>
                </div>
            </header>
            )}

            {/* Grid de produtos colorido */}
            {productGridEnabled && (products.data.length === 0 ? (
                <div
                    className="flex min-h-[400px] flex-col items-center justify-center gap-4 border-4 border-dashed p-12"
                    style={{ borderRadius: `calc(${tokens.radius} * 3)`, borderColor: settings.accent_color + '40' }}
                >
                    <Package className="h-20 w-20 opacity-30" style={{ color: settings.primary_color }} />
                    <p className="text-xl font-bold" style={{ color: settings.primary_color }}>
                        Em breve produtos novos!
                    </p>
                </div>
            ) : (
                <div
                    className="grid md:grid-cols-2 lg:grid-cols-3 mt-8"
                    style={{
                        gap: settings.layout_density === 'compact' ? '1.25rem' : '2rem',
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
                                        src={`/storage/${product.primary_image}`}
                                        alt={product.name}
                                        className="h-full w-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:rotate-2"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center bg-gradient-to-br" style={{
                                        background: `linear-gradient(135deg, ${settings.primary_color}10, ${settings.accent_color}10)`,
                                    }}>
                                        <Box className="h-16 w-16 opacity-20" />
                                    </div>
                                )}
                                <div className="absolute right-3 top-3">
                                    <div
                                        className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg"
                                        style={{ backgroundColor: settings.accent_color }}
                                    >
                                        <Zap className="h-5 w-5" />
                                    </div>
                                </div>
                            </div>
                            <div style={{ padding: `calc(${tokens.cardPadding} * 1.2)` }} className="space-y-3">
                                <h3 className="text-lg font-bold" style={{ color: settings.primary_color }}>
                                    {product.name}
                                </h3>
                                <p className="text-xs font-semibold uppercase tracking-wide opacity-50">
                                    SKU {product.sku}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {product.category && (
                                        <Badge
                                            className="text-white"
                                            style={{ backgroundColor: settings.secondary_color }}
                                        >
                                            {product.category}
                                        </Badge>
                                    )}
                                    {product.has_size_variants && product.sizes.length > 0 && (
                                        <Badge variant="outline">
                                            {product.sizes.length} tamanhos
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            ))}

            {productGridEnabled && <Pagination links={products.meta?.links ?? products.links} />}
        </>
    );
}

// Layout Boutique: Elegante, sofisticado, tipo magazine
function BoutiqueLayout({ manufacturer, settings, products, tokens }: LayoutProps) {
    const heroEnabled = settings.sections?.find(s => s.type === 'hero')?.enabled ?? true;
    const productGridEnabled = settings.sections?.find(s => s.type === 'product_grid')?.enabled ?? true;
    return (
        <>
            {/* Hero elegante tipo magazine */}
            {heroEnabled && (
            <header className="relative mb-16 overflow-hidden bg-white/40 backdrop-blur-md" style={{ borderRadius: tokens.radius }}>
                <div className="grid items-center gap-12 p-16 lg:grid-cols-2">
                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 border-b-2 pb-2 text-xs font-semibold uppercase tracking-[0.2em]" style={{ borderColor: settings.primary_color }}>
                            <Sparkles className="h-3 w-3" />
                            <span>Coleção Exclusiva</span>
                        </div>
                        <h1
                            className="font-serif text-6xl font-light leading-tight tracking-tight"
                            style={{ color: settings.secondary_color }}
                        >
                            {settings.brand_name ?? manufacturer.name}
                        </h1>
                        {settings.tagline && (
                            <p className="text-2xl font-light italic opacity-80">{settings.tagline}</p>
                        )}
                        {settings.description && (
                            <p className="max-w-lg text-base leading-relaxed opacity-70">
                                {settings.description}
                            </p>
                        )}
                        <div className="flex items-center gap-4 pt-4">
                            <div
                                className="h-px flex-1"
                                style={{ backgroundColor: settings.primary_color, opacity: 0.3 }}
                            />
                            <Badge
                                variant="outline"
                                className="border-2 px-6 py-2 text-sm font-semibold"
                                style={{ borderColor: settings.primary_color }}
                            >
                                {products.data.length} Peças Selecionadas
                            </Badge>
                        </div>
                    </div>
                    {settings.logo_url && (
                        <div className="flex justify-center">
                            <div className="h-64 w-64 overflow-hidden shadow-2xl" style={{ borderRadius: tokens.radius }}>
                                <img
                                    src={settings.logo_url}
                                    alt={settings.brand_name ?? manufacturer.name}
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </header>
            )}

            {/* Grid de produtos elegante */}
            {productGridEnabled && (products.data.length === 0 ? (
                <div className="flex min-h-[500px] flex-col items-center justify-center gap-6 border bg-white/20 p-20" style={{ borderRadius: tokens.radius }}>
                    <Package className="h-20 w-20 opacity-20" />
                    <p className="font-serif text-2xl font-light opacity-60">
                        Novidades em preparação
                    </p>
                </div>
            ) : (
                <div
                    className="grid gap-12 md:grid-cols-2 lg:grid-cols-3"
                    style={{
                        gap: settings.layout_density === 'compact' ? '2rem' : '3rem',
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
                                        src={`/storage/${product.primary_image}`}
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
                                        <span className="font-serif text-sm uppercase tracking-widest text-white">
                                            Esgotado
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <div>
                                    {product.category && (
                                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider opacity-50">
                                            {product.category}
                                        </p>
                                    )}
                                    <h3 className="font-serif text-xl font-light tracking-wide">
                                        {product.name}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs opacity-40">SKU {product.sku}</span>
                                    {product.has_size_variants && product.sizes.length > 0 && (
                                        <>
                                            <span className="opacity-20">•</span>
                                            <span className="text-xs opacity-60">
                                                {product.sizes.join(', ')}
                                            </span>
                                        </>
                                    )}
                                </div>
                                {product.has_color_variants && product.colors.length > 0 && (
                                    <div className="flex gap-2">
                                        {product.colors.slice(0, 5).map((color, i) => (
                                            <div
                                                key={i}
                                                className="h-6 w-6 rounded-full border-2 border-white shadow-sm"
                                                style={{
                                                    backgroundColor: color.hex ?? '#ccc',
                                                }}
                                                title={color.name}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            ))}

            {productGridEnabled && <Pagination links={products.meta?.links ?? products.links} />}
        </>
    );
}

export default function PublicCatalog({ manufacturer, catalog_settings, products }: Props) {
    const brandFont = fontMap[catalog_settings.font_family] ?? fontMap['space-grotesk'];
    const preset = catalog_settings.layout_preset ?? 'minimal';
    const tokens = LAYOUT_TOKENS[preset as keyof typeof LAYOUT_TOKENS] ?? LAYOUT_TOKENS.minimal;

    const backgroundStyle: React.CSSProperties = {};
    
    if (catalog_settings.background_mode === 'gradient' && catalog_settings.gradient_id) {
        backgroundStyle.background = GRADIENTS[catalog_settings.gradient_id as keyof typeof GRADIENTS];
    } else if (catalog_settings.background_mode === 'pattern' && catalog_settings.pattern_id) {
        const patternColor = catalog_settings.pattern_color ?? catalog_settings.primary_color;
        const patternOpacity = catalog_settings.pattern_opacity ?? 10;
        const patternFn = PATTERNS[catalog_settings.pattern_id as keyof typeof PATTERNS];
        backgroundStyle.background = patternFn ? patternFn(patternColor, patternOpacity) : catalog_settings.background_color;
    } else {
        backgroundStyle.backgroundColor = catalog_settings.background_color;
    }

    return (
        <div
            className="relative min-h-screen text-[var(--brand-secondary)]"
            style={{
                fontFamily: brandFont,
                ['--brand-primary' as string]: catalog_settings.primary_color,
                ['--brand-secondary' as string]: catalog_settings.secondary_color,
                ['--brand-accent' as string]: catalog_settings.accent_color,
                ['--brand-bg' as string]: catalog_settings.background_color,
                ['--radius' as string]: tokens.radius,
                ['--gap' as string]: tokens.gap,
                ['--card-padding' as string]: tokens.cardPadding,
                ['--shadow' as string]: tokens.shadow,
                ...backgroundStyle,
            }}
        >
            {catalog_settings.background_mode === 'image' && catalog_settings.background_image_url && (
                <>
                    <div
                        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                        style={{
                            backgroundImage: `url(${catalog_settings.background_image_url})`,
                            opacity: (catalog_settings.background_image_opacity ?? 100) / 100,
                            filter: `blur(${(catalog_settings.background_blur ?? 0) * 0.5}px)`,
                        }}
                    />
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundColor: catalog_settings.background_overlay_color,
                            opacity: (catalog_settings.background_overlay_opacity ?? 0) / 100,
                        }}
                    />
                </>
            )}

            <Head title={`Catalogo - ${catalog_settings.brand_name ?? manufacturer.name}`}>
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
                    />
                )}
                {preset === 'boutique' && (
                    <BoutiqueLayout
                        manufacturer={manufacturer}
                        settings={catalog_settings}
                        products={products}
                        tokens={tokens}
                    />
                )}
                {preset === 'minimal' && (
                    <MinimalLayout
                        manufacturer={manufacturer}
                        settings={catalog_settings}
                        products={products}
                        tokens={tokens}
                    />
                )}
            </div>
        </div>
    );
}
