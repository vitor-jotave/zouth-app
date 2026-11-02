import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
function load(name) {
    const exports = {};
    runInNewContext(
        ts.transpileModule(
            readFileSync(
                new URL(`../resources/js/lib/${name}.ts`, import.meta.url),
                'utf8',
            ),
            {
                compilerOptions: {
                    module: ts.ModuleKind.CommonJS,
                    target: ts.ScriptTarget.ES2022,
                },
            },
        ).outputText,
        { exports },
    );
    return exports;
}
const { automaticRuleMessage, isAutomaticRuleMessage } = load(
    'order-rule-messages',
);
const { buildRuleSimulation, orderRuleSimulationIssue } = load(
    'order-rule-simulation',
);
const { evaluateOrderRules } = load('order-rules');
test('automatic copy always follows percentage and fixed discounts without rewriting custom prose', () => {
    assert.match(
        automaticRuleMessage({ type: 'percentage_discount', value: 1050 }),
        /10,5%/,
    );
    assert.match(
        automaticRuleMessage({ type: 'fixed_discount', value: 15000 }),
        /150,00/,
    );
    assert.equal(
        isAutomaticRuleMessage('Você liberou 5% de desconto neste pedido.'),
        true,
    );
    assert.equal(
        isAutomaticRuleMessage('Converse com nossa equipe sobre sua condição.'),
        false,
    );
    assert.equal(
        isAutomaticRuleMessage(
            'Você liberou 5% de desconto neste pedido.',
            'custom',
        ),
        false,
    );
});
test('simulation evaluates actual product and category identifiers rather than generated IDs', () => {
    const products = [
        { id: 42, product_category_id: 9, price_cents: 1000 },
        { id: 77, product_category_id: 20, price_cents: null },
    ];
    const items = buildRuleSimulation(products, {
        42: { quantity: 5, unit_price_cents: 1000 },
        77: { quantity: 50, unit_price_cents: null },
        999: { quantity: 3, unit_price_cents: 999999 },
    });
    assert.equal(items.length, 2);
    const rule = {
        id: 1,
        is_active: true,
        match_mode: 'all',
        conditions: [
            {
                metric: 'subtotal_cents',
                operator: 'gte',
                value: 5000,
                max_value: null,
                scope_type: 'products',
                scope_ids: [42],
            },
        ],
        action: { type: 'percentage_discount', value: 500 },
    };
    assert.equal(evaluateOrderRules([rule], items).discount_cents, 250);
    rule.conditions = [
        {
            metric: 'total_quantity',
            operator: 'gte',
            value: 6,
            max_value: null,
            scope_type: 'categories',
            scope_ids: [9],
        },
    ];
    assert.equal(evaluateOrderRules([rule], items).discount_cents, 0);
    items[0].quantity = 6;
    assert.equal(evaluateOrderRules([rule], items).discount_cents, 300);
});
test('unpriced pieces count as volume without inflating monetary totals', () => {
    const items = buildRuleSimulation(
        [{ id: 12, product_category_id: 9, price_cents: null }],
        { 12: { quantity: 30, unit_price_cents: null } },
    );
    assert.equal(evaluateOrderRules([], items).subtotal_cents, 0);
    assert.equal(items[0].quantity, 30);
});

test('combo composition contributes actual pieces and categories to volume conditions', () => {
    const items = buildRuleSimulation(
        [
            {
                id: 80,
                product_category_id: 7,
                price_cents: 5000,
                components: [
                    {
                        product_id: 42,
                        product_category_id: 9,
                        quantity_per_unit: 2,
                    },
                ],
            },
        ],
        { 80: { quantity: 3, unit_price_cents: 5000 } },
    );
    const rule = {
        id: 1,
        is_active: true,
        match_mode: 'all',
        conditions: [
            {
                metric: 'total_quantity',
                operator: 'gte',
                value: 6,
                max_value: null,
                scope_type: 'categories',
                scope_ids: [9],
            },
        ],
        action: { type: 'percentage_discount', value: 500 },
    };
    assert.equal(evaluateOrderRules([rule], items).discount_cents, 750);
});

test('incomplete scoped conditions cannot masquerade as global rules in the preview', () => {
    const condition = {
        metric: 'subtotal_cents',
        operator: 'gte',
        value: 1000,
        max_value: null,
        scope_type: 'products',
        scope_ids: [],
    };
    assert.match(
        orderRuleSimulationIssue([condition], {
            type: 'percentage_discount',
            value: 500,
        }),
        /recorte/,
    );
    condition.scope_ids = [42];
    assert.equal(
        orderRuleSimulationIssue([condition], {
            type: 'percentage_discount',
            value: 500,
        }),
        null,
    );
});
