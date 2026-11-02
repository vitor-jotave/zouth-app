import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = readFileSync(
    new URL('../resources/js/lib/product-variant-drafts.ts', import.meta.url),
    'utf8',
);
const exports = {};
runInNewContext(
    ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    { exports },
);
const { rememberVariantDrafts, variationDraftKey } = exports;
const original = {
    variation_key: { Cor: 'Verde', Tamanho: 'P' },
    quantity: 12,
    price: '45,90',
    sku_variant: 'VERDE-P',
};

test('temporarily removing all options retains their quantity, price and SKU drafts', () => {
    const memory = rememberVariantDrafts([], [original]);
    const withoutOptions = rememberVariantDrafts(memory, []);
    assert.equal(withoutOptions.length, 1);
    assert.equal(withoutOptions[0].quantity, 12);
    assert.equal(withoutOptions[0].price, '45,90');
    assert.equal(withoutOptions[0].sku_variant, 'VERDE-P');
});

test('latest visible edits replace cached values and key order does not duplicate combinations', () => {
    const changed = {
        ...original,
        variation_key: { Tamanho: 'P', Cor: 'Verde' },
        quantity: 7,
        price: '50',
        sku_variant: 'NEW',
    };
    const memory = rememberVariantDrafts([original], [changed]);
    assert.equal(memory.length, 1);
    assert.equal(memory[0].quantity, 7);
    assert.equal(memory[0].sku_variant, 'NEW');
    assert.equal(
        variationDraftKey(original.variation_key),
        variationDraftKey(changed.variation_key),
    );
});

test('different dimensional combinations are retained separately without transferring stock', () => {
    const single = {
        ...original,
        variation_key: { Cor: 'Verde' },
        quantity: 0,
    };
    const memory = rememberVariantDrafts([original], [single]);
    assert.equal(memory.length, 2);
    assert.equal(memory[0].quantity, 12);
    assert.equal(memory[1].quantity, 0);
    single.variation_key.Cor = 'Azul';
    assert.equal(memory[1].variation_key.Cor, 'Verde');
});
