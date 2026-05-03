<?php

namespace App\Http\Controllers\Manufacturer;

use App\Enums\ProductMediaType;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductComboRequest;
use App\Http\Requests\UpdateProductComboRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Services\PlanLimitService;
use App\Services\ProductComboService;
use App\Services\ProductUpsertService;
use App\Services\TenantManager;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class ProductComboController extends Controller
{
    public function __construct(
        private TenantManager $tenantManager,
        private PlanLimitService $limitService,
        private ProductComboService $comboService,
        private ProductUpsertService $upsertService,
    ) {}

    public function create(): Response
    {
        $manufacturer = $this->tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        $this->authorize('create', Product::class);

        return Inertia::render('manufacturer/products/combos/create', [
            'categories' => $this->categories($manufacturer->id),
            'component_products' => $this->componentProducts($manufacturer->id),
        ]);
    }

    public function store(StoreProductComboRequest $request): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();

        if (! $this->limitService->canCreateProduct($manufacturer)) {
            return redirect()->back()
                ->withErrors(['limit' => 'Você atingiu o limite de produtos do seu plano.'])
                ->with('limit_exceeded', $this->limitService->limitExceededPayload($manufacturer, 'products'));
        }

        if (! $this->limitService->canStoreData($manufacturer)) {
            return redirect()->back()
                ->withErrors(['limit' => 'Você atingiu o limite de armazenamento de dados do seu plano.'])
                ->with('limit_exceeded', $this->limitService->limitExceededPayload($manufacturer, 'data_mb'));
        }

        $combo = $this->comboService->createCombo(array_merge($request->validated(), [
            'manufacturer_id' => $request->user()->current_manufacturer_id,
        ]));

        foreach ($request->file('images', []) as $image) {
            $this->upsertService->storeMedia($combo, $image, ProductMediaType::Image);
        }

        if ($request->hasFile('video')) {
            $this->upsertService->storeMedia($combo, $request->file('video'), ProductMediaType::Video);
        }

        return redirect()
            ->route('manufacturer.products.index')
            ->with('success', 'Combo criado com sucesso.');
    }

    public function edit(Product $product): Response
    {
        $this->authorize('update', $product);

        if (! $product->isCombo()) {
            abort(404);
        }

        $manufacturer = $this->tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        $product->load(['media', 'category', 'comboItems.componentProduct', 'comboItems.componentVariantStock']);

        return Inertia::render('manufacturer/products/combos/edit', [
            'product' => new ProductResource($product),
            'categories' => $this->categories($manufacturer->id),
            'component_products' => $this->componentProducts($manufacturer->id),
        ]);
    }

    public function update(UpdateProductComboRequest $request, Product $product): RedirectResponse
    {
        if (! $product->isCombo()) {
            abort(404);
        }

        $this->comboService->updateCombo($product, array_merge($request->validated(), [
            'manufacturer_id' => $request->user()->current_manufacturer_id,
        ]));

        return redirect()
            ->back()
            ->with('success', 'Combo atualizado com sucesso.');
    }

    /**
     * @return \Illuminate\Database\Eloquent\Collection<int, ProductCategory>
     */
    private function categories(int $manufacturerId): \Illuminate\Database\Eloquent\Collection
    {
        return ProductCategory::where('manufacturer_id', $manufacturerId)
            ->orderBy('name')
            ->get(['id', 'name']);
    }

    private function componentProducts(int $manufacturerId): \Illuminate\Support\Collection
    {
        return Product::query()
            ->where('manufacturer_id', $manufacturerId)
            ->where('product_type', 'product')
            ->where('is_active', true)
            ->with(['variantStocks', 'productVariations.variationType.values'])
            ->orderBy('name')
            ->get()
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'price_cents' => $product->price_cents,
                'base_quantity' => $product->base_quantity,
                'has_variations' => $product->productVariations->isNotEmpty(),
                'variant_stocks' => $product->variantStocks->map(fn ($stock) => [
                    'id' => $stock->id,
                    'variation_key' => $stock->variation_key,
                    'quantity' => $stock->quantity,
                    'price_cents' => $stock->price_cents,
                    'sku_variant' => $stock->sku_variant,
                ])->values()->all(),
            ])->values();
    }
}
