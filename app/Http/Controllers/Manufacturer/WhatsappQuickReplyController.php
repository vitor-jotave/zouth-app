<?php

namespace App\Http\Controllers\Manufacturer;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreWhatsappQuickReplyRequest;
use App\Http\Requests\UpdateWhatsappQuickReplyRequest;
use App\Models\WhatsappQuickReply;
use App\Services\TenantManager;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class WhatsappQuickReplyController extends Controller
{
    public function __construct(private TenantManager $tenantManager) {}

    public function index(): Response
    {
        $manufacturer = $this->tenantManager->get();

        return Inertia::render('manufacturer/atendimento/mensagens-rapidas/index', [
            'quick_replies' => WhatsappQuickReply::query()
                ->where('manufacturer_id', $manufacturer->id)
                ->orderByDesc('is_active')
                ->orderBy('shortcut')
                ->get()
                ->map(fn (WhatsappQuickReply $quickReply) => $this->quickReplyPayload($quickReply))
                ->values(),
        ]);
    }

    public function store(StoreWhatsappQuickReplyRequest $request): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();

        WhatsappQuickReply::create([
            'manufacturer_id' => $manufacturer->id,
            'shortcut' => $request->validated('shortcut'),
            'title' => $request->validated('title'),
            'body' => $request->validated('body'),
            'is_active' => $request->boolean('is_active', true),
        ]);

        return redirect()->back()->with('success', 'Mensagem rápida criada.');
    }

    public function update(
        UpdateWhatsappQuickReplyRequest $request,
        WhatsappQuickReply $quickReply,
    ): RedirectResponse {
        $quickReply->update($request->validated());

        return redirect()->back()->with('success', 'Mensagem rápida atualizada.');
    }

    public function destroy(WhatsappQuickReply $quickReply): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();

        abort_unless($quickReply->manufacturer_id === $manufacturer->id, 403);

        $quickReply->delete();

        return redirect()->back()->with('success', 'Mensagem rápida excluída.');
    }

    /**
     * @return array<string, mixed>
     */
    private function quickReplyPayload(WhatsappQuickReply $quickReply): array
    {
        return [
            'id' => $quickReply->id,
            'shortcut' => $quickReply->shortcut,
            'title' => $quickReply->title,
            'body' => $quickReply->body,
            'is_active' => $quickReply->is_active,
            'updated_at' => $quickReply->updated_at?->toISOString(),
        ];
    }
}
