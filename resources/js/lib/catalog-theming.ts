/**
 * Catalog theming utilities for premium customization
 */

export interface LayoutTokens {
    radius: string;
    gap: string;
    cardPadding: string;
    shadow: string;
}

export const LAYOUT_TOKENS: Record<string, LayoutTokens> = {
    minimal: {
        radius: '0.5rem',
        gap: '2rem',
        cardPadding: '1.5rem',
        shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    },
    playful: {
        radius: '1.5rem',
        gap: '1.5rem',
        cardPadding: '1.25rem',
        shadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    },
    boutique: {
        radius: '0.75rem',
        gap: '3rem',
        cardPadding: '2rem',
        shadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    },
};

/**
 * Generate SVG pattern as data-uri
 */
export const PATTERNS = {
    confetti: (color: string, opacity: number): string => {
        const encodedColor = encodeURIComponent(color);
        const op = opacity / 100;
        return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Ccircle cx='10' cy='10' r='2' fill='${encodedColor}' opacity='${op}'/%3E%3Ccircle cx='50' cy='25' r='2.5' fill='${encodedColor}' opacity='${op}'/%3E%3Ccircle cx='30' cy='45' r='1.5' fill='${encodedColor}' opacity='${op}'/%3E%3Ccircle cx='15' cy='35' r='2' fill='${encodedColor}' opacity='${op}'/%3E%3C/svg%3E")`;
    },
    stars: (color: string, opacity: number): string => {
        const encodedColor = encodeURIComponent(color);
        const op = opacity / 100;
        return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cpath d='M20,10 l2,6 l6,0 l-5,4 l2,6 l-5,-4 l-5,4 l2,-6 l-5,-4 l6,0 z' fill='${encodedColor}' opacity='${op}'/%3E%3Cpath d='M60,50 l1.5,4.5 l4.5,0 l-3.75,3 l1.5,4.5 l-3.75,-3 l-3.75,3 l1.5,-4.5 l-3.75,-3 l4.5,0 z' fill='${encodedColor}' opacity='${op}'/%3E%3C/svg%3E")`;
    },
    clouds: (color: string, opacity: number): string => {
        const encodedColor = encodeURIComponent(color);
        const op = opacity / 100;
        return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60'%3E%3Cellipse cx='20' cy='30' rx='15' ry='8' fill='${encodedColor}' opacity='${op}'/%3E%3Cellipse cx='70' cy='20' rx='12' ry='6' fill='${encodedColor}' opacity='${op}'/%3E%3C/svg%3E")`;
    },
    dots: (color: string, opacity: number): string => {
        const encodedColor = encodeURIComponent(color);
        const op = opacity / 100;
        return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='4' cy='4' r='1.5' fill='${encodedColor}' opacity='${op}'/%3E%3Ccircle cx='14' cy='14' r='1.5' fill='${encodedColor}' opacity='${op}'/%3E%3C/svg%3E")`;
    },
};

export const GRADIENTS: Record<string, string> = {
    sunset: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'soft-sky': 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    mint: 'linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)',
    ocean: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    lavender: 'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)',
    peach: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
};

export const PRESET_LABELS: Record<string, { label: string; description: string }> = {
    minimal: {
        label: 'Minimal',
        description: 'Clean, foco em grid, tipografia discreta',
    },
    playful: {
        label: 'Playful',
        description: 'Infantil, cards arredondados, cores vibrantes',
    },
    boutique: {
        label: 'Boutique',
        description: 'Premium, hero maior, espaçamento generoso',
    },
};

export const PATTERN_LABELS: Record<string, string> = {
    confetti: 'Confete',
    stars: 'Estrelas',
    clouds: 'Nuvens',
    dots: 'Pontos',
};

export const GRADIENT_LABELS: Record<string, string> = {
    sunset: 'Pôr do Sol',
    'soft-sky': 'Céu Suave',
    mint: 'Menta',
    ocean: 'Oceano',
    lavender: 'Lavanda',
    peach: 'Pêssego',
};
