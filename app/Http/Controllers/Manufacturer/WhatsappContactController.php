<?php

declare(strict_types=1);

namespace App\Http\Controllers\Manufacturer;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreWhatsappContactLabelRequest;
use App\Http\Requests\UpdateWhatsappContactLabelRequest;
use App\Models\Order;
use App\Models\WhatsappContactLabel;
use App\Models\WhatsappConversation;
use App\Support\WhatsappContactPhone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class WhatsappContactController extends Controller
{
    public function index(Request $request): Response
    {
        $manufacturer = $request->user()->currentManufacturer;
        $search = mb_substr(trim($request->string('search')->toString()), 0, 100);
        $digits = preg_replace('/\D/', '', $search);
        $labelId = max(0, $request->integer('label'));
        $instance = $manufacturer->whatsappInstances()->first();

        $contacts = WhatsappConversation::query()->where('whatsapp_instance_id', $instance?->id)
            ->where('is_group', false)
            ->when($search !== '', fn ($query) => $query->where(function ($query) use ($search, $digits): void {
                $query->whereLike('contact_name', "%{$search}%")->orWhereLike('contact_phone', "%{$search}%");
                if ($digits !== '' && ! preg_match('/\p{L}/u', $search)) {
                    $query->orWhereLike('contact_phone', "%{$digits}%")
                        ->orWhere(fn ($jid) => $jid->whereLike('remote_jid', "%{$digits}%@s.whatsapp.net")
                            ->orWhereLike('remote_jid', "%{$digits}%@c.us"));
                }
            }))
            ->when($labelId > 0, fn ($query) => $query->whereHas('contactLabels', fn ($labels) => $labels->whereKey($labelId)->where('manufacturer_id', $manufacturer->id)))
            ->with(['contactLabels' => fn ($labels) => $labels->where('manufacturer_id', $manufacturer->id)->orderBy('name')])
            ->orderByRaw('last_message_at IS NULL')->orderByDesc('last_message_at')->orderByDesc('id')
            ->paginate(24)->withQueryString()
            ->through(fn (WhatsappConversation $conversation): array => [
                'id' => $conversation->id,
                'name' => $conversation->displayName($instance?->profile_name, $manufacturer->name),
                'phone' => $conversation->contact_phone,
                'picture_url' => $conversation->contact_picture_url,
                'last_message_at' => $conversation->last_message_at?->toISOString(),
                'labels' => $conversation->contactLabels->map(fn (WhatsappContactLabel $label): array => $label->only(['id', 'name', 'color']))->values(),
            ]);

        return Inertia::render('manufacturer/atendimento/contatos/index', [
            'contacts' => $contacts,
            'contact_labels' => WhatsappContactLabel::query()->where('manufacturer_id', $manufacturer->id)->orderBy('name')->get(['id', 'name', 'color']),
            'filters' => ['search' => $search, 'label' => $labelId],
            'connected' => $instance?->isConnected() ?? false,
        ]);
    }

    public function storeLabel(StoreWhatsappContactLabelRequest $request): RedirectResponse
    {
        $name = $request->validated('name');
        $label = WhatsappContactLabel::query()->firstOrCreate([
            'manufacturer_id' => $request->user()->current_manufacturer_id,
            'name_key' => mb_strtolower($name),
        ], ['name' => $name, 'color' => strtolower($request->validated('color'))]);

        if (! $label->wasRecentlyCreated) {
            throw ValidationException::withMessages(['name' => 'Já existe uma etiqueta com esse nome.']);
        }

        return back();
    }

    public function updateLabel(UpdateWhatsappContactLabelRequest $request, WhatsappConversation $conversation, WhatsappContactLabel $label): RedirectResponse
    {
        $this->authorize('view', $conversation);
        abort_if($conversation->is_group || $label->manufacturer_id !== $request->user()->current_manufacturer_id, 404);

        if ($request->boolean('assigned')) {
            $conversation->getConnection()->transaction(function () use ($conversation, $label): void {
                WhatsappConversation::query()->whereKey($conversation->id)->lockForUpdate()->firstOrFail()
                    ->contactLabels()->syncWithoutDetaching([$label->id]);
            });
        } else {
            $conversation->contactLabels()->detach($label->id);
        }

        return back();
    }

    public function openOrder(Request $request, Order $order): RedirectResponse
    {
        $this->authorize('view', $order);
        $phone = WhatsappContactPhone::normalize($order->customer_phone);
        $instance = $request->user()->currentManufacturer->whatsappInstances()->first();

        if ($phone === null || ! $instance?->isConnected()) {
            throw ValidationException::withMessages([
                'atendimento' => $phone === null ? 'O pedido não tem um telefone válido para atendimento.' : 'Conecte um canal de WhatsApp para abrir a conversa.',
            ]);
        }

        $conversation = $instance->getConnection()->transaction(function () use ($instance, $order, $phone): WhatsappConversation {
            $current = $instance->newQuery()->whereKey($instance->id)->lockForUpdate()->firstOrFail();
            if (! $current->isConnected()) {
                throw ValidationException::withMessages(['atendimento' => 'O canal foi desconectado. Conecte o WhatsApp e tente novamente.']);
            }

            $jid = $phone.'@s.whatsapp.net';
            $candidate = $current->conversations()->where('remote_jid', $jid)->where('is_group', false)->first();
            if ($candidate) {
                return $candidate;
            }

            foreach ($current->conversations()->where('is_group', false)->lazyById() as $conversation) {
                [$number, $domain] = array_pad(explode('@', $conversation->remote_jid, 2), 2, '');
                if (in_array($domain, ['s.whatsapp.net', 'c.us'], true) && WhatsappContactPhone::normalize($number) === $phone) {
                    return $conversation;
                }

                if ($conversation->contact_phone !== $number && WhatsappContactPhone::normalize($conversation->contact_phone) === $phone) {
                    return $conversation;
                }
            }

            return $current->conversations()->firstOrCreate(['remote_jid' => $jid], [
                'is_group' => false,
                'contact_name' => $order->customer_name,
                'contact_phone' => $phone,
            ]);
        });

        return to_route('manufacturer.atendimento.index', ['conversation' => $conversation->id]);
    }
}
