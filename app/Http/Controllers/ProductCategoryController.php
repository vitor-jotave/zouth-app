<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductCategoryStoreRequest;
use App\Http\Requests\ProductCategoryUpdateRequest;
use App\Http\Resources\ProductCategoryResource;
use App\Models\ProductCategory;
use App\Services\TenantManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductCategoryController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(ProductCategory::class, 'category');
    }

    public function index(Request $request, TenantManager $tenantManager): Response
    {
        $manufacturer = $tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        $categories = ProductCategory::where('manufacturer_id', $manufacturer->id)
            ->withCount('products')
            ->when($request->search, function ($query, $search) {
                $query->where('name', 'like', '%' . $search . '%');
            })
            ->orderBy('name')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('manufacturer/categories/index', [
            'categories' => ProductCategoryResource::collection($categories),
            'filters' => [
                'search' => $request->search,
            ],
        ]);
    }

    public function store(ProductCategoryStoreRequest $request): RedirectResponse
    {
        $manufacturerId = $request->user()->current_manufacturer_id;
        ProductCategory::create(array_merge(
            $request->validated(),
            ['manufacturer_id' => $manufacturerId],
        ));

        return redirect()
            ->back()
            ->with('success', 'Categoria criada com sucesso.');
    }

    public function update(ProductCategoryUpdateRequest $request, ProductCategory $category): RedirectResponse
    {
        $category->update($request->validated());

        return redirect()
            ->back()
            ->with('success', 'Categoria atualizada com sucesso.');
    }

    public function destroy(ProductCategory $category): RedirectResponse
    {
        if ($category->products()->count() > 0) {
            return redirect()
                ->back()
                ->with('error', 'Nao e possivel excluir categoria com produtos vinculados.');
        }

        $category->delete();

        return redirect()
            ->back()
            ->with('success', 'Categoria excluida com sucesso.');
    }
}
