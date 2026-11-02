import { Head, Link } from '@inertiajs/react';
import {
    AlignCenter,
    AlignLeft,
    Check,
    ChevronDown,
    Copy,
    Eye,
    EyeOff,
    ExternalLink,
    GripVertical,
    ImageIcon,
    LayoutGrid,
    Link2,
    Loader2,
    MessageCircle,
    Maximize2,
    Minimize2,
    Minus,
    Monitor,
    Palette,
    Plus,
    RefreshCcw,
    RotateCcw,
    Redo2,
    Undo2,
    Save,
    Smartphone,
    Upload,
} from 'lucide-react';
import type { DragEvent, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import CatalogPreview, {
    type CatalogSection,
    type CatalogSectionType,
} from '@/components/catalog-preview';
import { ImageCropDialog } from '@/components/image-crop-dialog';
import InputError from '@/components/input-error';
import { StatusLabel } from '@/components/status-label';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useDraftForm } from '@/hooks/use-draft-history';
import { useEditorHistory } from '@/hooks/use-editor-history';
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';
import AppLayout from '@/layouts/app-layout';
import {
    catalogLegibilityWarnings,
    materializeCatalogHeroCopy,
} from '@/lib/catalog-editor-guidance';
import {
    CATALOG_COVER_SCALE,
    CATALOG_LOGO_SIZE,
    catalogCoverImageStyle,
    catalogLogoStyle,
    GRADIENT_LABELS,
    normalizeCatalogCoverFit,
    normalizeCatalogCoverScale,
    normalizeCatalogLogoSize,
    PATTERN_LABELS,
} from '@/lib/catalog-theming';
import { cn } from '@/lib/utils';
import manufacturer from '@/routes/manufacturer';
import type { BreadcrumbItem } from '@/types';

interface CatalogSettings {
    id: number;
    brand_name: string;
    show_brand_name: boolean;
    show_logo: boolean;
    hide_prices: boolean;
    allow_orders_without_stock: boolean;
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
    public_link_active: boolean;
    public_token_rotated_at?: string | null;
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
    sections: CatalogSection[];
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

interface Props {
    catalog_settings: CatalogSettings;
    appearance_defaults: Partial<CatalogSettings>;
    public_link: string;
    stats: {
        total: number;
        last_7_days: number;
        last_30_days: number;
    };
    sample_products: Product[];
    product_count: number;
    manufacturer_name: string;
    whatsapp_channel: {
        available: boolean;
        profile_name?: string | null;
        phone_masked?: string | null;
        channels_url: string;
    };
}

type CatalogPanel = CatalogSectionType | 'brand' | 'appearance' | 'publish';
type ViewportMode = 'desktop' | 'mobile';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Visão geral', href: '/dashboard' },
    { title: 'Catálogo', href: '/manufacturer/catalog-settings' },
];

const sectionMeta: Record<CatalogSectionType, { label: string }> = {
    hero: {
        label: 'Capa',
    },
    collections: {
        label: 'Coleções',
    },
    product_grid: {
        label: 'Produtos',
    },
};

const fontOptions = [
    { value: 'sora', label: 'Sora' },
    { value: 'manrope', label: 'Manrope' },
    { value: 'fraunces', label: 'Fraunces' },
    { value: 'space-grotesk', label: 'Space Grotesk' },
    { value: 'ibm-plex', label: 'IBM Plex Sans' },
];

const coverFitOptions = [
    {
        value: 'cover',
        label: 'Cobrir',
        description: 'Preenche a capa e pode cortar as bordas.',
    },
    {
        value: 'contain',
        label: 'Conter',
        description: 'Mostra a foto inteira, sem cortes.',
    },
    {
        value: 'fill',
        label: 'Estender',
        description: 'Ocupa todo o espaço, mesmo alterando a proporção.',
    },
    {
        value: 'manual',
        label: 'Tamanho manual',
        description: 'Controle a escala e a posição com precisão.',
    },
] as const;

const fallbackSections: CatalogSection[] = [
    {
        type: 'hero',
        enabled: true,
        props: {
            eyebrow: 'Nova coleção',
            headline: 'Nova coleção',
            subtitle: null,
            cta_text: 'Conheça a coleção',
            show_cta: true,
            show_product_count: false,
            logo_size: CATALOG_LOGO_SIZE.default,
            image_fit: 'cover',
            image_scale: CATALOG_COVER_SCALE.default,
            align: 'left',
        },
    },
    {
        type: 'collections',
        enabled: true,
        props: {
            title: 'Coleções',
            display: 'tabs',
            show_counts: true,
        },
    },
    {
        type: 'product_grid',
        enabled: true,
        props: {
            title: 'Em destaque',
            columns_desktop: 3,
            show_badges: true,
            presentation: 'commercial',
            show_price: true,
            show_sku: true,
            show_stock: true,
            show_variations: true,
            show_quantity_selector: true,
            show_action: true,
        },
    },
];

const panelLabels: Record<CatalogPanel, string> = {
    brand: 'Marca',
    hero: 'Capa',
    collections: 'Coleções',
    product_grid: 'Produtos',
    appearance: 'Aparência',
    publish: 'Publicar',
};

function panelForError(
    errorKey: string,
    sections: CatalogSection[],
): CatalogPanel {
    const sectionMatch = errorKey.match(/^sections\.(\d+)\./);

    if (sectionMatch) {
        if (/\.(logo_size|logo_align)$/.test(errorKey)) return 'brand';
        return sections[Number(sectionMatch[1])]?.type ?? 'hero';
    }

    if (
        [
            'brand_name',
            'logo',
            'remove_logo',
            'show_brand_name',
            'show_logo',
        ].includes(errorKey)
    ) {
        return 'brand';
    }

    if (
        [
            'remove_cover_image',
            'tagline',
            'description',
            'cover_image',
            'cover_image_focal_x',
            'cover_image_focal_y',
        ].includes(errorKey)
    ) {
        return 'hero';
    }

    if (['layout_density', 'card_style'].includes(errorKey)) {
        return 'product_grid';
    }

    if (
        [
            'hide_prices',
            'allow_orders_without_stock',
            'public_link_active',
        ].includes(errorKey)
    ) {
        return 'publish';
    }

    return 'appearance';
}

function normalizeSections(
    sections: CatalogSection[],
    brand?: Pick<
        CatalogSettings,
        'brand_name' | 'tagline' | 'description' | 'show_brand_name'
    >,
): CatalogSection[] {
    const current = sections.length ? sections : fallbackSections;
    const missing = fallbackSections.filter(
        (fallback) =>
            !current.some((section) => section.type === fallback.type),
    );

    return [...current, ...missing].map((section) => {
        if (section.type !== 'hero') {
            return {
                ...section,
                props: { ...section.props },
            };
        }

        return {
            ...section,
            props: {
                ...section.props,
                ...(brand
                    ? materializeCatalogHeroCopy(section.props ?? {}, brand)
                    : {}),
                logo_size: normalizeCatalogLogoSize(section.props?.logo_size),
                image_fit: normalizeCatalogCoverFit(section.props?.image_fit),
                image_scale: normalizeCatalogCoverScale(
                    section.props?.image_scale,
                ),
            },
        };
    });
}

function sectionProp<T extends string | number | boolean | null>(
    section: CatalogSection | undefined,
    key: string,
    fallback: T,
): T {
    return (section?.props?.[key] as T | undefined) ?? fallback;
}

function InspectorHeader({
    eyebrow,
    title
}: {
    eyebrow: string;
    title: string;
}) {
    return (
        <header className="border-b border-border px-5 pt-6 pb-5">
            <p className="text-[0.64rem] font-bold tracking-[0.2em] text-[#ff4d3d] uppercase">
                {eyebrow}
            </p>
            <h2 className="mt-2 font-zouth-display text-xl font-semibold tracking-[-0.035em]">
                {title}
            </h2>
        </header>
    );
}

function InspectorSection({
    title,
    children,
    className,
}: {
    title?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('border-b border-border px-5 py-5', className)}>
            {title && (
                <p className="mb-4 text-[0.64rem] font-bold tracking-[0.16em] text-foreground uppercase">
                    {title}
                </p>
            )}
            {children}
        </section>
    );
}

function SegmentedControl({
    label,
    value,
    options,
    onChange,
    error,
    errorKey,
}: {
    label: string;
    value: string;
    options: Array<{ value: string; label: string; icon?: ReactNode }>;
    onChange: (value: string) => void;
    error?: string;
    errorKey?: string;
}) {
    return (
        <div className="space-y-2" data-catalog-error={errorKey}>
            <Label className="text-xs">{label}</Label>
            <div
                className="grid border border-border bg-[#f6f4f0]"
                role="group"
                aria-label={label}
                aria-invalid={Boolean(error)}
                style={{
                    gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
                }}
            >
                {options.map((option, index) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        aria-pressed={value === option.value}
                        className={cn(
                            'flex min-h-11 items-center justify-center gap-2 px-2 text-xs font-semibold transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-[#ff4d3d]',
                            index > 0 && 'border-l border-border',
                            value === option.value
                                ? 'bg-[#18181f] text-[#f6f4f0]'
                                : 'hover:bg-[#e7e3dc]/55',
                        )}
                    >
                        {option.icon}
                        <span>{option.label}</span>
                    </button>
                ))}
            </div>
            <InputError message={error} />
        </div>
    );
}

function ColorField({
    id,
    label,
    value,
    onChange,
    error,
    errorKey,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    errorKey?: string;
}) {
    return (
        <div className="space-y-2" data-catalog-error={errorKey}>
            <Label htmlFor={id} className="text-xs">
                {label}
            </Label>
            <div className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)]">
                <label
                    htmlFor={`${id}-picker`}
                    className="flex h-11 cursor-pointer items-center justify-center border border-r-0 border-border bg-background"
                >
                    <input
                        id={`${id}-picker`}
                        type="color"
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        className="size-7 cursor-pointer border-0 bg-transparent p-0"
                    />
                    <span className="sr-only">Escolher {label}</span>
                </label>
                <Input
                    id={id}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    aria-invalid={Boolean(error)}
                    className="h-11 rounded-[2px] border-border bg-transparent font-mono text-xs uppercase shadow-none focus-visible:border-[#18181f] focus-visible:ring-0"
                />
            </div>
            <InputError message={error} />
        </div>
    );
}

function OptionSwitch({
    label,
    description,
    checked,
    onCheckedChange,
    disabled = false,
}: {
    label: string;
    description: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex items-start justify-between gap-4 py-1">
            <div>
                <p className="text-xs font-semibold">{label}</p>
                <p className="mt-1 text-[0.68rem] leading-4 text-muted-foreground">
                    {description}
                </p>
            </div>
            <Switch
                aria-label={label}
                checked={checked}
                onCheckedChange={onCheckedChange}
                disabled={disabled}
                className="shrink-0 disabled:cursor-not-allowed disabled:opacity-45 data-[state=checked]:bg-[#ff4d3d]"
            />
        </div>
    );
}

function PanelErrorBadge({ count }: { count?: number }) {
    if (!count) {
        return null;
    }

    return (
        <span className="mt-1 inline-flex items-center gap-1.5 text-[0.62rem] font-bold tracking-[0.08em] text-[#b5271d] uppercase">
            <span className="size-1.5 rounded-full bg-[#ff4d3d]" />
            {count} {count === 1 ? 'ajuste' : 'ajustes'}
        </span>
    );
}

function useMediaPreview(file: File | null): string | null {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!file) {
            setUrl(null);
            return;
        }
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);
    return url;
}

function MediaDraftNotice({
    pending,
    removed,
    onRevert,
}: {
    pending: boolean;
    removed: boolean;
    onRevert: () => void;
}) {
    if (!pending && !removed) return null;
    return (
        <div className="space-y-2 border-l-2 border-[#ff4d3d] pl-3 text-xs leading-5">
            <p role="status">
                {removed
                    ? 'A imagem será removida quando você salvar.'
                    : 'Imagem pronta na prévia. Salve para publicar junto com os outros ajustes.'}
            </p>
            <button
                type="button"
                onClick={onRevert}
                className="min-h-11 font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#ff4d3d]"
            >
                {removed ? 'Cancelar remoção' : 'Descartar nova imagem'}
            </button>
        </div>
    );
}

export default function CatalogSettings({
    catalog_settings: settings,
    appearance_defaults,
    public_link,
    stats,
    whatsapp_channel,
}: Props) {
    const [activePanel, setActivePanel] = useState<CatalogPanel>('hero');
    const [mobileView, setMobileView] = useState<
        'structure' | 'edit' | 'preview'
    >('edit');
    const selectPanel = (panel: CatalogPanel) => {
        setExpandedPreview(false);
        setActivePanel(panel);
        setMobileView('edit');
        window.requestAnimationFrame(() => {
            inspectorRef.current?.scrollTo({ top: 0 });
            if (window.innerWidth < 1280) {
                inspectorRef.current?.focus({ preventScroll: true });
            }
        });
    };
    const [viewport, setViewport] = useState<ViewportMode>('desktop');
    useEffect(() => {
        if (window.matchMedia('(max-width: 767px)').matches)
            setViewport('mobile');
    }, []);
    const [previewMode, setPreviewMode] = useState<'edit' | 'test'>('edit');
    const [zoom, setZoom] = useState<number | null>(null);
    const [expandedPreview, setExpandedPreview] = useState(false);
    const [copied, setCopied] = useState(false);
    const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [logoCropDialogOpen, setLogoCropDialogOpen] = useState(false);
    const [logoCropFile, setLogoCropFile] = useState<File | null>(null);
    const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
    const [draggedSection, setDraggedSection] =
        useState<CatalogSectionType | null>(null);
    const [pendingErrorKey, setPendingErrorKey] = useState<string | null>(null);
    const inspectorRef = useRef<HTMLElement>(null);
    const previewStageRef = useRef<HTMLDivElement>(null);
    const previewScrollRef = useRef<HTMLDivElement>(null);
    const [previewStageWidth, setPreviewStageWidth] = useState(0);
    const [previewStageHeight, setPreviewStageHeight] = useState(0);

    const settingsForm = useDraftForm(`catalog:${settings.id}`, {
        brand_name: settings.brand_name ?? '',
        show_brand_name: settings.show_brand_name ?? true,
        show_logo: settings.show_logo ?? true,
        hide_prices: settings.hide_prices ?? false,
        allow_orders_without_stock:
            settings.allow_orders_without_stock ?? false,
        tagline: settings.tagline ?? '',
        description: settings.description ?? '',
        primary_color: settings.primary_color ?? '#0F766E',
        secondary_color: settings.secondary_color ?? '#0F172A',
        accent_color: settings.accent_color ?? '#F97316',
        background_color: settings.background_color ?? '#F8FAFC',
        font_family: settings.font_family ?? 'space-grotesk',
        heading_font_family:
            settings.heading_font_family ?? settings.font_family ?? 'fraunces',
        body_font_family:
            settings.body_font_family ?? settings.font_family ?? 'manrope',
        cover_image_focal_x: settings.cover_image_focal_x ?? 50,
        cover_image_focal_y: settings.cover_image_focal_y ?? 50,
        public_link_active: settings.public_link_active ?? true,
        layout_preset: 'minimal',
        layout_density:
            settings.layout_density === 'compact' ? 'compact' : 'comfortable',
        card_style: settings.card_style === 'flat' ? 'flat' : 'soft',
        background_mode: ['solid', 'image', 'pattern', 'gradient'].includes(
            settings.background_mode,
        )
            ? settings.background_mode
            : 'solid',
        background_image_opacity: settings.background_image_opacity ?? 20,
        background_overlay_color:
            settings.background_overlay_color ?? '#000000',
        background_overlay_opacity: settings.background_overlay_opacity ?? 10,
        background_blur: settings.background_blur ?? 0,
        pattern_id: ['confetti', 'stars', 'clouds', 'dots'].includes(
            settings.pattern_id ?? '',
        )
            ? (settings.pattern_id ?? 'dots')
            : 'dots',
        pattern_color: settings.pattern_color ?? settings.primary_color,
        pattern_opacity: settings.pattern_opacity ?? 12,
        gradient_id: [
            'sunset',
            'soft-sky',
            'mint',
            'ocean',
            'lavender',
            'peach',
        ].includes(settings.gradient_id ?? '')
            ? (settings.gradient_id ?? 'soft-sky')
            : 'soft-sky',
        sections: normalizeSections(settings.sections ?? [], settings),
    });

    const mediaForm = useDraftForm<{
        logo: File | null;
        cover_image: File | null;
        background_image: File | null;
        remove_logo: boolean;
        remove_cover_image: boolean;
        remove_background_image: boolean;
    }>(`catalog-media:${settings.id}`, {
        logo: null,
        cover_image: null,
        background_image: null,
        remove_logo: false,
        remove_cover_image: false,
        remove_background_image: false,
    });

    const hasUnpublishedChanges = settingsForm.isDirty || mediaForm.isDirty;
    const [historyReady, setHistoryReady] = useState(false);
    useEffect(() => {
        const timer = window.setTimeout(() => setHistoryReady(true), 0);
        return () => window.clearTimeout(timer);
    }, []);
    const history = useEditorHistory({
        value: { settings: settingsForm.data, media: mediaForm.data },
        onChange: (snapshot) => {
            settingsForm.setData(snapshot.settings);
            mediaForm.setData(snapshot.media);
        },
        enabled: historyReady,
    });
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (settingsForm.processing) return;
            if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
            const target = event.target as HTMLElement | null;
            if (
                target?.closest(
                    'input, textarea, [contenteditable="true"], [role="dialog"]',
                )
            )
                return;
            if (event.key.toLowerCase() === 'z') {
                event.preventDefault();
                if (event.shiftKey) history.redo();
                else history.undo();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [history, settingsForm.processing]);
    useUnsavedChangesGuard(hasUnpublishedChanges);
    const logoPreviewUrl = useMediaPreview(mediaForm.data.logo);
    const coverPreviewUrl = useMediaPreview(mediaForm.data.cover_image);
    const backgroundPreviewUrl = useMediaPreview(
        mediaForm.data.background_image,
    );

    const draftSettings = useMemo(
        () => ({
            ...settingsForm.data,
            logo_url: mediaForm.data.remove_logo
                ? null
                : (logoPreviewUrl ?? settings.logo_url),
            background_image_url: mediaForm.data.remove_background_image
                ? null
                : (backgroundPreviewUrl ?? settings.background_image_url),
            cover_image_url: mediaForm.data.remove_cover_image
                ? null
                : (coverPreviewUrl ?? settings.cover_image_url),
            cover_thumbnail_url: mediaForm.data.remove_cover_image
                ? null
                : (coverPreviewUrl ?? settings.cover_thumbnail_url),
        }),
        [
            settingsForm.data,
            settings.logo_url,
            settings.background_image_url,
            settings.cover_image_url,
            settings.cover_thumbnail_url,
            coverPreviewUrl,
            logoPreviewUrl,
            backgroundPreviewUrl,
            mediaForm.data.remove_logo,
            mediaForm.data.remove_cover_image,
            mediaForm.data.remove_background_image,
        ],
    );

    const selectedSection = settingsForm.data.sections.find(
        (section) =>
            section.type === (activePanel === 'brand' ? 'hero' : activePanel),
    );
    const previewCanvasWidth = viewport === 'mobile' ? 390 : 1440;
    const previewFitScale = Math.min(
        1,
        (previewStageWidth || previewCanvasWidth) / previewCanvasWidth,
    );
    const previewScale =
        previewMode === 'test' || zoom === null ? previewFitScale : zoom / 100;
    const previewCanvasHeight =
        previewMode === 'test' && previewStageHeight > 0
            ? Math.max(1, Math.floor(previewStageHeight / previewScale))
            : viewport === 'mobile'
              ? 844
              : 1024;
    const formErrorEntries = Object.entries(settingsForm.errors) as Array<
        [string, string]
    >;
    const publicationErrors = settingsForm.errors as Record<string, string>;
    const hasFormErrors = formErrorEntries.length > 0;
    const firstErrorPanel = formErrorEntries[0]
        ? panelForError(formErrorEntries[0][0], settingsForm.data.sections)
        : null;
    const panelErrorCounts = useMemo(
        () =>
            formErrorEntries.reduce<Partial<Record<CatalogPanel, number>>>(
                (counts, [errorKey]) => {
                    const panel = panelForError(
                        errorKey,
                        settingsForm.data.sections,
                    );
                    counts[panel] = (counts[panel] ?? 0) + 1;

                    return counts;
                },
                {},
            ),
        [formErrorEntries, settingsForm.data.sections],
    );
    const brandDisplay =
        settingsForm.data.show_logo && settingsForm.data.show_brand_name
            ? 'both'
            : settingsForm.data.show_logo
              ? 'logo'
              : 'name';

    useEffect(() => {
        const viewportElement = previewScrollRef.current;

        if (!viewportElement || typeof ResizeObserver === 'undefined') {
            return;
        }

        const observer = new ResizeObserver((entries) => {
            const viewportEntry = entries.find(
                (entry) => entry.target === viewportElement,
            );
            if (!viewportEntry) return;
            setPreviewStageWidth(Math.floor(viewportEntry.contentRect.width));
            setPreviewStageHeight(Math.floor(viewportEntry.contentRect.height));
        });

        observer.observe(viewportElement);

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!pendingErrorKey) {
            return;
        }

        const timeout = window.setTimeout(() => {
            const behavior = window.matchMedia(
                '(prefers-reduced-motion: reduce)',
            ).matches
                ? 'auto'
                : 'smooth';
            const target = inspectorRef.current?.querySelector<HTMLElement>(
                `[data-catalog-error="${pendingErrorKey}"]`,
            );

            if (target) {
                target.scrollIntoView({
                    behavior,
                    block: 'center',
                });
                target
                    .querySelector<HTMLElement>(
                        'input, textarea, button, [tabindex]:not([tabindex="-1"])',
                    )
                    ?.focus({ preventScroll: true });
            } else {
                inspectorRef.current?.scrollTo({ top: 0, behavior });
            }

            setPendingErrorKey(null);
        }, 80);

        return () => window.clearTimeout(timeout);
    }, [activePanel, pendingErrorKey]);

    const updateSection = (
        type: CatalogSectionType,
        updater: (section: CatalogSection) => CatalogSection,
    ) => {
        settingsForm.setData(
            'sections',
            settingsForm.data.sections.map((section) =>
                section.type === type ? updater(section) : section,
            ),
        );
    };

    const updateSectionProp = (
        type: CatalogSectionType,
        key: string,
        value: string | number | boolean | null,
    ) => {
        updateSection(type, (section) => ({
            ...section,
            props: {
                ...section.props,
                [key]: value,
                ...(type === 'hero' &&
                ['headline', 'subtitle', 'eyebrow', 'cta_text'].includes(key)
                    ? { [`${key}_fallback`]: false }
                    : {}),
            },
        }));
    };

    const toggleSection = (type: CatalogSectionType) => {
        updateSection(type, (section) => ({
            ...section,
            enabled: !section.enabled,
        }));
    };

    const handleSectionDrop = (targetType: CatalogSectionType) => {
        if (!draggedSection || draggedSection === targetType) {
            setDraggedSection(null);
            return;
        }

        const sections = [...settingsForm.data.sections];
        const sourceIndex = sections.findIndex(
            (section) => section.type === draggedSection,
        );
        const targetIndex = sections.findIndex(
            (section) => section.type === targetType,
        );

        if (sourceIndex < 0 || targetIndex < 0) {
            setDraggedSection(null);
            return;
        }

        const [moved] = sections.splice(sourceIndex, 1);
        sections.splice(targetIndex, 0, moved);
        settingsForm.setData('sections', sections);
        setDraggedSection(null);
    };

    const guideToFirstError = (errors: Record<string, string>) => {
        const firstErrorKey = Object.keys(errors)[0];

        if (!firstErrorKey) {
            return;
        }
        if (firstErrorKey === 'catalog_publication') {
            window.requestAnimationFrame(() =>
                document.getElementById('catalog-save-errors')?.focus(),
            );
            return;
        }

        selectPanel(panelForError(firstErrorKey, settingsForm.data.sections));
        setPendingErrorKey(firstErrorKey);
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        settingsForm.transform((data) => ({
            ...data,
            _method: 'put',
            ...mediaForm.data,
        }));
        settingsForm.post(manufacturer.catalogSettings.update().url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                settingsForm.setDefaults();
                mediaForm.reset();
                setLogoUploadError(null);
                history.reset({
                    settings: settingsForm.data,
                    media: {
                        logo: null,
                        cover_image: null,
                        background_image: null,
                        remove_logo: false,
                        remove_cover_image: false,
                        remove_background_image: false,
                    },
                });
            },
            onError: (errors) => guideToFirstError(errors),
            onFinish: () => settingsForm.transform((data) => data),
        });
    };

    const handleBrandDisplayChange = (display: string) => {
        settingsForm.setData((data) => ({
            ...data,
            show_logo: display === 'logo' || display === 'both',
            show_brand_name: display === 'name' || display === 'both',
        }));
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(public_link);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
        } catch {
            setCopied(false);
        }
    };

    const handleLogoSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        event.target.value = '';

        if (!file) {
            return;
        }

        setLogoUploadError(null);
        setLogoCropFile(file);
        setLogoCropDialogOpen(true);
    };

    const handleLogoCropped = (croppedFile: File) => {
        history.flush();
        setLogoCropFile(null);
        setLogoCropDialogOpen(false);
        setLogoUploadError(null);
        mediaForm.setData((data) => ({
            ...data,
            logo: croppedFile,
            remove_logo: false,
        }));
    };

    const handleRemoveLogo = () => {
        history.flush();
        setLogoUploadError(null);
        mediaForm.setData((data) => ({
            ...data,
            logo: null,
            remove_logo: true,
        }));
    };

    const handleBackgroundSelected = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        history.flush();
        mediaForm.setData((data) => ({
            ...data,
            background_image: file,
            remove_background_image: false,
        }));
    };

    const handleCoverSelected = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0] ?? null;
        event.target.value = '';

        if (!file) {
            return;
        }

        history.flush();
        mediaForm.setData((data) => ({
            ...data,
            cover_image: file,
            remove_cover_image: false,
        }));
    };

    const handleRemoveCover = () => {
        history.flush();
        mediaForm.setData((data) => ({
            ...data,
            cover_image: null,
            remove_cover_image: true,
        }));
    };

    const updateCoverFocalPoint = (axis: 'x' | 'y', value: number) => {
        const key = `cover_image_focal_${axis}` as const;

        settingsForm.setData(key, value);
    };

    const handleRemoveBackground = () => {
        history.flush();
        mediaForm.setData((data) => ({
            ...data,
            background_image: null,
            remove_background_image: true,
        }));
    };

    const revertMedia = (key: 'logo' | 'cover_image' | 'background_image') => {
        history.flush();
        mediaForm.setData((data) => ({
            ...data,
            [key]: null,
            [`remove_${key}`]: false,
        }));
    };

    const handleRotateLink = () => {
        settingsForm.post(manufacturer.catalogSettings.rotateLink().url, {
            preserveScroll: true,
            onSuccess: () => setRotateDialogOpen(false),
        });
    };

    const handleResetDefaults = () => {
        history.flush();
        settingsForm.setData(
            (data) =>
                ({
                    ...data,
                    ...appearance_defaults,
                    tagline: appearance_defaults.tagline ?? '',
                    description: appearance_defaults.description ?? '',
                    heading_font_family:
                        appearance_defaults.heading_font_family ??
                        appearance_defaults.font_family ??
                        'fraunces',
                    body_font_family:
                        appearance_defaults.body_font_family ??
                        appearance_defaults.font_family ??
                        'manrope',
                    sections: normalizeSections(
                        appearance_defaults.sections ?? [],
                    ),
                }) as typeof data,
        );
        setResetDialogOpen(false);
    };

    const renderInspector = () => {
        if (activePanel === 'brand') {
            const logoSize = normalizeCatalogLogoSize(
                sectionProp(
                    selectedSection,
                    'logo_size',
                    CATALOG_LOGO_SIZE.default,
                ),
            );

            return (
                <>
                    <InspectorHeader
                        eyebrow="Configurações"
                        title="Marca"
                    />
                    <InspectorSection title="Identidade">
                        <div className="space-y-4">
                            <div
                                className="space-y-2"
                                data-catalog-error="brand_name"
                            >
                                <Label htmlFor="brand-name" className="text-xs">
                                    Nome da marca
                                </Label>
                                <Input
                                    id="brand-name"
                                    value={settingsForm.data.brand_name}
                                    onChange={(event) =>
                                        settingsForm.setData(
                                            'brand_name',
                                            event.target.value,
                                        )
                                    }
                                    aria-invalid={Boolean(
                                        settingsForm.errors.brand_name,
                                    )}
                                    className="h-11 rounded-[2px] border-border bg-transparent shadow-none focus-visible:border-[#18181f] focus-visible:ring-0"
                                />
                                <InputError
                                    message={settingsForm.errors.brand_name}
                                />
                            </div>
                            <SegmentedControl
                                label="Exibição da marca"
                                value={brandDisplay}
                                options={[
                                    { value: 'logo', label: 'Logo' },
                                    { value: 'both', label: 'Ambos' },
                                    { value: 'name', label: 'Nome' },
                                ]}
                                onChange={handleBrandDisplayChange}
                            />
                            <div
                                className="flex min-h-24 items-center justify-center border border-border p-4"
                                style={{
                                    background:
                                        'repeating-conic-gradient(#8e8e8e 0% 25%, #b6b6b6 0% 50%) 0 / 16px 16px',
                                }}
                            >
                                {draftSettings.logo_url ? (
                                    <img
                                        src={draftSettings.logo_url}
                                        alt={settingsForm.data.brand_name}
                                        className="h-auto object-contain"
                                        style={catalogLogoStyle(
                                            logoSize,
                                            160,
                                            64,
                                        )}
                                    />
                                ) : (
                                    <span className="text-xs text-muted-foreground">
                                        Sua logo aparece aqui
                                    </span>
                                )}
                            </div>
                            <p className="text-xs leading-5 text-[#66635d]">
                                O quadriculado ajuda a ver a transparência. Ele
                                não aparece no catálogo.
                            </p>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoSelected}
                                disabled={settingsForm.processing}
                                className="peer sr-only"
                                id="catalog-logo-file"
                            />
                            <Label
                                htmlFor="catalog-logo-file"
                                aria-disabled={settingsForm.processing}
                                className={cn(
                                    'inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 border border-border px-3 text-xs font-semibold peer-focus-visible:outline-2 peer-focus-visible:outline-[#ff4d3d] hover:bg-[#e7e3dc]/45',
                                    settingsForm.processing &&
                                        'pointer-events-none cursor-wait opacity-60',
                                )}
                            >
                                {settingsForm.processing ? (
                                    <Loader2
                                        className="size-4 animate-spin"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <Upload
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                )}
                                {settingsForm.processing
                                    ? 'Salvando…'
                                    : draftSettings.logo_url
                                      ? 'Trocar logo'
                                      : 'Escolher logo'}
                            </Label>
                            <MediaDraftNotice
                                pending={Boolean(mediaForm.data.logo)}
                                removed={mediaForm.data.remove_logo}
                                onRevert={() => revertMedia('logo')}
                            />
                            {draftSettings.logo_url && (
                                <>
                                    <div className="space-y-3 border-t border-border pt-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <Label className="text-xs">
                                                Tamanho da logo
                                            </Label>
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {logoSize}%
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                aria-label="Diminuir tamanho da logo"
                                                disabled={
                                                    logoSize <=
                                                    CATALOG_LOGO_SIZE.min
                                                }
                                                onClick={() =>
                                                    updateSectionProp(
                                                        'hero',
                                                        'logo_size',
                                                        Math.max(
                                                            CATALOG_LOGO_SIZE.min,
                                                            logoSize - 10,
                                                        ),
                                                    )
                                                }
                                                className="inline-flex size-11 shrink-0 items-center justify-center border border-border transition-colors hover:bg-[#e7e3dc]/55 disabled:cursor-not-allowed disabled:opacity-35"
                                            >
                                                <Minus
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                            </button>
                                            <Slider
                                                aria-label="Tamanho da logo"
                                                min={CATALOG_LOGO_SIZE.min}
                                                max={CATALOG_LOGO_SIZE.max}
                                                step={CATALOG_LOGO_SIZE.step}
                                                value={[logoSize]}
                                                onValueChange={([value]) =>
                                                    updateSectionProp(
                                                        'hero',
                                                        'logo_size',
                                                        value,
                                                    )
                                                }
                                                className="flex-1"
                                            />
                                            <button
                                                type="button"
                                                aria-label="Aumentar tamanho da logo"
                                                disabled={
                                                    logoSize >=
                                                    CATALOG_LOGO_SIZE.max
                                                }
                                                onClick={() =>
                                                    updateSectionProp(
                                                        'hero',
                                                        'logo_size',
                                                        Math.min(
                                                            CATALOG_LOGO_SIZE.max,
                                                            logoSize + 10,
                                                        ),
                                                    )
                                                }
                                                className="inline-flex size-11 shrink-0 items-center justify-center border border-border transition-colors hover:bg-[#e7e3dc]/55 disabled:cursor-not-allowed disabled:opacity-35"
                                            >
                                                <Plus
                                                    className="size-3.5"
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        </div>
                                        <div className="flex justify-between text-[0.65rem] text-muted-foreground">
                                            <span>Discreta</span>
                                            <span>Protagonista</span>
                                        </div>
                                    </div>
                                    <SegmentedControl
                                        label="Alinhamento da logo"
                                        value={sectionProp(
                                            selectedSection,
                                            'logo_align',
                                            sectionProp<string>(
                                                selectedSection,
                                                'align',
                                                'left',
                                            ) === 'center'
                                                ? 'center'
                                                : 'left',
                                        )}
                                        options={[
                                            {
                                                value: 'left',
                                                label: 'Esquerda',
                                            },
                                            {
                                                value: 'center',
                                                label: 'Centro',
                                            },
                                            {
                                                value: 'right',
                                                label: 'Direita',
                                            },
                                        ]}
                                        onChange={(value) =>
                                            updateSectionProp(
                                                'hero',
                                                'logo_align',
                                                value,
                                            )
                                        }
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRemoveLogo}
                                        disabled={settingsForm.processing}
                                        className="text-xs font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground"
                                    >
                                        Remover logo atual
                                    </button>
                                </>
                            )}
                            <InputError
                                message={
                                    logoUploadError ?? publicationErrors.logo
                                }
                            />
                        </div>
                    </InspectorSection>
                </>
            );
        }
        if (activePanel === 'hero') {
            const coverFit = normalizeCatalogCoverFit(
                sectionProp(selectedSection, 'image_fit', 'cover'),
            );
            const coverScale = normalizeCatalogCoverScale(
                sectionProp(
                    selectedSection,
                    'image_scale',
                    CATALOG_COVER_SCALE.default,
                ),
            );
            const heroSectionIndex = Math.max(
                0,
                settingsForm.data.sections.findIndex(
                    (section) => section.type === 'hero',
                ),
            );

            return (
                <>
                    <InspectorHeader
                        eyebrow="Seção selecionada"
                        title="Capa do catálogo"
                    />
                    <InspectorSection title="Imagem de campanha">
                        <div className="space-y-4">
                            <div className="relative aspect-[3/2] overflow-hidden border border-border bg-[#e7e3dc]/45">
                                {draftSettings.cover_image_url ? (
                                    <img
                                        src={
                                            draftSettings.cover_image_url ??
                                            undefined
                                        }
                                        alt="Prévia da imagem de campanha"
                                        className="h-full w-full"
                                        style={catalogCoverImageStyle(
                                            coverFit,
                                            coverScale,
                                            settingsForm.data
                                                .cover_image_focal_x,
                                            settingsForm.data
                                                .cover_image_focal_y,
                                        )}
                                    />
                                ) : (
                                    <div className="flex h-full flex-col items-center justify-center gap-2 px-5 text-center text-muted-foreground">
                                        <ImageIcon
                                            className="size-6"
                                            aria-hidden="true"
                                        />
                                        <p className="text-xs leading-5">
                                            Envie a fotografia que abre a
                                            coleção. Sem ela, a capa permanece
                                            apenas com texto.
                                        </p>
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleCoverSelected}
                                className="peer sr-only"
                                id="catalog-cover-file"
                            />
                            <div
                                className="grid gap-2"
                                data-catalog-error="cover_image"
                            >
                                <Label
                                    htmlFor="catalog-cover-file"
                                    className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 border border-border px-3 text-xs font-semibold hover:bg-[#e7e3dc]/45"
                                >
                                    <Upload
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Escolher foto
                                </Label>
                            </div>
                            <MediaDraftNotice
                                pending={Boolean(mediaForm.data.cover_image)}
                                removed={mediaForm.data.remove_cover_image}
                                onRevert={() => revertMedia('cover_image')}
                            />
                            {settingsForm.progress && (
                                <div
                                    className="h-1 overflow-hidden bg-[#d7d2c9]"
                                    aria-label={`Envio do catálogo em ${settingsForm.progress.percentage}%`}
                                >
                                    <div
                                        className="h-full bg-[#ff4d3d] transition-[width]"
                                        style={{
                                            width: `${settingsForm.progress.percentage}%`,
                                        }}
                                    />
                                </div>
                            )}
                            {draftSettings.cover_image_url && (
                                <button
                                    type="button"
                                    onClick={handleRemoveCover}
                                    className="text-xs font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground"
                                >
                                    Remover imagem de campanha
                                </button>
                            )}
                            <InputError
                                message={
                                    (
                                        settingsForm.errors as Record<
                                            string,
                                            string
                                        >
                                    ).cover_image ??
                                    mediaForm.errors.cover_image
                                }
                            />

                            <div className="space-y-4 border-t border-border pt-4">
                                <div
                                    className="space-y-2"
                                    data-catalog-error={`sections.${heroSectionIndex}.props.image_fit`}
                                >
                                    <Label className="text-xs">
                                        Tamanho da Imagem de Capa
                                    </Label>
                                    <div
                                        className="grid grid-cols-2 border-t border-l border-border"
                                        role="radiogroup"
                                        aria-label="Ajuste da imagem de campanha"
                                    >
                                        {coverFitOptions.map((option) => {
                                            const isSelected =
                                                coverFit === option.value;

                                            return (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={isSelected}
                                                    onClick={() =>
                                                        updateSectionProp(
                                                            'hero',
                                                            'image_fit',
                                                            option.value,
                                                        )
                                                    }
                                                    className={cn(
                                                        'min-h-24 border-r border-b border-border p-3 text-left transition-colors',
                                                        isSelected
                                                            ? 'bg-[#18181f] text-white'
                                                            : 'bg-background hover:bg-[#e7e3dc]/45',
                                                    )}
                                                >
                                                    <span className="block text-xs font-semibold">
                                                        {option.label}
                                                    </span>
                                                    <span
                                                        className={cn(
                                                            'mt-1.5 block text-[0.65rem] leading-4',
                                                            isSelected
                                                                ? 'text-white/60'
                                                                : 'text-muted-foreground',
                                                        )}
                                                    >
                                                        {option.description}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <SegmentedControl
                                    label="Alinhamento da capa"
                                    value={
                                        sectionProp<string>(
                                            selectedSection,
                                            'align',
                                            'left',
                                        ) === 'right'
                                            ? 'left'
                                            : sectionProp(
                                                  selectedSection,
                                                  'align',
                                                  'left',
                                              )
                                    }
                                    options={[
                                        {
                                            value: 'left',
                                            label: 'Lado a lado',
                                            icon: (
                                                <AlignLeft className="size-4" />
                                            ),
                                        },
                                        {
                                            value: 'center',
                                            label: 'Centralizado',
                                            icon: (
                                                <AlignCenter className="size-4" />
                                            ),
                                        },
                                        {
                                            value: 'background',
                                            label: 'Imagem de fundo',
                                            icon: (
                                                <ImageIcon className="size-4" />
                                            ),
                                        },
                                    ]}
                                    onChange={(value) =>
                                        updateSectionProp(
                                            'hero',
                                            'align',
                                            value,
                                        )
                                    }
                                />
                                {['left', 'right'].includes(
                                    sectionProp(
                                        selectedSection,
                                        'align',
                                        'left',
                                    ),
                                ) && (
                                    <SegmentedControl
                                        label="Posição da imagem"
                                        value={sectionProp(
                                            selectedSection,
                                            'align',
                                            'left',
                                        )}
                                        options={[
                                            {
                                                value: 'right',
                                                label: 'À esquerda',
                                            },
                                            {
                                                value: 'left',
                                                label: 'À direita',
                                            },
                                        ]}
                                        onChange={(value) =>
                                            updateSectionProp(
                                                'hero',
                                                'align',
                                                value,
                                            )
                                        }
                                    />
                                )}
                                {['center', 'background'].includes(
                                    sectionProp(
                                        selectedSection,
                                        'align',
                                        'left',
                                    ),
                                ) && (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label
                                                htmlFor="hero-overlay"
                                                className="text-xs"
                                            >
                                                Escurecimento da foto
                                            </Label>
                                            <span className="text-xs text-muted-foreground">
                                                {sectionProp(
                                                    selectedSection,
                                                    'overlay_opacity',
                                                    0,
                                                )}
                                                %
                                            </span>
                                        </div>
                                        <Slider
                                            id="hero-overlay"
                                            aria-label="Escurecimento da foto"
                                            min={0}
                                            max={80}
                                            step={5}
                                            value={[
                                                sectionProp(
                                                    selectedSection,
                                                    'overlay_opacity',
                                                    0,
                                                ),
                                            ]}
                                            onValueChange={([value]) =>
                                                updateSectionProp(
                                                    'hero',
                                                    'overlay_opacity',
                                                    value,
                                                )
                                            }
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Opcional. Em 0%, a foto aparece sem
                                            filtro.
                                        </p>
                                        <p className="border-l-2 border-[#cac4ba] pl-3 text-xs leading-5 text-muted-foreground">
                                            Confira se a logo e os textos ficam
                                            legíveis sobre a foto, também no
                                            celular. Você pode ajustar o
                                            enquadramento ou o escurecimento,
                                            sem obrigação de usar filtro.
                                        </p>
                                    </div>
                                )}

                                {coverFit === 'manual' && (
                                    <div
                                        className="space-y-2"
                                        data-catalog-error={`sections.${heroSectionIndex}.props.image_scale`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <Label className="text-xs">
                                                Tamanho da imagem
                                            </Label>
                                            <span className="text-[0.68rem] font-semibold text-muted-foreground tabular-nums">
                                                {coverScale}%
                                            </span>
                                        </div>
                                        <Slider
                                            aria-label="Tamanho da imagem de campanha"
                                            min={CATALOG_COVER_SCALE.min}
                                            max={CATALOG_COVER_SCALE.max}
                                            step={CATALOG_COVER_SCALE.step}
                                            value={[coverScale]}
                                            onValueChange={([value]) =>
                                                updateSectionProp(
                                                    'hero',
                                                    'image_scale',
                                                    value,
                                                )
                                            }
                                        />
                                        <div className="flex justify-between text-[0.65rem] text-muted-foreground">
                                            <span>Menor</span>
                                            <span>Maior</span>
                                        </div>
                                    </div>
                                )}

                                <details className="group border-t border-border pt-2">
                                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-[#ff4d3d]">
                                        Ajustar enquadramento
                                        <ChevronDown className="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                                    </summary>
                                    <div className="space-y-4 pt-3">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <Label className="text-xs">
                                                    Enquadramento horizontal
                                                </Label>
                                                <span className="text-[0.68rem] font-semibold text-muted-foreground tabular-nums">
                                                    {
                                                        settingsForm.data
                                                            .cover_image_focal_x
                                                    }
                                                    %
                                                </span>
                                            </div>
                                            <Slider
                                                aria-label="Enquadramento horizontal"
                                                min={0}
                                                max={100}
                                                step={1}
                                                value={[
                                                    settingsForm.data
                                                        .cover_image_focal_x,
                                                ]}
                                                onValueChange={([value]) =>
                                                    updateCoverFocalPoint(
                                                        'x',
                                                        value,
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-3">
                                                <Label className="text-xs">
                                                    Enquadramento vertical
                                                </Label>
                                                <span className="text-[0.68rem] font-semibold text-muted-foreground tabular-nums">
                                                    {
                                                        settingsForm.data
                                                            .cover_image_focal_y
                                                    }
                                                    %
                                                </span>
                                            </div>
                                            <Slider
                                                aria-label="Enquadramento vertical"
                                                min={0}
                                                max={100}
                                                step={1}
                                                value={[
                                                    settingsForm.data
                                                        .cover_image_focal_y,
                                                ]}
                                                onValueChange={([value]) =>
                                                    updateCoverFocalPoint(
                                                        'y',
                                                        value,
                                                    )
                                                }
                                            />
                                        </div>
                                    </div>
                                </details>
                            </div>
                        </div>
                    </InspectorSection>
                    <InspectorSection title="Textos da Capa">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="hero-eyebrow"
                                    className="text-xs"
                                >
                                    Linha de abertura
                                </Label>
                                <Input
                                    id="hero-eyebrow"
                                    value={sectionProp(
                                        selectedSection,
                                        'eyebrow',
                                        'Nova coleção',
                                    )}
                                    onChange={(event) =>
                                        updateSectionProp(
                                            'hero',
                                            'eyebrow',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Ex: Verão 2026"
                                    maxLength={60}
                                    className="h-11 rounded-[2px] border-border bg-transparent shadow-none focus-visible:border-[#18181f] focus-visible:ring-0"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label
                                    htmlFor="hero-headline"
                                    className="text-xs"
                                >
                                    Título da coleção
                                </Label>
                                <Input
                                    id="hero-headline"
                                    value={sectionProp(
                                        selectedSection,
                                        'headline',
                                        '',
                                    )}
                                    onChange={(event) =>
                                        updateSectionProp(
                                            'hero',
                                            'headline',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Ex: Verão 2026"
                                    maxLength={80}
                                    className="h-11 rounded-[2px] border-border bg-transparent shadow-none focus-visible:border-[#18181f] focus-visible:ring-0"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label
                                    htmlFor="hero-subtitle"
                                    className="text-xs"
                                >
                                    Apresentação
                                </Label>
                                <textarea
                                    id="hero-subtitle"
                                    value={sectionProp(
                                        selectedSection,
                                        'subtitle',
                                        '',
                                    )}
                                    onChange={(event) =>
                                        updateSectionProp(
                                            'hero',
                                            'subtitle',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Conte o que torna esta coleção especial."
                                    maxLength={220}
                                    className="min-h-28 w-full resize-y border border-border bg-transparent px-3 py-3 text-sm leading-5 outline-none focus:border-[#18181f]"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="hero-cta" className="text-xs">
                                    Convite para explorar
                                </Label>
                                <Input
                                    id="hero-cta"
                                    value={sectionProp(
                                        selectedSection,
                                        'cta_text',
                                        'Conheça a coleção',
                                    )}
                                    onChange={(event) =>
                                        updateSectionProp(
                                            'hero',
                                            'cta_text',
                                            event.target.value,
                                        )
                                    }
                                    maxLength={48}
                                    className="h-11 rounded-[2px] border-border bg-transparent shadow-none focus-visible:border-[#18181f] focus-visible:ring-0"
                                />
                            </div>
                            <div className="space-y-3 border-t border-border pt-4">
                                <OptionSwitch
                                    label="Mostrar Âncora"
                                    description="Leva o lojista diretamente para as peças."
                                    checked={sectionProp(
                                        selectedSection,
                                        'show_cta',
                                        true,
                                    )}
                                    onCheckedChange={(checked) =>
                                        updateSectionProp(
                                            'hero',
                                            'show_cta',
                                            checked,
                                        )
                                    }
                                />
                                <OptionSwitch
                                    label="Mostrar quantidade de produtos"
                                    description="Útil em catálogo técnico; opcional em lookbooks."
                                    checked={sectionProp(
                                        selectedSection,
                                        'show_product_count',
                                        false,
                                    )}
                                    onCheckedChange={(checked) =>
                                        updateSectionProp(
                                            'hero',
                                            'show_product_count',
                                            checked,
                                        )
                                    }
                                />
                            </div>
                        </div>
                    </InspectorSection>
                </>
            );
        }

        if (activePanel === 'collections') {
            return (
                <>
                    <InspectorHeader
                        eyebrow="Seção selecionada"
                        title="Coleções"
                    />
                    <InspectorSection>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold">
                                    Mostrar seção
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Usa as categorias já cadastradas.
                                </p>
                            </div>
                            <Switch
                                checked={selectedSection?.enabled ?? true}
                                onCheckedChange={() =>
                                    toggleSection('collections')
                                }
                                aria-label="Mostrar seção de coleções"
                                className="data-[state=checked]:bg-[#ff4d3d]"
                            />
                        </div>
                    </InspectorSection>
                    <InspectorSection title="Conteúdo">
                        <div className="space-y-4">
                            <SegmentedControl
                                label="Como as coleções aparecem"
                                value={sectionProp(
                                    selectedSection,
                                    'display',
                                    'tabs',
                                )}
                                options={[
                                    { value: 'tabs', label: 'Linha' },
                                    { value: 'chips', label: 'Pílulas' },
                                ]}
                                onChange={(value) =>
                                    updateSectionProp(
                                        'collections',
                                        'display',
                                        value,
                                    )
                                }
                            />
                        </div>
                    </InspectorSection>
                </>
            );
        }

        if (activePanel === 'product_grid') {
            return (
                <>
                    <InspectorHeader
                        eyebrow="Seção selecionada"
                        title="Produtos"
                    />
                    <InspectorSection>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-semibold">
                                    Mostrar produtos
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Mantém a coleção disponível para consulta.
                                </p>
                            </div>
                            <Switch
                                checked={selectedSection?.enabled ?? true}
                                onCheckedChange={() =>
                                    toggleSection('product_grid')
                                }
                                aria-label="Mostrar produtos"
                                className="data-[state=checked]:bg-[#ff4d3d]"
                            />
                        </div>
                    </InspectorSection>
                    <InspectorSection title="Composição">
                        <div className="space-y-4">
                            <SegmentedControl
                                label="Linguagem da vitrine"
                                value={sectionProp(
                                    selectedSection,
                                    'presentation',
                                    'commercial',
                                )}
                                options={[
                                    {
                                        value: 'editorial',
                                        label: 'Lookbook',
                                    },
                                    {
                                        value: 'commercial',
                                        label: 'Comercial',
                                    },
                                ]}
                                onChange={(value) =>
                                    updateSectionProp(
                                        'product_grid',
                                        'presentation',
                                        value,
                                    )
                                }
                            />
                            <SegmentedControl
                                label="Produtos por linha no desktop"
                                value={String(
                                    sectionProp(
                                        selectedSection,
                                        'columns_desktop',
                                        3,
                                    ),
                                )}
                                options={[
                                    { value: '3', label: '3 peças' },
                                    { value: '4', label: '4 peças' },
                                ]}
                                onChange={(value) =>
                                    updateSectionProp(
                                        'product_grid',
                                        'columns_desktop',
                                        Number(value),
                                    )
                                }
                            />
                            <SegmentedControl
                                label="Distância entre as peças"
                                value={settingsForm.data.layout_density}
                                options={[
                                    {
                                        value: 'comfortable',
                                        label: 'Amplo',
                                    },
                                    { value: 'compact', label: 'Próximo' },
                                ]}
                                onChange={(value) =>
                                    settingsForm.setData(
                                        'layout_density',
                                        value,
                                    )
                                }
                                error={settingsForm.errors.layout_density}
                                errorKey="layout_density"
                            />
                            {sectionProp(
                                selectedSection,
                                'presentation',
                                'commercial',
                            ) === 'commercial' ? (
                                <SegmentedControl
                                    label="Acabamento das peças"
                                    value={settingsForm.data.card_style}
                                    options={[
                                        { value: 'flat', label: 'Contorno' },
                                        {
                                            value: 'soft',
                                            label: 'Flutuante',
                                        },
                                    ]}
                                    onChange={(value) =>
                                        settingsForm.setData(
                                            'card_style',
                                            value,
                                        )
                                    }
                                    error={settingsForm.errors.card_style}
                                    errorKey="card_style"
                                />
                            ) : (
                                <div data-catalog-error="card_style">
                                    <p className="border-l-2 border-[#ff4d3d] pl-3 text-xs leading-5 text-muted-foreground">
                                        No lookbook, imagens e informações
                                        entram direto na página, sem moldura ou
                                        sombra.
                                    </p>
                                    <InputError
                                        message={settingsForm.errors.card_style}
                                    />
                                </div>
                            )}
                        </div>
                    </InspectorSection>
                    <InspectorSection title="Informação comercial">
                        <div className="space-y-4">
                            <p className="text-xs leading-5 text-muted-foreground">
                                Escolha o que o lojista precisa ver antes de
                                abrir os detalhes da peça.
                            </p>
                            <OptionSwitch
                                label="Preço na vitrine"
                                description={
                                    settingsForm.data.hide_prices
                                        ? 'Oculto porque a negociação está direcionada ao WhatsApp.'
                                        : 'Mostra o valor de atacado nos cards da vitrine.'
                                }
                                checked={sectionProp(
                                    selectedSection,
                                    'show_price',
                                    true,
                                )}
                                disabled={settingsForm.data.hide_prices}
                                onCheckedChange={(checked) =>
                                    updateSectionProp(
                                        'product_grid',
                                        'show_price',
                                        checked,
                                    )
                                }
                            />
                            <OptionSwitch
                                label="Código da peça"
                                description="Exibe o SKU abaixo do nome."
                                checked={sectionProp(
                                    selectedSection,
                                    'show_sku',
                                    true,
                                )}
                                onCheckedChange={(checked) =>
                                    updateSectionProp(
                                        'product_grid',
                                        'show_sku',
                                        checked,
                                    )
                                }
                            />
                            <OptionSwitch
                                label="Disponibilidade"
                                description="Antecipa o estoque disponível."
                                checked={sectionProp(
                                    selectedSection,
                                    'show_stock',
                                    true,
                                )}
                                onCheckedChange={(checked) =>
                                    updateSectionProp(
                                        'product_grid',
                                        'show_stock',
                                        checked,
                                    )
                                }
                            />
                            <OptionSwitch
                                label="Variações"
                                description="Mostra tamanhos, cores e estampas."
                                checked={sectionProp(
                                    selectedSection,
                                    'show_variations',
                                    true,
                                )}
                                onCheckedChange={(checked) =>
                                    updateSectionProp(
                                        'product_grid',
                                        'show_variations',
                                        checked,
                                    )
                                }
                            />
                            <OptionSwitch
                                label="Quantidade no card"
                                description="Permite escolher quantas peças adicionar sem abrir os detalhes."
                                checked={sectionProp(
                                    selectedSection,
                                    'show_quantity_selector',
                                    true,
                                )}
                                onCheckedChange={(checked) =>
                                    updateSectionProp(
                                        'product_grid',
                                        'show_quantity_selector',
                                        checked,
                                    )
                                }
                            />
                            <OptionSwitch
                                label="Ação de consulta"
                                description="Mantém o convite para abrir a peça."
                                checked={sectionProp(
                                    selectedSection,
                                    'show_action',
                                    true,
                                )}
                                onCheckedChange={(checked) =>
                                    updateSectionProp(
                                        'product_grid',
                                        'show_action',
                                        checked,
                                    )
                                }
                            />
                            <OptionSwitch
                                label="Etiquetas"
                                description="Exibe categoria e outros sinais de apoio."
                                checked={sectionProp(
                                    selectedSection,
                                    'show_badges',
                                    true,
                                )}
                                onCheckedChange={(checked) =>
                                    updateSectionProp(
                                        'product_grid',
                                        'show_badges',
                                        checked,
                                    )
                                }
                            />
                        </div>
                    </InspectorSection>
                </>
            );
        }

        if (activePanel === 'appearance') {
            return (
                <>
                    <InspectorHeader
                        eyebrow="Identidade da vitrine"
                        title="Aparência"
                    />
                    <InspectorSection title="Cores">
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                            <ColorField
                                id="primary-color"
                                label="Marca"
                                value={settingsForm.data.primary_color}
                                onChange={(value) =>
                                    settingsForm.setData('primary_color', value)
                                }
                                error={settingsForm.errors.primary_color}
                                errorKey="primary_color"
                            />
                            <ColorField
                                id="accent-color"
                                label="Destaque"
                                value={settingsForm.data.accent_color}
                                onChange={(value) =>
                                    settingsForm.setData('accent_color', value)
                                }
                                error={settingsForm.errors.accent_color}
                                errorKey="accent_color"
                            />
                            <ColorField
                                id="secondary-color"
                                label="Textos"
                                value={settingsForm.data.secondary_color}
                                onChange={(value) =>
                                    settingsForm.setData(
                                        'secondary_color',
                                        value,
                                    )
                                }
                                error={settingsForm.errors.secondary_color}
                                errorKey="secondary_color"
                            />
                            <ColorField
                                id="background-color"
                                label="Fundo"
                                value={settingsForm.data.background_color}
                                onChange={(value) =>
                                    settingsForm.setData(
                                        'background_color',
                                        value,
                                    )
                                }
                                error={settingsForm.errors.background_color}
                                errorKey="background_color"
                            />
                        </div>
                        {catalogLegibilityWarnings({
                            textColor: settingsForm.data.secondary_color,
                            accentColor: settingsForm.data.accent_color,
                            backgroundColor: settingsForm.data.background_color,
                            backgroundIsVariable:
                                settingsForm.data.background_mode !== 'solid',
                        }).map((warning) => (
                            <p
                                key={warning.id}
                                className="mt-4 border-l-2 border-[#b43f32] pl-3 text-xs leading-5 text-[#66635d]"
                            >
                                {warning.message}
                            </p>
                        ))}
                    </InspectorSection>
                    <InspectorSection title="Tipografia">
                        <div className="space-y-4">
                            <div
                                className="space-y-2"
                                data-catalog-error="heading_font_family"
                            >
                                <Label className="text-xs">
                                    Títulos e marca
                                </Label>
                                <Select
                                    value={
                                        settingsForm.data.heading_font_family
                                    }
                                    onValueChange={(value) =>
                                        settingsForm.setData(
                                            'heading_font_family',
                                            value,
                                        )
                                    }
                                >
                                    <SelectTrigger
                                        aria-label="Títulos e marca"
                                        aria-invalid={Boolean(
                                            settingsForm.errors
                                                .heading_font_family,
                                        )}
                                        className="h-11 rounded-[2px] border-border bg-transparent shadow-none"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {fontOptions.map((font) => (
                                            <SelectItem
                                                key={font.value}
                                                value={font.value}
                                            >
                                                {font.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError
                                    message={
                                        settingsForm.errors.heading_font_family
                                    }
                                />
                            </div>
                            <div
                                className="space-y-2"
                                data-catalog-error="body_font_family"
                            >
                                <Label className="text-xs">
                                    Textos e informações
                                </Label>
                                <Select
                                    value={settingsForm.data.body_font_family}
                                    onValueChange={(value) =>
                                        settingsForm.setData((data) => ({
                                            ...data,
                                            body_font_family: value,
                                            font_family: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger
                                        aria-label="Textos e informações"
                                        aria-invalid={Boolean(
                                            settingsForm.errors
                                                .body_font_family,
                                        )}
                                        className="h-11 rounded-[2px] border-border bg-transparent shadow-none"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {fontOptions.map((font) => (
                                            <SelectItem
                                                key={font.value}
                                                value={font.value}
                                            >
                                                {font.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError
                                    message={
                                        settingsForm.errors.body_font_family
                                    }
                                />
                            </div>
                            <p className="text-[0.68rem] leading-4 text-muted-foreground">
                                A fonte de títulos cria presença. A de textos
                                preserva leitura em preços, filtros e detalhes.
                            </p>
                        </div>
                    </InspectorSection>
                    <InspectorSection title="Atmosfera do fundo">
                        <div className="space-y-5">
                            <SegmentedControl
                                label="Tipo de fundo"
                                value={settingsForm.data.background_mode}
                                options={[
                                    { value: 'solid', label: 'Cor' },
                                    { value: 'image', label: 'Foto' },
                                    { value: 'pattern', label: 'Padrão' },
                                    { value: 'gradient', label: 'Degradê' },
                                ]}
                                onChange={(value) =>
                                    settingsForm.setData(
                                        'background_mode',
                                        value,
                                    )
                                }
                                error={settingsForm.errors.background_mode}
                                errorKey="background_mode"
                            />

                            {settingsForm.data.background_mode === 'image' && (
                                <div className="space-y-4">
                                    {draftSettings.background_image_url && (
                                        <img
                                            src={
                                                draftSettings.background_image_url
                                            }
                                            alt="Fundo atual do catálogo"
                                            className="aspect-[16/7] w-full border border-border object-cover"
                                        />
                                    )}
                                    <input
                                        id="catalog-background-file"
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleBackgroundSelected}
                                        className="sr-only"
                                    />
                                    <Label
                                        htmlFor="catalog-background-file"
                                        className="flex min-h-11 cursor-pointer items-center justify-center gap-2 border border-border px-3 text-xs font-semibold"
                                    >
                                        <Upload className="size-4" />
                                        {draftSettings.background_image_url
                                            ? 'Trocar foto de fundo'
                                            : 'Escolher foto de fundo'}
                                    </Label>
                                    <MediaDraftNotice
                                        pending={Boolean(
                                            mediaForm.data.background_image,
                                        )}
                                        removed={
                                            mediaForm.data
                                                .remove_background_image
                                        }
                                        onRevert={() =>
                                            revertMedia('background_image')
                                        }
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        {draftSettings.background_image_url && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                onClick={handleRemoveBackground}
                                                className="min-h-11 rounded-[2px]"
                                            >
                                                Remover
                                            </Button>
                                        )}
                                    </div>
                                    <InputError
                                        message={
                                            publicationErrors.background_image
                                        }
                                    />
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-4 text-xs">
                                            <Label>Presença da foto</Label>
                                            <span className="text-muted-foreground tabular-nums">
                                                {
                                                    settingsForm.data
                                                        .background_image_opacity
                                                }
                                                %
                                            </span>
                                        </div>
                                        <Slider
                                            aria-label="Presença da foto de fundo"
                                            value={[
                                                settingsForm.data
                                                    .background_image_opacity,
                                            ]}
                                            onValueChange={([value]) =>
                                                settingsForm.setData(
                                                    'background_image_opacity',
                                                    value,
                                                )
                                            }
                                            max={100}
                                            step={5}
                                        />
                                    </div>
                                </div>
                            )}

                            {settingsForm.data.background_mode ===
                                'pattern' && (
                                <div className="space-y-4">
                                    <div
                                        className="space-y-2"
                                        data-catalog-error="pattern_id"
                                    >
                                        <Label className="text-xs">
                                            Desenho
                                        </Label>
                                        <Select
                                            value={
                                                settingsForm.data.pattern_id ??
                                                'dots'
                                            }
                                            onValueChange={(value) =>
                                                settingsForm.setData(
                                                    'pattern_id',
                                                    value,
                                                )
                                            }
                                        >
                                            <SelectTrigger
                                                aria-invalid={Boolean(
                                                    settingsForm.errors
                                                        .pattern_id,
                                                )}
                                                className="h-11 rounded-[2px] border-border bg-transparent shadow-none"
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(
                                                    PATTERN_LABELS,
                                                ).map(([key, label]) => (
                                                    <SelectItem
                                                        key={key}
                                                        value={key}
                                                    >
                                                        {label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError
                                            message={
                                                settingsForm.errors.pattern_id
                                            }
                                        />
                                    </div>
                                    <ColorField
                                        id="pattern-color"
                                        label="Cor do padrão"
                                        value={
                                            settingsForm.data.pattern_color ??
                                            settingsForm.data.primary_color
                                        }
                                        onChange={(value) =>
                                            settingsForm.setData(
                                                'pattern_color',
                                                value,
                                            )
                                        }
                                        error={
                                            settingsForm.errors.pattern_color
                                        }
                                        errorKey="pattern_color"
                                    />
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between gap-4 text-xs">
                                            <Label>Intensidade</Label>
                                            <span className="text-muted-foreground tabular-nums">
                                                {
                                                    settingsForm.data
                                                        .pattern_opacity
                                                }
                                                %
                                            </span>
                                        </div>
                                        <Slider
                                            aria-label="Intensidade do padrão de fundo"
                                            value={[
                                                settingsForm.data
                                                    .pattern_opacity,
                                            ]}
                                            onValueChange={([value]) =>
                                                settingsForm.setData(
                                                    'pattern_opacity',
                                                    value,
                                                )
                                            }
                                            max={60}
                                            step={2}
                                        />
                                    </div>
                                </div>
                            )}

                            {settingsForm.data.background_mode ===
                                'gradient' && (
                                <div
                                    className="space-y-2"
                                    data-catalog-error="gradient_id"
                                >
                                    <Label className="text-xs">
                                        Combinação de cores
                                    </Label>
                                    <Select
                                        value={
                                            settingsForm.data.gradient_id ??
                                            'soft-sky'
                                        }
                                        onValueChange={(value) =>
                                            settingsForm.setData(
                                                'gradient_id',
                                                value,
                                            )
                                        }
                                    >
                                        <SelectTrigger
                                            aria-invalid={Boolean(
                                                settingsForm.errors.gradient_id,
                                            )}
                                            className="h-11 rounded-[2px] border-border bg-transparent shadow-none"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(
                                                GRADIENT_LABELS,
                                            ).map(([key, label]) => (
                                                <SelectItem
                                                    key={key}
                                                    value={key}
                                                >
                                                    {label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={
                                            settingsForm.errors.gradient_id
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    </InspectorSection>
                    <InspectorSection>
                        <Dialog
                            open={resetDialogOpen}
                            onOpenChange={setResetDialogOpen}
                        >
                            <DialogTrigger asChild>
                                <button
                                    type="button"
                                    className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                                >
                                    <RotateCcw
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Restaurar aparência inicial
                                </button>
                            </DialogTrigger>
                            <DialogContent className="rounded-[2px] border-border bg-[#f6f4f0] shadow-none">
                                <DialogHeader>
                                    <DialogTitle className="font-zouth-display text-2xl tracking-[-0.04em]">
                                        Restaurar a aparência?
                                    </DialogTitle>
                                    <DialogDescription className="leading-6">
                                        Cores, textos e composição voltam ao
                                        início apenas na prévia. Suas imagens,
                                        forma de negociação, regras de estoque e
                                        disponibilidade do link serão mantidas.
                                        O catálogo publicado só muda ao salvar.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="min-h-11 rounded-[2px] shadow-none"
                                        >
                                            Manter catálogo
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        type="button"
                                        onClick={handleResetDefaults}
                                        disabled={settingsForm.processing}
                                        className="min-h-11 rounded-[2px] bg-[#ff4d3d] text-[#18181f] shadow-none hover:bg-[#ff4d3d]"
                                    >
                                        Restaurar
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </InspectorSection>
                </>
            );
        }

        return (
            <>
                <InspectorHeader
                    eyebrow="Publicação"
                    title="Publicar e compartilhar"
                />
                <InspectorSection title="Forma de negociação">
                    <div className="space-y-4" data-catalog-error="hide_prices">
                        <p className="text-xs leading-5 text-muted-foreground">
                            Escolha se o lojista fecha o pedido pelo catálogo ou
                            leva a seleção para uma conversa comercial.
                        </p>
                        <div className="grid border border-border bg-[#f6f4f0]">
                            <button
                                type="button"
                                onClick={() =>
                                    settingsForm.setData('hide_prices', false)
                                }
                                aria-pressed={!settingsForm.data.hide_prices}
                                className={cn(
                                    'grid min-h-20 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-[#ff4d3d]',
                                    !settingsForm.data.hide_prices
                                        ? 'bg-[#18181f] text-[#f6f4f0]'
                                        : 'hover:bg-[#e7e3dc]/55',
                                )}
                            >
                                <Eye className="size-5" />
                                <span>
                                    <span className="block text-sm font-semibold">
                                        Com preços
                                    </span>
                                    <span
                                        className={cn(
                                            'mt-1 block text-[0.68rem] leading-4',
                                            !settingsForm.data.hide_prices
                                                ? 'text-[#cac4ba]'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        Pedido e valores fechados no catálogo.
                                    </span>
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    settingsForm.setData('hide_prices', true)
                                }
                                disabled={!whatsapp_channel.available}
                                aria-pressed={settingsForm.data.hide_prices}
                                className={cn(
                                    'grid min-h-20 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 border-t border-border px-4 py-3 text-left transition-colors focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-[#ff4d3d] disabled:cursor-not-allowed disabled:opacity-45',
                                    settingsForm.data.hide_prices
                                        ? 'bg-[#18181f] text-[#f6f4f0]'
                                        : 'hover:bg-[#e7e3dc]/55',
                                )}
                            >
                                <MessageCircle className="size-5" />
                                <span>
                                    <span className="block text-sm font-semibold">
                                        Pelo WhatsApp
                                    </span>
                                    <span
                                        className={cn(
                                            'mt-1 block text-[0.68rem] leading-4',
                                            settingsForm.data.hide_prices
                                                ? 'text-[#cac4ba]'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        Preços ocultos e seleção pronta para o
                                        comercial.
                                    </span>
                                </span>
                            </button>
                        </div>

                        <div
                            className={cn(
                                'border-l-2 px-3 py-1.5 text-xs leading-5',
                                whatsapp_channel.available
                                    ? 'border-[#2e705a] text-foreground'
                                    : 'border-[#ff4d3d] text-muted-foreground',
                            )}
                        >
                            {whatsapp_channel.available ? (
                                <>
                                    <p className="font-semibold">
                                        {whatsapp_channel.profile_name ??
                                            'WhatsApp conectado'}
                                    </p>
                                    <p className="text-muted-foreground">
                                        {whatsapp_channel.phone_masked}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p>
                                        Conecte um número antes de negociar sem
                                        preços.
                                    </p>
                                    <Link
                                        href={whatsapp_channel.channels_url}
                                        className="mt-2 inline-flex min-h-9 items-center gap-2 font-semibold text-[#18181f] underline decoration-[#ff4d3d] underline-offset-4"
                                    >
                                        Ir para Canais
                                        <ExternalLink className="size-3.5" />
                                    </Link>
                                </>
                            )}
                        </div>
                        <InputError message={settingsForm.errors.hide_prices} />
                    </div>
                </InspectorSection>
                <InspectorSection title="Disponibilidade dos pedidos">
                    <div
                        className="space-y-4"
                        data-catalog-error="allow_orders_without_stock"
                    >
                        <div className="flex items-start justify-between gap-5">
                            <div>
                                <p className="text-sm font-semibold">
                                    Aceitar pedidos além do estoque
                                </p>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    Permite que o lojista peça qualquer
                                    quantidade, mesmo quando o saldo imediato
                                    não cobre toda a seleção.
                                </p>
                            </div>
                            <Switch
                                checked={
                                    settingsForm.data.allow_orders_without_stock
                                }
                                onCheckedChange={(checked) =>
                                    settingsForm.setData(
                                        'allow_orders_without_stock',
                                        checked,
                                    )
                                }
                                aria-label="Aceitar pedidos além do estoque"
                                className="mt-0.5 shrink-0 data-[state=checked]:bg-[#ff4d3d]"
                            />
                        </div>

                        <div
                            className={cn(
                                'border-l-2 px-3 py-1.5 text-xs leading-5',
                                settingsForm.data.allow_orders_without_stock
                                    ? 'border-[#ff4d3d] text-foreground'
                                    : 'border-[#cac4ba] text-muted-foreground',
                            )}
                        >
                            {settingsForm.data.allow_orders_without_stock ? (
                                <>
                                    <p className="font-semibold">
                                        Produção sob demanda ativa
                                    </p>
                                    <p className="mt-1 text-muted-foreground">
                                        O que estiver disponível será baixado
                                        até zero. O restante entra no pedido sem
                                        criar estoque negativo.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="font-semibold text-foreground">
                                        Respeitar o saldo disponível
                                    </p>
                                    <p className="mt-1">
                                        O catálogo limita cada peça à quantidade
                                        registrada em estoque.
                                    </p>
                                </>
                            )}
                        </div>

                        {settingsForm.data.hide_prices && (
                            <p className="text-[0.68rem] leading-4 text-muted-foreground">
                                Esta política vale para pedidos fechados com
                                preços. Seleções enviadas ao WhatsApp continuam
                                seguindo a conversa comercial.
                            </p>
                        )}

                        <InputError
                            message={
                                settingsForm.errors.allow_orders_without_stock
                            }
                        />
                    </div>
                </InspectorSection>
                <InspectorSection>
                    <div
                        className="flex items-center justify-between gap-4"
                        data-catalog-error="public_link_active"
                    >
                        <div>
                            <p className="text-sm font-semibold">
                                Link disponível
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Permite acesso ao catálogo público.
                            </p>
                        </div>
                        <Switch
                            checked={settingsForm.data.public_link_active}
                            onCheckedChange={(checked) =>
                                settingsForm.setData(
                                    'public_link_active',
                                    checked,
                                )
                            }
                            aria-label="Disponibilizar catálogo público"
                            className="data-[state=checked]:bg-[#2e705a]"
                        />
                    </div>
                </InspectorSection>
                <InspectorSection title="Endereço do catálogo">
                    <div className="space-y-3">
                        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_2.75rem]">
                            <Input
                                value={public_link}
                                readOnly
                                aria-label="Link público do catálogo"
                                className="h-11 min-w-0 rounded-[2px] border-border bg-transparent pr-2 text-xs shadow-none focus-visible:ring-0"
                            />
                            <button
                                type="button"
                                onClick={handleCopy}
                                className="flex size-11 items-center justify-center border border-l-0 border-border hover:bg-[#e7e3dc]/55"
                                aria-label="Copiar link público"
                            >
                                {copied ? (
                                    <Check className="size-4 text-[#2e705a]" />
                                ) : (
                                    <Copy className="size-4" />
                                )}
                            </button>
                        </div>
                        <Button
                            asChild
                            variant="outline"
                            className="min-h-11 w-full rounded-[2px] shadow-none"
                        >
                            <a
                                href={public_link}
                                target="_blank"
                                rel="noreferrer"
                            >
                                <ExternalLink className="size-4" />
                                Abrir catálogo
                            </a>
                        </Button>
                        <Dialog
                            open={rotateDialogOpen}
                            onOpenChange={setRotateDialogOpen}
                        >
                            <DialogTrigger asChild>
                                <button
                                    type="button"
                                    className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                                >
                                    <RefreshCcw className="size-4" />
                                    Criar um novo link
                                </button>
                            </DialogTrigger>
                            <DialogContent className="rounded-[2px] border-border bg-[#f6f4f0] shadow-none">
                                <DialogHeader>
                                    <DialogTitle className="font-zouth-display text-2xl tracking-[-0.04em]">
                                        Substituir o link atual?
                                    </DialogTitle>
                                    <DialogDescription className="leading-6">
                                        O endereço antigo deixa de funcionar. Os
                                        representantes precisarão receber o novo
                                        link.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="min-h-11 rounded-[2px] shadow-none"
                                        >
                                            Manter link
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        type="button"
                                        onClick={handleRotateLink}
                                        disabled={settingsForm.processing}
                                        className="min-h-11 rounded-[2px] bg-[#ff4d3d] text-[#18181f] shadow-none hover:bg-[#ff4d3d]"
                                    >
                                        Criar novo link
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </InspectorSection>
                <InspectorSection title="Interesse pela coleção">
                    <div className="divide-y divide-border border-y border-border">
                        {[
                            ['Total de visitas', stats.total],
                            ['Últimos 30 dias', stats.last_30_days],
                            ['Últimos 7 dias', stats.last_7_days],
                        ].map(([label, value]) => (
                            <div
                                key={String(label)}
                                className="flex items-end justify-between gap-4 py-4"
                            >
                                <span className="text-xs text-muted-foreground">
                                    {label}
                                </span>
                                <strong className="font-zouth-display text-2xl tracking-[-0.04em] tabular-nums">
                                    {value}
                                </strong>
                            </div>
                        ))}
                    </div>
                </InspectorSection>
            </>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Catálogo" />

            <div
                data-testid="catalog-studio-workspace"
                className="relative flex h-[calc(100svh-4rem)] min-h-0 flex-col overflow-clip bg-[#f6f4f0] [--muted-foreground:#66635d]"
            >
                <h1 className="sr-only">Personalizar catálogo</h1>

                {hasFormErrors && (
                    <div
                        role="alert"
                        id="catalog-save-errors"
                        tabIndex={-1}
                        className="flex flex-col gap-3 border-b border-[#ff4d3d] bg-[#ff4d3d]/8 px-5 py-3 text-[#8c241d] sm:flex-row sm:items-center sm:justify-between lg:px-8"
                    >
                        <div>
                            <p className="text-sm font-semibold">
                                {publicationErrors.catalog_publication ? (
                                    'A publicação não foi concluída.'
                                ) : (
                                    <>
                                        Encontramos {formErrorEntries.length}{' '}
                                        {formErrorEntries.length === 1
                                            ? 'ajuste antes de salvar.'
                                            : 'ajustes antes de salvar.'}
                                    </>
                                )}
                            </p>
                            <p className="mt-0.5 text-xs leading-5">
                                {firstErrorPanel &&
                                    !publicationErrors.catalog_publication && (
                                        <>
                                            Revise{' '}
                                            {panelLabels[firstErrorPanel]}:{' '}
                                        </>
                                    )}
                                {formErrorEntries[0]?.[1]}
                            </p>
                        </div>
                        {!publicationErrors.catalog_publication && (
                            <button
                                type="button"
                                onClick={() =>
                                    guideToFirstError(
                                        settingsForm.errors as Record<
                                            string,
                                            string
                                        >,
                                    )
                                }
                                className="min-h-10 shrink-0 border border-[#ff4d3d] px-4 text-xs font-semibold transition-colors hover:bg-[#ff4d3d] hover:text-[#18181f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]"
                            >
                                Ir para o primeiro campo
                            </button>
                        )}
                    </div>
                )}

                <nav
                    aria-label="Áreas do editor de catálogo"
                    className="z-30 flex shrink-0 border-b border-border bg-[#f6f4f0] xl:hidden"
                >
                    {(
                        [
                            ['structure', 'Estrutura'],
                            ['edit', 'Editar'],
                            ['preview', 'Prévia'],
                        ] as const
                    ).map(([view, label]) => (
                        <button
                            key={view}
                            type="button"
                            aria-pressed={mobileView === view}
                            onClick={() => setMobileView(view)}
                            className={`min-h-12 flex-1 px-3 text-sm ${mobileView === view ? 'border-b-2 border-[#ff4d3d] font-semibold' : 'text-muted-foreground'}`}
                        >
                            {label}
                        </button>
                    ))}
                </nav>
                <form
                    id="catalog-studio-form"
                    onSubmit={handleSubmit}
                    inert={settingsForm.processing}
                    aria-busy={settingsForm.processing}
                    className={cn(
                        'relative grid min-h-0 flex-1 grid-cols-1 overflow-clip border-b border-border',
                        !expandedPreview &&
                            'xl:grid-cols-[12rem_minmax(0,1fr)_20rem] 2xl:grid-cols-[14rem_minmax(0,1fr)_21rem]',
                    )}
                >
                    <aside
                        data-testid="catalog-studio-structure"
                        className={cn(
                            'min-h-0 overflow-y-auto overscroll-contain border-b border-border bg-[#f6f4f0] xl:border-r xl:border-b-0',
                            mobileView === 'structure' ? 'block' : 'hidden',
                            !expandedPreview && 'xl:block',
                            expandedPreview && 'hidden',
                        )}
                    >
                        <div className="border-b border-border px-4 py-5">
                            <p className="text-[0.64rem] font-bold tracking-[0.18em] uppercase">
                                Estrutura
                            </p>
                        </div>
                        <div className="divide-y divide-border">
                            {settingsForm.data.sections.map((section) => {
                                const meta = sectionMeta[section.type];
                                const isActive = activePanel === section.type;

                                return (
                                    <div
                                        key={section.type}
                                        draggable
                                        onDragStart={() =>
                                            setDraggedSection(section.type)
                                        }
                                        onDragEnd={() =>
                                            setDraggedSection(null)
                                        }
                                        onDragOver={(event: DragEvent) =>
                                            event.preventDefault()
                                        }
                                        onDrop={() =>
                                            handleSectionDrop(section.type)
                                        }
                                        className={cn(
                                            'group relative flex h-16 items-center transition-colors',
                                            isActive
                                                ? 'bg-white/55'
                                                : 'hover:bg-white/35',
                                            draggedSection === section.type &&
                                                'opacity-45',
                                        )}
                                    >
                                        {isActive && (
                                            <span className="absolute inset-y-0 left-0 w-[3px] bg-[#ff4d3d]" />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() =>
                                                selectPanel(section.type)
                                            }
                                            className="flex h-full min-w-0 flex-1 items-center gap-3 pl-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d]"
                                        >
                                            <GripVertical
                                                className="size-4 shrink-0 cursor-grab text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                            <span className="min-w-0">
                                                <span className="block text-sm font-semibold">
                                                    {meta.label}
                                                </span>
                                                <PanelErrorBadge
                                                    count={
                                                        panelErrorCounts[
                                                            section.type
                                                        ]
                                                    }
                                                />
                                            </span>
                                        </button>
                                        <div className="flex shrink-0 items-center pr-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleSection(section.type)
                                                }
                                                aria-label={`${section.enabled ? 'Ocultar' : 'Mostrar'} ${meta.label}`}
                                                className="flex size-11 items-center justify-center text-muted-foreground hover:text-foreground"
                                            >
                                                {section.enabled ? (
                                                    <Eye className="size-4" />
                                                ) : (
                                                    <EyeOff className="size-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="border-t border-border">
                            <div className="border-b border-border px-4 py-5">
                                <p className="text-[0.64rem] font-bold tracking-[0.18em] uppercase">
                                    Configurações
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => selectPanel('brand')}
                                className={cn(
                                    'relative flex h-16 w-full items-center gap-3 border-b border-border px-4 text-left transition-colors hover:bg-white/35',
                                    activePanel === 'brand' && 'bg-white/55',
                                )}
                            >
                                {activePanel === 'brand' && (
                                    <span className="absolute inset-y-0 left-0 w-[3px] bg-[#ff4d3d]" />
                                )}
                                <ImageIcon className="size-4 shrink-0" />
                                <span className="block text-sm font-semibold">
                                    Marca
                                    <PanelErrorBadge
                                        count={panelErrorCounts.brand}
                                    />
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => selectPanel('appearance')}
                                className={cn(
                                    'relative flex h-16 w-full items-center gap-3 px-4 text-left transition-colors hover:bg-white/35',
                                    activePanel === 'appearance' &&
                                        'bg-white/55',
                                )}
                            >
                                {activePanel === 'appearance' && (
                                    <span className="absolute inset-y-0 left-0 w-[3px] bg-[#ff4d3d]" />
                                )}
                                <Palette className="size-4 shrink-0" />
                                <span>
                                    <span className="block text-sm font-semibold">
                                        Aparência
                                    </span>
                                    <PanelErrorBadge
                                        count={panelErrorCounts.appearance}
                                    />
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => selectPanel('publish')}
                                className={cn(
                                    'relative flex h-16 w-full items-center gap-3 border-t border-border px-4 text-left transition-colors hover:bg-white/35',
                                    activePanel === 'publish' && 'bg-white/55',
                                )}
                            >
                                {activePanel === 'publish' && (
                                    <span className="absolute inset-y-0 left-0 w-[3px] bg-[#ff4d3d]" />
                                )}
                                <Link2 className="size-4 shrink-0" />
                                <span>
                                    <span className="block text-sm font-semibold">
                                        Publicar
                                    </span>
                                    <PanelErrorBadge
                                        count={panelErrorCounts.publish}
                                    />
                                </span>
                            </button>
                        </div>
                    </aside>

                    <main
                        className={`min-h-0 min-w-0 flex-col bg-[#e7e3dc]/55 ${mobileView === 'preview' ? 'flex' : 'hidden'} xl:flex`}
                    >
                        <div
                            data-testid="catalog-studio-preview-toolbar"
                            className="z-20 flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-[#f6f4f0] px-3 py-2"
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <LayoutGrid className="size-4" />
                                <span className="text-xs font-semibold">
                                    Prévia ao vivo
                                </span>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setPreviewMode((mode) =>
                                            mode === 'edit' ? 'test' : 'edit',
                                        )
                                    }
                                    aria-pressed={previewMode === 'test'}
                                    className="min-h-11 border border-border px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-[#ff4d3d]"
                                >
                                    {previewMode === 'test'
                                        ? 'Voltar à edição'
                                        : 'Testar como lojista'}
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex border border-border bg-[#f6f4f0]">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setViewport('desktop');
                                            setZoom(null);
                                        }}
                                        aria-label="Prévia no computador"
                                        aria-pressed={viewport === 'desktop'}
                                        className={cn(
                                            'flex min-h-11 items-center gap-2 px-3 text-xs font-semibold',
                                            viewport === 'desktop'
                                                ? 'bg-[#18181f] text-[#f6f4f0]'
                                                : 'hover:bg-white/55',
                                        )}
                                    >
                                        <Monitor className="size-4" />
                                        <span className="hidden sm:inline">
                                            Desktop
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setViewport('mobile');
                                            setZoom(null);
                                        }}
                                        aria-label="Prévia no celular"
                                        aria-pressed={viewport === 'mobile'}
                                        className={cn(
                                            'flex min-h-11 items-center gap-2 border-l border-border px-3 text-xs font-semibold',
                                            viewport === 'mobile'
                                                ? 'bg-[#18181f] text-[#f6f4f0]'
                                                : 'hover:bg-white/55',
                                        )}
                                    >
                                        <Smartphone className="size-4" />
                                        <span className="hidden sm:inline">
                                            Mobile
                                        </span>
                                    </button>
                                </div>
                                <div
                                    className={cn(
                                        'items-center border border-border bg-[#f6f4f0]',
                                        previewMode === 'test'
                                            ? 'hidden'
                                            : 'flex',
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setZoom(
                                                Math.max(
                                                    25,
                                                    Math.round(
                                                        previewScale * 100,
                                                    ) - 10,
                                                ),
                                            )
                                        }
                                        disabled={previewScale <= 0.25}
                                        aria-label="Diminuir prévia"
                                        className="flex size-11 items-center justify-center disabled:opacity-30"
                                    >
                                        <Minus className="size-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setZoom(zoom === null ? 100 : null)
                                        }
                                        title={
                                            zoom === null
                                                ? 'Ver em tamanho real'
                                                : 'Encaixar na área disponível'
                                        }
                                        aria-label={
                                            zoom === null
                                                ? 'Ver prévia em tamanho real'
                                                : 'Encaixar prévia na área disponível'
                                        }
                                        className="min-h-11 min-w-14 px-1 text-center text-xs font-semibold tabular-nums"
                                    >
                                        {Math.round(previewScale * 100)}%
                                        <span className="block text-[0.6rem] font-normal">
                                            {zoom === null
                                                ? 'Encaixada'
                                                : 'Encaixar'}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setZoom(
                                                Math.min(
                                                    150,
                                                    Math.round(
                                                        previewScale * 100,
                                                    ) + 10,
                                                ),
                                            )
                                        }
                                        disabled={previewScale >= 1.5}
                                        aria-label="Aumentar prévia"
                                        className="flex size-11 items-center justify-center disabled:opacity-30"
                                    >
                                        <Plus className="size-3.5" />
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setExpandedPreview(!expandedPreview);
                                        setMobileView('preview');
                                        setZoom(null);
                                    }}
                                    aria-label={
                                        expandedPreview
                                            ? 'Voltar aos controles'
                                            : 'Ampliar prévia'
                                    }
                                    title={
                                        expandedPreview
                                            ? 'Voltar aos controles'
                                            : 'Ampliar prévia'
                                    }
                                    className="hidden size-11 items-center justify-center border border-border xl:flex"
                                >
                                    {expandedPreview ? (
                                        <Minimize2 className="size-4" />
                                    ) : (
                                        <Maximize2 className="size-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                        <div
                            ref={previewScrollRef}
                            data-testid="catalog-preview-viewport"
                            className={cn(
                                'flex min-h-0 flex-1 items-start p-4 [scrollbar-gutter:stable] sm:p-6',
                                previewMode === 'test'
                                    ? 'overflow-hidden'
                                    : 'overflow-auto',
                            )}
                        >
                            <div
                                ref={previewStageRef}
                                data-testid="catalog-preview-stage"
                                className="flex w-full min-w-0 items-start"
                            >
                                <div
                                    data-testid="catalog-live-preview"
                                    className="relative mx-auto shrink-0 overflow-clip"
                                    style={{
                                        width:
                                            previewCanvasWidth * previewScale,
                                        height:
                                            previewCanvasHeight * previewScale,
                                    }}
                                >
                                    <div
                                        className="absolute top-0 left-0 origin-top-left bg-white shadow-[0_18px_50px_rgba(24,24,31,0.08)] outline outline-[#cac4ba]"
                                        style={{
                                            width: `${previewCanvasWidth}px`,
                                            transform: `scale(${previewScale})`,
                                        }}
                                    >
                                        <CatalogPreview
                                            settings={draftSettings}
                                            viewport={viewport}
                                            height={previewCanvasHeight}
                                            mode={previewMode}
                                            selectedSection={
                                                activePanel === 'brand'
                                                    ? 'hero'
                                                    : activePanel === 'hero' ||
                                                        activePanel ===
                                                            'collections' ||
                                                        activePanel ===
                                                            'product_grid'
                                                      ? activePanel
                                                      : null
                                            }
                                            onSelectSection={(section) =>
                                                selectPanel(section)
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>

                    <aside
                        ref={inspectorRef}
                        data-testid="catalog-studio-inspector"
                        aria-label="Configurar seção do catálogo"
                        tabIndex={-1}
                        className={cn(
                            'relative min-h-0 min-w-0 overflow-y-auto overscroll-contain border-t border-border bg-[#f6f4f0] xl:border-t-0 xl:border-l',
                            mobileView === 'edit' ? 'block' : 'hidden',
                            !expandedPreview && 'xl:block',
                            expandedPreview && 'hidden',
                        )}
                    >
                        {renderInspector()}
                    </aside>
                </form>
                <footer
                    data-testid="catalog-studio-actions"
                    aria-label="Ações de publicação do catálogo"
                    className="z-30 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-[#f6f4f0] px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6"
                >
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1">
                        <StatusLabel
                            tone={
                                settings.public_link_active
                                    ? 'mineral'
                                    : 'muted'
                            }
                            className="gap-1.5"
                        >
                            <span
                                className={cn(
                                    'size-1.5 rounded-full',
                                    settings.public_link_active
                                        ? 'bg-[#2e705a]'
                                        : 'bg-[#98968d]',
                                )}
                            />
                            {settings.public_link_active
                                ? 'Publicado'
                                : 'Fora do ar'}
                        </StatusLabel>
                        {hasUnpublishedChanges && (
                            <span
                                role="status"
                                className="text-xs font-semibold text-[#b43f32]"
                            >
                                Alterações ainda não publicadas
                            </span>
                        )}
                        {settingsForm.recentlySuccessful && (
                            <span className="text-xs font-semibold text-[#2e705a]">
                                Alterações salvas
                            </span>
                        )}
                    </div>
                    <div className="flex w-full items-center gap-2 sm:w-auto sm:justify-end">
                        <div className="flex border border-border">
                            <button
                                type="button"
                                onClick={history.undo}
                                disabled={
                                    !history.canUndo || settingsForm.processing
                                }
                                aria-label="Desfazer alteração"
                                title="Desfazer (Ctrl ou ⌘ Z)"
                                className="flex size-11 items-center justify-center focus-visible:outline-2 focus-visible:outline-[#ff4d3d] disabled:opacity-30"
                            >
                                <Undo2 className="size-4" />
                            </button>
                            <button
                                type="button"
                                onClick={history.redo}
                                disabled={
                                    !history.canRedo || settingsForm.processing
                                }
                                aria-label="Refazer alteração"
                                title="Refazer (Ctrl ou ⌘ Shift Z)"
                                className="flex size-11 items-center justify-center border-l border-border focus-visible:outline-2 focus-visible:outline-[#ff4d3d] disabled:opacity-30"
                            >
                                <Redo2 className="size-4" />
                            </button>
                        </div>
                        <Button
                            asChild
                            variant="outline"
                            className="min-h-11 rounded-[2px] border-border bg-transparent px-3 shadow-none"
                        >
                            <a
                                href={public_link}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Ver publicado
                                <ExternalLink className="size-4" />
                            </a>
                        </Button>
                        <Button
                            type="submit"
                            form="catalog-studio-form"
                            disabled={
                                settingsForm.processing ||
                                !hasUnpublishedChanges
                            }
                            className="min-h-11 rounded-[2px] bg-[#ff4d3d] px-5 text-white shadow-none hover:bg-[#ed4536]"
                        >
                            <Save className="size-4" />
                            {settingsForm.processing ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </div>
                </footer>
            </div>

            <ImageCropDialog
                open={logoCropDialogOpen}
                onOpenChange={setLogoCropDialogOpen}
                imageFile={logoCropFile}
                onCropped={handleLogoCropped}
                aspectRatio={null}
                title="Ajustar logo"
                description="Recorte próximo da marca. O fundo transparente é preservado por padrão, inclusive em PNG e SVG. Escolher uma cor é opcional."
                allowTransparentBackground
            />
        </AppLayout>
    );
}
