<?php

namespace App\Http\Controllers;

use App\Http\Requests\VariationTypeStoreRequest;
use App\Http\Requests\VariationTypeUpdateRequest;
use App\Models\VariationType;
use App\Services\TenantManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
                'hex' => $valueData['hex'] ?? null,
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

        // Sync values: delete removed, update existing, create new
        $incomingValues = collect($request->validated('values', []));
        $existingIds = $incomingValues->pluck('id')->filter()->all();

        // Delete values not in the incoming list
        $variationType->values()->whereNotIn('id', $existingIds)->delete();

        foreach ($incomingValues as $index => $valueData) {
            if (! empty($valueData['id'])) {
                $variationType->values()->where('id', $valueData['id'])->update([
                    'value' => $valueData['value'],
                    'hex' => $valueData['hex'] ?? null,
                    'display_order' => $index,
                ]);
            } else {
                $variationType->values()->create([
                    'value' => $valueData['value'],
                    'hex' => $valueData['hex'] ?? null,
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

        $variationType->delete();

        return redirect()
            ->back()
            ->with('success', 'Tipo de variação excluído com sucesso.');
    }
}
