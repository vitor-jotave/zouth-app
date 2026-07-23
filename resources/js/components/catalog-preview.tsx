import { ArrowRight, Box, Eye, Package } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { CatalogHero } from '@/components/catalog-hero';
import {
    CATALOG_LOGO_SIZE,
    catalogCoverImageUrl,
    GRADIENTS,
    PATTERNS,
} from '@/lib/catalog-theming';
import { cn } from '@/lib/utils';

type CatalogSectionType = 'hero' | 'collections' | 'product_grid';

interface CatalogSection {
    type: CatalogSectionType;
    enabled: boolean;
    props?: Record<string, string | number | boolean | null>;
}

interface CatalogSettings {
    brand_name: string;
    show_brand_name?: boolean;
    show_logo?: boolean;
    hide_prices?: boolean;
    tagline?: string | null;
    description?: string | null;
    logo_url?: string | null;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    background_color: string;
    font_family: string;
    heading_font_family?: string | null;
    body_font_family?: string | null;
    cover_image_url?: string | null;
    cover_thumbnail_url?: string | null;
    cover_image_focal_x?: number;
    cover_image_focal_y?: number;
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
    sections?: CatalogSection[];
}

interface Product {
    id: number;
    name: string;
    sku: string;
    category?: string | null;
    primary_image?: string | null;
    total_stock: number;
    price_cents?: number | null;
}

interface CatalogPreviewProps {
    settings: CatalogSettings;
    products?: Product[];
    productCount?: number;
    manufacturerName?: string;
    viewport?: 'desktop' | 'mobile';
    selectedSection?: CatalogSectionType | null;
    onSelectSection?: (section: CatalogSectionType) => void;
}

const fontMap: Record<string, string> = {
    sora: '"Sora", "Helvetica Neue", Arial, sans-serif',
    manrope: '"Manrope", "Helvetica Neue", Arial, sans-serif',
    'space-grotesk': '"Space Grotesk", "Helvetica Neue", Arial, sans-serif',
    fraunces: '"Fraunces", "Times New Roman", serif',
    'ibm-plex': '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
};

const fallbackSections: CatalogSection[] = [
    {
        type: 'hero',
        enabled: true,
        props: { logo_size: CATALOG_LOGO_SIZE.default },
    },
    { type: 'collections', enabled: true, props: {} },
    { type: 'product_grid', enabled: true, props: {} },
];

const sectionLabels: Record<CatalogSectionType, string> = {
    hero: 'Capa',
    collections: 'Coleções',
    product_grid: 'Produtos',
};

function sectionValue<T extends string | number | boolean | null>(
    section: CatalogSection,
    key: string,
    fallback: T,
): T {
    return (section.props?.[key] as T | undefined) ?? fallback;
}

function ProductImage({ product }: { product: Product }) {
    if (product.primary_image) {
        return (
            <img
                src={product.primary_image}
                alt={product.name}
                className="h-full w-full object-cover"
            />
        );
    }

    return (
        <div className="flex h-full items-center justify-center bg-black/5">
            <Box className="size-5 opacity-20" aria-hidden="true" />
        </div>
    );
}

function EditableSection({
    type,
    selected,
    onSelect,
    children,
    className,
}: {
    type: CatalogSectionType;
    selected: boolean;
    onSelect?: (section: CatalogSectionType) => void;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            className={cn(
                'group/preview-section relative outline-offset-4 transition-[outline-color] duration-200',
                selected && 'outline-2 outline-[#ff4d3d]',
                onSelect &&
                    'cursor-pointer hover:outline-1 hover:outline-[#ff4d3d]/55',
                className,
            )}
            onClick={(event) => {
                if (!onSelect) {
                    return;
                }

                event.stopPropagation();
                onSelect(type);
            }}
            aria-label={
                onSelect ? `Editar seção ${sectionLabels[type]}` : undefined
            }
        >
            {onSelect && selected && (
                <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 bg-[#ff4d3d] px-2 py-1 text-[9px] font-bold tracking-[0.08em] text-[#18181f] uppercase">
                    <Eye className="size-3" aria-hidden="true" />
                    {sectionLabels[type]}
                </span>
            )}
            {children}
        </section>
    );
}

export default function CatalogPreview({
    settings,
    products = [],
    productCount = products.length,
    manufacturerName = 'Sua marca',
    viewport = 'desktop',
    selectedSection = null,
    onSelectSection,
}: CatalogPreviewProps) {
    const isMobile = viewport === 'mobile';
    const displayFont =
        fontMap[settings.heading_font_family ?? settings.font_family] ??
        fontMap['fraunces'];
    const bodyFont =
        fontMap[settings.body_font_family ?? settings.font_family] ??
        fontMap['manrope'];
    const sections = (
        settings.sections?.length ? settings.sections : fallbackSections
    ).filter((section) => section.enabled);
    const categories = Array.from(
        new Set(
            products
                .map((product) => product.category)
                .filter((category): category is string => Boolean(category)),
        ),
    ).slice(0, 4);
    const coverImage = catalogCoverImageUrl(settings);
    const featuredProducts = products.slice(0, isMobile ? 4 : 6);
    const backgroundStyle: CSSProperties = {};

    if (settings.background_mode === 'gradient' && settings.gradient_id) {
        backgroundStyle.background =
            GRADIENTS[settings.gradient_id as keyof typeof GRADIENTS];
    } else if (settings.background_mode === 'pattern' && settings.pattern_id) {
        const pattern = PATTERNS[settings.pattern_id as keyof typeof PATTERNS];

        backgroundStyle.background = pattern
            ? pattern(
                  settings.pattern_color ?? settings.primary_color,
                  settings.pattern_opacity ?? 12,
              )
            : settings.background_color;
    } else {
        backgroundStyle.backgroundColor = settings.background_color;
    }

    return (
        <div
            className="relative min-h-full overflow-hidden text-[var(--catalog-secondary)]"
            style={{
                ...backgroundStyle,
                fontFamily: bodyFont,
                ['--catalog-primary' as string]: settings.primary_color,
                ['--catalog-secondary' as string]: settings.secondary_color,
                ['--catalog-accent' as string]: settings.accent_color,
                ['--catalog-display' as string]: displayFont,
                ['--catalog-body' as string]: bodyFont,
            }}
        >
            {settings.background_mode === 'image' &&
                settings.background_image_url && (
                    <>
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{
                                backgroundImage: `url(${settings.background_image_url})`,
                                opacity:
                                    (settings.background_image_opacity ?? 20) /
                                    100,
                                filter: `blur(${settings.background_blur ?? 0}px)`,
                            }}
                        />
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundColor:
                                    settings.background_overlay_color ??
                                    '#000000',
                                opacity:
                                    (settings.background_overlay_opacity ?? 0) /
                                    100,
                            }}
                        />
                    </>
                )}

            <div
                className={cn(
                    'relative mx-auto flex min-h-full w-full flex-col px-6 py-12',
                    isMobile && 'max-w-[390px]',
                )}
                style={{
                    gap:
                        settings.layout_density === 'compact'
                            ? '2.5rem'
                            : '4rem',
                }}
            >
                {sections.map((section) => {
                    if (section.type === 'hero') {
                        const headline =
                            (section.props?.headline as
                                | string
                                | null
                                | undefined) ||
                            settings.tagline ||
                            settings.brand_name ||
                            manufacturerName;
                        const subtitle =
                            (section.props?.subtitle as
                                | string
                                | null
                                | undefined) || settings.description;
                        const alignment = sectionValue<string>(
                            section,
                            'align',
                            'left',
                        );
                        const ctaText =
                            (section.props?.cta_text as
                                | string
                                | null
                                | undefined) || 'Conheça a coleção';
                        const productGridEnabled = sections.some(
                            (candidate) =>
                                candidate.type === 'product_grid' &&
                                candidate.enabled,
                        );

                        return (
                            <EditableSection
                                key={section.type}
                                type={section.type}
                                selected={selectedSection === section.type}
                                onSelect={onSelectSection}
                                className="-mx-6 -mt-12"
                            >
                                <CatalogHero
                                    brandName={
                                        settings.brand_name || manufacturerName
                                    }
                                    brandTagline={settings.tagline}
                                    showBrandName={
                                        settings.show_brand_name ?? true
                                    }
                                    showLogo={Boolean(
                                        settings.show_logo && settings.logo_url,
                                    )}
                                    logoUrl={settings.logo_url}
                                    logoSize={sectionValue(
                                        section,
                                        'logo_size',
                                        CATALOG_LOGO_SIZE.default,
                                    )}
                                    showProductCount={sectionValue(
                                        section,
                                        'show_product_count',
                                        false,
                                    )}
                                    productCount={productCount}
                                    coverImage={coverImage}
                                    coverImageFit={sectionValue(
                                        section,
                                        'image_fit',
                                        'cover',
                                    )}
                                    coverImageScale={sectionValue(
                                        section,
                                        'image_scale',
                                        100,
                                    )}
                                    coverImageFocalX={
                                        settings.cover_image_focal_x
                                    }
                                    coverImageFocalY={
                                        settings.cover_image_focal_y
                                    }
                                    alignment={alignment}
                                    eyebrow={sectionValue(
                                        section,
                                        'eyebrow',
                                        'Nova coleção',
                                    )}
                                    headline={headline}
                                    subtitle={subtitle}
                                    showCta={
                                        sectionValue(
                                            section,
                                            'show_cta',
                                            true,
                                        ) && productGridEnabled
                                    }
                                    ctaText={ctaText}
                                    headingFont="var(--catalog-display)"
                                    accentColor={settings.accent_color}
                                />
                            </EditableSection>
                        );
                    }

                    if (section.type === 'collections') {
                        const title = sectionValue(
                            section,
                            'title',
                            'Coleções',
                        );
                        const display = sectionValue<string>(
                            section,
                            'display',
                            'tabs',
                        );

                        return (
                            <EditableSection
                                key={section.type}
                                type={section.type}
                                selected={selectedSection === section.type}
                                onSelect={onSelectSection}
                            >
                                <div
                                    className={cn(
                                        'flex gap-4 border-b border-black/10 pb-4',
                                        isMobile
                                            ? 'flex-col items-start'
                                            : 'items-end justify-between',
                                    )}
                                >
                                    <div>
                                        <p className="text-[9px] font-bold tracking-[0.15em] uppercase opacity-45">
                                            Descubra
                                        </p>
                                        <h2
                                            className="mt-1 text-xl font-semibold tracking-[-0.04em]"
                                            style={{
                                                fontFamily:
                                                    'var(--catalog-display)',
                                            }}
                                        >
                                            {title}
                                        </h2>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {(categories.length
                                            ? categories
                                            : ['Novidades', 'Em destaque']
                                        ).map((category, index) => (
                                            <span
                                                key={category}
                                                className={cn(
                                                    'px-3 py-1.5 text-[10px] font-semibold',
                                                    display === 'chips' &&
                                                        'rounded-full',
                                                    index === 0
                                                        ? 'text-white'
                                                        : 'border border-black/10 bg-white/35',
                                                )}
                                                style={
                                                    index === 0
                                                        ? {
                                                              backgroundColor:
                                                                  settings.primary_color,
                                                          }
                                                        : undefined
                                                }
                                            >
                                                {category}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </EditableSection>
                        );
                    }

                    const title = sectionValue(section, 'title', 'Em destaque');
                    const columns = Number(
                        sectionValue(section, 'columns_desktop', 3),
                    );
                    const presentation = sectionValue<string>(
                        section,
                        'presentation',
                        'commercial',
                    );
                    const isEditorial = presentation === 'editorial';
                    const showPrice =
                        !settings.hide_prices &&
                        sectionValue(section, 'show_price', true);
                    const showSku = sectionValue(section, 'show_sku', true);
                    const showStock = sectionValue(section, 'show_stock', true);
                    const showAction = sectionValue(
                        section,
                        'show_action',
                        true,
                    );
                    const showBadges = sectionValue(
                        section,
                        'show_badges',
                        true,
                    );

                    return (
                        <EditableSection
                            key={section.type}
                            type={section.type}
                            selected={selectedSection === section.type}
                            onSelect={onSelectSection}
                        >
                            <div className="flex items-end justify-between gap-4">
                                <div>
                                    <p className="text-[9px] font-bold tracking-[0.15em] uppercase opacity-45">
                                        Seleção da marca
                                    </p>
                                    <h2
                                        className="mt-1 text-xl font-semibold tracking-[-0.04em]"
                                        style={{
                                            fontFamily:
                                                'var(--catalog-display)',
                                        }}
                                    >
                                        {title}
                                    </h2>
                                </div>
                                <span className="text-[10px] opacity-45">
                                    {featuredProducts.length} peças
                                </span>
                            </div>

                            {featuredProducts.length === 0 ? (
                                <div className="mt-5 flex min-h-44 flex-col items-center justify-center gap-3 border border-black/10 bg-white/35 text-center opacity-55">
                                    <Package
                                        className="size-7"
                                        aria-hidden="true"
                                    />
                                    <p className="text-xs">
                                        Seus produtos aparecem aqui.
                                    </p>
                                </div>
                            ) : (
                                <div
                                    className={cn(
                                        'mt-5 grid',
                                        settings.layout_density === 'compact'
                                            ? 'gap-3'
                                            : 'gap-5',
                                        isMobile && 'grid-cols-1',
                                        !isMobile &&
                                            (columns === 4
                                                ? 'grid-cols-4'
                                                : 'grid-cols-3'),
                                    )}
                                >
                                    {featuredProducts.map((product) => (
                                        <article
                                            key={product.id}
                                            className={cn(
                                                'overflow-hidden',
                                                !isEditorial && 'bg-white/65',
                                            )}
                                            style={{
                                                border: isEditorial
                                                    ? 'none'
                                                    : settings.card_style ===
                                                        'flat'
                                                      ? '1px solid rgba(0,0,0,0.14)'
                                                      : '1px solid rgba(0,0,0,0.06)',
                                                boxShadow:
                                                    !isEditorial &&
                                                    settings.card_style ===
                                                        'soft'
                                                        ? '0 10px 24px rgba(24,24,31,0.08)'
                                                        : 'none',
                                            }}
                                        >
                                            <div className="aspect-[4/5] overflow-hidden">
                                                <ProductImage
                                                    product={product}
                                                />
                                            </div>
                                            <div
                                                className={cn(
                                                    isEditorial
                                                        ? 'px-1 pt-3 pb-1'
                                                        : settings.layout_density ===
                                                            'compact'
                                                          ? 'p-2.5'
                                                          : 'p-3.5',
                                                )}
                                            >
                                                <h3
                                                    className="truncate text-xs font-semibold"
                                                    style={{
                                                        fontFamily:
                                                            'var(--catalog-display)',
                                                    }}
                                                >
                                                    {product.name}
                                                </h3>
                                                {showSku && (
                                                    <p className="mt-1 text-[9px] opacity-55">
                                                        SKU {product.sku}
                                                    </p>
                                                )}
                                                {showPrice &&
                                                    product.price_cents !=
                                                        null && (
                                                        <p className="mt-2 text-[10px] font-semibold tabular-nums">
                                                            {(
                                                                product.price_cents /
                                                                100
                                                            ).toLocaleString(
                                                                'pt-BR',
                                                                {
                                                                    style: 'currency',
                                                                    currency:
                                                                        'BRL',
                                                                },
                                                            )}
                                                        </p>
                                                    )}
                                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] opacity-60">
                                                    {showBadges &&
                                                        product.category && (
                                                            <span>
                                                                {
                                                                    product.category
                                                                }
                                                            </span>
                                                        )}
                                                    {showStock && (
                                                        <span>
                                                            {
                                                                product.total_stock
                                                            }{' '}
                                                            disponível(is)
                                                        </span>
                                                    )}
                                                </div>
                                                {showAction && (
                                                    <p
                                                        className="mt-3 flex items-center justify-between border-b pb-1.5 text-[9px] font-semibold"
                                                        style={{
                                                            borderColor:
                                                                settings.accent_color,
                                                            color: settings.accent_color,
                                                        }}
                                                    >
                                                        Ver detalhes
                                                        <ArrowRight
                                                            className="size-3"
                                                            aria-hidden="true"
                                                        />
                                                    </p>
                                                )}
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </EditableSection>
                    );
                })}
            </div>
        </div>
    );
}

export type { CatalogSection, CatalogSectionType };
