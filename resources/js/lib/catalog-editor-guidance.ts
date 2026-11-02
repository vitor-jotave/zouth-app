interface CatalogHeroBrandCopy {
    brand_name?: string | null;
    tagline?: string | null;
    description?: string | null;
    show_brand_name?: boolean;
}

interface CatalogLegibilityOptions {
    textColor: string;
    accentColor: string;
    backgroundColor: string;
    backgroundIsVariable?: boolean;
}

export interface CatalogLegibilityWarning {
    id: 'text-contrast' | 'accent-contrast' | 'variable-background';
    message: string;
    contrastRatio: number | null;
}

function relativeLuminance(color: string): number | null {
    if (typeof color !== 'string') return null;
    const hex = color.trim().match(/^#([a-f\d]{3}|[a-f\d]{6})$/i)?.[1];
    if (!hex) return null;
    const expanded =
        hex.length === 3 ? [...hex].map((part) => part + part).join('') : hex;
    const [red, green, blue] = [0, 2, 4].map((offset) => {
        const channel =
            Number.parseInt(expanded.slice(offset, offset + 2), 16) / 255;
        return channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function catalogContrastRatio(
    foreground: string,
    background: string,
): number | null {
    const foregroundLuminance = relativeLuminance(foreground);
    const backgroundLuminance = relativeLuminance(background);
    if (foregroundLuminance === null || backgroundLuminance === null)
        return null;
    return (
        (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
        (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
    );
}

export function catalogLegibilityWarnings({
    textColor,
    accentColor,
    backgroundColor,
    backgroundIsVariable = false,
}: CatalogLegibilityOptions): CatalogLegibilityWarning[] {
    if (backgroundIsVariable) {
        return [
            {
                id: 'variable-background',
                message:
                    'A foto, a textura ou o degradê podem mudar a leitura dos textos. Confira a prévia em tamanho real, também no celular. Você decide se quer ajustar as cores ou o enquadramento.',
                contrastRatio: null,
            },
        ];
    }

    const warnings: CatalogLegibilityWarning[] = [];
    const textContrast = catalogContrastRatio(textColor, backgroundColor);
    const accentContrast = catalogContrastRatio(accentColor, backgroundColor);
    if (textContrast !== null && textContrast < 4.5) {
        warnings.push({
            id: 'text-contrast',
            message:
                'A cor dos textos está próxima da cor de fundo e pode dificultar a leitura. Experimente aumentar o contraste entre elas.',
            contrastRatio: textContrast,
        });
    }
    if (accentContrast !== null && accentContrast < 4.5) {
        warnings.push({
            id: 'accent-contrast',
            message:
                'Textos pequenos na cor de destaque podem perder legibilidade sobre esse fundo. Confira os links e as chamadas na prévia.',
            contrastRatio: accentContrast,
        });
    }
    return warnings;
}

export function materializeCatalogHeroCopy<T extends Record<string, unknown>>(
    props: T | null | undefined,
    brand: CatalogHeroBrandCopy,
) {
    const brandName = brand.brand_name ?? '';
    const headline = typeof props?.headline === 'string' ? props.headline : '';
    const resolvedHeadline =
        headline.trim() ||
        (props?.headline_fallback !== false
            ? brand.tagline?.trim() ||
              (brand.show_brand_name !== false ? brandName : '')
            : '');
    const visibleHeadline =
        brand.show_brand_name === false &&
        resolvedHeadline.localeCompare(brandName.trim(), undefined, {
            sensitivity: 'accent',
        }) === 0
            ? ''
            : resolvedHeadline;
    const subtitle = typeof props?.subtitle === 'string' ? props.subtitle : '';
    const eyebrow = typeof props?.eyebrow === 'string' ? props.eyebrow : null;
    const ctaText = typeof props?.cta_text === 'string' ? props.cta_text : '';

    return {
        ...props,
        headline: visibleHeadline,
        subtitle:
            props?.subtitle_fallback !== false
                ? subtitle || brand.description || ''
                : subtitle,
        headline_fallback: false,
        subtitle_fallback: false,
        eyebrow:
            eyebrow ??
            (props?.eyebrow_fallback === false ? '' : 'Nova coleção'),
        eyebrow_fallback: false,
        cta_text:
            ctaText ||
            (props?.cta_text_fallback === false ? '' : 'Conheça a coleção'),
        cta_text_fallback: false,
    };
}
