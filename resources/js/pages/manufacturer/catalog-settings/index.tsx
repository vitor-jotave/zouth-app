import { Head, useForm } from '@inertiajs/react';
import { Check, Copy, Image, Layout, Link2, Palette, RefreshCcw, RotateCcw, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import CatalogPreview from '@/components/catalog-preview';
import InputError from '@/components/input-error';
import IphoneFrame from '@/components/iphone-frame';
import { GRADIENT_LABELS, PATTERN_LABELS, PRESET_LABELS } from '@/lib/catalog-theming';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import manufacturer from '@/routes/manufacturer';
import type { BreadcrumbItem } from '@/types';

interface CatalogSettings {
    id: number;
    brand_name: string;
    tagline?: string | null;
    description?: string | null;
    logo_url?: string | null;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    background_color: string;
    font_family: string;
    public_link_active: boolean;
    public_token_rotated_at?: string | null;
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
    total_stock: number;
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

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Catalogo', href: '/manufacturer/catalog-settings' },
];

const fontOptions = [
    { value: 'space-grotesk', label: 'Space Grotesk' },
    { value: 'fraunces', label: 'Fraunces' },
    { value: 'ibm-plex', label: 'IBM Plex Sans' },
];

const colorFields = [
    { key: 'primary_color', label: 'Cor primaria' },
    { key: 'secondary_color', label: 'Cor secundaria' },
    { key: 'accent_color', label: 'Cor de destaque' },
    { key: 'background_color', label: 'Cor de fundo' },
] as const;

export default function CatalogSettings({
    catalog_settings: settings,
    public_link,
    stats,
    sample_products,
    manufacturer_name,
}: Props) {
    const [copied, setCopied] = useState(false);
    const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    
    const settingsForm = useForm({
        brand_name: settings.brand_name ?? '',
        tagline: settings.tagline ?? '',
        description: settings.description ?? '',
        primary_color: settings.primary_color ?? '#0F766E',
        secondary_color: settings.secondary_color ?? '#0F172A',
        accent_color: settings.accent_color ?? '#F97316',
        background_color: settings.background_color ?? '#F8FAFC',
        font_family: settings.font_family ?? 'space-grotesk',
        public_link_active: settings.public_link_active ?? true,
        // Premium fields
        layout_preset: settings.layout_preset ?? 'minimal',
        layout_density: settings.layout_density ?? 'comfortable',
        card_style: settings.card_style ?? 'soft',
        background_mode: settings.background_mode ?? 'solid',
        background_image_opacity: settings.background_image_opacity ?? 20,
        background_overlay_color: settings.background_overlay_color ?? '#000000',
        background_overlay_opacity: settings.background_overlay_opacity ?? 10,
        background_blur: settings.background_blur ?? 0,
        pattern_id: settings.pattern_id ?? null,
        pattern_color: settings.pattern_color ?? settings.primary_color,
        pattern_opacity: settings.pattern_opacity ?? 12,
        gradient_id: settings.gradient_id ?? null,
        sections: settings.sections ?? [],
    });

    const logoForm = useForm<{ logo: File | null }>({
        logo: null,
    });

    const backgroundForm = useForm<{ background_image: File | null }>({
        background_image: null,
    });

    const previewColors = useMemo(() => {
        return {
            primary: settingsForm.data.primary_color,
            secondary: settingsForm.data.secondary_color,
            accent: settingsForm.data.accent_color,
            background: settingsForm.data.background_color,
        };
    }, [
        settingsForm.data.primary_color,
        settingsForm.data.secondary_color,
        settingsForm.data.accent_color,
        settingsForm.data.background_color,
    ]);

    const draftSettings = useMemo(() => {
        return {
            ...settingsForm.data,
            logo_url: settings.logo_url,
            background_image_url: settings.background_image_url,
        };
    }, [settingsForm.data, settings.logo_url, settings.background_image_url]);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        settingsForm.put(manufacturer.catalogSettings.update().url);
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

    const handleLogoUpload = (event: React.FormEvent) => {
        event.preventDefault();
        logoForm.post(manufacturer.catalogSettings.logo().url, {
            onSuccess: () => logoForm.reset(),
        });
    };

    const handleRemoveLogo = () => {
        logoForm.delete(manufacturer.catalogSettings.logo.destroy().url);
    };

    const handleBackgroundUpload = (event: React.FormEvent) => {
        event.preventDefault();
        backgroundForm.post(manufacturer.catalogSettings.background().url, {
            onSuccess: () => {
                backgroundForm.reset();
                settingsForm.setData('background_mode', 'image');
            },
        });
    };

    const handleRemoveBackground = () => {
        backgroundForm.delete(manufacturer.catalogSettings.background.destroy().url, {
            onSuccess: () => {
                settingsForm.setData('background_mode', 'solid');
            },
        });
    };

    const handleRotateLink = () => {
        settingsForm.post(manufacturer.catalogSettings.rotateLink().url, {
            onSuccess: () => setRotateDialogOpen(false),
        });
    };

    const handleResetDefaults = () => {
        settingsForm.post(manufacturer.catalogSettings.resetDefaults().url, {
            onSuccess: () => {
                setResetDialogOpen(false);
                // Refresh page to show updated defaults
                window.location.reload();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Personalizacao do catalogo" />

            <div className="flex flex-1 flex-col gap-6 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Personalizacao do catalogo
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Ajuste a identidade visual e o link publico.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                            <DialogTrigger asChild>
                                <Button type="button" variant="outline">
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Restaurar padrao
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Restaurar configuracoes padrao?</DialogTitle>
                                    <DialogDescription>
                                        Esta acao ira restaurar todas as cores, fonte e textos
                                        para os valores padrao. Esta acao nao pode ser desfeita.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button type="button" variant="outline">
                                            Cancelar
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        type="button"
                                        onClick={handleResetDefaults}
                                        disabled={settingsForm.processing}
                                    >
                                        Confirmar
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <Button
                            type="submit"
                            form="catalog-settings-form"
                            disabled={settingsForm.processing}
                        >
                            Salvar alteracoes
                        </Button>
                    </div>
                </div>

                <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <Tabs defaultValue="personalization" className="space-y-6">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="personalization">Personalização</TabsTrigger>
                            <TabsTrigger value="links">Links e Analytics</TabsTrigger>
                        </TabsList>

                        <TabsContent value="personalization" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Palette className="h-5 w-5" />
                                        Identidade
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form
                                    id="catalog-settings-form"
                                    onSubmit={handleSubmit}
                                    className="space-y-6"
                                >
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="brand_name">Marca</Label>
                                            <Input
                                                id="brand_name"
                                                value={settingsForm.data.brand_name}
                                                onChange={(event) =>
                                                    settingsForm.setData(
                                                        'brand_name',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={settingsForm.errors.brand_name}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="tagline">Slogan</Label>
                                            <Input
                                                id="tagline"
                                                value={settingsForm.data.tagline}
                                                onChange={(event) =>
                                                    settingsForm.setData(
                                                        'tagline',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={settingsForm.errors.tagline}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Descricao</Label>
                                        <textarea
                                            id="description"
                                            value={settingsForm.data.description}
                                            onChange={(event) =>
                                                settingsForm.setData(
                                                    'description',
                                                    event.target.value,
                                                )
                                            }
                                            className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        />
                                        <InputError
                                            message={settingsForm.errors.description}
                                        />
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Fonte</Label>
                                            <Select
                                                value={settingsForm.data.font_family}
                                                onValueChange={(value) =>
                                                    settingsForm.setData(
                                                        'font_family',
                                                        value,
                                                    )
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
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
                                                message={settingsForm.errors.font_family}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Link publico ativo</Label>
                                            <div className="flex items-center gap-3 rounded-md border px-3 py-2">
                                                <Checkbox
                                                    checked={
                                                        settingsForm.data.public_link_active
                                                    }
                                                    onCheckedChange={(value) =>
                                                        settingsForm.setData(
                                                            'public_link_active',
                                                            Boolean(value),
                                                        )
                                                    }
                                                />
                                                <span className="text-sm text-muted-foreground">
                                                    Permitir acesso ao catalogo.
                                                </span>
                                            </div>
                                            <InputError
                                                message={
                                                    settingsForm.errors.public_link_active
                                                }
                                            />
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        {colorFields.map((field) => (
                                            <div className="space-y-2" key={field.key}>
                                                <Label htmlFor={field.key}>
                                                    {field.label}
                                                </Label>
                                                <div className="flex items-center gap-3">
                                                    <Input
                                                        id={field.key}
                                                        type="color"
                                                        value={
                                                            settingsForm.data[
                                                                field.key
                                                            ] as string
                                                        }
                                                        onChange={(event) =>
                                                            settingsForm.setData(
                                                                field.key,
                                                                event.target.value,
                                                            )
                                                        }
                                                        className="h-10 w-14 p-1"
                                                    />
                                                    <Input
                                                        value={
                                                            settingsForm.data[
                                                                field.key
                                                            ] as string
                                                        }
                                                        onChange={(event) =>
                                                            settingsForm.setData(
                                                                field.key,
                                                                event.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                                <InputError
                                                    message={
                                                        settingsForm.errors[field.key]
                                                    }
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Upload className="h-5 w-5" />
                                    Logo
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex h-20 w-20 items-center justify-center rounded-xl border bg-muted">
                                        {settings.logo_url ? (
                                            <img
                                                src={settings.logo_url}
                                                alt="Logo"
                                                className="h-full w-full rounded-xl object-cover"
                                            />
                                        ) : (
                                            <span className="text-xs text-muted-foreground">
                                                Sem logo
                                            </span>
                                        )}
                                    </div>
                                    <form
                                        onSubmit={handleLogoUpload}
                                        className="flex flex-wrap items-center gap-3"
                                    >
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(event) =>
                                                logoForm.setData(
                                                    'logo',
                                                    event.target.files?.[0] ?? null,
                                                )
                                            }
                                        />
                                        <Button
                                            type="submit"
                                            disabled={logoForm.processing}
                                        >
                                            Enviar logo
                                        </Button>
                                        {settings.logo_url && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleRemoveLogo}
                                            >
                                                Remover
                                            </Button>
                                        )}
                                    </form>
                                </div>
                                <InputError message={logoForm.errors.logo} />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Layout className="h-5 w-5" />
                                    Template do Catálogo
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-3">
                                    <Label>Estilo do Layout</Label>
                                    <RadioGroup
                                        value={settingsForm.data.layout_preset}
                                        onValueChange={(value) =>
                                            settingsForm.setData('layout_preset', value)
                                        }
                                    >
                                        {Object.entries(PRESET_LABELS).map(([key, { label, description }]) => (
                                            <div key={key} className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-muted/50">
                                                <RadioGroupItem value={key} id={`preset-${key}`} className="mt-1" />
                                                <div className="flex-1">
                                                    <Label htmlFor={`preset-${key}`} className="font-medium cursor-pointer">
                                                        {label}
                                                    </Label>
                                                    <p className="text-sm text-muted-foreground">{description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Densidade</Label>
                                        <Select
                                            value={settingsForm.data.layout_density}
                                            onValueChange={(value) =>
                                                settingsForm.setData('layout_density', value)
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="comfortable">Confortável</SelectItem>
                                                <SelectItem value="compact">Compacta</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Estilo do Card</Label>
                                        <Select
                                            value={settingsForm.data.card_style}
                                            onValueChange={(value) =>
                                                settingsForm.setData('card_style', value)
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="soft">Soft (sombra)</SelectItem>
                                                <SelectItem value="flat">Flat (borda)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Image className="h-5 w-5" />
                                    Fundo Avançado
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Tabs
                                    value={settingsForm.data.background_mode}
                                    onValueChange={(value) =>
                                        settingsForm.setData('background_mode', value)
                                    }
                                >
                                    <TabsList className="grid w-full grid-cols-4">
                                        <TabsTrigger value="solid">Sólido</TabsTrigger>
                                        <TabsTrigger value="image">Imagem</TabsTrigger>
                                        <TabsTrigger value="pattern">Pattern</TabsTrigger>
                                        <TabsTrigger value="gradient">Gradiente</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="solid" className="space-y-3 pt-4">
                                        <p className="text-sm text-muted-foreground">
                                            Usando cor sólida configurada acima.
                                        </p>
                                    </TabsContent>

                                    <TabsContent value="image" className="space-y-4 pt-4">
                                        <div className="space-y-3">
                                            {settings.background_image_url && (
                                                <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-lg border">
                                                    <img
                                                        src={settings.background_image_url}
                                                        alt="Background"
                                                        className="h-full w-full object-cover"
                                                    />
                                                </div>
                                            )}
                                            <form
                                                onSubmit={handleBackgroundUpload}
                                                className="flex flex-wrap items-center gap-3"
                                            >
                                                <Input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(event) =>
                                                        backgroundForm.setData(
                                                            'background_image',
                                                            event.target.files?.[0] ?? null,
                                                        )
                                                    }
                                                />
                                                <Button
                                                    type="submit"
                                                    disabled={backgroundForm.processing}
                                                    size="sm"
                                                >
                                                    Upload
                                                </Button>
                                                {settings.background_image_url && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={handleRemoveBackground}
                                                        size="sm"
                                                    >
                                                        Remover
                                                    </Button>
                                                )}
                                            </form>
                                            <InputError message={backgroundForm.errors.background_image} />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Opacidade da Imagem: {settingsForm.data.background_image_opacity}%</Label>
                                            <Slider
                                                value={[settingsForm.data.background_image_opacity]}
                                                onValueChange={([value]) =>
                                                    settingsForm.setData('background_image_opacity', value)
                                                }
                                                max={100}
                                                step={5}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Cor do Overlay</Label>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    type="color"
                                                    value={settingsForm.data.background_overlay_color}
                                                    onChange={(event) =>
                                                        settingsForm.setData('background_overlay_color', event.target.value)
                                                    }
                                                    className="h-10 w-14 p-1"
                                                />
                                                <Input
                                                    value={settingsForm.data.background_overlay_color}
                                                    onChange={(event) =>
                                                        settingsForm.setData('background_overlay_color', event.target.value)
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Opacidade do Overlay: {settingsForm.data.background_overlay_opacity}%</Label>
                                            <Slider
                                                value={[settingsForm.data.background_overlay_opacity]}
                                                onValueChange={([value]) =>
                                                    settingsForm.setData('background_overlay_opacity', value)
                                                }
                                                max={100}
                                                step={5}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Desfoque: {settingsForm.data.background_blur}px</Label>
                                            <Slider
                                                value={[settingsForm.data.background_blur]}
                                                onValueChange={([value]) =>
                                                    settingsForm.setData('background_blur', value)
                                                }
                                                max={12}
                                                step={1}
                                            />
                                        </div>

                                        <p className="text-xs text-amber-600">
                                            ⚠️ Use overlay para manter legibilidade dos textos
                                        </p>
                                    </TabsContent>

                                    <TabsContent value="pattern" className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <Label>Pattern</Label>
                                            <Select
                                                value={settingsForm.data.pattern_id ?? ''}
                                                onValueChange={(value) =>
                                                    settingsForm.setData('pattern_id', value || null)
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione um pattern" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(PATTERN_LABELS).map(([key, label]) => (
                                                        <SelectItem key={key} value={key}>
                                                            {label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Cor do Pattern</Label>
                                            <div className="flex items-center gap-3">
                                                <Input
                                                    type="color"
                                                    value={settingsForm.data.pattern_color ?? settingsForm.data.primary_color}
                                                    onChange={(event) =>
                                                        settingsForm.setData('pattern_color', event.target.value)
                                                    }
                                                    className="h-10 w-14 p-1"
                                                />
                                                <Input
                                                    value={settingsForm.data.pattern_color ?? settingsForm.data.primary_color}
                                                    onChange={(event) =>
                                                        settingsForm.setData('pattern_color', event.target.value)
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Intensidade: {settingsForm.data.pattern_opacity}%</Label>
                                            <Slider
                                                value={[settingsForm.data.pattern_opacity]}
                                                onValueChange={([value]) =>
                                                    settingsForm.setData('pattern_opacity', value)
                                                }
                                                max={100}
                                                step={5}
                                            />
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="gradient" className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <Label>Preset de Gradiente</Label>
                                            <Select
                                                value={settingsForm.data.gradient_id ?? ''}
                                                onValueChange={(value) =>
                                                    settingsForm.setData('gradient_id', value || null)
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione um gradiente" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Object.entries(GRADIENT_LABELS).map(([key, label]) => (
                                                        <SelectItem key={key} value={key}>
                                                            {label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Layout className="h-5 w-5" />
                                    Estrutura do Catálogo
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        Configure quais seções aparecem no catálogo e personalize cada uma.
                                    </p>

                                    {settingsForm.data.sections.map((section, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between rounded-lg border p-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    checked={section.enabled}
                                                    onCheckedChange={(checked) => {
                                                        const newSections = [...settingsForm.data.sections];
                                                        newSections[index] = {
                                                            ...section,
                                                            enabled: checked === true,
                                                        };
                                                        settingsForm.setData('sections', newSections);
                                                    }}
                                                />
                                                <div>
                                                    <p className="font-medium">
                                                        {section.type === 'hero' && 'Hero / Banner'}
                                                        {section.type === 'collections' && 'Coleções'}
                                                        {section.type === 'product_grid' && 'Grade de Produtos'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {section.type === 'hero' && 'Seção de destaque com logo e chamada'}
                                                        {section.type === 'collections' && 'Exibir categorias de produtos'}
                                                        {section.type === 'product_grid' && 'Grid principal de produtos'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                        </TabsContent>

                        <TabsContent value="links" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Link2 className="h-5 w-5" />
                                        Link publico
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>URL do catalogo</Label>
                                        <div className="flex flex-wrap gap-2">
                                            <Input
                                                value={public_link}
                                                readOnly
                                                className="min-w-[220px] flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleCopy}
                                            >
                                                {copied ? (
                                                    <>
                                                        <Check className="mr-2 h-4 w-4" />
                                                        Copiado
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="mr-2 h-4 w-4" />
                                                        Copiar
                                                    </>
                                                )}
                                            </Button>
                                            <a
                                                href={public_link}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                <Button type="button">Abrir</Button>
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Dialog
                                            open={rotateDialogOpen}
                                            onOpenChange={setRotateDialogOpen}
                                        >
                                            <DialogTrigger asChild>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    disabled={settingsForm.processing}
                                                >
                                                    <RefreshCcw className="mr-2 h-4 w-4" />
                                                    Rotacionar link
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>
                                                        Rotacionar link publico?
                                                    </DialogTitle>
                                                    <DialogDescription>
                                                        Um novo link sera gerado e o link antigo
                                                        sera invalidado. Todos os links
                                                        compartilhados anteriormente pararao de
                                                        funcionar.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <DialogFooter>
                                                    <DialogClose asChild>
                                                        <Button type="button" variant="outline">
                                                            Cancelar
                                                        </Button>
                                                    </DialogClose>
                                                    <Button
                                                        type="button"
                                                        onClick={handleRotateLink}
                                                        disabled={settingsForm.processing}
                                                    >
                                                        Rotacionar
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                        {settings.public_token_rotated_at && (
                                            <span className="text-xs text-muted-foreground">
                                                Atualizado em{' '}
                                                {new Date(
                                                    settings.public_token_rotated_at,
                                                ).toLocaleDateString('pt-BR')}
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Palette className="h-5 w-5" />
                                        Engajamento
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-3 rounded-xl border p-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Total de visitas
                                            </span>
                                            <span className="text-xl font-semibold">
                                                {stats.total}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Ultimos 7 dias
                                            </span>
                                            <span className="text-lg font-semibold">
                                                {stats.last_7_days}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">
                                                Ultimos 30 dias
                                            </span>
                                            <span className="text-lg font-semibold">
                                                {stats.last_30_days}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    <div className="sticky top-6 h-fit self-start">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Palette className="h-5 w-5" />
                                    Preview em tempo real
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="flex justify-center">
                                <IphoneFrame backgroundColor={settingsForm.data.background_color}>
                                    <CatalogPreview
                                        settings={draftSettings}
                                        products={sample_products}
                                        manufacturerName={manufacturer_name}
                                    />
                                </IphoneFrame>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
