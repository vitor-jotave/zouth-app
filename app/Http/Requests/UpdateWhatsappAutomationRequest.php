<?php

namespace App\Http\Requests;

use App\Models\WhatsappAutomation;
use App\Models\WhatsappFunnel;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWhatsappAutomationRequest extends FormRequest
{
    public function authorize(): bool
    {
        $automation = $this->route('automation');

        return $this->user()->isManufacturerUser()
            && $automation instanceof WhatsappAutomation
            && $automation->manufacturer_id === $this->user()->current_manufacturer_id;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'is_active' => ['required', 'boolean'],
            'definition' => ['required', 'array'],
            'definition.nodes' => ['required', 'array', 'min:1', 'max:80'],
            'definition.nodes.*.id' => ['required', 'string', 'max:80'],
            'definition.nodes.*.kind' => ['required', Rule::in(['trigger', 'condition', 'action'])],
            'definition.nodes.*.movement' => ['required', Rule::in([
                'message_received',
                'client_replied',
                'message_contains',
                'send_funnel',
                'wait_reply',
            ])],
            'definition.nodes.*.position' => ['required', 'array'],
            'definition.nodes.*.position.x' => ['required', 'numeric', 'min:0', 'max:5000'],
            'definition.nodes.*.position.y' => ['required', 'numeric', 'min:0', 'max:5000'],
            'definition.nodes.*.data' => ['required', 'array'],
            'definition.nodes.*.data.title' => ['required', 'string', 'max:120'],
            'definition.nodes.*.data.summary' => ['nullable', 'string', 'max:255'],
            'definition.nodes.*.data.keywords' => ['nullable', 'array', 'max:20'],
            'definition.nodes.*.data.keywords.*' => ['required', 'string', 'max:60'],
            'definition.nodes.*.data.match' => ['nullable', Rule::in(['any', 'all'])],
            'definition.nodes.*.data.case_sensitive' => ['nullable', 'boolean'],
            'definition.nodes.*.data.funnel_id' => ['nullable', 'integer', 'exists:whatsapp_funnels,id'],
            'definition.edges' => ['required', 'array', 'max:120'],
            'definition.edges.*.id' => ['required', 'string', 'max:100'],
            'definition.edges.*.from' => ['required', 'string', 'max:80'],
            'definition.edges.*.to' => ['required', 'string', 'max:80'],
            'definition.edges.*.branch' => ['nullable', Rule::in(['sim', 'não'])],
        ];
    }

    public function messages(): array
    {
        return [
            'definition.nodes.min' => 'Inclua pelo menos um movimento no fluxo.',
            'definition.nodes.*.data.funnel_id.exists' => 'O funil escolhido não está disponível.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $nodes = collect($this->input('definition.nodes', []));
            $nodeIds = $nodes->pluck('id');

            foreach ($this->input('definition.edges', []) as $index => $edge) {
                if (! $nodeIds->contains($edge['from'] ?? null)
                    || ! $nodeIds->contains($edge['to'] ?? null)) {
                    $validator->errors()->add(
                        "definition.edges.{$index}",
                        'Uma ligação aponta para um movimento que não existe.',
                    );
                }
            }

            $funnelIds = $nodes
                ->where('movement', 'send_funnel')
                ->pluck('data.funnel_id')
                ->filter()
                ->unique();

            if ($funnelIds->isEmpty()) {
                return;
            }

            $availableCount = WhatsappFunnel::query()
                ->where('manufacturer_id', $this->user()->current_manufacturer_id)
                ->whereIn('id', $funnelIds)
                ->count();

            if ($availableCount !== $funnelIds->count()) {
                $validator->errors()->add(
                    'definition.nodes',
                    'Um dos funis escolhidos não pertence a este fabricante.',
                );
            }
        });
    }
}
