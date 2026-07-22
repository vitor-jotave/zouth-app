<?php

namespace App\Http\Requests;

use App\Models\OrderRule;
use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreOrderRuleRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', OrderRule::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'is_active' => ['required', 'boolean'],
            'match_mode' => ['required', Rule::in(['all', 'any'])],
            'conditions' => ['required', 'array', 'min:1', 'max:10'],
            'conditions.*.metric' => [
                'required',
                Rule::in(['subtotal_cents', 'total_quantity', 'distinct_products']),
            ],
            'conditions.*.operator' => [
                'required',
                Rule::in(['gte', 'lte', 'eq', 'between']),
            ],
            'conditions.*.value' => ['required', 'integer', 'min:1'],
            'conditions.*.max_value' => ['nullable', 'integer', 'min:1'],
            'conditions.*.scope_type' => ['nullable', Rule::in(['products', 'categories'])],
            'conditions.*.scope_ids' => ['present', 'array'],
            'conditions.*.scope_ids.*' => ['integer', 'distinct', 'min:1'],
            'action' => ['required', 'array'],
            'action.type' => [
                'required',
                Rule::in(['block_checkout', 'percentage_discount', 'fixed_discount']),
            ],
            'action.value' => ['nullable', 'integer', 'min:1'],
            'public_message' => ['nullable', 'string', 'max:240'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $conditions = collect($this->input('conditions', []))
            ->map(function (mixed $condition): mixed {
                if (! is_array($condition)) {
                    return $condition;
                }

                $condition['scope_type'] = filled($condition['scope_type'] ?? null)
                    ? $condition['scope_type']
                    : null;
                $condition['scope_ids'] = is_array($condition['scope_ids'] ?? null)
                    ? array_values($condition['scope_ids'])
                    : [];
                $condition['max_value'] = filled($condition['max_value'] ?? null)
                    ? $condition['max_value']
                    : null;

                return $condition;
            })
            ->all();

        $this->merge([
            'conditions' => $conditions,
            'description' => filled($this->input('description')) ? $this->input('description') : null,
            'public_message' => filled($this->input('public_message')) ? $this->input('public_message') : null,
        ]);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $conditions = $this->input('conditions', []);

            foreach ($conditions as $index => $condition) {
                $operator = $condition['operator'];
                $value = (int) $condition['value'];
                $maxValue = $condition['max_value'] ?? null;
                $metric = $condition['metric'];
                $scopeType = $condition['scope_type'] ?? null;
                $scopeIds = $condition['scope_ids'] ?? [];

                if ($operator === 'between' && (! is_numeric($maxValue) || (int) $maxValue <= $value)) {
                    $validator->errors()->add(
                        "conditions.{$index}.max_value",
                        'O fim do intervalo precisa ser maior que o início.',
                    );
                }

                if ($scopeType && $scopeIds === []) {
                    $validator->errors()->add(
                        "conditions.{$index}.scope_ids",
                        'Escolha ao menos um produto ou uma categoria.',
                    );
                }

                if ($scopeType && $metric === 'distinct_products') {
                    $validator->errors()->add(
                        "conditions.{$index}.scope_type",
                        'Variedade mínima não aceita recorte por produto ou categoria.',
                    );
                }

                if ($scopeType) {
                    $this->validateScopeOwnership($validator, $index, $scopeType, $scopeIds);
                }
            }

            $action = $this->input('action', []);
            $actionType = $action['type'] ?? null;
            $actionValue = $action['value'] ?? null;

            if ($actionType !== 'block_checkout' && (! is_numeric($actionValue) || (int) $actionValue < 1)) {
                $validator->errors()->add('action.value', 'Informe o valor do desconto.');
            }

            if ($actionType === 'percentage_discount' && (int) $actionValue > 10000) {
                $validator->errors()->add('action.value', 'O desconto percentual não pode passar de 100%.');
            }
        });
    }

    /**
     * @param  array<int, int|string>  $scopeIds
     */
    private function validateScopeOwnership(
        Validator $validator,
        int $index,
        string $scopeType,
        array $scopeIds,
    ): void {
        $manufacturerId = $this->user()?->current_manufacturer_id;

        if (! $manufacturerId) {
            $validator->errors()->add('conditions', 'Fabricante não identificado.');

            return;
        }

        $query = $scopeType === 'products'
            ? Product::query()
            : ProductCategory::query();
        $validCount = $query
            ->where('manufacturer_id', $manufacturerId)
            ->whereKey($scopeIds)
            ->count();

        if ($validCount !== count(array_unique($scopeIds))) {
            $validator->errors()->add(
                "conditions.{$index}.scope_ids",
                'A seleção contém itens de outro fabricante ou que não existem.',
            );
        }
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Dê um nome para a regra.',
            'match_mode.in' => 'Escolha se todas ou qualquer condição deve ser atendida.',
            'conditions.required' => 'Adicione ao menos uma condição.',
            'conditions.min' => 'Adicione ao menos uma condição.',
            'conditions.*.metric.in' => 'Escolha uma medida válida para o carrinho.',
            'conditions.*.operator.in' => 'Escolha uma comparação válida.',
            'conditions.*.value.required' => 'Informe o valor da condição.',
            'conditions.*.value.min' => 'O valor da condição precisa ser maior que zero.',
            'action.type.in' => 'Escolha uma consequência válida.',
            'public_message.max' => 'A mensagem para o lojista pode ter até 240 caracteres.',
        ];
    }
}
