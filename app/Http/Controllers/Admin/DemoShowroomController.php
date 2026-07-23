<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreDemoShowroomRequest;
use App\Models\Manufacturer;
use App\Models\Plan;
use App\Services\DemoShowroomService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class DemoShowroomController extends Controller
{
    public function __construct(private readonly DemoShowroomService $showroom) {}

    public function show(): Response
    {
        $manufacturer = Manufacturer::query()
            ->where('is_demo', true)
            ->with(['primaryOwner:id,name,email', 'currentPlan:id,name', 'catalogSetting:id,manufacturer_id,public_token,public_link_active'])
            ->first();

        return Inertia::render('admin/demo-showroom', [
            'has_active_plan' => Plan::query()->where('is_active', true)->exists(),
            'showroom' => $manufacturer ? [
                'id' => $manufacturer->id,
                'name' => $manufacturer->name,
                'email' => $manufacturer->primaryOwner?->email,
                'plan_name' => $manufacturer->currentPlan?->name,
                'created_at' => $manufacturer->created_at?->toISOString(),
                'catalog_url' => $manufacturer->catalogSetting?->public_link_active
                    ? route('public.catalog.show', $manufacturer->catalogSetting->public_token)
                    : null,
                'counts' => [
                    'products' => $manufacturer->products()->where('product_type', 'normal')->count(),
                    'combos' => $manufacturer->products()->where('product_type', 'combo')->count(),
                    'categories' => $manufacturer->productCategories()->count(),
                    'variations' => $manufacturer->variationTypes()->count(),
                    'order_rules' => $manufacturer->orderRules()->count(),
                    'orders' => $manufacturer->orders()->count(),
                    'customers' => $manufacturer->customers()->count(),
                    'representatives' => $manufacturer->affiliations()->where('status', 'active')->count(),
                    'funnels' => $manufacturer->whatsappFunnels()->count(),
                    'automations' => $manufacturer->whatsappAutomations()->count(),
                    'quick_replies' => $manufacturer->whatsappQuickReplies()->count(),
                    'catalog_visits' => $manufacturer->catalogVisits()->count(),
                ],
            ] : null,
        ]);
    }

    public function store(StoreDemoShowroomRequest $request): RedirectResponse
    {
        try {
            $result = $this->showroom->create($request->string('email')->lower()->toString());
        } catch (Throwable $exception) {
            report($exception);

            return redirect()
                ->route('admin.demo-showroom.show')
                ->with('error', 'Não foi possível montar o showroom. Nada do showroom anterior foi perdido.');
        }

        return redirect()
            ->route('admin.demo-showroom.show')
            ->with('status', 'Showroom reconstruído e pronto para a próxima apresentação.')
            ->with('demo_credentials', [
                'email' => $result['user']->email,
                'password' => $result['password'],
            ]);
    }
}
