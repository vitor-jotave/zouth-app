<?php

namespace App\Http\Controllers\Rep;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAssistedSelectionRequest;
use App\Models\AssistedSelection;
use App\Models\CatalogSetting;
use App\Models\ManufacturerAffiliation;
use App\Services\OrderCartBuilder;
use App\Services\PlanLimitService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AssistedSelectionController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(StoreAssistedSelectionRequest $request, string $token, OrderCartBuilder $cartBuilder, PlanLimitService $limits): JsonResponse
    {
        $catalog = CatalogSetting::query()->with('manufacturer')
            ->where('public_token', $token)->where('public_link_active', true)->where('hide_prices', false)
            ->whereHas('manufacturer', fn ($query) => $query->where('is_active', true))->firstOrFail();
        abort_unless($limits->hasOperationalAccess($catalog->manufacturer), 404);

        $affiliation = ManufacturerAffiliation::query()->whereBelongsTo($catalog->manufacturer)
            ->where('user_id', $request->user()->id)->where('status', 'active')->firstOrFail();
        $items = $request->validated('items');
        $cart = $cartBuilder->build($catalog->manufacturer_id, $items, allowOrdersWithoutStock: (bool) $catalog->allow_orders_without_stock);
        $normalized = [];
        $seen = [];

        foreach ($items as $index => $item) {
            $variations = $cart['resolved_items'][$index]['selected_variations'] ?? [];
            ksort($variations);
            $key = serialize([(int) $item['product_id'], $variations]);
            if (isset($seen[$key])) {
                throw ValidationException::withMessages(['items' => 'Agrupe quantidades da mesma peça e variação antes de compartilhar.']);
            }
            $seen[$key] = true;
            $normalized[] = [
                'product_id' => (int) $item['product_id'],
                'quantity' => (int) $item['quantity'],
                'selected_variations' => (object) $variations,
            ];
        }

        $selection = AssistedSelection::create([
            'manufacturer_affiliation_id' => $affiliation->id,
            'catalog_setting_id' => $catalog->id,
            'token' => (string) Str::uuid(),
            'items' => $normalized,
            'expires_at' => now()->addDays(14),
        ]);

        return response()->json([
            'url' => route('public.catalog.show', ['token' => $catalog->public_token, 'selecao' => $selection->token]),
        ], 201)->header('Cache-Control', 'private, no-store');
    }
}
