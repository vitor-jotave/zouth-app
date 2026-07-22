<?php

namespace App\Http\Controllers\Manufacturer;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRuleRequest;
use App\Http\Requests\UpdateOrderRuleRequest;
use App\Http\Resources\OrderRuleResource;
use App\Models\OrderRule;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Services\TenantManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderRuleController extends Controller
{
    public function __construct(private TenantManager $tenantManager) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', OrderRule::class);
        $manufacturer = $this->tenantManager->get();

        abort_unless($manufacturer, 403);

        $rules = OrderRule::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->orderBy('sort_order')
            ->orderBy('created_at')
            ->get();

        return Inertia::render('manufacturer/order-rules/index', [
            'order_rules' => OrderRuleResource::collection($rules)->resolve($request),
            'rule_summary' => [
                'total' => $rules->count(),
                'active' => $rules->where('is_active', true)->count(),
                'limits' => $rules->filter(fn (OrderRule $rule): bool => ($rule->action['type'] ?? null) === 'block_checkout')->count(),
                'benefits' => $rules->filter(fn (OrderRule $rule): bool => ($rule->action['type'] ?? null) !== 'block_checkout')->count(),
            ],
            'products' => Product::query()
                ->where('manufacturer_id', $manufacturer->id)
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'sku', 'product_category_id']),
            'categories' => ProductCategory::query()
                ->where('manufacturer_id', $manufacturer->id)
                ->orderBy('name')
                ->get(['id', 'name']),
        ]);
    }

    public function store(StoreOrderRuleRequest $request): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();

        abort_unless($manufacturer, 403);

        $validated = $request->validated();
        $validated['manufacturer_id'] = $manufacturer->id;
        $validated['sort_order'] ??= (int) OrderRule::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->max('sort_order') + 1;

        OrderRule::query()->create($validated);

        return redirect()->back()->with('success', 'Regra criada e pronta para acompanhar o carrinho.');
    }

    public function update(UpdateOrderRuleRequest $request, OrderRule $orderRule): RedirectResponse
    {
        $orderRule->update($request->validated());

        return redirect()->back()->with('success', 'Regra atualizada.');
    }

    public function toggle(Request $request, OrderRule $orderRule): RedirectResponse
    {
        $this->authorize('update', $orderRule);

        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $orderRule->update($validated);

        return redirect()->back()->with('success', $orderRule->is_active
            ? 'Regra ativada.'
            : 'Regra pausada.');
    }

    public function duplicate(OrderRule $orderRule): RedirectResponse
    {
        $this->authorize('create', OrderRule::class);
        $this->authorize('view', $orderRule);

        $copy = $orderRule->replicate();
        $copy->name = "{$orderRule->name} — cópia";
        $copy->is_active = false;
        $copy->sort_order = (int) OrderRule::query()
            ->where('manufacturer_id', $orderRule->manufacturer_id)
            ->max('sort_order') + 1;
        $copy->save();

        return redirect()->back()->with('success', 'Regra duplicada como rascunho pausado.');
    }

    public function destroy(OrderRule $orderRule): RedirectResponse
    {
        $this->authorize('delete', $orderRule);
        $orderRule->delete();

        return redirect()->back()->with('success', 'Regra excluída. Pedidos antigos preservam o histórico.');
    }
}
