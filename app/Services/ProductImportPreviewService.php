<?php

namespace App\Services;

use App\Enums\ProductImportStatus;
use App\Models\Product;
use App\Models\ProductImport;
use App\Models\ProductImportRow;
use App\Models\ProductVariantStock;
use App\Models\VariationType;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;

class ProductImportPreviewService
{
    public function __construct(
        private readonly ProductImportReader $reader,
        private readonly ProductImportImageService $images,
        private readonly PlanLimitService $limits,
    ) {}

    public function validate(ProductImport $productImport): ProductImport
    {
        $productImport->update([
            'status' => ProductImportStatus::Validating,
            'progress' => 10,
            'error_message' => null,
        ]);

        try {
            $source = $this->reader->read(
                Storage::disk('local')->path($productImport->source_path),
                $productImport->source_extension,
            );
        } catch (\Throwable $exception) {
            $productImport->update([
                'status' => ProductImportStatus::Failed,
                'errors' => [$exception->getMessage()],
                'error_message' => $exception->getMessage(),
                'progress' => 0,
            ]);

            return $productImport->refresh();
        }

        $mapping = array_filter($productImport->mapping ?? [], fn (mixed $value): bool => is_string($value) && $value !== '');

        if (! isset($mapping['sku'])) {
            $productImport->update([
                'status' => ProductImportStatus::Mapping,
                'headers' => $source['headers'],
                'header_signature' => $source['signature'],
                'errors' => ['Relacione a coluna que contém o SKU principal.'],
                'progress' => 5,
            ]);

            return $productImport->refresh();
        }

        $sourceRows = collect($source['rows']);
        $skus = $sourceRows
            ->map(fn (array $row): string => $this->stringValue($row['values'][$mapping['sku']] ?? null))
            ->filter()
            ->unique()
            ->values();
        $existingProducts = Product::query()
            ->where('manufacturer_id', $productImport->manufacturer_id)
            ->whereIn('sku', $skus)
            ->with(['category', 'productVariations.variationType', 'variantStocks', 'media'])
            ->get()
            ->keyBy('sku');
        $knownCategories = $productImport->manufacturer->productCategories()
            ->get()
            ->keyBy(fn ($category): string => $this->key($category->name));
        $knownVariationTypes = VariationType::query()
            ->where('manufacturer_id', $productImport->manufacturer_id)
            ->with('values')
            ->get()
            ->keyBy(fn (VariationType $type): string => $this->key($type->name));
        $normalizedRows = $sourceRows->map(function (array $row) use ($mapping): array {
            $normalized = $this->normalizeRow($row['values'], $mapping);

            return [
                'row_number' => $row['row_number'],
                'source' => $row['values'],
                'normalized' => $normalized,
                'errors' => $this->rowErrors($normalized, $row['row_number']),
                'warnings' => [],
            ];
        });
        $newCategories = collect();
        $newVariationTypes = collect();
        $newVariationValues = collect();
        $variantSkus = [];

        $groupErrors = [];

        foreach ($normalizedRows->groupBy(fn (array $row): string => $row['normalized']['sku']) as $sku => $group) {
            $errorsByRow = $this->validateProductGroup(
                $sku,
                $group,
                $existingProducts->get($sku),
                $knownCategories,
                $knownVariationTypes,
                $newCategories,
                $newVariationTypes,
                $newVariationValues,
                $variantSkus,
            );

            foreach ($errorsByRow as $rowNumber => $errors) {
                $groupErrors[$rowNumber] = [...($groupErrors[$rowNumber] ?? []), ...$errors];
            }
        }

        $normalizedRows = $normalizedRows->map(function (array $row) use ($groupErrors): array {
            $row['errors'] = array_values(array_unique([
                ...$row['errors'],
                ...($groupErrors[$row['row_number']] ?? []),
            ]));

            return $row;
        });

        $variantSkuOwners = ProductVariantStock::query()
            ->whereIn(
                'sku_variant',
                $normalizedRows->pluck('normalized.variant_sku')->filter()->unique(),
            )
            ->whereHas('product', fn ($query) => $query->where('manufacturer_id', $productImport->manufacturer_id))
            ->with('product:id,sku')
            ->get()
            ->keyBy('sku_variant');
        $normalizedRows = $normalizedRows->map(function (array $row) use ($variantSkuOwners): array {
            $variantSku = $row['normalized']['variant_sku'];
            $owner = $variantSku !== '' ? $variantSkuOwners->get($variantSku) : null;

            if ($owner && $owner->product?->sku !== $row['normalized']['sku']) {
                $row['errors'][] = "O SKU de opção {$variantSku} já pertence ao produto {$owner->product?->sku}.";
                $row['errors'] = array_values(array_unique($row['errors']));
            }

            return $row;
        });

        $newProductCount = $normalizedRows
            ->pluck('normalized.sku')
            ->filter()
            ->unique()
            ->reject(fn (string $sku): bool => $existingProducts->has($sku))
            ->count();
        $globalErrors = $this->limitErrors($productImport, $newProductCount);
        $rowErrorCount = $normalizedRows->sum(fn (array $row): int => count($row['errors']));
        $imageUrlsBySku = $normalizedRows
            ->groupBy(fn (array $row): string => $row['normalized']['sku'])
            ->map(fn (Collection $rows): array => $rows->pluck('normalized.image_urls')->flatten()->filter()->unique()->values()->all())
            ->filter(fn (array $_urls, string $sku): bool => $sku !== '')
            ->all();

        if ($rowErrorCount === 0 && $globalErrors === []) {
            $stagedImages = $this->images->stage($productImport, $imageUrlsBySku);
            $globalErrors = [...$globalErrors, ...$stagedImages['errors']];

            if ($stagedImages['total_bytes'] > 0 && ! $this->limits->canUploadFile($productImport->manufacturer, $stagedImages['total_bytes'])) {
                $globalErrors[] = 'As novas imagens ultrapassam o espaço disponível no plano atual.';
            }
        } else {
            $stagedImages = ['manifest' => [], 'errors' => [], 'total_bytes' => 0];
        }

        $summary = [
            'rows' => $normalizedRows->count(),
            'products' => $normalizedRows->pluck('normalized.sku')->filter()->unique()->count(),
            'create' => $newProductCount,
            'update' => 0,
            'unchanged' => 0,
            'errors' => $rowErrorCount + count($globalErrors),
            'warnings' => $normalizedRows->sum(fn (array $row): int => count($row['warnings'])),
            'images' => collect($stagedImages['manifest'])->flatten(1)->count(),
            'new_taxonomies' => $newCategories->count() + $newVariationTypes->count() + $newVariationValues->count(),
        ];
        $actionsBySku = [];

        foreach ($normalizedRows->groupBy(fn (array $row): string => $row['normalized']['sku']) as $sku => $group) {
            if ($sku === '') {
                continue;
            }

            if (! $existingProducts->has($sku)) {
                $actionsBySku[$sku] = 'create';

                continue;
            }

            $hasIncomingImages = $group->pluck('normalized.image_urls')->flatten()->filter()->isNotEmpty()
                || isset($stagedImages['manifest'][$sku]);

            if ($hasIncomingImages || $this->groupWouldChange($group, $existingProducts->get($sku))) {
                $summary['update']++;
                $actionsBySku[$sku] = 'update';
            } else {
                $summary['unchanged']++;
                $actionsBySku[$sku] = 'unchanged';
            }
        }

        $normalizedRows = $normalizedRows->map(function (array $row) use ($actionsBySku, $existingProducts): array {
            $sku = $row['normalized']['sku'];
            $row['action'] = $actionsBySku[$sku] ?? ($sku !== '' && $existingProducts->has($sku) ? 'update' : 'create');

            return $row;
        });
        $previewSignature = hash('sha256', json_encode([
            'source' => hash_file('sha256', Storage::disk('local')->path($productImport->source_path)),
            'mapping' => $mapping,
            'rows' => $normalizedRows->pluck('normalized')->all(),
            'products_updated_at' => $existingProducts->max('updated_at')?->toJSON(),
        ], JSON_THROW_ON_ERROR));

        DB::transaction(function () use (
            $productImport,
            $source,
            $mapping,
            $normalizedRows,
            $summary,
            $newCategories,
            $newVariationTypes,
            $newVariationValues,
            $globalErrors,
            $previewSignature,
            $stagedImages,
        ): void {
            $productImport->rows()->delete();

            foreach ($normalizedRows as $row) {
                ProductImportRow::create([
                    'product_import_id' => $productImport->id,
                    'row_number' => $row['row_number'],
                    'product_sku' => $row['normalized']['sku'] ?: null,
                    'variant_identity' => $this->variantIdentity($row['normalized']),
                    'action' => $row['action'],
                    'source' => $row['source'],
                    'normalized' => $row['normalized'],
                    'errors' => $row['errors'] ?: null,
                    'warnings' => $row['warnings'] ?: null,
                ]);
            }

            $productImport->update([
                'status' => $summary['errors'] === 0 ? ProductImportStatus::Ready : ProductImportStatus::Mapping,
                'headers' => $source['headers'],
                'header_signature' => $source['signature'],
                'mapping' => $mapping,
                'summary' => $summary,
                'taxonomy_preview' => [
                    'categories' => $newCategories->values()->all(),
                    'variation_types' => $newVariationTypes->values()->all(),
                    'variation_values' => $newVariationValues->values()->all(),
                ],
                'errors' => $globalErrors ?: null,
                'options' => array_merge($productImport->options ?? [], [
                    'staged_images' => $stagedImages['manifest'],
                    'staged_image_bytes' => $stagedImages['total_bytes'],
                ]),
                'preview_signature' => $previewSignature,
                'validated_at' => now(),
                'progress' => 35,
                'error_message' => null,
            ]);
        });

        return $productImport->refresh();
    }

    /**
     * @param  array<string, mixed>  $source
     * @param  array<string, string>  $mapping
     * @return array<string, mixed>
     */
    private function normalizeRow(array $source, array $mapping): array
    {
        $present = [];
        $value = function (string $field) use ($source, $mapping, &$present): mixed {
            $header = $mapping[$field] ?? null;
            $raw = $header ? ($source[$header] ?? null) : null;
            $present[$field] = $header !== null && $raw !== null && trim((string) $raw) !== '';

            return $raw;
        };
        $variations = [];

        for ($index = 1; $index <= 3; $index++) {
            $type = $this->stringValue($value("variation_type_{$index}"));
            $variationValue = $this->stringValue($value("variation_value_{$index}"));

            if ($type !== '' || $variationValue !== '') {
                $variations[] = ['type' => $type, 'value' => $variationValue];
            }
        }

        $imageUrls = [];

        for ($index = 1; $index <= 5; $index++) {
            $raw = $this->stringValue($value("image_url_{$index}"));

            if ($raw !== '') {
                $imageUrls = [...$imageUrls, ...preg_split('/[;\r\n]+/', $raw) ?: []];
            }
        }

        $normalizationErrors = [];
        $parse = function (callable $callback, string $label) use (&$normalizationErrors): mixed {
            try {
                return $callback();
            } catch (InvalidArgumentException $exception) {
                $normalizationErrors[] = "{$label}: {$exception->getMessage()}";

                return null;
            }
        };

        return [
            'sku' => $this->stringValue($value('sku')),
            'name' => $this->stringValue($value('name')),
            'description' => $this->stringValue($value('description')),
            'category' => $this->stringValue($value('category')),
            'is_active' => $parse(fn (): ?bool => $this->booleanValue($value('is_active')), 'Estado'),
            'price_cents' => $parse(fn (): ?int => $this->moneyValue($value('price')), 'Preço'),
            'stock' => $parse(fn (): ?int => $this->integerValue($value('stock')), 'Estoque'),
            'variant_sku' => $this->stringValue($value('variant_sku')),
            'variant_price_cents' => $parse(fn (): ?int => $this->moneyValue($value('variant_price')), 'Preço da opção'),
            'variant_stock' => $parse(fn (): ?int => $this->integerValue($value('variant_stock')), 'Estoque da opção'),
            'variations' => $variations,
            'image_urls' => collect($imageUrls)->map(fn (string $url): string => trim($url))->filter()->unique()->values()->all(),
            'present' => $present,
            'normalization_errors' => $normalizationErrors,
        ];
    }

    /** @return list<string> */
    private function rowErrors(array $row, int $rowNumber): array
    {
        $errors = $row['normalization_errors'] ?? [];

        if ($row['sku'] === '') {
            $errors[] = "Linha {$rowNumber}: informe o SKU principal.";
        }

        foreach ($row['variations'] as $variation) {
            if ($variation['type'] === '' || $variation['value'] === '') {
                $errors[] = "Linha {$rowNumber}: toda variação precisa ter tipo e valor.";
            }
        }

        foreach ($row['image_urls'] as $url) {
            if (! filter_var($url, FILTER_VALIDATE_URL) || ! in_array(parse_url($url, PHP_URL_SCHEME), ['http', 'https'], true)) {
                $errors[] = "Linha {$rowNumber}: a URL de imagem {$url} não é válida.";
            }
        }

        return $errors;
    }

    /** @return array<int, list<string>> */
    private function validateProductGroup(
        string $sku,
        Collection $group,
        ?Product $existingProduct,
        Collection $knownCategories,
        Collection $knownVariationTypes,
        Collection $newCategories,
        Collection $newVariationTypes,
        Collection $newVariationValues,
        array &$variantSkus,
    ): array {
        $errorsByRow = [];

        if ($sku === '') {
            return $errorsByRow;
        }

        $addError = function (string $message) use ($group, &$errorsByRow): void {
            foreach ($group as $row) {
                $errorsByRow[$row['row_number']][] = $message;
            }
        };
        $hasVariations = $group->contains(fn (array $row): bool => $row['normalized']['variations'] !== []);

        if ($existingProduct?->isCombo()) {
            $addError("{$sku}: combos não entram nesta importação.");
        }

        if (! $existingProduct && $group->pluck('normalized.name')->filter()->isEmpty()) {
            $addError("{$sku}: produtos novos precisam de nome.");
        }

        if (! $existingProduct && ! $hasVariations && ! $group->first()['normalized']['present']['stock']) {
            $addError("{$sku}: informe o estoque do produto novo.");
        }

        if ($existingProduct && $existingProduct->productVariations->isNotEmpty() !== $hasVariations) {
            $addError("{$sku}: a planilha não pode transformar a estrutura de variações deste produto.");
        }

        foreach (['name', 'description', 'category', 'price_cents', 'is_active'] as $field) {
            if ($group->pluck("normalized.{$field}")->filter(fn (mixed $value): bool => $value !== null && $value !== '')->unique()->count() > 1) {
                $addError("{$sku}: o campo {$this->fieldLabel($field)} está diferente entre as linhas do mesmo produto.");
            }
        }

        $category = $group->pluck('normalized.category')->filter()->first();

        if (is_string($category) && ! $knownCategories->has($this->key($category))) {
            $newCategories->put($this->key($category), $category);
        }

        if (! $hasVariations) {
            if ($group->count() > 1) {
                $addError("{$sku}: produto sem variações deve aparecer em uma única linha.");
            }

            return $errorsByRow;
        }

        foreach ($group as $row) {
            if (! $row['normalized']['present']['variant_stock']) {
                $errorsByRow[$row['row_number']][] = "{$sku}: informe o estoque de cada opção.";
            }

            foreach ($row['normalized']['variations'] as $variation) {
                if ($variation['type'] === '' || $variation['value'] === '') {
                    continue;
                }

                $typeKey = $this->key($variation['type']);
                $valueKey = $typeKey.'|'.$this->key($variation['value']);
                $type = $knownVariationTypes->get($typeKey);

                if (! $type) {
                    $newVariationTypes->put($typeKey, $variation['type']);
                    $newVariationValues->put($valueKey, [
                        'type' => $variation['type'],
                        'value' => $variation['value'],
                    ]);
                } elseif (! $type->values->contains(fn ($value): bool => $this->key($value->value) === $this->key($variation['value']))) {
                    $newVariationValues->put($valueKey, [
                        'type' => $type->name,
                        'value' => $variation['value'],
                    ]);
                }
            }

            $variantSku = $row['normalized']['variant_sku'];

            if ($variantSku !== '') {
                $identity = $this->variantIdentity($row['normalized']);

                if (isset($variantSkus[$variantSku]) && $variantSkus[$variantSku] !== $sku.'|'.$identity) {
                    $errorsByRow[$row['row_number']][] = "O SKU de opção {$variantSku} aparece em combinações diferentes.";
                }

                $variantSkus[$variantSku] = $sku.'|'.$identity;
            }
        }

        $identities = $group->map(fn (array $row): string => $this->variantIdentity($row['normalized']));

        if ($identities->duplicates()->isNotEmpty()) {
            $addError("{$sku}: a mesma combinação de variações aparece mais de uma vez.");
        }

        $typesByRow = $group->map(fn (array $row): array => collect($row['normalized']['variations'])->pluck('type')->map(fn (string $type): string => $this->key($type))->sort()->values()->all());

        if ($typesByRow->unique(fn (array $types): string => implode('|', $types))->count() > 1) {
            $addError("{$sku}: todas as opções precisam usar os mesmos tipos de variação.");

            return $errorsByRow;
        }

        $valuesPerType = [];

        foreach ($group as $row) {
            foreach ($row['normalized']['variations'] as $variation) {
                $valuesPerType[$this->key($variation['type'])][$this->key($variation['value'])] = true;
            }
        }

        $expectedCombinations = array_product(array_map('count', $valuesPerType));

        if ($expectedCombinations !== $group->count()) {
            $addError("{$sku}: faltam combinações na matriz de variações.");
        }

        if ($existingProduct) {
            $existingTypes = $existingProduct->productVariations
                ->pluck('variationType.name')
                ->map(fn (string $name): string => $this->key($name))
                ->sort()
                ->values()
                ->all();
            $importedTypes = $typesByRow->first() ?? [];

            if ($existingTypes !== $importedTypes) {
                $addError("{$sku}: os tipos de variação não correspondem à estrutura já cadastrada.");
            }
        }

        return $errorsByRow;
    }

    /** @return list<string> */
    private function limitErrors(ProductImport $productImport, int $newProductCount): array
    {
        $plan = $this->limits->activePlan($productImport->manufacturer);

        if (! $plan) {
            return ['A assinatura não permite adicionar novos produtos neste momento.'];
        }

        $errors = [];
        $currentProducts = $productImport->manufacturer->products()->count();

        if (! $plan->isUnlimited('max_products') && $currentProducts + $newProductCount > $plan->max_products) {
            $available = max(0, $plan->max_products - $currentProducts);
            $errors[] = "O plano atual permite trazer mais {$available} produtos; a planilha contém {$newProductCount} novos.";
        }

        if (! $this->limits->canStoreData($productImport->manufacturer)) {
            $errors[] = 'O limite de armazenamento de dados do plano foi atingido.';
        }

        return $errors;
    }

    private function groupWouldChange(Collection $group, Product $product): bool
    {
        $first = $group->first()['normalized'];
        $comparisons = [
            'name' => $product->name,
            'description' => $product->description,
            'is_active' => $product->is_active,
            'price_cents' => $product->price_cents,
            'stock' => $product->base_quantity,
        ];

        foreach ($comparisons as $field => $current) {
            $presenceField = $field === 'price_cents' ? 'price' : $field;

            if (($first['present'][$presenceField] ?? false) && $first[$field] !== $current) {
                return true;
            }
        }

        if (($first['present']['category'] ?? false) && $this->key($first['category']) !== $this->key($product->category?->name ?? '')) {
            return true;
        }

        foreach ($group as $row) {
            if ($row['normalized']['variations'] === []) {
                continue;
            }

            $stock = $this->findExistingStock($product, $row['normalized']);

            if (! $stock
                || (($row['normalized']['present']['variant_stock'] ?? false) && $stock->quantity !== $row['normalized']['variant_stock'])
                || (($row['normalized']['present']['variant_price'] ?? false) && $stock->price_cents !== $row['normalized']['variant_price_cents'])
                || (($row['normalized']['present']['variant_sku'] ?? false) && $stock->sku_variant !== $row['normalized']['variant_sku'])) {
                return true;
            }
        }

        return false;
    }

    private function findExistingStock(Product $product, array $row): mixed
    {
        if ($row['variant_sku'] !== '') {
            $bySku = $product->variantStocks->firstWhere('sku_variant', $row['variant_sku']);

            if ($bySku) {
                return $bySku;
            }
        }

        $identity = $this->variantIdentity($row);

        return $product->variantStocks->first(
            fn ($stock): bool => $this->keyFromVariationArray($stock->variation_key) === $identity,
        );
    }

    private function variantIdentity(array $row): ?string
    {
        if (($row['variations'] ?? []) === []) {
            return null;
        }

        return $this->keyFromVariationArray(
            collect($row['variations'])->mapWithKeys(fn (array $variation): array => [$variation['type'] => $variation['value']])->all(),
        );
    }

    /** @param array<string, string> $variations */
    private function keyFromVariationArray(array $variations): string
    {
        $normalized = collect($variations)
            ->mapWithKeys(fn (string $value, string $type): array => [$this->key($type) => $this->key($value)])
            ->sortKeys()
            ->all();

        return json_encode($normalized, JSON_THROW_ON_ERROR);
    }

    private function moneyValue(mixed $value): ?int
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }

        if (is_int($value) || is_float($value)) {
            return (int) round(((float) $value) * 100);
        }

        $normalized = preg_replace('/[^0-9,.-]/', '', (string) $value);

        if ($normalized === null || $normalized === '') {
            throw new InvalidArgumentException('Valor monetário inválido.');
        }

        $lastComma = strrpos($normalized, ',');
        $lastDot = strrpos($normalized, '.');

        if ($lastComma !== false && $lastDot !== false) {
            $decimalSeparator = $lastComma > $lastDot ? ',' : '.';
            $thousandSeparator = $decimalSeparator === ',' ? '.' : ',';
            $normalized = str_replace($thousandSeparator, '', $normalized);
            $normalized = str_replace($decimalSeparator, '.', $normalized);
        } elseif ($lastComma !== false) {
            $normalized = str_replace('.', '', $normalized);
            $normalized = str_replace(',', '.', $normalized);
        }

        if (! is_numeric($normalized)) {
            throw new InvalidArgumentException('Valor monetário inválido.');
        }

        return (int) round(((float) $normalized) * 100);
    }

    private function integerValue(mixed $value): ?int
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }

        $normalized = filter_var($value, FILTER_VALIDATE_INT);

        if ($normalized === false || $normalized < 0) {
            throw new InvalidArgumentException('Quantidade inválida.');
        }

        return (int) $normalized;
    }

    private function booleanValue(mixed $value): ?bool
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }

        $normalized = $this->key((string) $value);

        return match ($normalized) {
            '1', 'sim', 's', 'ativo', 'publicado', 'true' => true,
            '0', 'nao', 'n', 'inativo', 'rascunho', 'false' => false,
            default => throw new InvalidArgumentException('Estado inválido. Use Sim/Não ou Ativo/Inativo.'),
        };
    }

    private function stringValue(mixed $value): string
    {
        return trim((string) ($value ?? ''));
    }

    private function key(string $value): string
    {
        return Str::lower(Str::ascii(trim($value)));
    }

    private function fieldLabel(string $field): string
    {
        return match ($field) {
            'name' => 'nome',
            'description' => 'descrição',
            'category' => 'categoria',
            'price_cents' => 'preço',
            'is_active' => 'estado',
            default => $field,
        };
    }
}
