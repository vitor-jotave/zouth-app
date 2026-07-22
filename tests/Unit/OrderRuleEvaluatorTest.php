<?php

use App\Services\OrderRuleEvaluator;

function evaluatorRule(array $overrides = []): array
{
    return array_replace([
        'id' => 1,
        'name' => 'Regra de teste',
        'is_active' => true,
        'match_mode' => 'all',
        'conditions' => [[
            'metric' => 'subtotal_cents',
            'operator' => 'gte',
            'value' => 10000,
            'max_value' => null,
            'scope_type' => null,
            'scope_ids' => [],
        ]],
        'action' => [
            'type' => 'percentage_discount',
            'value' => 500,
        ],
        'public_message' => 'Regra aplicada.',
    ], $overrides);
}

function evaluatorItems(): array
{
    return [
        [
            'product_id' => 10,
            'product_category_id' => 100,
            'quantity' => 2,
            'unit_price_cents' => 5000,
        ],
        [
            'product_id' => 20,
            'product_category_id' => 200,
            'quantity' => 3,
            'unit_price_cents' => 10000,
        ],
    ];
}

it('evaluates all and any match modes with every supported operator', function () {
    $evaluator = new OrderRuleEvaluator;
    $rules = [
        evaluatorRule([
            'id' => 1,
            'match_mode' => 'all',
            'conditions' => [
                [
                    'metric' => 'subtotal_cents',
                    'operator' => 'gte',
                    'value' => 40000,
                    'max_value' => null,
                    'scope_type' => null,
                    'scope_ids' => [],
                ],
                [
                    'metric' => 'total_quantity',
                    'operator' => 'eq',
                    'value' => 5,
                    'max_value' => null,
                    'scope_type' => null,
                    'scope_ids' => [],
                ],
                [
                    'metric' => 'distinct_products',
                    'operator' => 'between',
                    'value' => 2,
                    'max_value' => 4,
                    'scope_type' => null,
                    'scope_ids' => [],
                ],
            ],
        ]),
        evaluatorRule([
            'id' => 2,
            'match_mode' => 'any',
            'conditions' => [
                [
                    'metric' => 'total_quantity',
                    'operator' => 'lte',
                    'value' => 2,
                    'max_value' => null,
                    'scope_type' => null,
                    'scope_ids' => [],
                ],
                [
                    'metric' => 'distinct_products',
                    'operator' => 'eq',
                    'value' => 2,
                    'max_value' => null,
                    'scope_type' => null,
                    'scope_ids' => [],
                ],
            ],
        ]),
    ];

    $result = $evaluator->evaluate($rules, evaluatorItems());

    expect($result['evaluations'])
        ->toHaveCount(2)
        ->and($result['evaluations'][0]['matched'])->toBeTrue()
        ->and($result['evaluations'][1]['matched'])->toBeTrue();
});

it('restricts subtotal and quantity conditions to products or categories', function () {
    $evaluator = new OrderRuleEvaluator;
    $rules = [
        evaluatorRule([
            'id' => 1,
            'conditions' => [[
                'metric' => 'subtotal_cents',
                'operator' => 'eq',
                'value' => 10000,
                'max_value' => null,
                'scope_type' => 'products',
                'scope_ids' => [10],
            ]],
        ]),
        evaluatorRule([
            'id' => 2,
            'conditions' => [[
                'metric' => 'total_quantity',
                'operator' => 'eq',
                'value' => 3,
                'max_value' => null,
                'scope_type' => 'categories',
                'scope_ids' => [200],
            ]],
        ]),
    ];

    $result = $evaluator->evaluate($rules, evaluatorItems());

    expect($result['evaluations'][0]['matched'])->toBeTrue()
        ->and($result['evaluations'][1]['matched'])->toBeTrue();
});

it('blocks when a blocking condition matches and ignores inactive rules', function () {
    $evaluator = new OrderRuleEvaluator;
    $rules = [
        evaluatorRule([
            'id' => 1,
            'action' => ['type' => 'block_checkout', 'value' => null],
            'conditions' => [[
                'metric' => 'subtotal_cents',
                'operator' => 'lte',
                'value' => 50000,
                'max_value' => null,
                'scope_type' => null,
                'scope_ids' => [],
            ]],
            'public_message' => 'Pedido mínimo não atingido.',
        ]),
        evaluatorRule([
            'id' => 2,
            'is_active' => false,
            'action' => ['type' => 'block_checkout', 'value' => null],
        ]),
    ];

    $result = $evaluator->evaluate($rules, evaluatorItems());

    expect($result['is_blocked'])->toBeTrue()
        ->and($result['blocking_messages'])->toBe(['Pedido mínimo não atingido.'])
        ->and($result['evaluations'])->toHaveCount(1);
});

it('applies only the highest discount and breaks equal values by the oldest rule', function () {
    $evaluator = new OrderRuleEvaluator;
    $rules = [
        evaluatorRule([
            'id' => 30,
            'name' => 'Mais nova',
            'action' => ['type' => 'fixed_discount', 'value' => 5000],
        ]),
        evaluatorRule([
            'id' => 10,
            'name' => 'Mais antiga',
            'action' => ['type' => 'percentage_discount', 'value' => 1250],
        ]),
        evaluatorRule([
            'id' => 20,
            'name' => 'Benefício menor',
            'action' => ['type' => 'fixed_discount', 'value' => 3000],
        ]),
    ];

    $result = $evaluator->evaluate($rules, evaluatorItems());

    expect($result['subtotal_cents'])->toBe(40000)
        ->and($result['discount_cents'])->toBe(5000)
        ->and($result['total_cents'])->toBe(35000)
        ->and($result['applied_order_rules'])->toHaveCount(1)
        ->and($result['applied_order_rules'][0]['id'])->toBe(10)
        ->and($result['applied_order_rules'][0]['name'])->toBe('Mais antiga');
});

it('caps fixed discounts and excludes unpriced items from monetary conditions', function () {
    $evaluator = new OrderRuleEvaluator;
    $items = [
        [
            'product_id' => 10,
            'product_category_id' => null,
            'quantity' => 2,
            'unit_price_cents' => 5000,
        ],
        [
            'product_id' => 20,
            'product_category_id' => null,
            'quantity' => 20,
            'unit_price_cents' => null,
        ],
    ];
    $rules = [
        evaluatorRule([
            'action' => ['type' => 'fixed_discount', 'value' => 999999],
            'conditions' => [[
                'metric' => 'subtotal_cents',
                'operator' => 'eq',
                'value' => 10000,
                'max_value' => null,
                'scope_type' => null,
                'scope_ids' => [],
            ]],
        ]),
    ];

    $result = $evaluator->evaluate($rules, $items);

    expect($result['subtotal_cents'])->toBe(10000)
        ->and($result['discount_cents'])->toBe(10000)
        ->and($result['total_cents'])->toBe(0);
});
