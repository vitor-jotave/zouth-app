import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
const source = readFileSync(
    new URL('../resources/js/lib/catalog-selection.ts', import.meta.url),
    'utf8',
);
runInNewContext(
    ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
        },
    }).outputText,
    { exports },
);
const { parseCatalogSelection } = exports;
test('labels selections by distinct cart lines instead of counting the same piece twice', () => {
    assert.equal(exports.catalogSelectionCountLabel(1), '1 seleção');
    assert.equal(exports.catalogSelectionCountLabel(2), '2 seleções');
});
const { mergeRestoredCatalogSelection } = exports;
test('adds selections made during recovery without replacing saved quantities or fresh prices', () => {
    const restored = [{ key: '42:verde', quantity: 3, price: 1200, stock: 5 }];
    const additions = [
        { key: '42:verde', quantity: 4, price: 900, stock: 20 },
        { key: '77', quantity: 2, price: 800, stock: 10 },
    ];
    const result = mergeRestoredCatalogSelection(
        restored,
        additions,
        (item) => item.stock,
    );
    assert.equal(result[0].quantity, 5);
    assert.equal(result[0].price, 1200);
    assert.equal(result[1].key, '77');
    assert.equal(result[1].quantity, 2);
    assert.equal(restored[0].quantity, 3);
    assert.equal(additions[0].quantity, 4);
});
test('restores only product identifiers, quantities and chosen options, never stored prices', () => {
    const [item] = parseCatalogSelection(
        JSON.stringify([
            {
                product_id: 12,
                quantity: 3,
                selected_variations: { Cor: 'Verde' },
                price_cents: 1,
                product: { name: 'Untrusted' },
            },
        ]),
    );
    assert.equal(item.product_id, 12);
    assert.equal(item.selected_variations.Cor, 'Verde');
    assert.equal(item.price_cents, undefined);
    assert.equal(item.product, undefined);
});
test('ignores malformed storage, invalid quantities and invalid variation data', () => {
    for (const value of [
        null,
        '{',
        '{}',
        'null',
        JSON.stringify([{ product_id: 1, quantity: -1 }]),
        JSON.stringify([
            { product_id: 1, quantity: 1, selected_variations: { Cor: 2 } },
        ]),
    ]) {
        assert.equal(parseCatalogSelection(value).length, 0);
    }
});
test('bounds stored selections and strips unrecognized fields', () => {
    const values = Array.from({ length: 250 }, (_, index) => ({
        product_id: index + 1,
        quantity: 1,
    }));
    assert.equal(parseCatalogSelection(JSON.stringify(values)).length, 200);
});
