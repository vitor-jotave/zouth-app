<?php

namespace App\Http\Controllers\Manufacturer;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreWhatsappFunnelRequest;
use App\Http\Requests\UpdateWhatsappFunnelRequest;
use App\Jobs\ProcessWhatsappFunnelStep;
use App\Models\Product;
use App\Models\WhatsappConversation;
use App\Models\WhatsappFunnel;
use App\Models\WhatsappFunnelRun;
use App\Services\TenantManager;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class WhatsappFunnelController extends Controller
{
    public function __construct(private TenantManager $tenantManager) {}

    public function index(): Response
    {
        $manufacturer = $this->tenantManager->get();

        $funnels = WhatsappFunnel::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->withCount('steps')
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(15);

        return Inertia::render('manufacturer/atendimento/funis/index', [
            'funnels' => $funnels->through(fn (WhatsappFunnel $funnel) => $this->funnelPayload($funnel)),
        ]);
    }

    public function store(StoreWhatsappFunnelRequest $request): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();

        $funnel = DB::transaction(function () use ($request, $manufacturer) {
            $nextSortOrder = ((int) WhatsappFunnel::where('manufacturer_id', $manufacturer->id)->max('sort_order')) + 1;

            $funnel = WhatsappFunnel::create([
                'manufacturer_id' => $manufacturer->id,
                'name' => $request->validated('name'),
                'code' => strtoupper($request->validated('code')),
                'is_active' => (bool) $request->boolean('is_active', true),
                'sort_order' => $nextSortOrder,
            ]);

            $this->storeSteps($funnel, $request);

            return $funnel;
        });

        return redirect()
            ->route('manufacturer.atendimento.funis.edit', $funnel)
            ->with('success', 'Funil criado com sucesso.');
    }

    public function edit(Request $request, WhatsappFunnel $funnel): Response
    {
        $this->ensureOwnFunnel($request, $funnel);

        $manufacturer = $this->tenantManager->get();
        $funnel->load('steps');

        $products = Product::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'sku', 'price_cents']);

        return Inertia::render('manufacturer/atendimento/funis/edit', [
            'funnel' => $this->funnelPayload($funnel, true),
            'products' => $products,
        ]);
    }

    public function update(UpdateWhatsappFunnelRequest $request, WhatsappFunnel $funnel): RedirectResponse
    {
        $this->ensureOwnFunnel($request, $funnel);

        DB::transaction(function () use ($request, $funnel) {
            $funnel->update([
                'name' => $request->validated('name'),
                'code' => strtoupper($request->validated('code')),
                'is_active' => (bool) $request->boolean('is_active', true),
            ]);

            $funnel->steps()->delete();
            $this->storeSteps($funnel, $request);
        });

        return redirect()->back()->with('success', 'Funil atualizado com sucesso.');
    }

    public function toggle(Request $request, WhatsappFunnel $funnel): RedirectResponse
    {
        $this->ensureOwnFunnel($request, $funnel);

        $funnel->update(['is_active' => ! $funnel->is_active]);

        return redirect()->back()->with('success', 'Status do funil atualizado.');
    }

    public function order(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'funnels' => ['required', 'array'],
            'funnels.*.id' => ['required', 'integer', 'exists:whatsapp_funnels,id'],
            'funnels.*.sort_order' => ['required', 'integer', 'min:0'],
        ]);

        $manufacturer = $this->tenantManager->get();

        foreach ($validated['funnels'] as $item) {
            WhatsappFunnel::where('manufacturer_id', $manufacturer->id)
                ->where('id', $item['id'])
                ->update(['sort_order' => $item['sort_order']]);
        }

        return redirect()->back()->with('success', 'Ordem dos funis atualizada.');
    }

    public function startRun(Request $request, WhatsappConversation $conversation, WhatsappFunnel $funnel): JsonResponse
    {
        $this->authorize('sendMessage', $conversation);
        $this->ensureOwnFunnel($request, $funnel, notFound: true);

        $funnel->load('steps');

        $run = DB::transaction(function () use ($conversation, $funnel) {
            $run = WhatsappFunnelRun::create([
                'whatsapp_funnel_id' => $funnel->id,
                'whatsapp_conversation_id' => $conversation->id,
                'status' => 'pending',
            ]);

            foreach ($funnel->steps as $step) {
                $run->steps()->create([
                    'whatsapp_funnel_step_id' => $step->id,
                    'type' => $step->type,
                    'sort_order' => $step->sort_order,
                    'payload' => $step->payload,
                    'status' => 'pending',
                ]);
            }

            return $run;
        });

        $firstStep = $run->steps()->orderBy('sort_order')->first();

        if ($firstStep) {
            ProcessWhatsappFunnelStep::dispatch($firstStep);
        } else {
            $run->update(['status' => 'completed', 'completed_at' => now()]);
        }

        return response()->json(['run' => $this->runPayload($run->refresh())]);
    }

    public function showRun(Request $request, WhatsappFunnelRun $run): JsonResponse
    {
        $run->load('conversation.instance', 'steps.message', 'funnel');
        $this->authorize('sendMessage', $run->conversation);

        return response()->json(['run' => $this->runPayload($run)]);
    }

    private function ensureOwnFunnel(Request $request, WhatsappFunnel $funnel, bool $notFound = false): void
    {
        if ($funnel->manufacturer_id === $request->user()->current_manufacturer_id) {
            return;
        }

        if ($notFound) {
            abort(404);
        }

        abort(403);
    }

    private function storeSteps(WhatsappFunnel $funnel, StoreWhatsappFunnelRequest $request): void
    {
        foreach ($request->validated('steps') as $index => $step) {
            $payload = $this->stepPayload($request, $step, $index);

            $funnel->steps()->create([
                'type' => $step['type'],
                'sort_order' => $index + 1,
                'payload' => $payload,
            ]);
        }
    }

    /**
     * @param  array<string, mixed>  $step
     * @return array<string, mixed>
     */
    private function stepPayload(StoreWhatsappFunnelRequest $request, array $step, int $index): array
    {
        return match ($step['type']) {
            'wait' => ['seconds' => (int) $step['seconds']],
            'text' => ['body' => $step['body']],
            'audio' => $this->audioPayload($request, $step, $index),
            'product' => [
                'product_id' => (int) $step['product_id'],
                'include_photo' => (bool) ($step['include_photo'] ?? false),
                'include_price' => (bool) ($step['include_price'] ?? false),
                'include_description' => (bool) ($step['include_description'] ?? false),
                'include_sku' => (bool) ($step['include_sku'] ?? false),
            ],
        };
    }

    /**
     * @param  array<string, mixed>  $step
     * @return array<string, mixed>
     */
    private function audioPayload(StoreWhatsappFunnelRequest $request, array $step, int $index): array
    {
        $file = $request->file("steps.{$index}.audio_file");

        if ($file) {
            return [
                'media_path' => $file->store('whatsapp-funnels/audio', 's3'),
                'file_name' => $file->getClientOriginalName(),
                'mimetype' => $file->getMimeType() ?: 'audio/mpeg',
            ];
        }

        return [
            'media_path' => $step['media_path'],
            'file_name' => $step['file_name'] ?? basename((string) $step['media_path']),
            'mimetype' => $step['mimetype'] ?? 'audio/mpeg',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function funnelPayload(WhatsappFunnel $funnel, bool $withSteps = false): array
    {
        $payload = [
            'id' => $funnel->id,
            'name' => $funnel->name,
            'code' => $funnel->code,
            'is_active' => $funnel->is_active,
            'sort_order' => $funnel->sort_order,
            'steps_count' => (int) ($funnel->steps_count ?? $funnel->steps()->count()),
        ];

        if ($withSteps || $funnel->relationLoaded('steps')) {
            $payload['steps'] = $funnel->steps->map(fn ($step) => [
                'id' => $step->id,
                'type' => $step->type,
                'sort_order' => $step->sort_order,
                'payload' => $step->payload,
            ])->values()->all();
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    private function runPayload(WhatsappFunnelRun $run): array
    {
        $run->loadMissing('steps.message', 'funnel');

        return [
            'id' => $run->id,
            'status' => $run->status,
            'funnel' => [
                'id' => $run->funnel->id,
                'name' => $run->funnel->name,
                'code' => $run->funnel->code,
            ],
            'steps' => $run->steps->map(fn ($step) => [
                'id' => $step->id,
                'type' => $step->type,
                'sort_order' => $step->sort_order,
                'status' => $step->status,
                'payload' => $step->payload,
                'message_id' => $step->whatsapp_message_id,
                'error_message' => $step->error_message,
            ])->values()->all(),
        ];
    }
}
