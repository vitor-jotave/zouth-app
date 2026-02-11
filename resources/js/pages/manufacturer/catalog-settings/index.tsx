import { Head, useForm } from '@inertiajs/react';
import { Check, Copy, Link2, Palette, RefreshCcw, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
}

interface Props {
    catalog_settings: CatalogSettings;
    public_link: string;
    stats: {
        total: number;
        last_7_days: number;
        last_30_days: number;
    };
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
}: Props) {
    const [copied, setCopied] = useState(false);
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
    });

    const logoForm = useForm<{ logo: File | null }>({
        logo: null,
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

    const handleRotateLink = () => {
        const confirmed = window.confirm(
            'Deseja rotacionar o link publico? O link antigo sera invalidado.',
        );

        if (!confirmed) {
            return;
        }

        settingsForm.post(manufacturer.catalogSettings.rotateLink().url);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Personalizacao do catalogo" />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Personalizacao do catalogo
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Ajuste a identidade visual e o link publico.
                        </p>
                    </div>
                    <Button
                        type="submit"
                        form="catalog-settings-form"
                        disabled={settingsForm.processing}
                    >
                        Salvar alteracoes
                    </Button>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="space-y-6">
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

                                    <div className="rounded-xl border p-4">
                                        <div className="text-sm font-medium text-muted-foreground">
                                            Preview rapido
                                        </div>
                                        <div
                                            className="mt-3 grid gap-4 rounded-xl p-4"
                                            style={{
                                                background: previewColors.background,
                                            }}
                                        >
                                            <div className="flex flex-wrap items-center gap-3">
                                                <div
                                                    className="h-8 w-8 rounded-full"
                                                    style={{
                                                        background: previewColors.primary,
                                                    }}
                                                />
                                                <div
                                                    className="h-8 w-8 rounded-full"
                                                    style={{
                                                        background: previewColors.secondary,
                                                    }}
                                                />
                                                <div
                                                    className="h-8 w-8 rounded-full"
                                                    style={{
                                                        background: previewColors.accent,
                                                    }}
                                                />
                                                <Badge
                                                    style={{
                                                        background: previewColors.primary,
                                                        color: '#fff',
                                                    }}
                                                >
                                                    Destaque
                                                </Badge>
                                            </div>
                                            <div
                                                className="text-sm font-semibold"
                                                style={{
                                                    color: previewColors.secondary,
                                                }}
                                            >
                                                {settingsForm.data.brand_name || 'Sua marca'}
                                            </div>
                                        </div>
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
                    </div>

                    <div className="space-y-6">
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

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleRotateLink}
                                        disabled={settingsForm.processing}
                                    >
                                        <RefreshCcw className="mr-2 h-4 w-4" />
                                        Rotacionar link
                                    </Button>
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
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
