<?php

namespace App\Http\Controllers;

use App\Http\Resources\CatalogSettingResource;
use App\Http\Resources\ProductCatalogResource;
use App\Models\CatalogSetting;
use App\Models\CatalogVisit;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\VariationType;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PublicCatalogController extends Controller
{
    public function show(Request $request, string $token): Response
    {
        $setting = CatalogSetting::query()
            ->with('manufacturer')
            ->where('public_token', $token)
            ->where('public_link_active', true)
            ->whereHas('manufacturer', fn ($query) => $query->where('is_active', true))
            ->firstOrFail();

        // Track visit without breaking the render if it fails
        try {
            CatalogVisit::create([
                'catalog_setting_id' => $setting->id,
                'manufacturer_id' => $setting->manufacturer_id,
                'public_token' => $setting->public_token,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'referer' => $request->header('referer'),
                'utm_source' => $request->query('utm_source'),
                'utm_medium' => $request->query('utm_medium'),
                'utm_campaign' => $request->query('utm_campaign'),
                'utm_term' => $request->query('utm_term'),
                'utm_content' => $request->query('utm_content'),
                'visited_at' => now(),
            ]);
        } catch (\Throwable $e) {
            report($e);
        }

        $search = trim((string) $request->input('search', ''));
        $categoryId = $request->filled('category_id') ? (string) $request->input('category_id') : null;
        $variationFilters = $this->normalizeVariationFilters($request->input('variations', []));
        $variationTypeNames = VariationType::query()
            ->where('manufacturer_id', $setting->manufacturer_id)
            ->whereIn('id', array_keys($variationFilters))
            ->pluck('name', 'id');

        $products = Product::query()
            ->where('manufacturer_id', $setting->manufacturer_id)
            ->where('is_active', true)
            ->when($search !== '', function ($query) use ($search) {
                $normalizedSearch = $this->normalizeSearchTerm($search);
                $normalizedName = $this->normalizedSearchExpression('products.name');
                $normalizedSku = $this->normalizedSearchExpression('products.sku');

                $query->where(function ($searchQuery) use ($search, $normalizedSearch, $normalizedName, $normalizedSku) {
                    $searchQuery
                        ->where(function ($q) use ($search) {
                            $q->where('name', 'like', "%{$search}%")
                                ->orWhere('sku', 'like', "%{$search}%");
                        })
                        ->orWhere(function ($q) use ($normalizedSearch, $normalizedName, $normalizedSku) {
                            $q->whereRaw("{$normalizedName} like ?", ["%{$normalizedSearch}%"])
                                ->orWhereRaw("{$normalizedSku} like ?", ["%{$normalizedSearch}%"]);
                        });
                });
            })
            ->when($categoryId, function ($query, string $categoryId) {
                $query->where('product_category_id', $categoryId);
            })
            ->when($variationTypeNames->isNotEmpty(), function ($query) use ($variationFilters, $variationTypeNames) {
                foreach ($variationFilters as $typeId => $values) {
                    $typeName = $variationTypeNames->get($typeId);

                    if (! $typeName) {
                        continue;
                    }

                    $query->where(function ($variationQuery) use ($typeId, $typeName, $values) {
                        $variationQuery
                            ->whereHas('variantStocks', function ($stockQuery) use ($typeName, $values) {
                                $stockQuery->whereIn("variation_key->{$typeName}", $values);
                            })
                            ->orWhereHas('productVariations', function ($productVariationQuery) use ($typeId, $values) {
                                $productVariationQuery
                                    ->where('variation_type_id', $typeId)
                                    ->whereHas('variationType.values', function ($valueQuery) use ($values) {
                                        $valueQuery->whereIn('value', $values);
                                    });
                            });
                    });
                }
            })
            ->with(['category', 'media', 'productVariations.variationType.values', 'variantStocks', 'comboItems.componentProduct', 'comboItems.componentVariantStock'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(24)
            ->withQueryString();

        return Inertia::render('public/catalog', [
            'manufacturer' => [
                'id' => $setting->manufacturer->id,
                'name' => $setting->manufacturer->name,
                'slug' => $setting->manufacturer->slug,
            ],
            'catalog_settings' => (new CatalogSettingResource($setting))->resolve(request()),
            'products' => ProductCatalogResource::collection($products),
            'catalog_token' => $setting->public_token,
            'filters' => [
                'search' => $search,
                'category_id' => $categoryId,
                'variations' => collect($variationFilters)
                    ->mapWithKeys(fn (array $values, int|string $typeId) => [(string) $typeId => $values])
                    ->all(),
            ],
            'filter_options' => $this->buildFilterOptions($setting),
        ]);
    }

    /**
     * @return array<int|string, array<int, string>>
     */
    private function normalizeVariationFilters(mixed $input): array
    {
        if (! is_array($input)) {
            return [];
        }

        $filters = [];

        foreach ($input as $typeId => $values) {
            if (! is_numeric($typeId)) {
                continue;
            }

            $normalizedValues = collect(is_array($values) ? $values : [$values])
                ->map(fn (mixed $value) => trim((string) $value))
                ->filter()
                ->unique()
                ->values()
                ->all();

            if ($normalizedValues !== []) {
                $filters[(int) $typeId] = $normalizedValues;
            }
        }

        return $filters;
    }

    private function normalizeSearchTerm(string $value): string
    {
        return Str::lower(Str::ascii($value));
    }

    private function normalizedSearchExpression(string $column): string
    {
        $expression = $column;

        foreach ($this->accentReplacementMap() as $accent => $replacement) {
            $expression = "replace({$expression}, '{$accent}', '{$replacement}')";
        }

        return "lower({$expression})";
    }

    /**
     * @return array<string, string>
     */
    private function accentReplacementMap(): array
    {
        return [
            'á' => 'a',
            'à' => 'a',
            'â' => 'a',
            'ã' => 'a',
            'ä' => 'a',
            'Á' => 'A',
            'À' => 'A',
            'Â' => 'A',
            'Ã' => 'A',
            'Ä' => 'A',
            'é' => 'e',
            'è' => 'e',
            'ê' => 'e',
            'ë' => 'e',
            'É' => 'E',
            'È' => 'E',
            'Ê' => 'E',
            'Ë' => 'E',
            'í' => 'i',
            'ì' => 'i',
            'î' => 'i',
            'ï' => 'i',
            'Í' => 'I',
            'Ì' => 'I',
            'Î' => 'I',
            'Ï' => 'I',
            'ó' => 'o',
            'ò' => 'o',
            'ô' => 'o',
            'õ' => 'o',
            'ö' => 'o',
            'Ó' => 'O',
            'Ò' => 'O',
            'Ô' => 'O',
            'Õ' => 'O',
            'Ö' => 'O',
            'ú' => 'u',
            'ù' => 'u',
            'û' => 'u',
            'ü' => 'u',
            'Ú' => 'U',
            'Ù' => 'U',
            'Û' => 'U',
            'Ü' => 'U',
            'ç' => 'c',
            'Ç' => 'C',
            'ñ' => 'n',
            'Ñ' => 'N',
        ];
    }

    /**
     * @return array{categories: array<int, array{id: int, name: string}>, variation_types: array<int, array{id: int, name: string, is_color_type: bool, values: array<int, array{value: string, hex: string|null}>}>}
     */
    private function buildFilterOptions(CatalogSetting $setting): array
    {
        $categories = ProductCategory::query()
            ->where('manufacturer_id', $setting->manufacturer_id)
            ->whereHas('products', function ($query) use ($setting) {
                $query->where('manufacturer_id', $setting->manufacturer_id)
                    ->where('is_active', true);
            })
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (ProductCategory $category) => [
                'id' => $category->id,
                'name' => $category->name,
            ])
            ->values()
            ->all();

        $variationTypes = VariationType::query()
            ->where('manufacturer_id', $setting->manufacturer_id)
            ->whereHas('productVariations.product', function ($query) use ($setting) {
                $query->where('manufacturer_id', $setting->manufacturer_id)
                    ->where('is_active', true);
            })
            ->with('values')
            ->orderBy('display_order')
            ->orderBy('name')
            ->get()
            ->map(function (VariationType $type) {
                $values = $type->values
                    ->sortBy([
                        ['display_order', 'asc'],
                        ['value', 'asc'],
                    ])
                    ->map(fn ($value) => [
                        'value' => $value->value,
                        'hex' => $value->hex,
                    ])
                    ->values()
                    ->all();

                return [
                    'id' => $type->id,
                    'name' => $type->name,
                    'is_color_type' => $type->is_color_type,
                    'values' => $values,
                ];
            })
            ->filter(fn (array $type) => $type['values'] !== [])
            ->values()
            ->all();

        return [
            'categories' => $categories,
            'variation_types' => $variationTypes,
        ];
    }
}
