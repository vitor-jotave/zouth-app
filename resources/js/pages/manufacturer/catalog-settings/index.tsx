import { Head, useForm } from '@inertiajs/react';
import {
    AlignCenter,
    AlignLeft,
    Check,
    ChevronDown,
    ChevronUp,
    Copy,
    Eye,
    EyeOff,
    ExternalLink,
    GripVertical,
    ImageIcon,
    LayoutGrid,
    Link2,
    Minus,
    Monitor,
    Palette,
    Plus,
    RefreshCcw,
    RotateCcw,
    Save,
    Smartphone,
    Upload,
} from 'lucide-react';
import type { DragEvent, ReactNode } from 'react';
import { useMemo, useState } from 'react';
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
import AppLayout from '@/layouts/app-layout';
import { GRADIENT_LABELS, PATTERN_LABELS } from '@/lib/catalog-theming';
import { cn } from '@/lib/utils';
import manufacturer from '@/routes/manufacturer';
import type { BreadcrumbItem } from '@/types';

interface CatalogSettings {
    id: number;
    brand_name: string;
    show_brand_name: boolean;
    show_logo: boolean;
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
    public_link: string;
    stats: {
        total: number;
        last_7_days: number;
        last_30_days: number;
    };
    sample_products: Product[];
    manufacturer_name: string;
}

type CatalogPanel = CatalogSectionType | 'appearance' | 'publish';
type ViewportMode = 'desktop' | 'mobile';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Visão geral', href: '/dashboard' },
    { title: 'Catálogo', href: '/manufacturer/catalog-settings' },
];

const sectionMeta: Record<
    CatalogSectionType,
    { label: string; description: string }
> = {
    hero: {
        label: 'Capa',
        description: 'Abertura e apresentação',
    },
    collections: {
        label: 'Coleções',
        description: 'Caminhos para explorar',
    },
    product_grid: {
        label: 'Produtos',
        description: 'Vitrine da coleção',
    },
};

const fontOptions = [
    { value: 'sora', label: 'Sora' },
    { value: 'manrope', label: 'Manrope' },
    { value: 'fraunces', label: 'Fraunces' },
    { value: 'space-grotesk', label: 'Space Grotesk' },
    { value: 'ibm-plex', label: 'IBM Plex Sans' },
];

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
            show_action: true,
        },
    },
];

function normalizeSections(sections: CatalogSection[]): CatalogSection[] {
    const current = sections.length ? sections : fallbackSections;
    const missing = fallbackSections.filter(
        (fallback) =>
            !current.some((section) => section.type === fallback.type),
    );

    return [...current, ...missing].map((section) => ({
        ...section,
        props: { ...section.props },
    }));
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
    title,
    description,
}: {
    eyebrow: string;
    title: string;
    description: string;
}) {
    return (
        <header className="border-b border-border px-5 pt-6 pb-5">
            <p className="text-[0.64rem] font-bold tracking-[0.2em] text-[#ff4d3d] uppercase">
                {eyebrow}
            </p>
            <h2 className="mt-2 font-zouth-display text-xl font-semibold tracking-[-0.035em]">
                {title}
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                {description}
            </p>
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
}: {
    label: string;
    value: string;
    options: Array<{ value: string; label: string; icon?: ReactNode }>;
    onChange: (value: string) => void;
}) {
    return (
        <div className="space-y-2">
            <Label className="text-xs">{label}</Label>
            <div
                className="grid border border-border bg-[#f6f4f0]"
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
        </div>
    );
}

function ColorField({
    id,
    label,
    value,
    onChange,
    error,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
}) {
    return (
        <div className="space-y-2">
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
}: {
    label: string;
    description: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
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
                className="shrink-0 data-[state=checked]:bg-[#ff4d3d]"
            />
        </div>
    );
}

export default function CatalogSettings({
    catalog_settings: settings,
    public_link,
    stats,
    sample_products,
    manufacturer_name,
}: Props) {
    const [activePanel, setActivePanel] = useState<CatalogPanel>('hero');
    const [viewport, setViewport] = useState<ViewportMode>('desktop');
    const [zoom, setZoom] = useState(100);
    const [copied, setCopied] = useState(false);
    const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [logoCropDialogOpen, setLogoCropDialogOpen] = useState(false);
    const [logoCropFile, setLogoCropFile] = useState<File | null>(null);
    const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
    const [draggedSection, setDraggedSection] =
        useState<CatalogSectionType | null>(null);

    const settingsForm = useForm({
        brand_name: settings.brand_name ?? '',
        show_brand_name: settings.show_brand_name ?? true,
        show_logo: settings.show_logo ?? true,
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
        layout_density: settings.layout_density ?? 'comfortable',
        card_style: settings.card_style ?? 'soft',
        background_mode: settings.background_mode ?? 'solid',
        background_image_opacity: settings.background_image_opacity ?? 20,
        background_overlay_color:
            settings.background_overlay_color ?? '#000000',
        background_overlay_opacity: settings.background_overlay_opacity ?? 10,
        background_blur: settings.background_blur ?? 0,
        pattern_id: settings.pattern_id ?? 'dots',
        pattern_color: settings.pattern_color ?? settings.primary_color,
        pattern_opacity: settings.pattern_opacity ?? 12,
        gradient_id: settings.gradient_id ?? 'soft-sky',
        sections: normalizeSections(settings.sections ?? []),
    });

    const logoForm = useForm<{ logo: File | null }>({ logo: null });
    const backgroundForm = useForm<{ background_image: File | null }>({
        background_image: null,
    });
    const coverForm = useForm<{
        cover_image: File | null;
        cover_image_focal_x: number;
        cover_image_focal_y: number;
    }>({
        cover_image: null,
        cover_image_focal_x: settings.cover_image_focal_x ?? 50,
        cover_image_focal_y: settings.cover_image_focal_y ?? 50,
    });

    const draftSettings = useMemo(
        () => ({
            ...settingsForm.data,
            logo_url: settings.logo_url,
            background_image_url: settings.background_image_url,
            cover_image_url:
                coverPreviewUrl ??
                settings.cover_thumbnail_url ??
                settings.cover_image_url,
            cover_thumbnail_url:
                coverPreviewUrl ?? settings.cover_thumbnail_url,
        }),
        [
            settingsForm.data,
            settings.logo_url,
            settings.background_image_url,
            settings.cover_image_url,
            settings.cover_thumbnail_url,
            coverPreviewUrl,
        ],
    );

    const selectedSection = settingsForm.data.sections.find(
        (section) => section.type === activePanel,
    );
    const hasFormErrors = Object.keys(settingsForm.errors).length > 0;
    const brandDisplay =
        settingsForm.data.show_logo && settingsForm.data.show_brand_name
            ? 'both'
            : settingsForm.data.show_logo
              ? 'logo'
              : 'name';

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
            },
        }));
    };

    const toggleSection = (type: CatalogSectionType) => {
        updateSection(type, (section) => ({
            ...section,
            enabled: !section.enabled,
        }));
    };

    const moveSection = (
        type: CatalogSectionType,
        direction: 'up' | 'down',
    ) => {
        const sections = [...settingsForm.data.sections];
        const currentIndex = sections.findIndex(
            (section) => section.type === type,
        );
        const targetIndex =
            direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        if (
            currentIndex < 0 ||
            targetIndex < 0 ||
            targetIndex >= sections.length
        ) {
            return;
        }

        [sections[currentIndex], sections[targetIndex]] = [
            sections[targetIndex],
            sections[currentIndex],
        ];
        settingsForm.setData('sections', sections);
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

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        settingsForm.put(manufacturer.catalogSettings.update().url, {
            preserveScroll: true,
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

        setLogoCropFile(file);
        setLogoCropDialogOpen(true);
    };

    const handleLogoCropped = (croppedFile: File) => {
        logoForm.setData('logo', croppedFile);
        setLogoCropFile(null);
        setLogoCropDialogOpen(false);
    };

    const handleLogoUpload = () => {
        logoForm.post(manufacturer.catalogSettings.logo().url, {
            preserveScroll: true,
            onSuccess: () => {
                logoForm.reset();
                setLogoCropFile(null);
            },
        });
    };

    const handleRemoveLogo = () => {
        logoForm.delete(manufacturer.catalogSettings.logo.destroy().url, {
            preserveScroll: true,
        });
    };

    const handleBackgroundUpload = () => {
        backgroundForm.post(manufacturer.catalogSettings.background().url, {
            preserveScroll: true,
            onSuccess: () => {
                backgroundForm.reset();
                settingsForm.setData('background_mode', 'image');
            },
        });
    };

    const handleCoverSelected = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0] ?? null;
        event.target.value = '';

        if (!file) {
            return;
        }

        if (coverPreviewUrl) {
            URL.revokeObjectURL(coverPreviewUrl);
        }

        coverForm.setData('cover_image', file);
        setCoverPreviewUrl(URL.createObjectURL(file));
    };

    const handleCoverUpload = () => {
        coverForm.post(manufacturer.catalogSettings.cover().url, {
            preserveScroll: true,
            onSuccess: () => {
                coverForm.reset('cover_image');

                if (coverPreviewUrl) {
                    URL.revokeObjectURL(coverPreviewUrl);
                    setCoverPreviewUrl(null);
                }
            },
        });
    };

    const handleRemoveCover = () => {
        coverForm.delete(manufacturer.catalogSettings.cover.destroy().url, {
            preserveScroll: true,
            onSuccess: () => {
                coverForm.reset('cover_image');
                settingsForm.setData((data) => ({
                    ...data,
                    cover_image_focal_x: 50,
                    cover_image_focal_y: 50,
                }));

                if (coverPreviewUrl) {
                    URL.revokeObjectURL(coverPreviewUrl);
                    setCoverPreviewUrl(null);
                }
            },
        });
    };

    const updateCoverFocalPoint = (axis: 'x' | 'y', value: number) => {
        const key = `cover_image_focal_${axis}` as const;

        coverForm.setData(key, value);
        settingsForm.setData(key, value);
    };

    const handleRemoveBackground = () => {
        backgroundForm.delete(
            manufacturer.catalogSettings.background.destroy().url,
            {
                preserveScroll: true,
                onSuccess: () =>
                    settingsForm.setData('background_mode', 'solid'),
            },
        );
    };

    const handleRotateLink = () => {
        settingsForm.post(manufacturer.catalogSettings.rotateLink().url, {
            preserveScroll: true,
            onSuccess: () => setRotateDialogOpen(false),
        });
    };

    const handleResetDefaults = () => {
        settingsForm.post(manufacturer.catalogSettings.resetDefaults().url, {
            onSuccess: () => {
                setResetDialogOpen(false);
                window.location.reload();
            },
        });
    };

    const renderInspector = () => {
        if (activePanel === 'hero') {
            return (
                <>
                    <InspectorHeader
                        eyebrow="Seção selecionada"
                        title="Capa do catálogo"
                        description="Apresente a coleção antes de mostrar as peças."
                    />
                    <InspectorSection title="Marca">
                        <div className="space-y-4">
                            <div className="flex min-h-24 items-center justify-center border border-border bg-background p-4">
                                {settings.logo_url ? (
                                    <img
                                        src={settings.logo_url}
                                        alt={settingsForm.data.brand_name}
                                        className="max-h-16 max-w-full object-contain"
                                    />
                                ) : (
                                    <span className="text-xs text-muted-foreground">
                                        Sua logo aparece aqui
                                    </span>
                                )}
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoSelected}
                                className="sr-only"
                                id="catalog-logo-file"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <Label
                                    htmlFor="catalog-logo-file"
                                    className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 border border-border px-3 text-xs font-semibold hover:bg-[#e7e3dc]/45"
                                >
                                    <Upload
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Escolher logo
                                </Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleLogoUpload}
                                    disabled={
                                        logoForm.processing ||
                                        !logoForm.data.logo
                                    }
                                    className="min-h-11 rounded-[2px] shadow-none"
                                >
                                    Enviar
                                </Button>
                            </div>
                            {settings.logo_url && (
                                <button
                                    type="button"
                                    onClick={handleRemoveLogo}
                                    className="text-xs font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground"
                                >
                                    Remover logo atual
                                </button>
                            )}
                            {logoForm.data.logo && (
                                <p className="text-xs text-[#2e705a]">
                                    Recorte pronto para envio.
                                </p>
                            )}
                            <InputError message={logoForm.errors.logo} />
                        </div>
                    </InspectorSection>
                    <InspectorSection title="Imagem de campanha">
                        <div className="space-y-4">
                            <div className="relative aspect-[3/2] overflow-hidden border border-border bg-[#e7e3dc]/45">
                                {coverPreviewUrl ||
                                settings.cover_thumbnail_url ||
                                settings.cover_image_url ? (
                                    <img
                                        src={
                                            coverPreviewUrl ??
                                            settings.cover_thumbnail_url ??
                                            settings.cover_image_url ??
                                            undefined
                                        }
                                        alt="Prévia da imagem de campanha"
                                        className="h-full w-full object-cover"
                                        style={{
                                            objectPosition: `${settingsForm.data.cover_image_focal_x}% ${settingsForm.data.cover_image_focal_y}%`,
                                        }}
                                    />
                                ) : (
                                    <div className="flex h-full flex-col items-center justify-center gap-2 px-5 text-center text-muted-foreground">
                                        <ImageIcon
                                            className="size-6"
                                            aria-hidden="true"
                                        />
                                        <p className="text-xs leading-5">
                                            Envie a fotografia que abre a
                                            coleção. Sem ela, usamos a primeira
                                            peça com imagem.
                                        </p>
                                    </div>
                                )}
                            </div>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleCoverSelected}
                                className="sr-only"
                                id="catalog-cover-file"
                            />
                            <div className="grid grid-cols-2 gap-2">
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
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCoverUpload}
                                    disabled={
                                        coverForm.processing ||
                                        !coverForm.data.cover_image
                                    }
                                    className="min-h-11 rounded-[2px] shadow-none"
                                >
                                    {coverForm.processing
                                        ? 'Enviando...'
                                        : 'Usar na capa'}
                                </Button>
                            </div>
                            {coverForm.progress && (
                                <div
                                    className="h-1 overflow-hidden bg-[#d7d2c9]"
                                    aria-label={`Envio da capa em ${coverForm.progress.percentage}%`}
                                >
                                    <div
                                        className="h-full bg-[#ff4d3d] transition-[width]"
                                        style={{
                                            width: `${coverForm.progress.percentage}%`,
                                        }}
                                    />
                                </div>
                            )}
                            {(settings.cover_image_url || coverPreviewUrl) && (
                                <button
                                    type="button"
                                    onClick={handleRemoveCover}
                                    className="text-xs font-semibold text-muted-foreground underline underline-offset-4 hover:text-foreground"
                                >
                                    Remover imagem de campanha
                                </button>
                            )}
                            <InputError
                                message={coverForm.errors.cover_image}
                            />

                            <div className="space-y-4 border-t border-border pt-4">
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
                                            updateCoverFocalPoint('x', value)
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
                                            updateCoverFocalPoint('y', value)
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </InspectorSection>
                    <InspectorSection title="Apresentação">
                        <div className="space-y-4">
                            <div className="space-y-2">
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
                                    className="h-11 rounded-[2px] border-border bg-transparent shadow-none focus-visible:border-[#18181f] focus-visible:ring-0"
                                />
                                <InputError
                                    message={settingsForm.errors.brand_name}
                                />
                            </div>
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
                            <SegmentedControl
                                label="Composição da capa"
                                value={sectionProp(
                                    selectedSection,
                                    'align',
                                    'left',
                                )}
                                options={[
                                    {
                                        value: 'left',
                                        label: 'Imagem + texto',
                                        icon: <AlignLeft className="size-4" />,
                                    },
                                    {
                                        value: 'center',
                                        label: 'Só texto',
                                        icon: (
                                            <AlignCenter className="size-4" />
                                        ),
                                    },
                                ]}
                                onChange={(value) =>
                                    updateSectionProp('hero', 'align', value)
                                }
                            />
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
                                    label="Mostrar convite"
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
                        description="Crie caminhos rápidos para o lojista explorar sua linha."
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
                            <div className="space-y-2">
                                <Label
                                    htmlFor="collections-title"
                                    className="text-xs"
                                >
                                    Título da seção
                                </Label>
                                <Input
                                    id="collections-title"
                                    value={sectionProp(
                                        selectedSection,
                                        'title',
                                        'Coleções',
                                    )}
                                    onChange={(event) =>
                                        updateSectionProp(
                                            'collections',
                                            'title',
                                            event.target.value,
                                        )
                                    }
                                    className="h-11 rounded-[2px] border-border bg-transparent shadow-none focus-visible:border-[#18181f] focus-visible:ring-0"
                                />
                            </div>
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
                        description="Defina o ritmo da vitrine sem esconder as peças."
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
                            <div className="space-y-2">
                                <Label
                                    htmlFor="products-title"
                                    className="text-xs"
                                >
                                    Título da vitrine
                                </Label>
                                <Input
                                    id="products-title"
                                    value={sectionProp(
                                        selectedSection,
                                        'title',
                                        'Em destaque',
                                    )}
                                    onChange={(event) =>
                                        updateSectionProp(
                                            'product_grid',
                                            'title',
                                            event.target.value,
                                        )
                                    }
                                    className="h-11 rounded-[2px] border-border bg-transparent shadow-none focus-visible:border-[#18181f] focus-visible:ring-0"
                                />
                            </div>
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
                                label="Respiro entre as peças"
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
                                />
                            ) : (
                                <p className="border-l-2 border-[#ff4d3d] pl-3 text-xs leading-5 text-muted-foreground">
                                    No lookbook, imagens e informações entram
                                    direto na página, sem moldura ou sombra.
                                </p>
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
                                label="Preço"
                                description="Mostra o valor de atacado na vitrine."
                                checked={sectionProp(
                                    selectedSection,
                                    'show_price',
                                    true,
                                )}
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
                        description="A coleção continua sendo protagonista; a identidade dá o tom."
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
                            />
                            <ColorField
                                id="accent-color"
                                label="Destaque"
                                value={settingsForm.data.accent_color}
                                onChange={(value) =>
                                    settingsForm.setData('accent_color', value)
                                }
                                error={settingsForm.errors.accent_color}
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
                            />
                        </div>
                    </InspectorSection>
                    <InspectorSection title="Tipografia">
                        <div className="space-y-4">
                            <div className="space-y-2">
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
                            <div className="space-y-2">
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
                            />

                            {settingsForm.data.background_mode === 'image' && (
                                <div className="space-y-4">
                                    {settings.background_image_url && (
                                        <img
                                            src={settings.background_image_url}
                                            alt="Fundo atual do catálogo"
                                            className="aspect-[16/7] w-full border border-border object-cover"
                                        />
                                    )}
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(event) =>
                                            backgroundForm.setData(
                                                'background_image',
                                                event.target.files?.[0] ?? null,
                                            )
                                        }
                                        className="h-11 rounded-[2px] border-border bg-transparent text-xs shadow-none file:mr-3 file:border-0 file:bg-transparent file:text-xs file:font-semibold"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleBackgroundUpload}
                                            disabled={
                                                backgroundForm.processing ||
                                                !backgroundForm.data
                                                    .background_image
                                            }
                                            className="min-h-11 rounded-[2px] shadow-none"
                                        >
                                            Enviar foto
                                        </Button>
                                        {settings.background_image_url && (
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
                                            backgroundForm.errors
                                                .background_image
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
                                    <div className="space-y-2">
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
                                            <SelectTrigger className="h-11 rounded-[2px] border-border bg-transparent shadow-none">
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
                                <div className="space-y-2">
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
                                        <SelectTrigger className="h-11 rounded-[2px] border-border bg-transparent shadow-none">
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
                                        Restaurar o catálogo?
                                    </DialogTitle>
                                    <DialogDescription className="leading-6">
                                        Cores, textos, fundo e estrutura voltam
                                        para o início. Essa ação não pode ser
                                        desfeita.
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
                    eyebrow="Catálogo em circulação"
                    title="Publicar e compartilhar"
                    description="Leve a coleção ao lojista e acompanhe sua chegada."
                />
                <InspectorSection>
                    <div className="flex items-center justify-between gap-4">
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

            <div className="flex min-h-0 flex-1 flex-col bg-[#f6f4f0]">
                <header className="grid gap-6 border-b border-border px-5 py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8">
                    <div className="min-w-0">
                        <p className="text-[0.64rem] font-bold tracking-[0.22em] text-[#ff4d3d] uppercase">
                            Catálogo digital
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                            <h1 className="font-zouth-display text-[clamp(2rem,3.5vw,3.35rem)] leading-[0.95] font-semibold tracking-[-0.055em]">
                                Seu Catálogo
                                <span className="text-[#ff4d3d]">.</span>
                            </h1>
                            <StatusLabel
                                tone={
                                    settingsForm.data.public_link_active
                                        ? 'mineral'
                                        : 'muted'
                                }
                                className="gap-1.5"
                            >
                                <span
                                    className={cn(
                                        'size-1.5 rounded-full',
                                        settingsForm.data.public_link_active
                                            ? 'bg-[#2e705a]'
                                            : 'bg-[#98968d]',
                                    )}
                                />
                                {settingsForm.data.public_link_active
                                    ? 'Publicado'
                                    : 'Fora do ar'}
                            </StatusLabel>
                            {settingsForm.recentlySuccessful && (
                                <span className="text-xs font-semibold text-[#2e705a]">
                                    Alterações salvas
                                </span>
                            )}
                        </div>
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                            Vitrine compartilhável com a identidade da sua
                            marca.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                        <Button
                            asChild
                            variant="outline"
                            className="min-h-12 rounded-[2px] border-border bg-transparent px-5 shadow-none"
                        >
                            <a
                                href={public_link}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Ver catálogo
                                <ExternalLink className="size-4" />
                            </a>
                        </Button>
                        <Button
                            type="submit"
                            form="catalog-studio-form"
                            disabled={settingsForm.processing}
                            className="min-h-12 rounded-[2px] bg-[#ff4d3d] px-7 text-[#18181f] shadow-none hover:translate-y-[-1px] hover:bg-[#ff4d3d]"
                        >
                            <Save className="size-4" />
                            {settingsForm.processing ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </div>
                </header>

                {hasFormErrors && (
                    <div className="border-b border-[#ff4d3d] bg-[#ff4d3d]/8 px-5 py-3 text-sm text-[#8c241d] lg:px-8">
                        Revise os campos destacados antes de salvar.
                    </div>
                )}

                <form
                    id="catalog-studio-form"
                    onSubmit={handleSubmit}
                    className="grid min-h-[780px] flex-1 grid-cols-1 border-b border-border xl:grid-cols-[12.5rem_minmax(0,1fr)_19rem] xl:items-start 2xl:grid-cols-[14rem_minmax(0,1fr)_21rem]"
                >
                    <aside
                        data-testid="catalog-studio-structure"
                        className="border-b border-border bg-[#f6f4f0] xl:sticky xl:top-0 xl:z-20 xl:max-h-svh xl:self-start xl:overflow-y-auto xl:overscroll-contain xl:border-r xl:border-b-0"
                    >
                        <div className="border-b border-border px-4 py-5">
                            <p className="text-[0.64rem] font-bold tracking-[0.18em] uppercase">
                                Estrutura
                            </p>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                Arraste para mudar a ordem.
                            </p>
                        </div>
                        <div className="divide-y divide-border">
                            {settingsForm.data.sections.map(
                                (section, index) => {
                                    const meta = sectionMeta[section.type];
                                    const isActive =
                                        activePanel === section.type;

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
                                                'group relative flex min-h-[4.75rem] items-center transition-colors',
                                                isActive
                                                    ? 'bg-white/55'
                                                    : 'hover:bg-white/35',
                                                draggedSection ===
                                                    section.type &&
                                                    'opacity-45',
                                            )}
                                        >
                                            {isActive && (
                                                <span className="absolute inset-y-0 left-0 w-[3px] bg-[#ff4d3d]" />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setActivePanel(section.type)
                                                }
                                                className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d]"
                                            >
                                                <GripVertical
                                                    className="size-4 shrink-0 cursor-grab text-muted-foreground"
                                                    aria-hidden="true"
                                                />
                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm font-semibold">
                                                        {meta.label}
                                                    </span>
                                                    <span className="mt-0.5 block truncate text-[0.67rem] text-muted-foreground">
                                                        {meta.description}
                                                    </span>
                                                </span>
                                            </button>
                                            <div className="mr-2 flex items-center">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        moveSection(
                                                            section.type,
                                                            'up',
                                                        )
                                                    }
                                                    disabled={index === 0}
                                                    aria-label={`Mover ${meta.label} para cima`}
                                                    className="hidden size-8 items-center justify-center text-muted-foreground group-hover:flex hover:text-foreground focus-visible:flex disabled:opacity-25"
                                                >
                                                    <ChevronUp className="size-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        moveSection(
                                                            section.type,
                                                            'down',
                                                        )
                                                    }
                                                    disabled={
                                                        index ===
                                                        settingsForm.data
                                                            .sections.length -
                                                            1
                                                    }
                                                    aria-label={`Mover ${meta.label} para baixo`}
                                                    className="hidden size-8 items-center justify-center text-muted-foreground group-hover:flex hover:text-foreground focus-visible:flex disabled:opacity-25"
                                                >
                                                    <ChevronDown className="size-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        toggleSection(
                                                            section.type,
                                                        )
                                                    }
                                                    aria-label={`${section.enabled ? 'Ocultar' : 'Mostrar'} ${meta.label}`}
                                                    className="flex size-9 items-center justify-center text-muted-foreground hover:text-foreground"
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
                                },
                            )}
                        </div>
                        <div className="border-t border-border">
                            <button
                                type="button"
                                onClick={() => setActivePanel('appearance')}
                                className={cn(
                                    'relative flex min-h-[4.75rem] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-white/35',
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
                                    <span className="mt-0.5 block text-[0.67rem] text-muted-foreground">
                                        Cores, fonte e fundo
                                    </span>
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActivePanel('publish')}
                                className={cn(
                                    'relative flex min-h-[4.75rem] w-full items-center gap-3 border-t border-border px-4 text-left transition-colors hover:bg-white/35',
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
                                    <span className="mt-0.5 block text-[0.67rem] text-muted-foreground">
                                        Link e interesse
                                    </span>
                                </span>
                            </button>
                        </div>
                    </aside>

                    <main className="flex min-w-0 flex-col bg-[#e7e3dc]/55">
                        <div
                            data-testid="catalog-studio-preview-toolbar"
                            className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-border bg-[#f6f4f0] px-4 py-2.5 xl:sticky xl:top-0 xl:z-30"
                        >
                            <div className="flex items-center gap-2">
                                <LayoutGrid className="size-4" />
                                <span className="text-xs font-semibold">
                                    Prévia ao vivo
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex border border-border bg-[#f6f4f0]">
                                    <button
                                        type="button"
                                        onClick={() => setViewport('desktop')}
                                        aria-pressed={viewport === 'desktop'}
                                        className={cn(
                                            'flex min-h-9 items-center gap-2 px-3 text-xs font-semibold',
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
                                        onClick={() => setViewport('mobile')}
                                        aria-pressed={viewport === 'mobile'}
                                        className={cn(
                                            'flex min-h-9 items-center gap-2 border-l border-border px-3 text-xs font-semibold',
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
                                <div className="flex items-center border border-border bg-[#f6f4f0]">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setZoom((current) =>
                                                Math.max(75, current - 10),
                                            )
                                        }
                                        disabled={zoom === 75}
                                        aria-label="Diminuir prévia"
                                        className="flex size-9 items-center justify-center disabled:opacity-30"
                                    >
                                        <Minus className="size-3.5" />
                                    </button>
                                    <span className="min-w-12 text-center text-[0.67rem] font-semibold tabular-nums">
                                        {zoom}%
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setZoom((current) =>
                                                Math.min(115, current + 10),
                                            )
                                        }
                                        disabled={zoom === 115}
                                        aria-label="Aumentar prévia"
                                        className="flex size-9 items-center justify-center disabled:opacity-30"
                                    >
                                        <Plus className="size-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex min-h-[680px] flex-1 items-start justify-center overflow-auto p-4 sm:p-6">
                            <div
                                data-testid="catalog-live-preview"
                                className={cn(
                                    'origin-top transition-[width,transform] duration-300 ease-out',
                                    viewport === 'mobile'
                                        ? 'w-[390px] max-w-full'
                                        : 'w-full max-w-[1024px] min-w-[620px]',
                                )}
                                style={{
                                    transform: `scale(${zoom / 100})`,
                                }}
                            >
                                <div className="min-h-[680px] overflow-hidden border border-[#cac4ba] bg-white shadow-[0_18px_50px_rgba(24,24,31,0.08)]">
                                    <CatalogPreview
                                        settings={draftSettings}
                                        products={sample_products}
                                        manufacturerName={manufacturer_name}
                                        viewport={viewport}
                                        selectedSection={
                                            activePanel === 'hero' ||
                                            activePanel === 'collections' ||
                                            activePanel === 'product_grid'
                                                ? activePanel
                                                : null
                                        }
                                        onSelectSection={(section) =>
                                            setActivePanel(section)
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </main>

                    <aside
                        data-testid="catalog-studio-inspector"
                        className="min-w-0 border-t border-border bg-[#f6f4f0] xl:sticky xl:top-0 xl:z-20 xl:max-h-svh xl:self-start xl:overflow-y-auto xl:overscroll-contain xl:border-t-0 xl:border-l"
                    >
                        {renderInspector()}
                    </aside>
                </form>
            </div>

            <ImageCropDialog
                open={logoCropDialogOpen}
                onOpenChange={setLogoCropDialogOpen}
                imageFile={logoCropFile}
                onCropped={handleLogoCropped}
                onSkip={() => {
                    logoForm.setData('logo', null);
                    setLogoCropFile(null);
                    setLogoCropDialogOpen(false);
                }}
                aspectRatio={null}
                title="Ajustar logo"
                description="Recorte próximo da marca. O catálogo preserva o formato original sem cortar a assinatura."
            />
        </AppLayout>
    );
}
