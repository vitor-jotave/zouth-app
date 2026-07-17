<?php

namespace App\Http\Requests;

use App\Models\WhatsappFunnel;
use Illuminate\Validation\Rule;

class UpdateWhatsappFunnelRequest extends StoreWhatsappFunnelRequest
{
    public function authorize(): bool
    {
        $funnel = $this->route('funnel');

        return parent::authorize()
            && $funnel instanceof WhatsappFunnel
            && $funnel->manufacturer_id === $this->user()->current_manufacturer_id;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $rules = parent::rules();
        $funnel = $this->route('funnel');

        $rules['code'] = [
            'required',
            'string',
            'max:50',
            'regex:/^[A-Z0-9_-]+$/',
            Rule::unique('whatsapp_funnels', 'code')
                ->where('manufacturer_id', $this->user()->current_manufacturer_id)
                ->ignore($funnel?->id),
        ];

        return $rules;
    }

    protected function acceptsExistingAudioPath(string $mediaPath): bool
    {
        $funnel = $this->route('funnel');

        if (! $funnel instanceof WhatsappFunnel) {
            return false;
        }

        return $funnel->steps()
            ->where('type', 'audio')
            ->where('payload->media_path', $mediaPath)
            ->exists();
    }
}
