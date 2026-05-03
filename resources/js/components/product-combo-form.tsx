import { router, useForm } from '@inertiajs/react';
import { ImagePlus, Package, Plus, Trash2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';

interface Category {
    id: number;
    name: string;
}

interface ComponentProduct {
    id: number;
    name: string;
    sku: string;
    price_cents: number | null;
    base_quantity: number;
    has_variations: boolean;
    variant_stocks: Array<{
        id: number;
        variation_key: Record<string, string>;
        quantity: number;
        price_cents?: number | null;
        sku_variant?: string | null;
    }>;
}

interface ComboItem {
    component_product_id: string | number;
    component_variant_stock_id: string | number | null;
    quantity: number;
}

interface ProductPayload {
    id: number;
    name: string;
    sku: string;
    description?: string | null;
    product_category_id?: number | null;
    is_active: boolean;
    sort_order: number;
    price_cents?: number | null;
    media?: Array<{
        id: number;
        type: 'image' | 'video';
        url?: string;
        path: string;
        sort_order: number;
    }>;
    combo_items?: Array<{
        component_product_id: number;
        component_variant_stock_id: number | null;
        quantity: number;
    }>;
}

interface Props {
    mode: 'create' | 'edit';
    categories: Category[];
    componentProducts: ComponentProduct[];
    product?: ProductPayload;
}

function formatPrice(priceCents?: number | null): string {
    if (priceCents == null) {
        return 'Sob consulta';
    }

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(priceCents / 100);
}

function centsToDisplay(cents: number | null | undefined): string {
    if (cents == null) {
        return '';
    }

    return String(cents / 100).replace('.', ',');
}

function variationLabel(key: Record<string, string>): string {
    return Object.entries(key)
        .map(([name, value]) => `${name}: ${value}`)
        .join(' / ');
}

export function ProductComboForm({
    mode,
    categories,
    componentProducts,
    product,
}: Props) {
    const initialItems =
        product?.combo_items?.map((item) => ({
            component_product_id: item.component_product_id,
            component_variant_stock_id: item.component_variant_stock_id,
            quantity: item.quantity,
        })) ?? [];

    const { data, setData, post, put, processing, errors } = useForm<{
        name: string;
        sku: string;
        description: string;
        product_category_id: string | number;
        price: string;
        is_active: boolean;
        sort_order: number;
        combo_items: ComboItem[];
        images: File[];
        video: File | null;
    }>({
        name: product?.name ?? '',
        sku: product?.sku ?? '',
        description: product?.description ?? '',
        product_category_id: product?.product_category_id ?? '',
        price: centsToDisplay(product?.price_cents),
        is_active: product?.is_active ?? true,
        sort_order: product?.sort_order ?? 0,
        combo_items:
            initialItems.length > 0
                ? initialItems
                : [
                      {
                          component_product_id: '',
                          component_variant_stock_id: null,
                          quantity: 1,
                      },
                  ],
        images: [],
        video: null,
    });

    const productsById = useMemo(
        () =>
            new Map(
                componentProducts.map((componentProduct) => [
                    componentProduct.id,
                    componentProduct,
                ]),
            ),
        [componentProducts],
    );
    const [editImages, setEditImages] = useState<File[]>([]);
    const [editVideo, setEditVideo] = useState<File | null>(null);
    const [uploadingMedia, setUploadingMedia] = useState(false);

    const addItem = () => {
        setData('combo_items', [
            ...data.combo_items,
            {
                component_product_id: '',
                component_variant_stock_id: null,
                quantity: 1,
            },
        ]);
    };

    const updateItem = (index: number, patch: Partial<ComboItem>) => {
        setData(
            'combo_items',
            data.combo_items.map((item, currentIndex) =>
                currentIndex === index ? { ...item, ...patch } : item,
            ),
        );
    };

    const removeItem = (index: number) => {
        setData(
            'combo_items',
            data.combo_items.filter(
                (_, currentIndex) => currentIndex !== index,
            ),
        );
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();

        if (mode === 'create') {
            post('/manufacturer/products/combos', { forceFormData: true });

            return;
        }

        if (!product) {
            return;
        }

        put(`/manufacturer/products/${product.id}/combo`);
    };

    const uploadImages = () => {
        if (!product || editImages.length === 0) {
            return;
        }

        setUploadingMedia(true);
        router.post(
            `/manufacturer/products/${product.id}/media`,
            { type: 'image', files: editImages },
            {
                forceFormData: true,
                preserveScroll: true,
                preserveState: true,
                onFinish: () => {
                    setEditImages([]);
                    setUploadingMedia(false);
                },
            },
        );
    };

    const uploadVideo = () => {
        if (!product || !editVideo) {
            return;
        }

        setUploadingMedia(true);
        router.post(
            `/manufacturer/products/${product.id}/media`,
            { type: 'video', file: editVideo },
            {
                forceFormData: true,
                preserveScroll: true,
                preserveState: true,
                onFinish: () => {
                    setEditVideo(null);
                    setUploadingMedia(false);
                },
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
            <Card>
                <CardHeader>
                    <CardTitle>Dados do combo</CardTitle>
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

                    <div className="grid gap-4 md:grid-cols-3">
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
                                    <SelectItem value="none">
                                        Sem categoria
                                    </SelectItem>
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
                            <Label htmlFor="price">Preço do combo (R$)</Label>
                            <Input
                                id="price"
                                placeholder="Ex: 129,90"
                                value={data.price}
                                onChange={(event) =>
                                    setData('price', event.target.value)
                                }
                            />
                            <InputError message={errors.price} />
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

                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="is_active"
                            checked={data.is_active}
                            onCheckedChange={(checked) =>
                                setData('is_active', checked === true)
                            }
                        />
                        <Label htmlFor="is_active">Combo ativo</Label>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                            id="description"
                            value={data.description}
                            onChange={(event) =>
                                setData('description', event.target.value)
                            }
                            rows={4}
                        />
                        <InputError message={errors.description} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <div>
                        <CardTitle>Produtos do combo</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Escolha os produtos, variações e quantidades que
                            compõem este combo.
                        </p>
                    </div>
                    <Button type="button" variant="outline" onClick={addItem}>
                        <Plus className="mr-2 size-4" />
                        Adicionar produto
                    </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                    <InputError message={errors.combo_items} />

                    {data.combo_items.map((item, index) => {
                        const selectedProduct = productsById.get(
                            Number(item.component_product_id),
                        );
                        const itemPrefix = `combo_items.${index}`;

                        return (
                            <div
                                key={index}
                                className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_120px_auto]"
                            >
                                <div className="space-y-2">
                                    <Label>Produto</Label>
                                    <Select
                                        value={
                                            item.component_product_id
                                                ? String(
                                                      item.component_product_id,
                                                  )
                                                : 'none'
                                        }
                                        onValueChange={(value) =>
                                            updateItem(index, {
                                                component_product_id:
                                                    value === 'none'
                                                        ? ''
                                                        : Number(value),
                                                component_variant_stock_id:
                                                    null,
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione um produto" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                Selecione um produto
                                            </SelectItem>
                                            {componentProducts.map(
                                                (componentProduct) => (
                                                    <SelectItem
                                                        key={
                                                            componentProduct.id
                                                        }
                                                        value={String(
                                                            componentProduct.id,
                                                        )}
                                                    >
                                                        {componentProduct.name}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={
                                            errors[
                                                `${itemPrefix}.component_product_id`
                                            ]
                                        }
                                    />
                                    {selectedProduct && (
                                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                            <span>
                                                SKU {selectedProduct.sku}
                                            </span>
                                            <span>
                                                {formatPrice(
                                                    selectedProduct.price_cents,
                                                )}
                                            </span>
                                            <Badge variant="outline">
                                                Estoque{' '}
                                                {selectedProduct.has_variations
                                                    ? selectedProduct.variant_stocks.reduce(
                                                          (sum, stock) =>
                                                              sum +
                                                              stock.quantity,
                                                          0,
                                                      )
                                                    : selectedProduct.base_quantity}
                                            </Badge>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label>Variação</Label>
                                    <Select
                                        value={
                                            item.component_variant_stock_id
                                                ? String(
                                                      item.component_variant_stock_id,
                                                  )
                                                : 'none'
                                        }
                                        disabled={
                                            !selectedProduct?.has_variations
                                        }
                                        onValueChange={(value) =>
                                            updateItem(index, {
                                                component_variant_stock_id:
                                                    value === 'none'
                                                        ? null
                                                        : Number(value),
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue
                                                placeholder={
                                                    selectedProduct?.has_variations
                                                        ? 'Selecione'
                                                        : 'Sem variação'
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                Sem variação
                                            </SelectItem>
                                            {selectedProduct?.variant_stocks.map(
                                                (stock) => (
                                                    <SelectItem
                                                        key={stock.id}
                                                        value={String(stock.id)}
                                                    >
                                                        {variationLabel(
                                                            stock.variation_key,
                                                        )}{' '}
                                                        · Estoque{' '}
                                                        {stock.quantity}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={
                                            errors[
                                                `${itemPrefix}.component_variant_stock_id`
                                            ]
                                        }
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Quantidade</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={item.quantity}
                                        onChange={(event) =>
                                            updateItem(index, {
                                                quantity: Number(
                                                    event.target.value,
                                                ),
                                            })
                                        }
                                    />
                                    <InputError
                                        message={
                                            errors[`${itemPrefix}.quantity`]
                                        }
                                    />
                                </div>

                                <div className="flex items-end">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeItem(index)}
                                        disabled={data.combo_items.length === 1}
                                    >
                                        <Trash2 className="size-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Mídia</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {mode === 'create' ? (
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="images">Imagens</Label>
                                <Input
                                    id="images"
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={(event) =>
                                        setData(
                                            'images',
                                            Array.from(
                                                event.target.files ?? [],
                                            ),
                                        )
                                    }
                                />
                                <InputError message={errors.images} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="video">Vídeo</Label>
                                <Input
                                    id="video"
                                    type="file"
                                    accept="video/mp4,video/quicktime,video/webm"
                                    onChange={(event) =>
                                        setData(
                                            'video',
                                            event.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                                <InputError message={errors.video} />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="edit_images">
                                        Adicionar imagens
                                    </Label>
                                    <Input
                                        id="edit_images"
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={(event) =>
                                            setEditImages(
                                                Array.from(
                                                    event.target.files ?? [],
                                                ),
                                            )
                                        }
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={uploadImages}
                                        disabled={
                                            uploadingMedia ||
                                            editImages.length === 0
                                        }
                                    >
                                        Enviar imagens
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit_video">
                                        Adicionar vídeo
                                    </Label>
                                    <Input
                                        id="edit_video"
                                        type="file"
                                        accept="video/mp4,video/quicktime,video/webm"
                                        onChange={(event) =>
                                            setEditVideo(
                                                event.target.files?.[0] ?? null,
                                            )
                                        }
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={uploadVideo}
                                        disabled={uploadingMedia || !editVideo}
                                    >
                                        Enviar vídeo
                                    </Button>
                                </div>
                            </div>

                            {product?.media && product.media.length > 0 ? (
                                <div className="space-y-2">
                                    {product.media.map((media) => (
                                        <div
                                            key={media.id}
                                            className="flex items-center justify-between gap-3 rounded-md border p-3"
                                        >
                                            <div className="flex items-center gap-3">
                                                {media.type === 'image' &&
                                                media.url ? (
                                                    <img
                                                        src={media.url}
                                                        alt="Mídia do combo"
                                                        className="size-14 rounded-md object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex size-14 items-center justify-center rounded-md bg-muted">
                                                        <ImagePlus className="size-5 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {media.type === 'image'
                                                            ? 'Imagem'
                                                            : 'Vídeo'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Ordem{' '}
                                                        {media.sort_order + 1}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                onClick={() =>
                                                    deleteMedia(media.id)
                                                }
                                            >
                                                Remover
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 rounded-lg border p-4 text-sm text-muted-foreground">
                                    <ImagePlus className="size-5" />
                                    Nenhuma mídia cadastrada para este combo.
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" asChild>
                    <a href="/manufacturer/products">Cancelar</a>
                </Button>
                <Button type="submit" disabled={processing}>
                    <Package className="mr-2 size-4" />
                    {processing
                        ? 'Salvando...'
                        : mode === 'create'
                          ? 'Criar combo'
                          : 'Salvar combo'}
                </Button>
            </div>
        </form>
    );
}
