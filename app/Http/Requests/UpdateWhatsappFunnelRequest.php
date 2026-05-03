<?php

namespace App\Http\Requests;

use Illuminate\Validation\Rule;

class UpdateWhatsappFunnelRequest extends StoreWhatsappFunnelRequest
{
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
}
