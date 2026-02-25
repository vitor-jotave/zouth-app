import { router, useForm } from '@inertiajs/react';
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    type DragEndEvent,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CircleAlert, GripVertical, ImagePlus, Loader2, Package, Palette, Shirt, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImageCropDialog } from '@/components/image-crop-dialog';
import { ImageDropzone } from '@/components/image-dropzone';
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
import { Separator } from '@/components/ui/separator';

interface Category {
    id: number;
    name: string;
}

interface MediaItem {
    id: number;
    type: 'image' | 'video';
    path: string;
    url?: string;
    sort_order: number;
}

const MAX_IMAGES = 10;

interface VariationTypeValue {
    id: number;
    value: string;
    hex?: string | null;
}

interface VariationTypeOption {
    id: number;
    name: string;
    is_color_type: boolean;
    values: VariationTypeValue[];
}

interface ProductVariation {
    variation_type_id: number;
    values: string[];
}

interface ProductVariantStock {
    variation_key: Record<string, string>;
    quantity: number;
    price: string;
    sku_variant?: string | null;
}

interface ProductPayload {
    id: number;
    name: string;
    sku: string;
    description?: string | null;
    product_category_id?: number | null;
    base_quantity: number;
    is_active: boolean;
    sort_order: number;
    price_cents?: number | null;
    media?: MediaItem[];
    variations?: Array<{
        id: number;
        variation_type_id: number;
        type?: {
            id: number;
            name: string;
            is_color_type: boolean;
            values: VariationTypeValue[];
        } | null;
    }>;
    variant_stocks?: Array<{
        id: number;
        variation_key: Record<string, string>;
        quantity: number;
        price_cents?: number | null;
        sku_variant?: string | null;
    }>;
}

interface StockStructure {
    variations: Array<{
        id: number;
        type: {
            id: number;
            name: string;
            is_color_type: boolean;
        };
        values: VariationTypeValue[];
    }>;
    base_quantity: number;
    stocks: Array<{
        id: number;
        variation_key: Record<string, string>;
        quantity: number;
        price_cents?: number | null;
        sku_variant?: string | null;
    }>;
}

interface Props {
    mode: 'create' | 'edit';
    categories: Category[];
    variationTypes: VariationTypeOption[];
    product?: ProductPayload;
    stockStructure?: StockStructure;
}

const steps = [
    { key: 'basic', label: 'Dados basicos', icon: Package },
    { key: 'media', label: 'Midia', icon: ImagePlus },
    { key: 'variants', label: 'Variacoes e estoque', icon: Shirt },
];

/** Maps error field prefixes to their respective step index. */
const STEP_FIELDS: Record<number, string[]> = {
    0: ['name', 'sku', 'description', 'product_category_id', 'price', 'sort_order', 'is_active'],
    1: ['images', 'video'],
    2: ['variations', 'variant_stocks', 'base_quantity'],
};

function getStepForError(errorKey: string): number {
    for (const [stepStr, fields] of Object.entries(STEP_FIELDS)) {
        const stepIdx = Number(stepStr);
        if (fields.some((f) => errorKey === f || errorKey.startsWith(`${f}.`))) {
            return stepIdx;
        }
    }
    return 0;
}

function stepsWithErrors(errors: Record<string, string>): Set<number> {
    const set = new Set<number>();
    for (const key of Object.keys(errors)) {
        set.add(getStepForError(key));
    }
    return set;
}

/**
 * Build the cartesian product of all selected variation values and return stock
 * rows, preserving existing quantities when the key matches.
 */
function buildVariantStocks(
    variations: ProductVariation[],
    variationTypes: VariationTypeOption[],
    currentStocks: ProductVariantStock[],
): ProductVariantStock[] {
    if (variations.length === 0) {
        return [];
    }

    // Resolve type names for each selected variation
    const resolvedSets = variations
        .map((v) => {
            const type = variationTypes.find((t) => t.id === v.variation_type_id);
            return type ? { name: type.name, values: v.values } : null;
        })
        .filter(Boolean) as { name: string; values: string[] }[];

    if (resolvedSets.length === 0 || resolvedSets.some((s) => s.values.length === 0)) {
        return [];
    }

    // Generate cartesian product of all value sets
    let combos: Record<string, string>[] = [{}];
    for (const set of resolvedSets) {
        const next: Record<string, string>[] = [];
        for (const combo of combos) {
            for (const val of set.values) {
                next.push({ ...combo, [set.name]: val });
            }
        }
        combos = next;
    }

    // Build a lookup from current stocks for quantity/price/sku preservation
    const normalize = (key: Record<string, string>) =>
        JSON.stringify(Object.entries(key).sort(([a], [b]) => a.localeCompare(b)));

    const stockMap = new Map<string, ProductVariantStock>();
    currentStocks.forEach((s) => stockMap.set(normalize(s.variation_key), s));

    return combos.map((key) => {
        const existing = stockMap.get(normalize(key));
        return {
            variation_key: key,
            quantity: existing?.quantity ?? 0,
            price: existing?.price ?? '',
            sku_variant: existing?.sku_variant ?? null,
        };
    });
}

// ---------------------------------------------------------------------------
// Sortable media item component
// ---------------------------------------------------------------------------
interface SortableMediaItemProps {
    media: MediaItem;
    index: number;
    onDelete: (id: number) => void;
}

function SortableMediaItem({ media, index, onDelete }: SortableMediaItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: media.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background p-3"
        >
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
                    aria-label="Arrastar para reordenar"
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="h-5 w-5" />
                </button>
                {media.type === 'image' ? (
                    <img
                        src={media.url}
                        alt="Preview"
                        className="h-16 w-16 rounded-md object-cover"
                    />
                ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted text-sm">
                        Video
                    </div>
                )}
                <div>
                    <div className="text-sm font-medium">
                        {media.type === 'image' ? 'Imagem' : 'Video'}
                    </div>
                    <div className="text-xs text-muted-foreground">Ordem {index + 1}</div>
                </div>
            </div>
            <Button
                type="button"
                variant="destructive"
                onClick={() => onDelete(media.id)}
            >
                Remover
            </Button>
        </div>
    );
}

export function ProductForm({
    mode,
    categories,
    variationTypes,
    product,
    stockStructure,
}: Props) {
    const centsToDisplay = (cents: number | null | undefined): string => {
        if (cents == null) return '';
        return String(cents / 100).replace('.', ',');
    };

    // Derive initial variations from stockStructure (edit) or product
    const initialVariations: ProductVariation[] = (() => {
        if (stockStructure?.variations) {
            return stockStructure.variations.map((v) => ({
                variation_type_id: v.type.id,
                values: v.values.map((val) => val.value),
            }));
        }
        if (product?.variations) {
            return product.variations
                .filter((v) => v.type)
                .map((v) => ({
                    variation_type_id: v.variation_type_id,
                    values: v.type!.values.map((val) => val.value),
                }));
        }
        return [];
    })();

    const initialStocks: ProductVariantStock[] = (() => {
        if (stockStructure?.stocks) {
            return stockStructure.stocks.map((s) => ({
                variation_key: s.variation_key,
                quantity: s.quantity,
                price: centsToDisplay(s.price_cents),
                sku_variant: s.sku_variant ?? null,
            }));
        }
        if (product?.variant_stocks) {
            return product.variant_stocks.map((s) => ({
                variation_key: s.variation_key,
                quantity: s.quantity,
                price: centsToDisplay(s.price_cents),
                sku_variant: s.sku_variant ?? null,
            }));
        }
        return [];
    })();

    const { data, setData, post, put, processing, errors } = useForm<{
        name: string;
        sku: string;
        description: string;
        product_category_id: string | number;
        base_quantity: number;
        is_active: boolean;
        sort_order: number;
        price: string;
        variations: ProductVariation[];
        variant_stocks: ProductVariantStock[];
        images: File[];
        video: File | null;
    }>({
        name: product?.name ?? '',
        sku: product?.sku ?? '',
        description: product?.description ?? '',
        product_category_id: product?.product_category_id ?? '',
        base_quantity: product?.base_quantity ?? 0,
        is_active: product?.is_active ?? true,
        sort_order: product?.sort_order ?? 0,
        price: product?.price_cents != null ? String(product.price_cents / 100).replace('.', ',') : '',
        variations: initialVariations,
        variant_stocks: initialStocks,
        images: [],
        video: null,
    });

    const [step, setStep] = useState(0);
    const [mediaItems, setMediaItems] = useState<MediaItem[]>(
        product?.media ?? [],
    );
    const [videoToUpload, setVideoToUpload] = useState<File | null>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    // Crop queue: files waiting to be cropped one-by-one
    const [cropQueue, setCropQueue] = useState<File[]>([]);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);

    useEffect(() => {
        setMediaItems(product?.media ?? []);
    }, [product?.media]);

    const hasVariants = data.variations.length > 0;

    const computedStocks = useMemo(() => {
        return buildVariantStocks(data.variations, variationTypes, data.variant_stocks);
    }, [data.variations, variationTypes, data.variant_stocks]);

    // Steps with validation errors — used for badges + auto-navigation
    const errorSteps = useMemo(() => stepsWithErrors(errors), [errors]);

    // When backend errors arrive, navigate to the first step that has errors
    useEffect(() => {
        if (errorSteps.size > 0) {
            const first = Math.min(...errorSteps);
            setStep(first);
        }
    }, [errorSteps]);

    /** Client-side required-field check for the current step. */
    const validateCurrentStep = (): boolean => {
        if (step === 0) {
            return data.name.trim() !== '' && data.sku.trim() !== '';
        }
        // Steps 1 & 2 don't have mandatory fields that block advancing
        return true;
    };

    const handleNext = () => {
        if (!validateCurrentStep()) return;
        setStep((current) => Math.min(current + 1, steps.length - 1));
    };

    const handlePrev = () => {
        setStep((current) => Math.max(current - 1, 0));
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        if (mode === 'create') {
            post('/manufacturer/products', { forceFormData: true });
            return;
        }

        if (!product) {
            return;
        }

        put(`/manufacturer/products/${product.id}`);
    };

    const rebuildStocks = (nextVariations: ProductVariation[]) => {
        setData('variations', nextVariations);
        setData('variant_stocks', buildVariantStocks(nextVariations, variationTypes, data.variant_stocks));
    };

    const toggleVariationType = (typeId: number, checked: boolean) => {
        if (checked) {
            if (data.variations.some((v) => v.variation_type_id === typeId)) return;
            rebuildStocks([...data.variations, { variation_type_id: typeId, values: [] }]);
        } else {
            rebuildStocks(data.variations.filter((v) => v.variation_type_id !== typeId));
        }
    };

    const toggleVariationValue = (typeId: number, value: string) => {
        const nextVariations = data.variations.map((v) => {
            if (v.variation_type_id !== typeId) return v;
            const hasValue = v.values.includes(value);
            return {
                ...v,
                values: hasValue ? v.values.filter((val) => val !== value) : [...v.values, value],
            };
        });
        rebuildStocks(nextVariations);
    };

    const updateStockField = (
        key: Record<string, string>,
        field: 'quantity' | 'price' | 'sku_variant',
        value: number | string | null,
    ) => {
        const normalize = (k: Record<string, string>) =>
            JSON.stringify(Object.entries(k).sort(([a], [b]) => a.localeCompare(b)));
        const target = normalize(key);
        const nextStocks = computedStocks.map((stock) =>
            normalize(stock.variation_key) === target ? { ...stock, [field]: value } : stock,
        );
        setData('variant_stocks', nextStocks);
    };

    // -----------------------------------------------------------------------
    // Image crop queue
    // -----------------------------------------------------------------------
    const currentCropFile = cropQueue.length > 0 ? cropQueue[0] : null;

    const handleFilesSelected = useCallback(
        (files: File[]) => {
            setCropQueue(files);
            setCropDialogOpen(true);
        },
        [],
    );

    const handleCropped = useCallback(
        (croppedFile: File) => {
            if (mode === 'create') {
                setData('images', [...data.images, croppedFile]);
            } else if (product) {
                // Upload immediately in edit mode
                setUploadingMedia(true);
                router.post(
                    `/manufacturer/products/${product.id}/media`,
                    { type: 'image', files: [croppedFile] },
                    {
                        forceFormData: true,
                        preserveScroll: true,
                        preserveState: true,
                        onFinish: () => setUploadingMedia(false),
                    },
                );
            }

            // Advance to next file in queue or close
            setCropQueue((prev) => {
                const next = prev.slice(1);
                if (next.length === 0) {
                    setCropDialogOpen(false);
                }
                return next;
            });
        },
        [mode, product, data.images, setData],
    );

    const handleCropSkip = useCallback(() => {
        setCropQueue((prev) => {
            const next = prev.slice(1);
            if (next.length === 0) {
                setCropDialogOpen(false);
            }
            return next;
        });
    }, []);

    const handleVideoUpload = useCallback(() => {
        if (!product || !videoToUpload) return;

        setUploadingMedia(true);
        router.post(
            `/manufacturer/products/${product.id}/media`,
            { type: 'video', file: videoToUpload },
            {
                forceFormData: true,
                preserveScroll: true,
                preserveState: true,
                onFinish: () => {
                    setVideoToUpload(null);
                    setUploadingMedia(false);
                    if (videoInputRef.current) {
                        videoInputRef.current.value = '';
                    }
                },
            },
        );
    }, [product, videoToUpload]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over || active.id === over.id || !product) return;

            setMediaItems((prev) => {
                const oldIndex = prev.findIndex((m) => m.id === active.id);
                const newIndex = prev.findIndex((m) => m.id === over.id);
                const next = arrayMove(prev, oldIndex, newIndex);

                router.put(
                    `/manufacturer/products/${product.id}/media/order`,
                    { media_order: next.map((item) => item.id) },
                    { preserveScroll: true, preserveState: true },
                );

                return next;
            });
        },
        [product],
    );

    const moveMedia = (index: number, direction: 'up' | 'down') => {
        const next = [...mediaItems];
        const newIndex = direction === 'up' ? index - 1 : index + 1;

        if (newIndex < 0 || newIndex >= mediaItems.length) {
            return;
        }

        [next[index], next[newIndex]] = [next[newIndex], next[index]];
        setMediaItems(next);
    };

    const persistMediaOrder = () => {
        if (!product) {
            return;
        }

        router.put(
            `/manufacturer/products/${product.id}/media/order`,
            {
                media_order: mediaItems.map((item) => item.id),
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const deleteMedia = (mediaId: number) => {
        if (!product) {
            return;
        }

        router.delete(`/manufacturer/products/${product.id}/media/${mediaId}`);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-wrap gap-2">
                {steps.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = step === index;
                    const hasError = errorSteps.has(index);

                    return (
                        <Button
                            key={item.key}
                            type="button"
                            variant={isActive ? 'default' : 'outline'}
                            onClick={() => setStep(index)}
                            className="relative"
                        >
                            <Icon className="mr-2 h-4 w-4" />
                            {item.label}
                            {hasError && (
                                <CircleAlert className="ml-1.5 size-4 shrink-0 text-destructive" />
                            )}
                        </Button>
                    );
                })}
            </div>

            {step === 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Dados basicos</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome</Label>
                                <Input
                                    id="name"
                                    value={data.name}
                                    onChange={(event) =>
                                        setData('name', event.target.value)
                                    }
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sku">SKU</Label>
                                <Input
                                    id="sku"
                                    value={data.sku}
                                    onChange={(event) =>
                                        setData('sku', event.target.value)
                                    }
                                />
                                <InputError message={errors.sku} />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Categoria</Label>
                                <Select
                                    value={
                                        data.product_category_id
                                            ? String(data.product_category_id)
                                            : 'none'
                                    }
                                    onValueChange={(value) =>
                                        setData(
                                            'product_category_id',
                                            value === 'none' ? '' : Number(value),
                                        )
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sem categoria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Sem categoria</SelectItem>
                                        {categories.map((category) => (
                                            <SelectItem
                                                key={category.id}
                                                value={String(category.id)}
                                            >
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.product_category_id} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sort_order">Ordem</Label>
                                <Input
                                    id="sort_order"
                                    type="number"
                                    min={0}
                                    value={data.sort_order}
                                    onChange={(event) =>
                                        setData(
                                            'sort_order',
                                            Number(event.target.value),
                                        )
                                    }
                                />
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="price">Preco (R$)</Label>
                                <Input
                                    id="price"
                                    placeholder="Ex: 12,90"
                                    value={data.price}
                                    onChange={(event) =>
                                        setData('price', event.target.value)
                                    }
                                />
                                <p className="text-muted-foreground text-xs">
                                    Deixe em branco para exibir &ldquo;Sob consulta&rdquo;
                                </p>
                                <InputError message={errors.price} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descricao</Label>
                            <textarea
                                id="description"
                                value={data.description ?? ''}
                                onChange={(event) =>
                                    setData('description', event.target.value)
                                }
                                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                            />
                            <InputError message={errors.description} />
                        </div>

                        <div className="flex flex-wrap items-center gap-6">
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                    checked={data.is_active}
                                    onCheckedChange={(checked) =>
                                        setData('is_active', Boolean(checked))
                                    }
                                />
                                Produto ativo
                            </label>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Midia</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Image drop zone */}
                        <div className="space-y-4">
                            <Label>Fotos do produto</Label>
                            <ImageDropzone
                                onFilesSelected={handleFilesSelected}
                                maxFiles={MAX_IMAGES}
                                currentCount={
                                    mode === 'create'
                                        ? data.images.length
                                        : mediaItems.filter((m) => m.type === 'image').length
                                }
                                disabled={uploadingMedia}
                            />
                            <InputError message={errors.images} />
                        </div>

                        {/* Crop dialog (processes queue one by one) */}
                        <ImageCropDialog
                            open={cropDialogOpen}
                            onOpenChange={setCropDialogOpen}
                            imageFile={currentCropFile}
                            onCropped={handleCropped}
                            onSkip={handleCropSkip}
                        />

                        {/* Create mode: preview of cropped images ready to submit */}
                        {mode === 'create' && data.images.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">
                                    {data.images.length} foto(s) pronta(s) para envio
                                </Label>
                                <div className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2">
                                    {data.images.map((file, index) => (
                                        <div
                                            key={`img-${index}`}
                                            className="group relative aspect-[4/5] overflow-hidden rounded-md border bg-muted"
                                        >
                                            <img
                                                src={URL.createObjectURL(file)}
                                                alt={`Preview ${index + 1}`}
                                                className="h-full w-full object-cover"
                                            />
                                            <button
                                                type="button"
                                                className="absolute top-1 right-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                                                onClick={() =>
                                                    setData(
                                                        'images',
                                                        data.images.filter(
                                                            (_, i) => i !== index,
                                                        ),
                                                    )
                                                }
                                            >
                                                <X className="size-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Create mode: video selector */}
                        {mode === 'create' && (
                            <div className="space-y-2">
                                <Label>Video (opcional)</Label>
                                <Input
                                    ref={videoInputRef}
                                    type="file"
                                    accept="video/mp4,video/quicktime,video/webm"
                                    onChange={(event) => {
                                        const file =
                                            event.target.files?.[0] ?? null;
                                        setData('video', file);
                                    }}
                                />
                                <InputError message={errors.video} />

                                {data.video && (
                                    <div className="flex items-center gap-2 rounded-md border p-2 text-sm">
                                        <span className="text-muted-foreground">
                                            Video:
                                        </span>
                                        <span className="truncate">
                                            {data.video.name}
                                        </span>
                                        <button
                                            type="button"
                                            className="ml-auto shrink-0 rounded-full bg-destructive p-1 text-destructive-foreground"
                                            onClick={() => {
                                                setData('video', null);
                                                if (videoInputRef.current) {
                                                    videoInputRef.current.value =
                                                        '';
                                                }
                                            }}
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Edit mode: video upload */}
                        {mode === 'edit' && (
                            <div className="space-y-2">
                                <Label>Adicionar video</Label>
                                <Input
                                    ref={videoInputRef}
                                    type="file"
                                    accept="video/mp4,video/quicktime,video/webm"
                                    onChange={(event) => {
                                        const file =
                                            event.target.files?.[0] ?? null;
                                        setVideoToUpload(file);
                                    }}
                                />
                                <InputError message={errors.video} />

                                {videoToUpload && (
                                    <Button
                                        type="button"
                                        onClick={handleVideoUpload}
                                        disabled={uploadingMedia}
                                    >
                                        {uploadingMedia && (
                                            <Loader2 className="mr-2 size-4 animate-spin" />
                                        )}
                                        Enviar video
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Upload progress indicator */}
                        {uploadingMedia && (
                            <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
                                <Loader2 className="size-4 animate-spin" />
                                Enviando midia...
                            </div>
                        )}

                        {/* Existing media list (edit mode) */}
                        {mediaItems.length === 0 && mode === 'edit' && (
                            <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                                Nenhuma midia adicionada.
                            </div>
                        )}

                        {mediaItems.length > 0 && (
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">
                                    Midias do produto ({mediaItems.length})
                                </Label>
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={mediaItems.map((m) => m.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-2">
                                            {mediaItems.map((media, index) => (
                                                <SortableMediaItem
                                                    key={media.id}
                                                    media={media}
                                                    index={index}
                                                    onDelete={deleteMedia}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Variacoes e estoque</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Variation type selection */}
                        {variationTypes.length > 0 && (
                            <div className="space-y-3">
                                <Label>Tipos de variacao</Label>
                                <div className="flex flex-wrap items-center gap-6">
                                    {variationTypes.map((type) => (
                                        <label key={type.id} className="flex items-center gap-2 text-sm">
                                            <Checkbox
                                                checked={data.variations.some(
                                                    (v) => v.variation_type_id === type.id,
                                                )}
                                                onCheckedChange={(checked) =>
                                                    toggleVariationType(type.id, Boolean(checked))
                                                }
                                            />
                                            {type.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {variationTypes.length === 0 && (
                            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                                Nenhum tipo de variacao cadastrado. Cadastre tipos de variacao nas
                                configuracoes do fabricante.
                            </div>
                        )}

                        {/* Value toggles per selected variation type */}
                        {data.variations.map((variation, vIdx) => {
                            const type = variationTypes.find(
                                (t) => t.id === variation.variation_type_id,
                            );
                            if (!type) return null;
                            return (
                                <div key={type.id} className="space-y-2">
                                    <Label>Valores de {type.name}</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {type.values.map((val) => {
                                            const isSelected = variation.values.includes(val.value);
                                            return (
                                                <Button
                                                    key={val.id}
                                                    type="button"
                                                    variant={isSelected ? 'default' : 'outline'}
                                                    onClick={() =>
                                                        toggleVariationValue(type.id, val.value)
                                                    }
                                                    className="gap-2"
                                                >
                                                    {type.is_color_type && val.hex && (
                                                        <span
                                                            className="inline-block h-4 w-4 rounded-full border"
                                                            style={{ backgroundColor: val.hex }}
                                                        />
                                                    )}
                                                    {val.value}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                    <InputError
                                        message={errors[`variations.${vIdx}.values`]}
                                    />
                                </div>
                            );
                        })}

                        <InputError message={errors.variations} />

                        <Separator />

                        {/* Base quantity (no variations) */}
                        {!hasVariants && (
                            <div className="space-y-2">
                                <Label htmlFor="base_quantity">Quantidade base</Label>
                                <Input
                                    id="base_quantity"
                                    type="number"
                                    min={0}
                                    value={data.base_quantity}
                                    onChange={(event) =>
                                        setData(
                                            'base_quantity',
                                            Number(event.target.value),
                                        )
                                    }
                                />
                                <InputError message={errors.base_quantity} />
                            </div>
                        )}

                        {/* Stock grid for variations */}
                        {hasVariants && computedStocks.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Palette className="h-4 w-4" />
                                    Estoque por variacao
                                </div>

                                <div className="grid gap-3">
                                    {computedStocks.map((stock) => (
                                        <div
                                            key={JSON.stringify(stock.variation_key)}
                                            className="flex flex-wrap items-center gap-3 rounded-md border p-3"
                                        >
                                            <div className="flex flex-wrap gap-1.5">
                                                {Object.entries(stock.variation_key).map(
                                                    ([typeName, value]) => {
                                                        const type = variationTypes.find(
                                                            (t) => t.name === typeName,
                                                        );
                                                        const val = type?.values.find(
                                                            (v) => v.value === value,
                                                        );
                                                        return (
                                                            <Badge
                                                                key={typeName}
                                                                variant="outline"
                                                                className="gap-1.5"
                                                            >
                                                                {type?.is_color_type && val?.hex && (
                                                                    <span
                                                                        className="inline-block h-3 w-3 rounded-full border"
                                                                        style={{
                                                                            backgroundColor:
                                                                                val.hex,
                                                                        }}
                                                                    />
                                                                )}
                                                                {value}
                                                            </Badge>
                                                        );
                                                    },
                                                )}
                                            </div>
                                            <div className="flex flex-1 flex-wrap items-center gap-2">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    placeholder="Qtd"
                                                    value={stock.quantity}
                                                    onChange={(e) =>
                                                        updateStockField(
                                                            stock.variation_key,
                                                            'quantity',
                                                            Number(e.target.value),
                                                        )
                                                    }
                                                    className="w-24"
                                                />
                                                <Input
                                                    placeholder="Preco (R$)"
                                                    value={stock.price}
                                                    onChange={(e) =>
                                                        updateStockField(
                                                            stock.variation_key,
                                                            'price',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-32"
                                                />
                                                <Input
                                                    placeholder="SKU variacao"
                                                    value={stock.sku_variant ?? ''}
                                                    onChange={(e) =>
                                                        updateStockField(
                                                            stock.variation_key,
                                                            'sku_variant',
                                                            e.target.value,
                                                        )
                                                    }
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <InputError message={errors.variant_stocks} />
                            </div>
                        )}

                        {hasVariants && computedStocks.length === 0 && (
                            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                                Selecione ao menos um valor em cada tipo de variacao para gerar a
                                grade de estoque.
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4">
                {step > 0 ? (
                    <Button type="button" variant="outline" onClick={handlePrev}>
                        Voltar
                    </Button>
                ) : (
                    <div />
                )}
                <div className="flex gap-2">
                    {step < steps.length - 1 && (
                        <Button type="button" onClick={handleNext}>
                            Continuar
                        </Button>
                    )}
                    {step === steps.length - 1 && (
                        <Button type="submit" disabled={processing}>
                            {processing && <Loader2 className="mr-2 size-4 animate-spin" />}
                            {processing
                                ? mode === 'create'
                                    ? 'Criando...'
                                    : 'Salvando...'
                                : mode === 'create'
                                  ? 'Criar produto'
                                  : 'Salvar alteracoes'}
                        </Button>
                    )}
                </div>
            </div>
        </form>
    );
}
