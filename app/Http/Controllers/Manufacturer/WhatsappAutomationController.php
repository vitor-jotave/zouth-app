<?php

namespace App\Http\Controllers\Manufacturer;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreWhatsappAutomationRequest;
use App\Http\Requests\UpdateWhatsappAutomationRequest;
use App\Models\WhatsappAutomation;
use App\Models\WhatsappFunnel;
use App\Services\TenantManager;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class WhatsappAutomationController extends Controller
{
    public function __construct(private TenantManager $tenantManager) {}

    public function index(): Response
    {
        $manufacturer = $this->tenantManager->get();
        $automations = WhatsappAutomation::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->latest('updated_at')
            ->get();

        $funnels = WhatsappFunnel::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return Inertia::render('manufacturer/atendimento/automacoes/index', [
            'automations' => $automations
                ->map(fn (WhatsappAutomation $automation) => $this->automationPayload($automation))
                ->values(),
            'starter_definition' => WhatsappAutomation::starterDefinition(
                $funnels->first()?->id,
            ),
        ]);
    }

    public function edit(WhatsappAutomation $automation): Response
    {
        $manufacturer = $this->tenantManager->get();

        abort_unless($automation->manufacturer_id === $manufacturer->id, 403);

        $funnels = WhatsappFunnel::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return Inertia::render('manufacturer/atendimento/automacoes/edit', [
            'automation' => $this->automationPayload($automation),
            'funnels' => $funnels,
        ]);
    }

    public function store(StoreWhatsappAutomationRequest $request): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();
        $automation = WhatsappAutomation::create([
            'manufacturer_id' => $manufacturer->id,
            'name' => $request->validated('name'),
            'is_active' => false,
            'definition' => $request->validated('definition'),
        ]);

        return redirect()
            ->route('manufacturer.atendimento.automations.edit', $automation)
            ->with('success', 'Automação criada como rascunho.');
    }

    public function update(
        UpdateWhatsappAutomationRequest $request,
        WhatsappAutomation $automation,
    ): RedirectResponse {
        $wasActive = $automation->is_active;

        $automation->update([
            'name' => $request->validated('name'),
            'is_active' => $request->boolean('is_active'),
            'definition' => $request->validated('definition'),
            'last_activated_at' => ! $wasActive && $request->boolean('is_active')
                ? now()
                : $automation->last_activated_at,
        ]);

        return redirect()->back()->with(
            'success',
            $automation->is_active
                ? 'Automação ativa e pronta para agir.'
                : 'Rascunho salvo.',
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function automationPayload(WhatsappAutomation $automation): array
    {
        return [
            'id' => $automation->id,
            'name' => $automation->name,
            'is_active' => $automation->is_active,
            'definition' => $automation->definition,
            'last_activated_at' => $automation->last_activated_at?->toISOString(),
            'updated_at' => $automation->updated_at?->toISOString(),
        ];
    }
}
