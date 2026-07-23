import { ArrowRight } from 'lucide-react';
import {
    catalogCoverImageStyle,
    catalogLogoStyle,
    normalizeCatalogLogoSize,
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
    const centerWithImage = alignment === 'center' && Boolean(coverImage);
    const showBrandBar =
        showBrandName || (showLogo && Boolean(logoUrl)) || showProductCount;
    const brandReserve = showBrandBar
        ? Math.max(
              128,
              Math.round(112 * (normalizeCatalogLogoSize(logoSize) / 100) + 64),
          )
        : 0;
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
        <div
            data-testid="catalog-hero-surface"
            className={cn(
                'relative flex flex-col overflow-hidden bg-white/45',
                centerWithImage &&
                    'min-h-[clamp(32rem,72vw,48rem)] text-center text-white',
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
                        'absolute inset-x-0 top-0 z-20 flex flex-col items-start justify-between gap-4 px-8 pt-8 sm:flex-row sm:items-center sm:px-10 sm:pt-10',
                        centerWithImage && 'text-white',
                    )}
                >
                    <div
                        className={cn(
                            'flex max-w-full flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6',
                            centerLogoOnly && 'mx-auto items-center',
                        )}
                    >
                        {showLogo && logoUrl && (
                            <div
                                className={cn(
                                    'inline-flex max-w-full shrink-0 items-center',
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
                                    style={catalogLogoStyle(logoSize, 320, 112)}
                                />
                            </div>
                        )}
                        {showBrandName && (
                            <div className="min-w-0">
                                <p
                                    className="text-2xl font-semibold tracking-[-0.04em]"
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
                className={cn(
                    'relative grid flex-1',
                    alignment === 'center'
                        ? 'grid-cols-1 place-items-center text-center'
                        : 'md:grid-cols-[0.8fr_1.2fr]',
                )}
            >
                <div
                    className={cn(
                        'relative z-10 flex min-h-[24rem] flex-col justify-center px-8 py-12 sm:px-10 sm:py-16 md:min-h-72',
                        alignment === 'center' &&
                            'mx-auto max-w-4xl items-center py-16 sm:py-24',
                    )}
                    style={
                        brandReserve > 0
                            ? { paddingTop: `${brandReserve}px` }
                            : undefined
                    }
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
                    <h1
                        className="mt-4 text-4xl leading-[0.98] font-semibold tracking-[-0.05em] sm:text-5xl lg:text-7xl"
                        style={{ fontFamily: headingFont }}
                    >
                        {headline}
                    </h1>
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
                    <div className="min-h-80 overflow-hidden md:min-h-[40rem]">
                        <img
                            src={coverImage}
                            alt={headline}
                            loading="eager"
                            fetchPriority="high"
                            className="h-full min-h-80 w-full md:min-h-[40rem]"
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
