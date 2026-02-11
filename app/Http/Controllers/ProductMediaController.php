<?php

namespace App\Http\Controllers;

use App\Enums\ProductMediaType;
use App\Http\Requests\ProductMediaOrderRequest;
use App\Http\Requests\ProductMediaStoreRequest;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Services\ProductUpsertService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;

class ProductMediaController extends Controller
{
    public function __construct(protected ProductUpsertService $upsertService)
    {
    }

    public function store(ProductMediaStoreRequest $request, Product $product): RedirectResponse
    {
        $type = ProductMediaType::from($request->input('type'));

        if ($type === ProductMediaType::Image) {
            $files = $request->file('files', []);

            foreach ($files as $file) {
                $this->upsertService->storeMedia(
                    $product,
                    $file,
                    $type,
                    $request->input('sort_order')
                );
            }
        } else {
            $this->upsertService->storeMedia(
                $product,
                $request->file('file'),
                $type,
                $request->input('sort_order')
            );
        }

        return redirect()
            ->back()
            ->with('success', 'Midia adicionada com sucesso.');
    }

    public function reorder(ProductMediaOrderRequest $request, Product $product): RedirectResponse
    {
        $this->authorize('update', $product);

        $this->upsertService->reorderMedia($product, $request->input('media_order'));

        return redirect()
            ->back()
            ->with('success', 'Ordem das midias atualizada.');
    }

    public function destroy(Product $product, ProductMedia $media): RedirectResponse
    {
        $this->authorize('update', $product);

        if ($media->product_id !== $product->id) {
            abort(404);
        }

        Storage::disk('public')->delete($media->path);
        $media->delete();

        return redirect()
            ->back()
            ->with('success', 'Midia removida com sucesso.');
    }
}
