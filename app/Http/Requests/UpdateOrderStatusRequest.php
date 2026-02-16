<?php

namespace App\Http\Requests;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateOrderStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        $order = $this->route('order');

        return $order instanceof Order && $this->user()?->can('updateStatus', $order);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(OrderStatus::class)],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            /** @var Order $order */
            $order = $this->route('order');
            $newStatus = OrderStatus::from($this->status);

            if (! $order->status->canTransitionTo($newStatus)) {
                $validator->errors()->add(
                    'status',
                    "Nao e possivel mudar de \"{$order->status->label()}\" para \"{$newStatus->label()}\"."
                );
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'status.required' => 'O status e obrigatorio.',
            'status.enum' => 'Status invalido.',
        ];
    }
}
