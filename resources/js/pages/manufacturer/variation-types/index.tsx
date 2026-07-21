import { Head, router, useForm } from '@inertiajs/react';
import {
    ImagePlus,
    LockKeyhole,
    MoreHorizontal,
    Palette,
    Pencil,
    Plus,
    Search,
    Trash2,
    Type,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppPageHeader } from '@/components/app-page-header';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { ResourceToolbar } from '@/components/resource-toolbar';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import manufacturer from '@/routes/manufacturer';
import type { BreadcrumbItem } from '@/types';

type VariationValue = {
    id?: number;
    value: string;
    hex: string | null;
    image_path?: string | null;
    image_url?: string | null;
    display_order: number;
};

type VariationType = {
    id: number;
    name: string;
    is_color_type: boolean;
    display_order: number;
    products_count: number;
    values: VariationValue[];
};

type Props = {
    variation_types: VariationType[];
};

type FormValue = {
    id?: number;
    value: string;
    hex: string;
    image?: File | null;
    image_url?: string | null;
    image_preview_url?: string | null;
    remove_image?: boolean;
};

type VariationFormData = {
    name: string;
    is_color_type: boolean;
    values: FormValue[];
};

type VariationEditor = {
    mode: 'create' | 'edit';
    variationType?: VariationType;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Visão geral', href: dashboard().url },
    {
        title: 'Variações',
        href: manufacturer.variationTypes.index().url,
    },
];

const emptyFormValue = (): FormValue => ({
    value: '',
    hex: '',
    image: null,
    image_url: null,
    image_preview_url: null,
    remove_image: false,
});

function formatOrdinal(value: number): string {
    return String(value).padStart(2, '0');
}

function valuesLabel(count: number): string {
    return count === 1 ? '1 valor' : `${count} valores`;
}

function productsLabel(count: number): string {
    return count === 1 ? 'usada em 1 peça' : `usada em ${count} peças`;
}

function typeDescription(isVisual: boolean): string {
    return isVisual ? 'Escolha visual' : 'Escolha por texto';
}

function VariationValuePreview({
    value,
    isVisual,
    mode,
}: {
    value: VariationValue;
    isVisual: boolean;
    mode: 'row' | 'inspector';
}) {
    if (!isVisual) {
        return (
            <figure className="min-w-0">
                <div
                    className={cn(
                        'flex items-center justify-center border border-border bg-background font-zouth-display font-semibold text-foreground',
                        mode === 'row'
                            ? 'size-14 text-base sm:size-16'
                            : 'aspect-square w-full text-xl',
                    )}
                >
                    {value.value}
                </div>
                {mode === 'inspector' && (
                    <figcaption className="mt-2 truncate text-center text-xs text-foreground">
                        {value.value}
                    </figcaption>
                )}
            </figure>
        );
    }

    return (
        <figure className="min-w-0">
            <div
                className={cn(
                    'overflow-hidden border border-black/10 bg-[#e7e3dc]',
                    mode === 'row'
                        ? 'h-14 w-[4.5rem] sm:h-16 sm:w-24'
                        : 'aspect-square w-full',
                )}
                style={
                    value.image_url
                        ? undefined
                        : { backgroundColor: value.hex ?? '#e7e3dc' }
                }
            >
                {value.image_url && (
                    <img
                        src={value.image_url}
                        alt={`Estampa ${value.value}`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                    />
                )}
            </div>
            <figcaption
                className={cn(
                    'mt-2 text-foreground',
                    mode === 'row'
                        ? 'max-w-24 truncate text-xs'
                        : 'line-clamp-2 text-center text-xs leading-4',
                )}
                title={value.value}
            >
                {value.value}
            </figcaption>
        </figure>
    );
}

export default function VariationTypesIndex({ variation_types }: Props) {
    const [search, setSearch] = useState('');
    const [selectedTypeId, setSelectedTypeId] = useState<number | null>(
        variation_types[0]?.id ?? null,
    );
    const [editor, setEditor] = useState<VariationEditor | null>(null);
    const [deleteType, setDeleteType] = useState<VariationType | null>(null);
    const previewUrlsRef = useRef<Set<string>>(new Set());

    const form = useForm<VariationFormData>({
        name: '',
        is_color_type: false,
        values: [emptyFormValue()],
    });

    const filteredTypes = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

        if (!normalizedSearch) {
            return variation_types;
        }

        return variation_types.filter((type) => {
            const searchableValues = type.values
                .map((value) => value.value)
                .join(' ');

            return `${type.name} ${searchableValues}`
                .toLocaleLowerCase('pt-BR')
                .includes(normalizedSearch);
        });
    }, [search, variation_types]);

    const selectedType =
        filteredTypes.find((type) => type.id === selectedTypeId) ??
        filteredTypes[0] ??
        null;
    const selectedTypeIndex = selectedType
        ? variation_types.findIndex((type) => type.id === selectedType.id)
        : -1;
    const totalValues = variation_types.reduce(
        (total, type) => total + type.values.length,
        0,
    );

    useEffect(() => {
        if (!selectedType) {
            setSelectedTypeId(null);
            return;
        }

        if (selectedType.id !== selectedTypeId) {
            setSelectedTypeId(selectedType.id);
        }
    }, [selectedType, selectedTypeId]);

    const revokePreviewUrl = (previewUrl?: string | null) => {
        if (!previewUrl?.startsWith('blob:')) {
            return;
        }

        URL.revokeObjectURL(previewUrl);
        previewUrlsRef.current.delete(previewUrl);
    };

    const revokePreviewUrls = (values: FormValue[]) => {
        values.forEach((value) => {
            revokePreviewUrl(value.image_preview_url);
        });
    };

    useEffect(() => {
        const previewUrls = previewUrlsRef.current;

        return () => {
            previewUrls.forEach((previewUrl) => {
                URL.revokeObjectURL(previewUrl);
            });
            previewUrls.clear();
        };
    }, []);

    const openCreateEditor = () => {
        revokePreviewUrls(form.data.values);
        form.setData({
            name: '',
            is_color_type: false,
            values: [emptyFormValue()],
        });
        form.clearErrors();
        setEditor({ mode: 'create' });
    };

    const openEditEditor = (variationType: VariationType) => {
        revokePreviewUrls(form.data.values);
        form.setData({
            name: variationType.name,
            is_color_type: variationType.is_color_type,
            values: variationType.values.length
                ? variationType.values.map((value) => ({
                      id: value.id,
                      value: value.value,
                      hex: value.hex ?? '',
                      image: null,
                      image_url: value.image_url ?? null,
                      image_preview_url: null,
                      remove_image: false,
                  }))
                : [emptyFormValue()],
        });
        form.clearErrors();
        setSelectedTypeId(variationType.id);
        setEditor({ mode: 'edit', variationType });
    };

    const closeEditor = () => {
        revokePreviewUrls(form.data.values);
        form.clearErrors();
        setEditor(null);
    };

    const addValue = () => {
        form.setData('values', [...form.data.values, emptyFormValue()]);
    };

    const removeValue = (index: number) => {
        const value = form.data.values[index];

        revokePreviewUrl(value.image_preview_url);

        form.setData(
            'values',
            form.data.values.filter((_, valueIndex) => valueIndex !== index),
        );
    };

    const updateValue = (
        index: number,
        field: 'value' | 'hex',
        nextValue: string,
    ) => {
        const values = [...form.data.values];
        const currentValue = values[index];

        if (field === 'hex' && nextValue) {
            revokePreviewUrl(currentValue.image_preview_url);

            values[index] = {
                ...currentValue,
                hex: nextValue,
                image: null,
                image_url: null,
                image_preview_url: null,
                remove_image: Boolean(
                    currentValue.image_url || currentValue.image_preview_url,
                ),
            };
        } else {
            values[index] = { ...currentValue, [field]: nextValue };
        }

        form.setData('values', values);
    };

    const updateValueImage = (index: number, file: File | null) => {
        const values = [...form.data.values];
        const currentValue = values[index];

        revokePreviewUrl(currentValue.image_preview_url);

        const previewUrl = file ? URL.createObjectURL(file) : null;

        if (previewUrl) {
            previewUrlsRef.current.add(previewUrl);
        }

        values[index] = {
            ...currentValue,
            hex: file ? '' : currentValue.hex,
            image: file,
            image_preview_url: previewUrl,
            remove_image: file ? false : currentValue.remove_image,
        };
        form.setData('values', values);
    };

    const removeValueImage = (index: number) => {
        const values = [...form.data.values];
        const currentValue = values[index];

        revokePreviewUrl(currentValue.image_preview_url);

        values[index] = {
            ...currentValue,
            image: null,
            image_url: null,
            image_preview_url: null,
            remove_image: true,
        };
        form.setData('values', values);
    };

    const submitVariation = (event: React.FormEvent) => {
        event.preventDefault();

        const options = {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: closeEditor,
        };

        if (editor?.mode === 'edit' && editor.variationType) {
            form.transform((data) => ({ ...data, _method: 'put' }));
            form.post(
                manufacturer.variationTypes.update(editor.variationType.id).url,
                {
                    ...options,
                    onFinish: () => form.transform((data) => data),
                },
            );
            return;
        }

        form.transform((data) => data);
        form.post(manufacturer.variationTypes.store().url, options);
    };

    const confirmDelete = () => {
        if (!deleteType || deleteType.products_count > 0) {
            return;
        }

        router.delete(manufacturer.variationTypes.destroy(deleteType.id).url, {
            preserveScroll: true,
            onFinish: () => setDeleteType(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Variações" />

            <div className="mx-auto flex w-full max-w-[1560px] flex-1 flex-col px-5 py-8 sm:px-7 md:px-9 lg:pt-8 lg:pb-12 xl:px-12 2xl:px-14">
                <AppPageHeader
                    eyebrow="Organização da coleção"
                    title={
                        <>
                            Variações
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description={
                        <p>
                            Um produto pode ter várias opções de cores,
                            tamanhos, e entre outros. Cadastre essas opções
                            aqui.
                        </p>
                    }
                    aside={
                        <div className="grid gap-4">
                            <Button
                                type="button"
                                onClick={openCreateEditor}
                                className="min-h-12 rounded-[2px] bg-[#ff4d3d] text-[#18181f] hover:-translate-y-px hover:bg-[#ff4d3d]"
                            >
                                <Plus className="size-4" aria-hidden="true" />
                                Nova variação
                            </Button>
                            <p className="text-center font-zouth-display text-sm font-semibold tracking-[-0.01em] text-foreground tabular-nums">
                                {variation_types.length}{' '}
                                {variation_types.length === 1
                                    ? 'tipo'
                                    : 'tipos'}
                                <span
                                    className="px-2 text-[#98968d]"
                                    aria-hidden="true"
                                >
                                    ·
                                </span>
                                {valuesLabel(totalValues)}
                            </p>
                        </div>
                    }
                />

                <ResourceToolbar
                    className="mt-6"
                    label="Buscar variações"
                    search={
                        <div className="relative">
                            <label
                                htmlFor="variation-search"
                                className="sr-only"
                            >
                                Buscar variação
                            </label>
                            <Search
                                className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <Input
                                id="variation-search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Buscar variação ou valor"
                                className="h-[52px] rounded-[2px] border-border bg-transparent pr-11 pl-12 text-base shadow-none focus-visible:border-[#18181f] focus-visible:ring-0"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute top-1/2 right-1 flex size-11 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d]"
                                    aria-label="Limpar busca"
                                >
                                    <X className="size-4" aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    }
                    views={
                        <p
                            className="flex min-h-[52px] items-center border-l border-border px-5 text-sm font-semibold text-foreground tabular-nums"
                            aria-live="polite"
                        >
                            {filteredTypes.length}{' '}
                            {filteredTypes.length === 1
                                ? 'variação'
                                : 'variações'}{' '}
                        </p>
                    }
                    filters={
                        <p className="flex min-h-[52px] items-center gap-2 text-sm text-muted-foreground">
                            <span
                                className="size-1.5 rounded-full bg-[#ff4d3d]"
                                aria-hidden="true"
                            />
                            Cores, estampas e escolhas por texto
                        </p>
                    }
                />

                {filteredTypes.length > 0 ? (
                    <div className="mt-5 grid min-w-0 gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.36fr)]">
                        <section
                            aria-labelledby="variation-library-title"
                            className="min-w-0"
                        >
                            <div className="mb-3 flex items-end justify-between gap-4">
                                <p
                                    id="variation-library-title"
                                    className="text-[0.68rem] font-bold tracking-[0.2em] text-foreground uppercase"
                                >
                                    Biblioteca de variações
                                </p>
                                <p className="text-xs text-muted-foreground tabular-nums">
                                    {filteredTypes.length} de{' '}
                                    {variation_types.length}
                                </p>
                            </div>

                            <div className="border-t border-border">
                                {filteredTypes.map((type) => {
                                    const originalIndex =
                                        variation_types.findIndex(
                                            (variationType) =>
                                                variationType.id === type.id,
                                        );
                                    const isSelected =
                                        selectedType?.id === type.id;

                                    return (
                                        <article
                                            key={type.id}
                                            className={cn(
                                                'group relative border-b border-border transition-colors hover:bg-[#e7e3dc]/35',
                                                isSelected && 'bg-[#e7e3dc]/18',
                                            )}
                                        >
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedTypeId(type.id)
                                                }
                                                aria-pressed={isSelected}
                                                className="grid min-h-[132px] w-full grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 gap-y-5 py-5 pr-14 pl-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d] sm:grid-cols-[3rem_minmax(150px,0.65fr)_minmax(220px,1fr)] sm:items-center sm:gap-x-5 sm:px-5 sm:pr-16"
                                            >
                                                <span className="font-zouth-display text-xl font-medium tracking-[-0.035em] text-muted-foreground tabular-nums">
                                                    {formatOrdinal(
                                                        originalIndex + 1,
                                                    )}
                                                </span>

                                                <span className="min-w-0">
                                                    <span className="block truncate font-zouth-display text-xl font-semibold tracking-[-0.03em] text-foreground">
                                                        {type.name}
                                                    </span>
                                                    <span className="mt-1 flex items-center gap-2 text-[0.68rem] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                                                        {type.is_color_type ? (
                                                            <Palette
                                                                className="size-3.5"
                                                                aria-hidden="true"
                                                            />
                                                        ) : (
                                                            <Type
                                                                className="size-3.5"
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                        {type.is_color_type
                                                            ? 'Visual'
                                                            : 'Texto'}
                                                    </span>
                                                    <span className="mt-3 block text-sm text-foreground">
                                                        {valuesLabel(
                                                            type.values.length,
                                                        )}
                                                    </span>
                                                    <span className="mt-0.5 block text-xs text-muted-foreground">
                                                        {productsLabel(
                                                            type.products_count,
                                                        )}
                                                    </span>
                                                </span>

                                                <span className="col-span-2 col-start-1 flex min-w-0 gap-3 overflow-hidden pl-[3.25rem] sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:pl-0">
                                                    {type.values
                                                        .slice(0, 4)
                                                        .map((value) => (
                                                            <VariationValuePreview
                                                                key={
                                                                    value.id ??
                                                                    value.value
                                                                }
                                                                value={value}
                                                                isVisual={
                                                                    type.is_color_type
                                                                }
                                                                mode="row"
                                                            />
                                                        ))}
                                                    {type.values.length > 4 && (
                                                        <span className="flex size-16 shrink-0 items-center justify-center border border-border text-xs font-semibold text-muted-foreground">
                                                            +
                                                            {type.values
                                                                .length - 4}
                                                        </span>
                                                    )}
                                                </span>
                                            </button>

                                            {isSelected && (
                                                <span
                                                    aria-hidden="true"
                                                    className="absolute inset-y-0 left-0 w-1 bg-[#ff4d3d]"
                                                />
                                            )}

                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute top-6 right-1 min-h-11 min-w-11 rounded-[2px] hover:bg-[#e7e3dc] sm:top-1/2 sm:right-2 sm:-translate-y-1/2"
                                                        aria-label={`Ações para ${type.name}`}
                                                    >
                                                        <MoreHorizontal
                                                            className="size-5"
                                                            aria-hidden="true"
                                                        />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    align="end"
                                                    className="min-w-52 rounded-[2px] shadow-none"
                                                >
                                                    <DropdownMenuItem
                                                        className="min-h-11 rounded-[2px]"
                                                        onSelect={() =>
                                                            openEditEditor(type)
                                                        }
                                                    >
                                                        <Pencil
                                                            className="size-4"
                                                            aria-hidden="true"
                                                        />
                                                        Editar variação
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        variant="destructive"
                                                        disabled={
                                                            type.products_count >
                                                            0
                                                        }
                                                        className="min-h-11 rounded-[2px]"
                                                        onSelect={() =>
                                                            setDeleteType(type)
                                                        }
                                                    >
                                                        {type.products_count >
                                                        0 ? (
                                                            <LockKeyhole
                                                                className="size-4"
                                                                aria-hidden="true"
                                                            />
                                                        ) : (
                                                            <Trash2
                                                                className="size-4"
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                        {type.products_count > 0
                                                            ? 'Variação em uso'
                                                            : 'Excluir variação'}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>

                        {selectedType && (
                            <aside className="hidden border-l border-border pl-8 xl:block">
                                <p className="text-[0.68rem] font-bold tracking-[0.2em] text-foreground uppercase">
                                    Variação em foco
                                </p>
                                <p className="mt-7 font-zouth-display text-[5.25rem] leading-[0.82] font-medium tracking-[-0.065em] text-[#ff4d3d] tabular-nums">
                                    {formatOrdinal(selectedTypeIndex + 1)}
                                </p>
                                <h2 className="mt-7 max-w-xs font-zouth-display text-[clamp(1.75rem,2.5vw,2.35rem)] leading-[0.98] font-semibold tracking-[-0.045em] text-balance text-foreground">
                                    {selectedType.name}
                                </h2>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {typeDescription(
                                        selectedType.is_color_type,
                                    )}
                                </p>

                                <div className="mt-7 grid grid-cols-3 gap-3">
                                    {selectedType.values
                                        .slice(0, 6)
                                        .map((value) => (
                                            <VariationValuePreview
                                                key={value.id ?? value.value}
                                                value={value}
                                                isVisual={
                                                    selectedType.is_color_type
                                                }
                                                mode="inspector"
                                            />
                                        ))}
                                </div>

                                <div className="mt-7 border-t border-border pt-5">
                                    <p className="font-zouth-display text-lg font-semibold tracking-[-0.025em] text-foreground tabular-nums">
                                        {valuesLabel(
                                            selectedType.values.length,
                                        )}
                                        <span
                                            className="px-2 text-[#98968d]"
                                            aria-hidden="true"
                                        >
                                            ·
                                        </span>
                                        {productsLabel(
                                            selectedType.products_count,
                                        )}
                                    </p>
                                </div>

                                <Button
                                    type="button"
                                    onClick={() => openEditEditor(selectedType)}
                                    className="mt-7 min-h-12 w-full rounded-[2px] bg-[#18181f] text-[#f6f4f0] hover:-translate-y-px hover:bg-[#18181f]"
                                >
                                    <Pencil
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Editar variação
                                </Button>

                                {selectedType.products_count > 0 ? (
                                    <p className="mt-8 flex gap-3 text-xs leading-5 text-muted-foreground">
                                        <LockKeyhole
                                            className="mt-0.5 size-4 shrink-0"
                                            aria-hidden="true"
                                        />
                                        Em uso na coleção. Remova esta escolha
                                        das peças antes de excluí-la.
                                    </p>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setDeleteType(selectedType)
                                        }
                                        className="mt-7 min-h-11 text-sm font-semibold text-[#b42318] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]"
                                    >
                                        Excluir variação sem uso
                                    </button>
                                )}
                            </aside>
                        )}
                    </div>
                ) : (
                    <EmptyState
                        className="mt-5"
                        visual={
                            <span className="flex size-16 items-center justify-center border border-border bg-[#e7e3dc]/30">
                                <Search
                                    className="size-6 text-muted-foreground"
                                    aria-hidden="true"
                                />
                            </span>
                        }
                        eyebrow={
                            variation_types.length === 0
                                ? 'Primeira escolha'
                                : 'Busca sem resultado'
                        }
                        title={
                            variation_types.length === 0
                                ? 'Crie o vocabulário da sua coleção.'
                                : 'Nenhuma variação encontrada.'
                        }
                        description={
                            variation_types.length === 0 ? (
                                <p>
                                    Comece por Cor, Tamanho ou outra escolha que
                                    aparece em várias peças.
                                </p>
                            ) : (
                                <p>
                                    Tente outro nome ou busque por um valor da
                                    variação.
                                </p>
                            )
                        }
                        actions={
                            variation_types.length === 0 ? (
                                <Button
                                    type="button"
                                    onClick={openCreateEditor}
                                    className="min-h-12 rounded-[2px] bg-[#ff4d3d] text-[#18181f] hover:bg-[#ff4d3d]"
                                >
                                    <Plus
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Criar primeira variação
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setSearch('')}
                                    className="min-h-11 rounded-[2px] shadow-none"
                                >
                                    Limpar busca
                                </Button>
                            )
                        }
                    />
                )}
            </div>

            <Sheet
                open={Boolean(editor)}
                onOpenChange={(open) => {
                    if (!open) {
                        closeEditor();
                    }
                }}
            >
                <SheetContent className="w-full gap-0 overflow-hidden border-l border-border bg-[#f6f4f0] p-0 shadow-none sm:max-w-[680px]">
                    <SheetHeader className="border-b border-border px-6 pt-8 pb-6 sm:px-9">
                        <p className="pr-12 text-[0.68rem] font-bold tracking-[0.22em] text-[#ff4d3d] uppercase">
                            {editor?.mode === 'edit'
                                ? 'Editar variação'
                                : 'Nova variação'}
                        </p>
                        <SheetTitle className="pr-12 font-zouth-display text-[clamp(2rem,4vw,3rem)] leading-[0.98] font-semibold tracking-[-0.05em]">
                            {editor?.mode === 'edit'
                                ? `${editor.variationType?.name}.`
                                : 'Monte uma variação.'}
                        </SheetTitle>
                        {/* <SheetDescription className="max-w-lg pt-3 text-sm leading-6">
                            Defina uma escolha uma vez e reutilize-a em todas as
                            peças que precisarem dela.
                        </SheetDescription> */}
                    </SheetHeader>

                    <form
                        onSubmit={submitVariation}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-7 sm:px-9">
                            <section aria-labelledby="variation-identity-title">
                                <div className="space-y-2">
                                    <Label htmlFor="variation-name">
                                        Nome da variação
                                    </Label>
                                    <Input
                                        id="variation-name"
                                        value={form.data.name}
                                        onChange={(event) =>
                                            form.setData(
                                                'name',
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Ex: Cor, Tamanho, Material"
                                        autoFocus
                                        className="h-12 rounded-[2px] border-border bg-transparent text-base shadow-none focus-visible:border-[#18181f] focus-visible:ring-0"
                                    />
                                    <InputError message={form.errors.name} />
                                </div>

                                <fieldset className="mt-6">
                                    <legend className="text-sm font-medium text-foreground">
                                        Como os valores aparecem?
                                    </legend>
                                    <div className="mt-2 grid grid-cols-2 border border-border">
                                        <button
                                            type="button"
                                            aria-pressed={
                                                !form.data.is_color_type
                                            }
                                            onClick={() =>
                                                form.setData(
                                                    'is_color_type',
                                                    false,
                                                )
                                            }
                                            className={cn(
                                                'flex min-h-24 flex-col items-start justify-between border-r border-border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d]',
                                                !form.data.is_color_type
                                                    ? 'bg-[#18181f] text-[#f6f4f0]'
                                                    : 'hover:bg-[#e7e3dc]/35',
                                            )}
                                        >
                                            <Type
                                                className="size-5"
                                                aria-hidden="true"
                                            />
                                            <span>
                                                <span className="block font-zouth-display font-semibold">
                                                    Texto
                                                </span>
                                                <span
                                                    className={cn(
                                                        'mt-1 block text-xs',
                                                        !form.data.is_color_type
                                                            ? 'text-[#cac4ba]'
                                                            : 'text-muted-foreground',
                                                    )}
                                                >
                                                    Tamanho, material, modelo
                                                </span>
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            aria-pressed={
                                                form.data.is_color_type
                                            }
                                            onClick={() =>
                                                form.setData(
                                                    'is_color_type',
                                                    true,
                                                )
                                            }
                                            className={cn(
                                                'flex min-h-24 flex-col items-start justify-between p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d]',
                                                form.data.is_color_type
                                                    ? 'bg-[#18181f] text-[#f6f4f0]'
                                                    : 'hover:bg-[#e7e3dc]/35',
                                            )}
                                        >
                                            <Palette
                                                className="size-5"
                                                aria-hidden="true"
                                            />
                                            <span>
                                                <span className="block font-zouth-display font-semibold">
                                                    Cor ou estampa
                                                </span>
                                                <span
                                                    className={cn(
                                                        'mt-1 block text-xs',
                                                        form.data.is_color_type
                                                            ? 'text-[#cac4ba]'
                                                            : 'text-muted-foreground',
                                                    )}
                                                >
                                                    Swatch visual no catálogo
                                                </span>
                                            </span>
                                        </button>
                                    </div>
                                </fieldset>
                            </section>

                            <section
                                aria-labelledby="variation-values-title"
                                className="mt-9 border-t border-border pt-7"
                            >
                                <div className="flex items-end justify-between gap-4">
                                    <div>
                                        <p
                                            id="variation-values-title"
                                            className="text-[0.68rem] font-bold tracking-[0.2em] text-foreground uppercase"
                                        >
                                            Opções da variação
                                        </p>
                                        <p className="mt-2 text-sm text-muted-foreground">
                                            Cada valor vira uma escolha no seu
                                            catálogo.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={addValue}
                                        className="min-h-11 shrink-0 rounded-[2px] shadow-none"
                                    >
                                        <Plus
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        Adicionar
                                    </Button>
                                </div>

                                <div className="mt-5 border-t border-border">
                                    {form.data.values.map((value, index) => {
                                        const visualUrl =
                                            value.image_preview_url ??
                                            value.image_url;
                                        const colorPickerValue =
                                            /^#[0-9A-F]{6}$/i.test(value.hex)
                                                ? value.hex
                                                : '#d8d2c8';

                                        return (
                                            <article
                                                key={value.id ?? index}
                                                className="relative border-b border-border py-5"
                                            >
                                                <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 pr-11">
                                                    <span className="pt-3 font-zouth-display text-sm font-semibold text-muted-foreground tabular-nums">
                                                        {formatOrdinal(
                                                            index + 1,
                                                        )}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <Label
                                                            htmlFor={`variation-value-${index}`}
                                                            className="sr-only"
                                                        >
                                                            Valor {index + 1}
                                                        </Label>
                                                        <Input
                                                            id={`variation-value-${index}`}
                                                            value={value.value}
                                                            onChange={(event) =>
                                                                updateValue(
                                                                    index,
                                                                    'value',
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                            placeholder={
                                                                form.data
                                                                    .is_color_type
                                                                    ? 'Ex: Verde musgo'
                                                                    : 'Ex: P'
                                                            }
                                                            className="h-12 rounded-[2px] border-border bg-transparent text-base shadow-none focus-visible:border-[#18181f] focus-visible:ring-0"
                                                        />
                                                        <InputError
                                                            message={
                                                                form.errors[
                                                                    `values.${index}.value`
                                                                ]
                                                            }
                                                        />
                                                    </div>
                                                </div>

                                                {form.data.is_color_type && (
                                                    <div className="mt-4 ml-[3rem] grid gap-3 sm:grid-cols-[6rem_minmax(0,1fr)]">
                                                        <div
                                                            className="aspect-square overflow-hidden border border-black/10 bg-[#e7e3dc]"
                                                            style={
                                                                visualUrl
                                                                    ? undefined
                                                                    : {
                                                                          backgroundColor:
                                                                              value.hex ||
                                                                              '#e7e3dc',
                                                                      }
                                                            }
                                                        >
                                                            {visualUrl && (
                                                                <img
                                                                    src={
                                                                        visualUrl
                                                                    }
                                                                    alt=""
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            )}
                                                        </div>

                                                        <div className="grid min-w-0 gap-3">
                                                            <div className="grid grid-cols-[3.25rem_minmax(0,1fr)]">
                                                                <label
                                                                    htmlFor={`variation-color-${index}`}
                                                                    className="flex h-11 cursor-pointer items-center justify-center border border-r-0 border-border bg-background"
                                                                    title="Escolher cor"
                                                                >
                                                                    <input
                                                                        id={`variation-color-${index}`}
                                                                        type="color"
                                                                        value={
                                                                            colorPickerValue
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            updateValue(
                                                                                index,
                                                                                'hex',
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        className="size-7 cursor-pointer border-0 bg-transparent p-0"
                                                                    />
                                                                    <span className="sr-only">
                                                                        Escolher
                                                                        cor
                                                                    </span>
                                                                </label>
                                                                <Input
                                                                    value={
                                                                        value.hex
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        updateValue(
                                                                            index,
                                                                            'hex',
                                                                            event
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    placeholder="#RRGGBB"
                                                                    aria-label={`Código da cor do valor ${index + 1}`}
                                                                    className="h-11 rounded-[2px] border-border bg-transparent font-mono uppercase shadow-none focus-visible:border-[#18181f] focus-visible:ring-0"
                                                                />
                                                            </div>

                                                            <div className="flex flex-wrap gap-2">
                                                                <input
                                                                    id={`variation-image-${index}`}
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="sr-only"
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        updateValueImage(
                                                                            index,
                                                                            event
                                                                                .target
                                                                                .files?.[0] ??
                                                                                null,
                                                                        )
                                                                    }
                                                                />
                                                                <Label
                                                                    htmlFor={`variation-image-${index}`}
                                                                    className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[2px] border border-border bg-transparent px-4 text-sm font-medium focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#ff4d3d] hover:bg-[#e7e3dc]/50"
                                                                >
                                                                    <ImagePlus
                                                                        className="size-4"
                                                                        aria-hidden="true"
                                                                    />
                                                                    {visualUrl
                                                                        ? 'Trocar estampa'
                                                                        : 'Usar estampa'}
                                                                </Label>
                                                                {visualUrl && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        onClick={() =>
                                                                            removeValueImage(
                                                                                index,
                                                                            )
                                                                        }
                                                                        className="min-h-11 rounded-[2px] text-muted-foreground"
                                                                    >
                                                                        Remover
                                                                        estampa
                                                                    </Button>
                                                                )}
                                                            </div>
                                                            <InputError
                                                                message={
                                                                    form.errors[
                                                                        `values.${index}.image`
                                                                    ]
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {form.data.values.length >
                                                    1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeValue(index)
                                                        }
                                                        className="absolute top-5 right-0 flex size-11 items-center justify-center text-muted-foreground hover:text-[#b42318] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d]"
                                                        aria-label={`Remover valor ${index + 1}`}
                                                    >
                                                        <Trash2
                                                            className="size-4"
                                                            aria-hidden="true"
                                                        />
                                                    </button>
                                                )}
                                            </article>
                                        );
                                    })}
                                </div>
                            </section>
                        </div>

                        <SheetFooter className="grid grid-cols-2 border-t border-border bg-[#f6f4f0] px-6 py-5 sm:px-9">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeEditor}
                                className="min-h-12 rounded-[2px] shadow-none"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={form.processing}
                                className="min-h-12 rounded-[2px] bg-[#ff4d3d] text-[#18181f] hover:bg-[#ff4d3d]"
                            >
                                {form.processing
                                    ? 'Salvando...'
                                    : editor?.mode === 'edit'
                                      ? 'Salvar variação'
                                      : 'Criar variação'}
                            </Button>
                        </SheetFooter>
                    </form>
                </SheetContent>
            </Sheet>

            <AlertDialog
                open={Boolean(deleteType)}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeleteType(null);
                    }
                }}
            >
                <AlertDialogContent className="rounded-[2px] border-border bg-[#f6f4f0] shadow-none">
                    <AlertDialogHeader>
                        <p className="text-[0.68rem] font-bold tracking-[0.2em] text-[#b42318] uppercase">
                            Excluir escolha
                        </p>
                        <AlertDialogTitle className="font-zouth-display text-2xl tracking-[-0.04em]">
                            Excluir {deleteType?.name}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="leading-6">
                            Os valores desta variação deixam de ficar
                            disponíveis para novas peças. Esta ação não pode ser
                            desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="min-h-11 rounded-[2px] shadow-none">
                            Manter variação
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={confirmDelete}
                            className="min-h-11 rounded-[2px] shadow-none"
                        >
                            Excluir variação
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
