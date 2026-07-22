<?php

namespace App\Services;

use App\Jobs\ProcessWhatsappFunnelStep;
use App\Models\WhatsappAutomation;
use App\Models\WhatsappConversation;
use App\Models\WhatsappFunnel;
use App\Models\WhatsappFunnelRun;
use App\Models\WhatsappMessage;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WhatsappAutomationRunner
{
    public function runForIncomingMessage(WhatsappMessage $message): void
    {
        if ($message->from_me) {
            return;
        }

        $message->loadMissing('conversation.instance');
        $conversation = $message->conversation;
        $manufacturerId = $conversation?->instance?->manufacturer_id;

        if (! $conversation || ! $manufacturerId) {
            return;
        }

        WhatsappAutomation::query()
            ->where('manufacturer_id', $manufacturerId)
            ->where('is_active', true)
            ->each(fn (WhatsappAutomation $automation) => $this->run(
                $automation,
                $conversation,
                $message,
            ));
    }

    private function run(
        WhatsappAutomation $automation,
        WhatsappConversation $conversation,
        WhatsappMessage $message,
    ): void {
        $definition = $automation->definition;
        $nodes = collect(Arr::get($definition, 'nodes', []))->keyBy('id');
        $edges = collect(Arr::get($definition, 'edges', []));
        $current = $nodes->first(fn (array $node) => ($node['kind'] ?? null) === 'trigger'
            && in_array($node['movement'] ?? null, ['message_received', 'client_replied'], true));
        $visited = [];

        while ($current && count($visited) < 80) {
            $nodeId = (string) ($current['id'] ?? '');

            if ($nodeId === '' || in_array($nodeId, $visited, true)) {
                return;
            }

            $visited[] = $nodeId;
            $branch = null;

            if (($current['kind'] ?? null) === 'condition') {
                $branch = $this->conditionMatches($current, $message) ? 'sim' : 'não';
            }

            if (($current['kind'] ?? null) === 'action') {
                if (($current['movement'] ?? null) === 'send_funnel') {
                    $this->startFunnel(
                        $automation,
                        $conversation,
                        (int) data_get($current, 'data.funnel_id'),
                    );
                }

                if (($current['movement'] ?? null) === 'wait_reply') {
                    return;
                }
            }

            $nextEdge = $edges->first(fn (array $edge) => ($edge['from'] ?? null) === $nodeId
                && ($branch === null || ($edge['branch'] ?? null) === $branch));
            $current = $nextEdge
                ? $nodes->get($nextEdge['to'] ?? '')
                : null;
        }
    }

    /**
     * @param  array<string, mixed>  $node
     */
    private function conditionMatches(array $node, WhatsappMessage $message): bool
    {
        if (($node['movement'] ?? null) !== 'message_contains') {
            return false;
        }

        $keywords = collect(data_get($node, 'data.keywords', []))
            ->filter(fn ($keyword) => is_string($keyword) && $keyword !== '')
            ->values();

        if ($keywords->isEmpty() || blank($message->body)) {
            return false;
        }

        $caseSensitive = (bool) data_get($node, 'data.case_sensitive', false);
        $normalize = fn (string $value) => $caseSensitive
            ? Str::ascii($value)
            : Str::lower(Str::ascii($value));
        $body = $normalize((string) $message->body);
        $matches = $keywords->map(fn (string $keyword) => Str::contains(
            $body,
            $normalize($keyword),
        ));

        return data_get($node, 'data.match', 'any') === 'all'
            ? $matches->every()
            : $matches->contains(true);
    }

    private function startFunnel(
        WhatsappAutomation $automation,
        WhatsappConversation $conversation,
        int $funnelId,
    ): void {
        if ($funnelId === 0) {
            return;
        }

        $funnel = WhatsappFunnel::query()
            ->where('manufacturer_id', $automation->manufacturer_id)
            ->where('is_active', true)
            ->with('steps')
            ->find($funnelId);

        if (! $funnel) {
            return;
        }

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

            return;
        }

        $run->update(['status' => 'completed', 'completed_at' => now()]);
    }
}
