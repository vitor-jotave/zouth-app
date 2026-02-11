import { Head } from '@inertiajs/react';
import { Box, Package, Sparkles } from 'lucide-react';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';

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

const fontMap: Record<string, string> = {
    'space-grotesk': '"Space Grotesk", "Helvetica Neue", Arial, sans-serif',
    fraunces: '"Fraunces", "Times New Roman", serif',
    'ibm-plex': '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
};

export default function PublicCatalog({ manufacturer, catalog_settings, products }: Props) {
    const brandFont = fontMap[catalog_settings.font_family] ?? fontMap['space-grotesk'];

    return (
        <div
            className="min-h-screen bg-[var(--brand-bg)] text-[var(--brand-secondary)]"
            style={{
                fontFamily: brandFont,
                ['--brand-primary' as string]: catalog_settings.primary_color,
                ['--brand-secondary' as string]: catalog_settings.secondary_color,
                ['--brand-accent' as string]: catalog_settings.accent_color,
                ['--brand-bg' as string]: catalog_settings.background_color,
            }}
        >
            <Head title={`Catalogo - ${catalog_settings.brand_name ?? manufacturer.name}`}>
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link
                    href="https://fonts.bunny.net/css?family=space-grotesk:400,500,600,700|fraunces:400,600,700|ibm-plex-sans:400,500,600,700"
                    rel="stylesheet"
                />
            </Head>

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-12">
                <header className="relative overflow-hidden rounded-3xl border border-white/20 bg-white/60 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
                    <div
                        className="absolute inset-0"
                        style={{
                            background: `radial-gradient(60% 80% at 10% 10%, ${catalog_settings.accent_color}33 0%, transparent 70%), radial-gradient(80% 100% at 90% 0%, ${catalog_settings.primary_color}24 0%, transparent 70%)`,
                        }}
                    />
                    <div className="relative flex flex-wrap items-center justify-between gap-6">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--brand-secondary)]">
                                <Sparkles className="h-3.5 w-3.5" />
                                Catalogo publico
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                                    {catalog_settings.brand_name ?? manufacturer.name}
                                </h1>
                                {catalog_settings.tagline && (
                                    <p className="text-lg text-[var(--brand-secondary)]/80">
                                        {catalog_settings.tagline}
                                    </p>
                                )}
                                {catalog_settings.description && (
                                    <p className="max-w-2xl text-sm text-[var(--brand-secondary)]/70">
                                        {catalog_settings.description}
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                                <Badge
                                    style={{
                                        background: catalog_settings.primary_color,
                                        color: '#fff',
                                    }}
                                >
                                    {products.data.length} produtos ativos
                                </Badge>
                                <Badge
                                    variant="outline"
                                    className="border-[var(--brand-secondary)]/20 text-[var(--brand-secondary)]"
                                >
                                    {manufacturer.slug}
                                </Badge>
                            </div>
                        </div>

                        <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-white/70 bg-white/80 shadow-sm">
                            {catalog_settings.logo_url ? (
                                <img
                                    src={catalog_settings.logo_url}
                                    alt={catalog_settings.brand_name ?? manufacturer.name}
                                    className="h-full w-full rounded-2xl object-cover"
                                />
                            ) : (
                                <Box className="h-10 w-10 text-[var(--brand-secondary)]/50" />
                            )}
                        </div>
                    </div>
                </header>

                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight">
                                Destaques do catalogo
                            </h2>
                            <p className="text-sm text-[var(--brand-secondary)]/70">
                                Escolha a linha perfeita para cada cliente.
                            </p>
                        </div>
                    </div>

                    {products.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-[var(--brand-secondary)]/20 bg-white/60 p-16 text-center">
                            <Package className="h-12 w-12 text-[var(--brand-secondary)]/40" />
                            <h3 className="text-lg font-semibold">
                                Nenhum produto disponivel
                            </h3>
                            <p className="text-sm text-[var(--brand-secondary)]/60">
                                Este fabricante ainda nao publicou produtos ativos.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {products.data.map((product) => (
                                <article
                                    key={product.id}
                                    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/30 bg-white/80 shadow-[0_20px_40px_rgba(15,23,42,0.08)] transition-transform duration-300 hover:-translate-y-1"
                                >
                                    <div className="relative h-44 overflow-hidden">
                                        {product.primary_image ? (
                                            <img
                                                src={`/storage/${product.primary_image}`}
                                                alt={product.name}
                                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center bg-[var(--brand-bg)]">
                                                <Box className="h-10 w-10 text-[var(--brand-secondary)]/40" />
                                            </div>
                                        )}
                                        <div className="absolute left-4 top-4">
                                            <span
                                                className="rounded-full px-3 py-1 text-xs font-semibold"
                                                style={{
                                                    background: catalog_settings.accent_color,
                                                    color: '#fff',
                                                }}
                                            >
                                                {product.total_stock > 0
                                                    ? 'Disponivel'
                                                    : 'Sem estoque'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-1 flex-col gap-3 p-5">
                                        <div>
                                            <h3 className="text-lg font-semibold">
                                                {product.name}
                                            </h3>
                                            <p className="text-xs text-[var(--brand-secondary)]/60">
                                                SKU {product.sku}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {product.category && (
                                                <Badge
                                                    variant="outline"
                                                    className="border-[var(--brand-secondary)]/20 text-[var(--brand-secondary)]"
                                                >
                                                    {product.category}
                                                </Badge>
                                            )}
                                            {product.has_size_variants && (
                                                <Badge
                                                    variant="outline"
                                                    className="border-[var(--brand-secondary)]/20 text-[var(--brand-secondary)]"
                                                >
                                                    {product.sizes.join(', ') || 'Tamanho unico'}
                                                </Badge>
                                            )}
                                        </div>
                                        {(product.has_size_variants || product.has_color_variants) && (
                                            <div className="text-xs text-[var(--brand-secondary)]/60">
                                                {product.has_color_variants && (
                                                    <div>
                                                        Cores: {product.colors
                                                            .map((color) => color.name)
                                                            .join(', ') || '---'}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    <Pagination links={products.meta?.links ?? products.links} />
                </section>
            </div>
        </div>
    );
}
