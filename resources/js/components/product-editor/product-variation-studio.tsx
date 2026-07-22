import { Boxes, Check, Layers3, Plus } from 'lucide-react';
import { EditorField, EditorSection } from './editor-section';
import type {
    ProductEditorErrors,
    ProductVariantStockValue,
    ProductVariationSelection,
    ProductVariationTypeOption,
} from './types';

type ProductVariationStudioProps = {
    variationTypes: ProductVariationTypeOption[];
    variations: ProductVariationSelection[];
    stocks: ProductVariantStockValue[];
    baseQuantity: number;
    errors: ProductEditorErrors;
    onToggleType: (typeId: number, checked: boolean) => void;
    onToggleValue: (typeId: number, value: string) => void;
    onBaseQuantityChange: (quantity: number) => void;
    onStockChange: (
        key: Record<string, string>,
        field: 'quantity' | 'price' | 'sku_variant',
        value: number | string | null,
    ) => void;
};

const controlClassName =
    'h-[52px] w-full rounded-[2px] border border-border bg-transparent px-3 font-zouth-body text-sm text-foreground shadow-none outline-none focus:border-[#18181f] focus:ring-2 focus:ring-[#ff4d3d]/25';

function firstErrorStartingWith(
    errors: ProductEditorErrors,
    prefix: string,
): string | undefined {
    const entry = Object.entries(errors).find(
        ([key, value]) => key.startsWith(prefix) && Boolean(value),
    );

    return entry?.[1];
}

function stockKey(stock: ProductVariantStockValue): string {
    return JSON.stringify(
        Object.entries(stock.variation_key).sort(([a], [b]) =>
            a.localeCompare(b),
        ),
    );
}

export function ProductVariationStudio({
    variationTypes,
    variations,
    stocks,
    baseQuantity,
    errors,
    onToggleType,
    onToggleValue,
    onBaseQuantityChange,
    onStockChange,
}: ProductVariationStudioProps) {
    const selectedTypeIds = new Set(
        variations.map((variation) => variation.variation_type_id),
    );
    const selectedTypes = variationTypes.filter((type) =>
        selectedTypeIds.has(type.id),
    );
    const colorType = selectedTypes.find((type) => type.is_color_type);
    const groups = new Map<string, ProductVariantStockValue[]>();

    stocks.forEach((stock) => {
        const groupName = colorType
            ? (stock.variation_key[colorType.name] ?? 'Outras opções')
            : 'Todas as combinações';
        const group = groups.get(groupName) ?? [];
        group.push(stock);
        groups.set(groupName, group);
    });

    return (
        <>
            <EditorSection
                id="variations"
                eyebrow="02 · Variações"
                description="Cadastre as cores, tamanhos e outras variações dessa peça."
                marker={
                    variations.length > 0 ? (
                        <span className="inline-flex min-h-8 items-center gap-2 bg-[#18181f] px-3 text-[0.68rem] font-bold tracking-[0.08em] text-[#f6f4f0] uppercase">
                            <Layers3 className="size-3.5" aria-hidden="true" />
                            {stocks.length}{' '}
                            {stocks.length === 1 ? 'combinação' : 'combinações'}
                        </span>
                    ) : undefined
                }
            >
                {variationTypes.length === 0 ? (
                    <div className="border border-dashed border-border bg-[#e7e3dc]/35 px-5 py-6">
                        <p className="font-zouth-display text-base font-semibold tracking-[-0.02em]">
                            Esta coleção ainda não tem variações cadastradas.
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Cadastre cores, tamanhos ou outros atributos na área
                            de Variações e volte para compor a peça.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-7">
                        <fieldset>
                            <legend className="mb-3 font-zouth-display text-[0.68rem] font-bold tracking-[0.12em] text-foreground uppercase">
                                Como esta peça varia?
                            </legend>
                            <div className="flex flex-wrap gap-2">
                                {variationTypes.map((type) => {
                                    const isSelected = selectedTypeIds.has(
                                        type.id,
                                    );

                                    return (
                                        <button
                                            key={type.id}
                                            type="button"
                                            aria-pressed={isSelected}
                                            onClick={() =>
                                                onToggleType(
                                                    type.id,
                                                    !isSelected,
                                                )
                                            }
                                            className={`inline-flex min-h-11 items-center gap-2 border px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d] ${
                                                isSelected
                                                    ? 'border-[#18181f] bg-[#18181f] text-[#f6f4f0]'
                                                    : 'border-border bg-transparent text-foreground hover:border-[#98968d] hover:bg-[#e7e3dc]/45'
                                            }`}
                                        >
                                            {isSelected ? (
                                                <Check
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <Plus
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            )}
                                            {type.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>

                        {variations.map((variation, variationIndex) => {
                            const type = variationTypes.find(
                                (item) =>
                                    item.id === variation.variation_type_id,
                            );

                            if (!type) {
                                return null;
                            }

                            return (
                                <fieldset
                                    key={type.id}
                                    className="border-t border-border pt-6"
                                >
                                    <legend className="float-left mb-4 w-full font-zouth-display text-base font-semibold tracking-[-0.025em] text-foreground">
                                        Escolha os valores de {type.name}
                                    </legend>
                                    <div className="clear-both flex flex-wrap gap-2.5">
                                        {type.values.map((value) => {
                                            const isSelected =
                                                variation.values.includes(
                                                    value.value,
                                                );

                                            return (
                                                <button
                                                    key={value.id}
                                                    type="button"
                                                    aria-pressed={isSelected}
                                                    onClick={() =>
                                                        onToggleValue(
                                                            type.id,
                                                            value.value,
                                                        )
                                                    }
                                                    className={`group inline-flex min-h-12 items-center gap-2.5 border px-3.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d] ${
                                                        isSelected
                                                            ? 'border-[#ff4d3d] bg-[#ff4d3d]/8 text-foreground'
                                                            : 'border-border bg-transparent text-foreground hover:border-[#98968d]'
                                                    }`}
                                                >
                                                    {type.is_color_type && (
                                                        <span
                                                            className="size-6 shrink-0 overflow-hidden rounded-full border border-[#18181f]/20 bg-[#e7e3dc]"
                                                            style={
                                                                value.hex
                                                                    ? {
                                                                          backgroundColor:
                                                                              value.hex,
                                                                      }
                                                                    : undefined
                                                            }
                                                        >
                                                            {value.image_url && (
                                                                <img
                                                                    src={
                                                                        value.image_url
                                                                    }
                                                                    alt=""
                                                                    className="size-full object-cover"
                                                                />
                                                            )}
                                                        </span>
                                                    )}
                                                    {value.value}
                                                    {isSelected && (
                                                        <Check
                                                            className="size-3.5 text-[#c53024]"
                                                            aria-hidden="true"
                                                        />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {errors[
                                        `variations.${variationIndex}.values`
                                    ] && (
                                        <p
                                            className="mt-3 text-sm font-medium text-[#b42318]"
                                            role="alert"
                                        >
                                            {
                                                errors[
                                                    `variations.${variationIndex}.values`
                                                ]
                                            }
                                        </p>
                                    )}
                                </fieldset>
                            );
                        })}

                        {errors.variations && (
                            <p
                                className="text-sm font-medium text-[#b42318]"
                                role="alert"
                            >
                                {errors.variations}
                            </p>
                        )}
                    </div>
                )}
            </EditorSection>

            <EditorSection
                id="availability"
                eyebrow="03 · Disponibilidade"
                title={
                    variations.length > 0
                        ? 'Controle seu estoque.'
                        : 'Quantas peças estão prontas para o pedido?'
                }
                description={
                    variations.length > 0
                        ? 'As combinações ficam agrupadas pelas escolhas de variações acima.'
                        : 'Informe a disponibilidade geral. Se adicionar variações, o estoque passa a ser definido por combinação.'
                }
            >
                {variations.length === 0 ? (
                    <EditorField
                        label="Quantidade disponível"
                        htmlFor="base_quantity"
                        error={errors.base_quantity}
                        className="max-w-xs"
                    >
                        <input
                            id="base_quantity"
                            type="number"
                            min={0}
                            value={baseQuantity}
                            onChange={(event) =>
                                onBaseQuantityChange(Number(event.target.value))
                            }
                            className={controlClassName}
                        />
                    </EditorField>
                ) : stocks.length === 0 ? (
                    <div className="border border-dashed border-border bg-[#e7e3dc]/35 px-5 py-6">
                        <p className="font-zouth-display text-base font-semibold tracking-[-0.02em]">
                            A matriz aparece assim que cada variação tiver ao
                            menos uma escolha.
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Volte um pouco e selecione, por exemplo, uma cor e
                            um tamanho.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Array.from(groups.entries()).map(
                            ([groupName, groupStocks]) => {
                                const colorValue = colorType?.values.find(
                                    (value) => value.value === groupName,
                                );

                                return (
                                    <fieldset key={groupName}>
                                        <legend className="sr-only">
                                            Combinações de {groupName}
                                        </legend>

                                        <div className="divide-y divide-border border-y border-border">
                                            {groupStocks.map((stock) => {
                                                const rowLabel = selectedTypes
                                                    .map(
                                                        (type) =>
                                                            stock.variation_key[
                                                                type.name
                                                            ],
                                                    )
                                                    .filter(Boolean)
                                                    .join('/');
                                                const key = stockKey(stock);

                                                return (
                                                    <div
                                                        key={key}
                                                        className="grid gap-3 py-4 sm:grid-cols-[minmax(132px,0.75fr)_minmax(100px,0.6fr)_minmax(120px,0.8fr)_minmax(145px,1.15fr)] sm:items-end"
                                                    >
                                                        <div className="inline-flex min-w-0 items-center gap-2.5 self-center font-zouth-display text-sm font-semibold tracking-[-0.015em] text-foreground">
                                                            {colorType && (
                                                                <span
                                                                    className="size-5 shrink-0 overflow-hidden rounded-full border border-[#18181f]/20 bg-[#e7e3dc]"
                                                                    style={
                                                                        colorValue?.hex
                                                                            ? {
                                                                                  backgroundColor:
                                                                                      colorValue.hex,
                                                                              }
                                                                            : undefined
                                                                    }
                                                                >
                                                                    {colorValue?.image_url && (
                                                                        <img
                                                                            src={
                                                                                colorValue.image_url
                                                                            }
                                                                            alt=""
                                                                            className="size-full object-cover"
                                                                        />
                                                                    )}
                                                                </span>
                                                            )}
                                                            <span className="truncate">
                                                                {rowLabel}
                                                            </span>
                                                        </div>
                                                        <EditorField
                                                            label="Quantidade"
                                                            htmlFor={`stock-${key}-quantity`}
                                                        >
                                                            <input
                                                                id={`stock-${key}-quantity`}
                                                                type="number"
                                                                min={0}
                                                                value={
                                                                    stock.quantity
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    onStockChange(
                                                                        stock.variation_key,
                                                                        'quantity',
                                                                        Number(
                                                                            event
                                                                                .target
                                                                                .value,
                                                                        ),
                                                                    )
                                                                }
                                                                className={
                                                                    controlClassName
                                                                }
                                                            />
                                                        </EditorField>
                                                        <EditorField
                                                            label="Preço próprio"
                                                            htmlFor={`stock-${key}-price`}
                                                        >
                                                            <input
                                                                id={`stock-${key}-price`}
                                                                inputMode="decimal"
                                                                placeholder="R$ 0,00"
                                                                value={
                                                                    stock.price
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    onStockChange(
                                                                        stock.variation_key,
                                                                        'price',
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                className={
                                                                    controlClassName
                                                                }
                                                            />
                                                        </EditorField>
                                                        <EditorField
                                                            label="SKU da opção"
                                                            htmlFor={`stock-${key}-sku`}
                                                        >
                                                            <input
                                                                id={`stock-${key}-sku`}
                                                                value={
                                                                    stock.sku_variant ??
                                                                    ''
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    onStockChange(
                                                                        stock.variation_key,
                                                                        'sku_variant',
                                                                        event
                                                                            .target
                                                                            .value,
                                                                    )
                                                                }
                                                                className={
                                                                    controlClassName
                                                                }
                                                            />
                                                        </EditorField>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </fieldset>
                                );
                            },
                        )}

                        {firstErrorStartingWith(errors, 'variant_stocks') && (
                            <div
                                className="flex items-start gap-3 border border-[#b42318]/30 bg-[#b42318]/5 px-4 py-3 text-sm font-medium text-[#b42318]"
                                role="alert"
                            >
                                <Boxes
                                    className="mt-0.5 size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                {firstErrorStartingWith(
                                    errors,
                                    'variant_stocks',
                                )}
                            </div>
                        )}
                    </div>
                )}
            </EditorSection>
        </>
    );
}
