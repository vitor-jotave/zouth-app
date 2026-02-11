import { Box, Heart, Package, Sparkles, Star, Zap } from 'lucide-react';
import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { LAYOUT_TOKENS, PATTERNS, GRADIENTS } from '@/lib/catalog-theming';

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
    layout_preset?: string;
    layout_density?: string;
    card_style?: string;
    background_mode?: string;
    background_image_url?: string | null;
    background_image_opacity?: number;
    background_overlay_color?: string;
    background_overlay_opacity?: number;
    background_blur?: number;
    pattern_id?: string | null;
    pattern_color?: string | null;
    pattern_opacity?: number;
    gradient_id?: string | null;
}

interface Product {
    id: number;
    name: string;
    sku: string;
    category?: string | null;
    primary_image?: string | null;
    total_stock: number;
}

interface CatalogPreviewProps {
    settings: CatalogSettings;
    products?: Product[];
    manufacturerName?: string;
}

interface LayoutContentProps {
    settings: CatalogSettings;
    products: Product[];
    manufacturerName: string;
    tokens: (typeof LAYOUT_TOKENS)['minimal'];
}

const fontMap: Record<string, string> = {
    'space-grotesk': '"Space Grotesk", "Helvetica Neue", Arial, sans-serif',
    fraunces: '"Fraunces", "Times New Roman", serif',
    'ibm-plex': '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
};

function ProductImage({ product }: { product: Product }) {
    if (product.primary_image) {
        return (
            <img
                src={`/storage/${product.primary_image}`}
                alt={product.name}
                className="h-full w-full object-cover"
            />
        );
    }
    return (
        <div className="flex h-full items-center justify-center bg-gray-100">
            <Box className="h-5 w-5 opacity-20" />
        </div>
    );
}

function EmptyState({ icon: Icon, message }: { icon: typeof Package; message: string }) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center opacity-50">
            <Icon className="h-8 w-8" />
            <p className="text-[11px]">{message}</p>
        </div>
    );
}

// --- Minimal Layout Preview ---
function MinimalContent({ settings, products, manufacturerName, tokens }: LayoutContentProps) {
    const density = settings.layout_density ?? 'comfortable';
    const cardStyle = settings.card_style ?? 'soft';

    return (
        <div className="flex flex-col px-4 py-5" style={{ gap: density === 'compact' ? '0.75rem' : '1.25rem' }}>
            {/* Header: logo + title side by side, compact */}
            <header className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    {settings.logo_url && (
                        <div className="h-10 w-10 shrink-0 overflow-hidden" style={{ borderRadius: tokens.radius }}>
                            <img src={settings.logo_url} alt="" className="h-full w-full object-cover" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-sm font-bold tracking-tight">
                            {settings.brand_name || manufacturerName}
                        </h1>
                        {settings.tagline && (
                            <p className="text-[10px] opacity-60">{settings.tagline}</p>
                        )}
                    </div>
                </div>
                <Badge className="text-[8px] text-white" style={{ backgroundColor: settings.primary_color }}>
                    {products.length} produtos
                </Badge>
            </header>

            {settings.description && (
                <p className="text-[10px] leading-snug opacity-70">{settings.description}</p>
            )}

            {/* Products grid — square cards */}
            {products.length === 0 ? (
                <EmptyState icon={Package} message="Nenhum produto disponível" />
            ) : (
                <div
                    className="grid grid-cols-2"
                    style={{ gap: density === 'compact' ? '0.5rem' : '0.75rem' }}
                >
                    {products.slice(0, 4).map((product) => (
                        <article
                            key={product.id}
                            className="overflow-hidden bg-white/50 backdrop-blur-sm"
                            style={{
                                borderRadius: tokens.radius,
                                border: cardStyle === 'flat' ? '2px solid rgba(0,0,0,0.08)' : '1px solid rgba(0,0,0,0.05)',
                                boxShadow: cardStyle === 'soft' ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                            }}
                        >
                            <div className="aspect-square overflow-hidden">
                                <ProductImage product={product} />
                            </div>
                            <div className="space-y-0.5 p-2">
                                <h3 className="truncate text-[11px] font-semibold">{product.name}</h3>
                                <p className="text-[9px] opacity-50">SKU {product.sku}</p>
                                {product.category && (
                                    <Badge variant="outline" className="mt-0.5 px-1 py-0 text-[8px]">
                                        {product.category}
                                    </Badge>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}

// --- Playful Layout Preview ---
function PlayfulContent({ settings, products, manufacturerName, tokens }: LayoutContentProps) {
    const density = settings.layout_density ?? 'comfortable';

    return (
        <div className="flex flex-col px-4 py-5" style={{ gap: density === 'compact' ? '0.75rem' : '1.25rem' }}>
            {/* Header: centered, colorful, decorative icons */}
            <header
                className="relative overflow-hidden border-[3px] bg-white/80 p-5 text-center backdrop-blur"
                style={{
                    borderRadius: `calc(${tokens.radius} * 3)`,
                    borderColor: settings.primary_color,
                    background: `linear-gradient(135deg, ${settings.accent_color}15 0%, ${settings.primary_color}10 100%)`,
                }}
            >
                <div className="absolute -right-3 -top-3 opacity-10">
                    <Star className="h-14 w-14" style={{ color: settings.accent_color }} />
                </div>
                <div className="absolute -bottom-3 -left-3 opacity-10">
                    <Heart className="h-14 w-14" style={{ color: settings.primary_color }} />
                </div>

                <div className="relative space-y-2">
                    {settings.logo_url && (
                        <div className="mx-auto h-14 w-14 overflow-hidden rounded-full shadow-lg">
                            <img src={settings.logo_url} alt="" className="h-full w-full object-cover" />
                        </div>
                    )}
                    <div className="mx-auto inline-flex items-center gap-1 rounded-full px-3 py-1" style={{ backgroundColor: settings.accent_color }}>
                        <Sparkles className="h-2.5 w-2.5 text-white" />
                        <span className="text-[8px] font-bold uppercase tracking-wider text-white">Catálogo Oficial</span>
                    </div>
                    <h1 className="text-base font-black tracking-tight" style={{ color: settings.primary_color }}>
                        {settings.brand_name || manufacturerName}
                    </h1>
                    {settings.tagline && (
                        <p className="text-[11px] font-semibold opacity-70">{settings.tagline}</p>
                    )}
                    <Badge className="text-[8px] text-white shadow" style={{ backgroundColor: settings.primary_color }}>
                        ⭐ {products.length} produtos incríveis
                    </Badge>
                </div>
            </header>

            {/* Products — colorful bordered cards with Zap icons */}
            {products.length === 0 ? (
                <div
                    className="flex flex-col items-center justify-center gap-2 border-[3px] border-dashed py-10"
                    style={{ borderRadius: `calc(${tokens.radius} * 2)`, borderColor: settings.accent_color + '40' }}
                >
                    <Package className="h-10 w-10 opacity-30" style={{ color: settings.primary_color }} />
                    <p className="text-xs font-bold" style={{ color: settings.primary_color }}>Em breve!</p>
                </div>
            ) : (
                <div
                    className="grid grid-cols-2"
                    style={{ gap: density === 'compact' ? '0.5rem' : '0.75rem' }}
                >
                    {products.slice(0, 4).map((product, index) => (
                        <article
                            key={product.id}
                            className="overflow-hidden bg-white shadow-md"
                            style={{
                                borderRadius: `calc(${tokens.radius} * 2)`,
                                border: `2px solid ${index % 3 === 0 ? settings.primary_color : index % 3 === 1 ? settings.accent_color : settings.secondary_color}25`,
                            }}
                        >
                            <div className="relative aspect-square overflow-hidden">
                                <ProductImage product={product} />
                                <div className="absolute right-1.5 top-1.5">
                                    <div
                                        className="flex h-6 w-6 items-center justify-center rounded-full text-white shadow"
                                        style={{ backgroundColor: settings.accent_color }}
                                    >
                                        <Zap className="h-3 w-3" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-0.5 p-2">
                                <h3 className="truncate text-[11px] font-bold" style={{ color: settings.primary_color }}>
                                    {product.name}
                                </h3>
                                <p className="text-[8px] font-semibold uppercase tracking-wide opacity-40">
                                    SKU {product.sku}
                                </p>
                                {product.category && (
                                    <Badge className="mt-0.5 px-1 py-0 text-[8px] text-white" style={{ backgroundColor: settings.secondary_color }}>
                                        {product.category}
                                    </Badge>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}

// --- Boutique Layout Preview ---
function BoutiqueContent({ settings, products, manufacturerName, tokens }: LayoutContentProps) {
    const density = settings.layout_density ?? 'comfortable';

    return (
        <div className="flex flex-col px-4 py-5" style={{ gap: density === 'compact' ? '0.75rem' : '1.5rem' }}>
            {/* Header: magazine-style, serif, elegant */}
            <header className="overflow-hidden bg-white/40 backdrop-blur-md" style={{ borderRadius: tokens.radius }}>
                <div className="space-y-3 p-5">
                    <div
                        className="inline-flex items-center gap-1.5 border-b-2 pb-1 text-[8px] font-semibold uppercase tracking-[0.15em]"
                        style={{ borderColor: settings.primary_color }}
                    >
                        <Sparkles className="h-2.5 w-2.5" />
                        <span>Coleção Exclusiva</span>
                    </div>
                    <h1
                        className="font-serif text-2xl font-light leading-tight tracking-tight"
                        style={{ color: settings.secondary_color }}
                    >
                        {settings.brand_name || manufacturerName}
                    </h1>
                    {settings.tagline && (
                        <p className="font-serif text-xs font-light italic opacity-70">{settings.tagline}</p>
                    )}
                    {settings.description && (
                        <p className="text-[10px] leading-snug opacity-60">{settings.description}</p>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                        <div className="h-px flex-1" style={{ backgroundColor: settings.primary_color, opacity: 0.3 }} />
                        <Badge
                            variant="outline"
                            className="border-2 px-2 py-0.5 text-[8px] font-semibold"
                            style={{ borderColor: settings.primary_color }}
                        >
                            {products.length} Peças
                        </Badge>
                    </div>
                </div>
                {settings.logo_url && (
                    <div className="px-5 pb-4">
                        <div className="h-28 w-full overflow-hidden shadow-lg" style={{ borderRadius: tokens.radius }}>
                            <img src={settings.logo_url} alt="" className="h-full w-full object-cover" />
                        </div>
                    </div>
                )}
            </header>

            {/* Products — portrait cards, serif type */}
            {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 border bg-white/20 py-10" style={{ borderRadius: tokens.radius }}>
                    <Package className="h-10 w-10 opacity-20" />
                    <p className="font-serif text-sm font-light opacity-50">Novidades em preparação</p>
                </div>
            ) : (
                <div
                    className="grid grid-cols-2"
                    style={{ gap: density === 'compact' ? '0.75rem' : '1rem' }}
                >
                    {products.slice(0, 4).map((product) => (
                        <article key={product.id} className="space-y-2">
                            <div
                                className="relative aspect-[3/4] overflow-hidden bg-gray-50 shadow-md"
                                style={{ borderRadius: tokens.radius }}
                            >
                                <ProductImage product={product} />
                                {product.total_stock === 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                                        <span className="font-serif text-[9px] uppercase tracking-widest text-white">
                                            Esgotado
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-0.5">
                                {product.category && (
                                    <p className="text-[8px] font-semibold uppercase tracking-wider opacity-40">
                                        {product.category}
                                    </p>
                                )}
                                <h3 className="truncate font-serif text-[11px] font-light tracking-wide">
                                    {product.name}
                                </h3>
                                <p className="text-[8px] opacity-30">SKU {product.sku}</p>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}

// --- Main Preview Component ---
const CatalogPreview = memo(function CatalogPreview({
    settings,
    products = [],
    manufacturerName = 'Minha Marca',
}: CatalogPreviewProps) {
    const brandFont = fontMap[settings.font_family] ?? fontMap['space-grotesk'];
    const preset = settings.layout_preset ?? 'minimal';
    const tokens = LAYOUT_TOKENS[preset] ?? LAYOUT_TOKENS.minimal;

    // Background logic
    let backgroundStyle: React.CSSProperties = {};
    if (settings.background_mode === 'gradient' && settings.gradient_id) {
        backgroundStyle.background = GRADIENTS[settings.gradient_id as keyof typeof GRADIENTS] ?? settings.background_color;
    } else if (settings.background_mode === 'pattern' && settings.pattern_id) {
        const patternColor = settings.pattern_color ?? settings.primary_color;
        const patternOpacity = settings.pattern_opacity ?? 12;
        backgroundStyle.backgroundColor = settings.background_color;
        const patternFn = PATTERNS[settings.pattern_id as keyof typeof PATTERNS];
        backgroundStyle.backgroundImage = patternFn?.(patternColor, patternOpacity);
    } else {
        backgroundStyle.backgroundColor = settings.background_color;
    }

    const layoutProps: LayoutContentProps = { settings, products, manufacturerName, tokens };

    return (
        <div
            className="relative min-h-full text-[var(--brand-secondary)]"
            style={{
                ...backgroundStyle,
                fontFamily: preset === 'boutique' ? '"Fraunces", "Times New Roman", serif' : brandFont,
                ['--brand-primary' as string]: settings.primary_color,
                ['--brand-secondary' as string]: settings.secondary_color,
                ['--brand-accent' as string]: settings.accent_color,
                ['--brand-bg' as string]: settings.background_color,
                ['--radius' as string]: tokens.radius,
                ['--gap' as string]: tokens.gap,
                ['--card-padding' as string]: tokens.cardPadding,
                ['--shadow' as string]: tokens.shadow,
            }}
        >
            {/* Background image layer */}
            {settings.background_mode === 'image' && settings.background_image_url && (
                <>
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundImage: `url(${settings.background_image_url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            opacity: (settings.background_image_opacity ?? 20) / 100,
                            filter: `blur(${settings.background_blur ?? 0}px)`,
                        }}
                    />
                    <div
                        className="absolute inset-0"
                        style={{
                            backgroundColor: settings.background_overlay_color ?? '#000000',
                            opacity: (settings.background_overlay_opacity ?? 10) / 100,
                        }}
                    />
                </>
            )}

            <div className="relative">
                {preset === 'playful' && <PlayfulContent {...layoutProps} />}
                {preset === 'boutique' && <BoutiqueContent {...layoutProps} />}
                {preset === 'minimal' && <MinimalContent {...layoutProps} />}
            </div>
        </div>
    );
});
export default CatalogPreview;