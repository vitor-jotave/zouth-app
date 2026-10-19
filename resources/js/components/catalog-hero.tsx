import { ArrowRight } from 'lucide-react';
import {
    catalogCoverImageStyle,
    catalogLogoStyle,
} from '@/lib/catalog-theming';
import { cn } from '@/lib/utils';

interface CatalogHeroProps {
    brandName: string;
    brandTagline?: string | null;
    showBrandName: boolean;
    showLogo: boolean;
    logoUrl?: string | null;
    logoSize: unknown;
    showProductCount: boolean;
    productCount: number;
    coverImage?: string | null;
    coverImageFit: unknown;
    coverImageScale: unknown;
    coverImageFocalX: unknown;
    coverImageFocalY: unknown;
    alignment: string;
    eyebrow: string;
    headline: string;
    subtitle?: string | null;
    showCta: boolean;
    ctaText: string;
    ctaHref?: string;
    headingFont: string;
    accentColor: string;
}

export function CatalogHero({
    brandName,
    brandTagline,
    showBrandName,
    showLogo,
    logoUrl,
    logoSize,
    showProductCount,
    productCount,
    coverImage,
    coverImageFit,
    coverImageScale,
    coverImageFocalX,
    coverImageFocalY,
    alignment,
    eyebrow,
    headline,
    subtitle,
    showCta,
    ctaText,
    ctaHref,
    headingFont,
    accentColor,
}: CatalogHeroProps) {
    const resolvedHeadline =
        headline.trim() ||
        brandTagline?.trim() ||
        (showBrandName ? brandName : '');
    const visibleHeadline =
        !showBrandName &&
        resolvedHeadline.localeCompare(brandName.trim(), undefined, {
            sensitivity: 'accent',
        }) === 0
            ? ''
            : resolvedHeadline;
    const centerWithImage = alignment === 'center' && Boolean(coverImage);
    const showBrandBar =
        showBrandName || (showLogo && Boolean(logoUrl)) || showProductCount;
    const centerLogoOnly =
        alignment === 'center' &&
        showLogo &&
        !showBrandName &&
        !showProductCount;
    const ctaClassName =
        'group mt-7 inline-flex min-h-10 w-full max-w-48 items-center justify-between gap-4 border-b pb-1 text-xs font-semibold transition-opacity hover:opacity-70';
    const ctaStyle = {
        borderColor: centerWithImage ? 'currentColor' : accentColor,
        color: centerWithImage ? 'currentColor' : accentColor,
    };
    const ctaContent = (
        <>
            {ctaText}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </>
    );

    return (
        <div className="@container/catalog-hero">
            <div
                data-testid="catalog-hero-surface"
                className={cn(
                    'relative isolate grid min-w-0 grid-cols-1 overflow-hidden bg-white/45',
                    alignment !== 'center' &&
                        Boolean(coverImage) &&
                        '@min-[768px]/catalog-hero:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] @min-[768px]/catalog-hero:grid-rows-[auto_1fr]',
                    centerWithImage &&
                        'min-h-[clamp(32rem,72cqw,48rem)] text-center text-white',
                )}
            >
                {centerWithImage && coverImage && (
                    <>
                        <img
                            src={coverImage}
                            alt=""
                            loading="eager"
                            fetchPriority="high"
                            className="absolute inset-0 h-full w-full"
                            style={catalogCoverImageStyle(
                                coverImageFit,
                                coverImageScale,
                                coverImageFocalX,
                                coverImageFocalY,
                            )}
                        />
                        <div className="absolute inset-0 bg-black/35" />
                    </>
                )}

                {showBrandBar && (
                    <div
                        data-testid="catalog-brand-bar"
                        className={cn(
                            'relative z-20 col-start-1 row-start-1 flex min-w-0 flex-col items-start justify-between gap-4 px-8 pt-8 @min-[640px]/catalog-hero:px-10 @min-[640px]/catalog-hero:pt-10',
                            centerWithImage && 'text-white',
                        )}
                    >
                        <div
                            className={cn(
                                'flex w-full min-w-0 flex-col items-start gap-4',
                                centerLogoOnly && 'mx-auto items-center',
                            )}
                        >
                            {showLogo && logoUrl && (
                                <div
                                    className={cn(
                                        'inline-flex w-full max-w-full shrink-0 items-center',
                                        centerLogoOnly
                                            ? 'justify-center'
                                            : 'justify-start',
                                    )}
                                >
                                    <img
                                        src={logoUrl}
                                        alt={brandName}
                                        className={cn(
                                            'h-auto object-contain',
                                            centerLogoOnly
                                                ? 'object-center'
                                                : 'object-left',
                                        )}
                                        style={catalogLogoStyle(
                                            logoSize,
                                            320,
                                            112,
                                        )}
                                    />
                                </div>
                            )}
                            {showBrandName && (
                                <div className="min-w-0">
                                    <p
                                        className="text-2xl font-semibold tracking-[-0.04em] wrap-anywhere"
                                        style={{ fontFamily: headingFont }}
                                    >
                                        {brandName}
                                    </p>
                                    {brandTagline && (
                                        <p className="mt-1 text-sm opacity-70">
                                            {brandTagline}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                        {showProductCount && (
                            <span
                                className="shrink-0 bg-[var(--brand-primary)] px-2.5 py-1 text-xs font-semibold text-white"
                                style={{ borderRadius: '9999px' }}
                            >
                                {productCount}{' '}
                                {productCount === 1 ? 'produto' : 'produtos'}
                            </span>
                        )}
                    </div>
                )}

                <div
                    data-testid="catalog-hero-copy"
                    className={cn(
                        'relative z-10 col-start-1 flex min-w-0 flex-col justify-center px-8 py-12 @min-[640px]/catalog-hero:px-10 @min-[640px]/catalog-hero:py-16',
                        showBrandBar ? 'row-start-2' : 'row-start-1',
                        alignment === 'center' &&
                            'mx-auto w-full max-w-4xl items-center py-16 text-center @min-[640px]/catalog-hero:py-24',
                    )}
                >
                    <p
                        className="text-xs font-semibold tracking-[0.16em] uppercase"
                        style={{
                            color: centerWithImage
                                ? 'currentColor'
                                : accentColor,
                        }}
                    >
                        {eyebrow}
                    </p>
                    {visibleHeadline && (
                        <h1
                            className="mt-4 max-w-full text-4xl leading-[0.98] font-semibold tracking-[-0.05em] wrap-anywhere @min-[640px]/catalog-hero:text-5xl @min-[1024px]/catalog-hero:text-7xl"
                            style={{ fontFamily: headingFont }}
                        >
                            {visibleHeadline}
                        </h1>
                    )}
                    {subtitle && (
                        <p className="mt-5 max-w-xl text-sm leading-6 opacity-65">
                            {subtitle}
                        </p>
                    )}
                    {showCta &&
                        ctaText.trim() !== '' &&
                        (ctaHref ? (
                            <a
                                href={ctaHref}
                                className={ctaClassName}
                                style={ctaStyle}
                            >
                                {ctaContent}
                            </a>
                        ) : (
                            <span className={ctaClassName} style={ctaStyle}>
                                {ctaContent}
                            </span>
                        ))}
                </div>

                {alignment !== 'center' && coverImage && (
                    <div
                        data-testid="catalog-hero-media"
                        className="relative col-start-1 aspect-[4/3] min-w-0 overflow-hidden @min-[768px]/catalog-hero:col-start-2 @min-[768px]/catalog-hero:row-span-2 @min-[768px]/catalog-hero:row-start-1 @min-[768px]/catalog-hero:aspect-auto @min-[768px]/catalog-hero:min-h-[40rem]"
                    >
                        <img
                            src={coverImage}
                            alt={headline}
                            loading="eager"
                            fetchPriority="high"
                            className="absolute inset-0 h-full w-full"
                            style={catalogCoverImageStyle(
                                coverImageFit,
                                coverImageScale,
                                coverImageFocalX,
                                coverImageFocalY,
                            )}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
