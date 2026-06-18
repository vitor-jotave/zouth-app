<?php

namespace App\Http\Controllers;

use App\Http\Requests\VariationTypeStoreRequest;
use App\Http\Requests\VariationTypeUpdateRequest;
use App\Models\VariationType;
use App\Services\TenantManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class VariationTypeController extends Controller
{
    public function __construct()
    {
        $this->authorizeResource(VariationType::class, 'variation_type');
    }

    public function index(Request $request, TenantManager $tenantManager): Response
    {
        $manufacturer = $tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        $variationTypes = VariationType::where('manufacturer_id', $manufacturer->id)
            ->with('values')
            ->orderBy('display_order')
            ->orderBy('name')
            ->get();

        return Inertia::render('manufacturer/variation-types/index', [
            'variation_types' => $variationTypes->map(fn (VariationType $type) => [
                'id' => $type->id,
                'name' => $type->name,
                'is_color_type' => $type->is_color_type,
                'display_order' => $type->display_order,
                'values' => $type->values->map(fn ($value) => [
                    'id' => $value->id,
                    'value' => $value->value,
                    'hex' => $value->hex,
                    'image_path' => $value->image_path,
                    'image_url' => $this->variationValueImageUrl($value->image_path),
                    'display_order' => $value->display_order,
                ]),
            ]),
        ]);
    }

    public function store(VariationTypeStoreRequest $request): RedirectResponse
    {
        $manufacturerId = $request->user()->current_manufacturer_id;

        $maxOrder = VariationType::where('manufacturer_id', $manufacturerId)->max('display_order') ?? 0;

        $type = VariationType::create([
            'manufacturer_id' => $manufacturerId,
            'name' => $request->validated('name'),
            'is_color_type' => $request->validated('is_color_type', false),
            'display_order' => $maxOrder + 1,
        ]);

        $values = $request->validated('values', []);
        foreach ($values as $index => $valueData) {
            $type->values()->create([
                'value' => $valueData['value'],
                'hex' => $type->is_color_type ? ($valueData['hex'] ?? null) : null,
                'image_path' => $type->is_color_type ? $this->storeVariationValueImage($request, $index) : null,
                'display_order' => $index,
            ]);
        }

        return redirect()
            ->back()
            ->with('success', 'Tipo de variação criado com sucesso.');
    }

    public function update(VariationTypeUpdateRequest $request, VariationType $variationType): RedirectResponse
    {
        $variationType->update([
            'name' => $request->validated('name'),
            'is_color_type' => $request->validated('is_color_type', false),
        ]);

        $incomingValues = collect($request->validated('values', []));
        $existingIds = $incomingValues->pluck('id')->filter()->all();

        $removedValues = $variationType->values()
            ->when($existingIds !== [], fn ($query) => $query->whereNotIn('id', $existingIds))
            ->get();

        foreach ($removedValues as $removedValue) {
            $this->deleteVariationValueImage($removedValue->image_path);
        }

        $variationType->values()
            ->when($existingIds !== [], fn ($query) => $query->whereNotIn('id', $existingIds))
            ->delete();

        foreach ($incomingValues as $index => $valueData) {
            $storedImagePath = $variationType->is_color_type
                ? $this->storeVariationValueImage($request, $index)
                : null;

            if (! empty($valueData['id'])) {
                $value = $variationType->values()->where('id', $valueData['id'])->first();

                if (! $value) {
                    continue;
                }

                $imagePath = $value->image_path;

                if ($storedImagePath) {
                    $this->deleteVariationValueImage($imagePath);
                    $imagePath = $storedImagePath;
                } elseif ($request->boolean("values.{$index}.remove_image") || ! $variationType->is_color_type) {
                    $this->deleteVariationValueImage($imagePath);
                    $imagePath = null;
                }

                $value->update([
                    'value' => $valueData['value'],
                    'hex' => $variationType->is_color_type ? ($valueData['hex'] ?? null) : null,
                    'image_path' => $imagePath,
                    'display_order' => $index,
                ]);
            } else {
                $variationType->values()->create([
                    'value' => $valueData['value'],
                    'hex' => $variationType->is_color_type ? ($valueData['hex'] ?? null) : null,
                    'image_path' => $storedImagePath,
                    'display_order' => $index,
                ]);
            }
        }

        return redirect()
            ->back()
            ->with('success', 'Tipo de variação atualizado com sucesso.');
    }

    public function destroy(VariationType $variationType): RedirectResponse
    {
        // Check if any products are using this variation type
        if ($variationType->productVariations()->exists()) {
            return redirect()
                ->back()
                ->with('error', 'Não é possível excluir um tipo de variação em uso por produtos.');
        }

        foreach ($variationType->values as $value) {
            $this->deleteVariationValueImage($value->image_path);
        }

        $variationType->delete();

        return redirect()
            ->back()
            ->with('success', 'Tipo de variação excluído com sucesso.');
    }

    private function storeVariationValueImage(Request $request, int|string $index): ?string
    {
        $file = $request->file("values.{$index}.image");

        if (! $file) {
            return null;
        }

        return $file->store('variation-values', 's3');
    }

    private function deleteVariationValueImage(?string $path): void
    {
        if ($path) {
            Storage::disk('s3')->delete($path);
        }
    }

    private function variationValueImageUrl(?string $path): ?string
    {
        return $path ? Storage::disk('s3')->url($path) : null;
    }
}
