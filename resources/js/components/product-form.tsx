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

interface ProductColor {
    id?: number;
    name: string;
    hex?: string | null;
}

interface ProductVariantStock {
    id?: number;
    size?: string | null;
    color_name?: string | null;
    quantity: number;
    sku_variant?: string | null;
}

interface ProductPayload {
    id: number;
    name: string;
    sku: string;
    description?: string | null;
    product_category_id?: number | null;
    has_size_variants: boolean;
    has_color_variants: boolean;
    base_quantity: number;
    is_active: boolean;
    sort_order: number;
    price_cents?: number | null;
    colors?: ProductColor[];
    media?: MediaItem[];
    variant_stocks?: ProductVariantStock[];
}

interface StockStructure {
    has_size_variants: boolean;
    has_color_variants: boolean;
    base_quantity: number;
    sizes: string[];
    colors: ProductColor[];
    stocks: Array<{
        id?: number;
        size?: string | null;
        color?: ProductColor | null;
        quantity: number;
        sku_variant?: string | null;
    }>;
}

interface Props {
    mode: 'create' | 'edit';
    categories: Category[];
    sizes: string[];
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
    2: ['sizes', 'colors', 'variant_stocks', 'has_size_variants', 'has_color_variants', 'base_quantity'],
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

function buildVariantStocks(
    hasSizes: boolean,
    hasColors: boolean,
    sizes: string[],
    colors: ProductColor[],
    current: ProductVariantStock[],
): ProductVariantStock[] {
    if (!hasSizes && !hasColors) {
        return [];
    }

    const map = new Map<string, ProductVariantStock>();

    current.forEach((item) => {
        const sizeKey = item.size ?? '';
        const colorKey = item.color_name ?? '';
        map.set(`${sizeKey}|${colorKey}`, item);
    });

    const build = (size?: string | null, color?: ProductColor | null) => {
        const key = `${size ?? ''}|${color?.name ?? ''}`;
        const existing = map.get(key);

        return {
            size: size ?? null,
            color_name: color?.name ?? null,
            quantity: existing?.quantity ?? 0,
            sku_variant: existing?.sku_variant ?? null,
        };
    };

    if (hasSizes && !hasColors) {
        return sizes.map((size) => build(size));
    }

    if (!hasSizes && hasColors) {
        return colors.map((color) => build(null, color));
    }

    const combos: ProductVariantStock[] = [];
    sizes.forEach((size) => {
        colors.forEach((color) => {
            combos.push(build(size, color));
        });
    });

    return combos;
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
    sizes,
    product,
    stockStructure,
}: Props) {
    const initialSizes = stockStructure?.sizes ?? [];
    const initialColors = stockStructure?.colors ?? product?.colors ?? [];
    const initialStocks = stockStructure?.stocks
        ? stockStructure.stocks.map((stock) => ({
              size: stock.size ?? null,
              color_name: stock.color?.name ?? null,
              quantity: stock.quantity,
              sku_variant: stock.sku_variant ?? null,
          }))
        : product?.variant_stocks ?? [];

    const { data, setData, post, put, processing, errors } = useForm<{
        name: string;
        sku: string;
        description: string;
        product_category_id: string | number;
        has_size_variants: boolean;
        has_color_variants: boolean;
        base_quantity: number;
        is_active: boolean;
        sort_order: number;
        price: string;
        sizes: string[];
        colors: ProductColor[];
        variant_stocks: ProductVariantStock[];
        images: File[];
        video: File | null;
    }>({
        name: product?.name ?? '',
        sku: product?.sku ?? '',
        description: product?.description ?? '',
        product_category_id: product?.product_category_id ?? '',
        has_size_variants: product?.has_size_variants ?? false,
        has_color_variants: product?.has_color_variants ?? false,
        base_quantity: product?.base_quantity ?? 0,
        is_active: product?.is_active ?? true,
        sort_order: product?.sort_order ?? 0,
        price: product?.price_cents != null ? String(product.price_cents / 100).replace('.', ',') : '',
        sizes: initialSizes,
        colors: initialColors,
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

    const hasVariants = data.has_size_variants || data.has_color_variants;

    const computedStocks = useMemo(() => {
        return buildVariantStocks(
            data.has_size_variants,
            data.has_color_variants,
            data.sizes,
            data.colors,
            data.variant_stocks,
        );
    }, [
        data.has_size_variants,
        data.has_color_variants,
        data.sizes,
        data.colors,
        data.variant_stocks,
    ]);

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

    const updateSizes = (nextSizes: string[]) => {
        setData('sizes', nextSizes);
        setData(
            'variant_stocks',
            buildVariantStocks(
                data.has_size_variants,
                data.has_color_variants,
                nextSizes,
                data.colors,
                data.variant_stocks,
            ),
        );
    };

    const updateColors = (nextColors: ProductColor[]) => {
        setData('colors', nextColors);
        setData(
            'variant_stocks',
            buildVariantStocks(
                data.has_size_variants,
                data.has_color_variants,
                data.sizes,
                nextColors,
                data.variant_stocks,
            ),
        );
    };

    const toggleSizeVariants = (checked: boolean) => {
        setData('has_size_variants', checked);
        const nextSizes = checked ? data.sizes : [];
        setData('sizes', nextSizes);
        setData(
            'variant_stocks',
            buildVariantStocks(
                checked,
                data.has_color_variants,
                nextSizes,
                data.colors,
                data.variant_stocks,
            ),
        );
    };

    const toggleColorVariants = (checked: boolean) => {
        setData('has_color_variants', checked);
        const nextColors = checked ? data.colors : [];
        setData('colors', nextColors);
        setData(
            'variant_stocks',
            buildVariantStocks(
                data.has_size_variants,
                checked,
                data.sizes,
                nextColors,
                data.variant_stocks,
            ),
        );
    };

    const updateStockQuantity = (
        size: string | null,
        color: string | null,
        quantity: number,
    ) => {
        const nextStocks = computedStocks.map((stock) => {
            const sizeMatch = (stock.size ?? null) === size;
            const colorMatch = (stock.color_name ?? null) === color;

            if (sizeMatch && colorMatch) {
                return { ...stock, quantity };
            }

            return stock;
        });

        setData('variant_stocks', nextStocks);
    };

    const updateStockSku = (
        size: string | null,
        color: string | null,
        skuVariant: string,
    ) => {
        const nextStocks = computedStocks.map((stock) => {
            const sizeMatch = (stock.size ?? null) === size;
            const colorMatch = (stock.color_name ?? null) === color;

            if (sizeMatch && colorMatch) {
                return { ...stock, sku_variant: skuVariant };
            }

            return stock;
        });

        setData('variant_stocks', nextStocks);
    };

    const addColor = () => {
        updateColors([...data.colors, { name: '', hex: '' }]);
    };

    const removeColor = (index: number) => {
        const nextColors = data.colors.filter((_, idx) => idx !== index);
        updateColors(nextColors);
    };

    const updateColor = (
        index: number,
        field: 'name' | 'hex',
        value: string,
    ) => {
        const nextColors = data.colors.map((color, idx) =>
            idx === index ? { ...color, [field]: value } : color,
        );
        updateColors(nextColors);
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
                        <div className="flex flex-wrap items-center gap-6">
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                    checked={data.has_size_variants}
                                    onCheckedChange={(checked) =>
                                        toggleSizeVariants(Boolean(checked))
                                    }
                                />
                                Tem tamanhos
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                    checked={data.has_color_variants}
                                    onCheckedChange={(checked) =>
                                        toggleColorVariants(Boolean(checked))
                                    }
                                />
                                Tem cores
                            </label>
                        </div>

                        {data.has_size_variants && (
                            <div className="space-y-2">
                                <Label>Selecione os tamanhos</Label>
                                <div className="flex flex-wrap gap-2">
                                    {sizes.map((size) => {
                                        const isSelected = data.sizes.includes(size);

                                        return (
                                            <Button
                                                key={size}
                                                type="button"
                                                variant={isSelected ? 'default' : 'outline'}
                                                onClick={() => {
                                                    const nextSizes = isSelected
                                                        ? data.sizes.filter(
                                                              (item) => item !== size,
                                                          )
                                                        : [...data.sizes, size];
                                                    updateSizes(nextSizes);
                                                }}
                                            >
                                                {size}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <InputError message={errors.sizes} />
                            </div>
                        )}

                        {data.has_color_variants && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label>Cores</Label>
                                    <Button type="button" variant="outline" onClick={addColor}>
                                        Adicionar cor
                                    </Button>
                                </div>

                                {data.colors.length === 0 && (
                                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                                        Nenhuma cor cadastrada.
                                    </div>
                                )}

                                {data.colors.map((color, index) => (
                                    <div
                                        key={`color-${index}`}
                                        className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_160px_auto]"
                                    >
                                        <div className="space-y-2">
                                            <Label>Nome</Label>
                                            <Input
                                                value={color.name}
                                                onChange={(event) =>
                                                    updateColor(
                                                        index,
                                                        'name',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={
                                                    errors[`colors.${index}.name`]
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Hex</Label>
                                            <Input
                                                value={color.hex ?? ''}
                                                onChange={(event) =>
                                                    updateColor(
                                                        index,
                                                        'hex',
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                onClick={() => removeColor(index)}
                                            >
                                                Remover
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                <InputError message={errors.colors} />
                            </div>
                        )}

                        <Separator />

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

                        {hasVariants && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Palette className="h-4 w-4" />
                                    Estoque por variacao
                                </div>

                                {data.has_size_variants && !data.has_color_variants && (
                                    <div className="grid gap-3">
                                        {computedStocks.map((stock) => (
                                            <div
                                                key={stock.size ?? ''}
                                                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                                            >
                                                <Badge variant="outline">{stock.size}</Badge>
                                                <div className="flex flex-1 flex-wrap items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={stock.quantity}
                                                        onChange={(event) =>
                                                            updateStockQuantity(
                                                                stock.size ?? null,
                                                                null,
                                                                Number(event.target.value),
                                                            )
                                                        }
                                                        className="w-32"
                                                    />
                                                    <Input
                                                        placeholder="SKU da variacao"
                                                        value={stock.sku_variant ?? ''}
                                                        onChange={(event) =>
                                                            updateStockSku(
                                                                stock.size ?? null,
                                                                null,
                                                                event.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!data.has_size_variants && data.has_color_variants && (
                                    <div className="grid gap-3">
                                        {computedStocks.map((stock) => (
                                            <div
                                                key={stock.color_name ?? ''}
                                                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                                            >
                                                <Badge variant="outline">
                                                    {stock.color_name}
                                                </Badge>
                                                <div className="flex flex-1 flex-wrap items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={stock.quantity}
                                                        onChange={(event) =>
                                                            updateStockQuantity(
                                                                null,
                                                                stock.color_name ?? null,
                                                                Number(event.target.value),
                                                            )
                                                        }
                                                        className="w-32"
                                                    />
                                                    <Input
                                                        placeholder="SKU da variacao"
                                                        value={stock.sku_variant ?? ''}
                                                        onChange={(event) =>
                                                            updateStockSku(
                                                                null,
                                                                stock.color_name ?? null,
                                                                event.target.value,
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {data.has_size_variants && data.has_color_variants && (
                                    <div className="overflow-auto rounded-md border">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted">
                                                <tr>
                                                    <th className="px-3 py-2 text-left">Cor</th>
                                                    {data.sizes.map((size) => (
                                                        <th
                                                            key={size}
                                                            className="px-3 py-2 text-left"
                                                        >
                                                            {size}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.colors.map((color) => (
                                                    <tr
                                                        key={color.name}
                                                        className="odd:bg-background even:bg-muted/40"
                                                    >
                                                        <td className="px-3 py-2 font-medium">
                                                            {color.name}
                                                        </td>
                                                        {data.sizes.map((size) => {
                                                            const stock = computedStocks.find(
                                                                (item) =>
                                                                    item.size === size &&
                                                                    item.color_name === color.name,
                                                            );

                                                            return (
                                                                <td
                                                                    key={`${color.name}-${size}`}
                                                                    className="px-3 py-2"
                                                                >
                                                                    <div className="space-y-2">
                                                                        <Input
                                                                            type="number"
                                                                            min={0}
                                                                            value={stock?.quantity ?? 0}
                                                                            onChange={(event) =>
                                                                                updateStockQuantity(
                                                                                    size,
                                                                                    color.name,
                                                                                    Number(
                                                                                        event.target.value,
                                                                                    ),
                                                                                )
                                                                            }
                                                                            className="w-24"
                                                                        />
                                                                        <Input
                                                                            placeholder="SKU"
                                                                            value={stock?.sku_variant ?? ''}
                                                                            onChange={(event) =>
                                                                                updateStockSku(
                                                                                    size,
                                                                                    color.name,
                                                                                    event.target.value,
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <InputError message={errors.variant_stocks} />
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
