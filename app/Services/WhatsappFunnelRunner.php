<?php

namespace App\Services;

use App\Jobs\ProcessWhatsappFunnelStep;
use App\Models\WhatsappConversation;
use App\Models\WhatsappFunnel;
use App\Models\WhatsappFunnelRun;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WhatsappFunnelRunner
{
    public function start(WhatsappConversation $conversation, WhatsappFunnel $funnel): WhatsappFunnelRun
    {
        return DB::transaction(function () use ($conversation, $funnel): WhatsappFunnelRun {
            $conversation = WhatsappConversation::query()->lockForUpdate()->findOrFail($conversation->id);
            $conversation->load('instance');
            $funnel = WhatsappFunnel::query()->lockForUpdate()->findOrFail($funnel->id);

            if ($conversation->instance->manufacturer_id !== $funnel->manufacturer_id || ! $funnel->is_active) {
                throw ValidationException::withMessages(['funnel' => 'Este funil não está disponível.']);
            }

            if (! $conversation->instance->isConnected()) {
                throw ValidationException::withMessages(['funnel' => 'Conecte o WhatsApp antes de enviar um funil.']);
            }

            $existing = WhatsappFunnelRun::query()
                ->where('whatsapp_conversation_id', $conversation->id)
                ->whereIn('status', ['pending', 'running'])
                ->oldest('id')->first();

            if ($existing) {
                return $existing;
            }

            $funnel->load('steps');

            if ($funnel->steps->isEmpty()) {
                throw ValidationException::withMessages(['funnel' => 'Adicione pelo menos uma etapa ao funil.']);
            }

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

            ProcessWhatsappFunnelStep::dispatch($run->steps()->orderBy('sort_order')->firstOrFail())->afterCommit();

            return $run;
        });
    }
}
