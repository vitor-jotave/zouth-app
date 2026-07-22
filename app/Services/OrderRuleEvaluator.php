<?php

namespace App\Services;

use App\Models\OrderRule;
use Illuminate\Support\Collection;

class OrderRuleEvaluator
{
    /**
     * @param  Collection<int, OrderRule>|array<int, OrderRule|array<string, mixed>>  $rules
     * @param  array<int, array{product_id: int, product_category_id: int|null, quantity: int, unit_price_cents: int|null}>  $items
     * @return array{subtotal_cents: int, discount_cents: int, total_cents: int, is_blocked: bool, blocking_messages: array<int, string>, applied_order_rules: array<int, array<string, mixed>>, evaluations: array<int, array<string, mixed>>}
     */
    public function evaluate(Collection|array $rules, array $items): array
    {
        $subtotalCents = (int) collect($items)->sum(
            fn (array $item): int => ($item['unit_price_cents'] ?? 0) * $item['quantity'],
        );
        $evaluations = [];
        $blockingMessages = [];
        $bestDiscount = null;

        $orderedRules = collect($rules)
            ->filter(fn (OrderRule|array $rule): bool => $this->isActive($rule))
            ->sortBy(fn (OrderRule|array $rule): int => $this->ruleId($rule))
            ->values();

        foreach ($orderedRules as $rule) {
            $conditions = $this->value($rule, 'conditions', []);
            $conditionResults = collect($conditions)
                ->map(fn (array $condition): array => [
                    'matched' => $this->conditionMatches($condition, $items),
                    'current_value' => $this->metricValue($condition, $items),
                ])
                ->all();
            $matchMode = $this->value($rule, 'match_mode', 'all');
            $matched = $matchMode === 'any'
                ? collect($conditionResults)->contains('matched', true)
                : collect($conditionResults)->every(fn (array $result): bool => $result['matched']);
            $action = $this->value($rule, 'action', []);
            $actionType = $action['type'] ?? null;
            $discountCents = 0;

            if ($matched && $actionType === 'percentage_discount') {
                $discountCents = min(
                    $subtotalCents,
                    (int) round($subtotalCents * ((int) ($action['value'] ?? 0) / 10000)),
                );
            }

            if ($matched && $actionType === 'fixed_discount') {
                $discountCents = min($subtotalCents, (int) ($action['value'] ?? 0));
            }

            $evaluation = [
                'rule_id' => $this->ruleId($rule),
                'name' => $this->value($rule, 'name', 'Regra de pedido'),
                'matched' => $matched,
                'condition_results' => $conditionResults,
                'action' => $action,
                'discount_cents' => $discountCents,
                'public_message' => $this->value($rule, 'public_message'),
            ];
            $evaluations[] = $evaluation;

            if ($matched && $actionType === 'block_checkout') {
                $blockingMessages[] = $this->value($rule, 'public_message')
                    ?: 'Este pedido ainda não atende aos limites do fabricante.';
            }

            if ($discountCents > 0 && ($bestDiscount === null || $discountCents > $bestDiscount['discount_cents'])) {
                $bestDiscount = [
                    'discount_cents' => $discountCents,
                    'rule' => $rule,
                ];
            }
        }

        $discountCents = $bestDiscount['discount_cents'] ?? 0;
        $appliedRules = $bestDiscount
            ? [$this->snapshot($bestDiscount['rule'], $discountCents)]
            : [];

        return [
            'subtotal_cents' => $subtotalCents,
            'discount_cents' => $discountCents,
            'total_cents' => max(0, $subtotalCents - $discountCents),
            'is_blocked' => $blockingMessages !== [],
            'blocking_messages' => array_values(array_unique($blockingMessages)),
            'applied_order_rules' => $appliedRules,
            'evaluations' => $evaluations,
        ];
    }

    /**
     * @param  array<string, mixed>  $condition
     * @param  array<int, array{product_id: int, product_category_id: int|null, quantity: int, unit_price_cents: int|null}>  $items
     */
    private function conditionMatches(array $condition, array $items): bool
    {
        $currentValue = $this->metricValue($condition, $items);
        $value = (int) ($condition['value'] ?? 0);

        return match ($condition['operator'] ?? null) {
            'gte' => $currentValue >= $value,
            'lte' => $currentValue <= $value,
            'eq' => $currentValue === $value,
            'between' => $currentValue >= $value
                && $currentValue <= (int) ($condition['max_value'] ?? $value),
            default => false,
        };
    }

    /**
     * @param  array<string, mixed>  $condition
     * @param  array<int, array{product_id: int, product_category_id: int|null, quantity: int, unit_price_cents: int|null}>  $items
     */
    private function metricValue(array $condition, array $items): int
    {
        $scopedItems = $this->scopedItems($condition, $items);

        return match ($condition['metric'] ?? null) {
            'subtotal_cents' => (int) collect($scopedItems)->sum(
                fn (array $item): int => ($item['unit_price_cents'] ?? 0) * $item['quantity'],
            ),
            'total_quantity' => (int) collect($scopedItems)->sum('quantity'),
            'distinct_products' => collect($scopedItems)->pluck('product_id')->unique()->count(),
            default => 0,
        };
    }

    /**
     * @param  array<string, mixed>  $condition
     * @param  array<int, array{product_id: int, product_category_id: int|null, quantity: int, unit_price_cents: int|null}>  $items
     * @return array<int, array{product_id: int, product_category_id: int|null, quantity: int, unit_price_cents: int|null}>
     */
    private function scopedItems(array $condition, array $items): array
    {
        $scopeType = $condition['scope_type'] ?? null;
        $scopeIds = array_map('intval', $condition['scope_ids'] ?? []);

        if (! $scopeType || $scopeIds === []) {
            return $items;
        }

        return array_values(array_filter(
            $items,
            fn (array $item): bool => $scopeType === 'products'
                ? in_array($item['product_id'], $scopeIds, true)
                : in_array($item['product_category_id'], $scopeIds, true),
        ));
    }

    private function isActive(OrderRule|array $rule): bool
    {
        return $rule instanceof OrderRule
            ? $rule->is_active
            : (bool) ($rule['is_active'] ?? true);
    }

    private function ruleId(OrderRule|array $rule): int
    {
        return (int) ($rule instanceof OrderRule ? $rule->id : ($rule['id'] ?? 0));
    }

    private function value(OrderRule|array $rule, string $key, mixed $default = null): mixed
    {
        return $rule instanceof OrderRule
            ? ($rule->{$key} ?? $default)
            : ($rule[$key] ?? $default);
    }

    /**
     * @return array<string, mixed>
     */
    private function snapshot(OrderRule|array $rule, int $discountCents): array
    {
        return [
            'id' => $this->ruleId($rule),
            'name' => $this->value($rule, 'name', 'Regra de pedido'),
            'match_mode' => $this->value($rule, 'match_mode', 'all'),
            'conditions' => $this->value($rule, 'conditions', []),
            'action' => $this->value($rule, 'action', []),
            'public_message' => $this->value($rule, 'public_message'),
            'discount_cents' => $discountCents,
        ];
    }
}
