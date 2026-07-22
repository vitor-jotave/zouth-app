<?php

namespace App\Http\Requests;

use App\Models\OrderRule;

class UpdateOrderRuleRequest extends StoreOrderRuleRequest
{
    public function authorize(): bool
    {
        $orderRule = $this->route('orderRule');

        return $orderRule instanceof OrderRule
            && ($this->user()?->can('update', $orderRule) ?? false);
    }
}
