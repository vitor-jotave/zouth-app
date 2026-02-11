<?php

namespace App\Http\Controllers;

use App\Enums\ProductMediaType;
use App\Enums\ProductSize;
use App\Http\Requests\ProductStoreRequest;
use App\Http\Requests\ProductUpdateRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Services\ProductStockService;
use App\Services\ProductUpsertService;
use App\Services\TenantManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function __construct(
        protected ProductUpsertService $upsertService,
        protected ProductStockService $stockService,
        protected TenantManager $tenantManager
    ) {
        $this->authorizeResource(Product::class, 'product');
    }

    public function index(Request $request): Response
    {
        $manufacturer = $this->tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        $products = Product::where('manufacturer_id', $manufacturer->id)
            ->with(['category', 'media'])
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', '%'.$search.'%')
                        ->orWhere('sku', 'like', '%'.$search.'%');
                });
            })
            ->when($request->category_id, function ($query, $categoryId) {
                $query->where('product_category_id', $categoryId);
            })
            ->when($request->has('is_active'), function ($query) use ($request) {
                $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
            })
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        $categories = ProductCategory::where('manufacturer_id', $manufacturer->id)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('manufacturer/products/index', [
            'products' => ProductResource::collection($products),
            'categories' => $categories,
            'filters' => [
                'search' => $request->search,
                'category_id' => $request->category_id,
                'is_active' => $request->is_active,
            ],
        ]);
    }

    public function create(): Response
    {
        $manufacturer = $this->tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        $categories = ProductCategory::where('manufacturer_id', $manufacturer->id)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('manufacturer/products/create', [
            'categories' => $categories,
            'sizes' => collect(ProductSize::cases())->map(fn (ProductSize $size) => $size->value),
        ]);
    }

    public function store(ProductStoreRequest $request): RedirectResponse
    {
        $payload = array_merge($request->validated(), [
            'manufacturer_id' => $request->user()->current_manufacturer_id,
        ]);

        $product = $this->upsertService->createProduct($payload);

        // Upload media files if provided during creation
        foreach ($request->file('images', []) as $image) {
            $this->upsertService->storeMedia($product, $image, ProductMediaType::Image);
        }

        if ($request->hasFile('video')) {
            $this->upsertService->storeMedia($product, $request->file('video'), ProductMediaType::Video);
        }

        return redirect()
            ->route('manufacturer.products.edit', $product)
            ->with('success', 'Produto criado com sucesso.');
    }

    public function edit(Product $product): Response
    {
        $manufacturer = $this->tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        $product->load(['media', 'colors', 'variantStocks.color', 'category']);

        $categories = ProductCategory::where('manufacturer_id', $manufacturer->id)
            ->orderBy('name')
            ->get(['id', 'name']);

        $stockStructure = $this->stockService->getStockStructure($product);

        return Inertia::render('manufacturer/products/edit', [
            'product' => new ProductResource($product),
            'categories' => $categories,
            'sizes' => collect(ProductSize::cases())->map(fn (ProductSize $size) => $size->value),
            'stock_structure' => $stockStructure,
        ]);
    }

    public function update(ProductUpdateRequest $request, Product $product): RedirectResponse
    {
        $payload = array_merge($request->validated(), [
            'manufacturer_id' => $request->user()->current_manufacturer_id,
        ]);

        $this->upsertService->updateProduct($product, $payload);

        return redirect()
            ->back()
            ->with('success', 'Produto atualizado com sucesso.');
    }

    public function destroy(Product $product): RedirectResponse
    {
        foreach ($product->media as $media) {
            Storage::disk('public')->delete($media->path);
        }

        $product->delete();

        return redirect()
            ->route('manufacturer.products.index')
            ->with('success', 'Produto excluido com sucesso.');
    }
}
