import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
const source = readFileSync(
    new URL('../resources/js/lib/catalog-preview-protocol.ts', import.meta.url),
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

const product = {
    id: 7,
    name: 'Macacão Verão',
    sku: 'VER-01',
    category_id: 2,
    product_type: 'product',
    allow_quote_when_out_of_stock: false,
    total_stock: 3,
    price_cents: 1200,
    variations: [
        {
            type_name: 'Cor',
            values: [
                { value: 'Azul', hex: '#00f' },
                { value: 'Verde', hex: '#0f0' },
            ],
        },
    ],
    variant_stocks: [
        { variation_key: { Cor: 'Azul' }, quantity: 3 },
        { variation_key: { Cor: 'Verde' }, quantity: 0 },
    ],
};
const filter = { search: '', category_id: null, variations: {} };
const types = [{ id: 5, name: 'Cor' }];

test('accepts only known preview messages, modes and editable sections', () => {
    const message = {
        type: 'zouth:catalog-preview:update',
        settings: {},
        mode: 'edit',
        selectedSection: 'hero',
    };
    assert.equal(exports.isCatalogPreviewUpdate(message), true);
    assert.equal(
        exports.isCatalogPreviewUpdate({
            ...message,
            mode: 'test',
            selectedSection: null,
        }),
        true,
    );
    for (const invalid of [
        null,
        [],
        {},
        { ...message, type: 'other' },
        { ...message, settings: null },
        { ...message, settings: [] },
        { ...message, mode: 'publish' },
        { ...message, selectedSection: 'script' },
    ]) {
        assert.equal(exports.isCatalogPreviewUpdate(invalid), false);
    }
});

test('preview cart follows a changed stock policy without losing valid selections', () => {
    const zeroStock = {
        ...product,
        id: 8,
        total_stock: 0,
        variations: [],
        variant_stocks: [],
    };
    const quote = { ...zeroStock, id: 9, allow_quote_when_out_of_stock: true };
    const lines = [
        {
            key: 'blue',
            product,
            quantity: 20,
            selected_variations: { Cor: 'Azul' },
            unit_price_cents: 1,
        },
        {
            key: 'green',
            product,
            quantity: 10,
            selected_variations: { Cor: 'Verde' },
        },
        { key: 'zero', product: zeroStock, quantity: 10 },
        { key: 'quote', product: quote, quantity: 15 },
    ];
    const products = [product, zeroStock, quote];
    const restricted = exports.reconcileCatalogPreviewCart(
        lines,
        products,
        false,
    );
    assert.equal(restricted.length, 2);
    assert.equal(restricted[0].key, 'blue');
    assert.equal(restricted[0].quantity, 3);
    assert.equal(restricted[0].unit_price_cents, 1200);
    assert.equal(restricted[1].key, 'quote');
    assert.equal(restricted[1].quantity, 15);
    assert.equal(lines[0].quantity, 20);
    assert.equal(
        exports.reconcileCatalogPreviewCart(lines, products, true).length,
        4,
    );
});

test('preview cart reconciles exact variant combinations and current option price', () => {
    const priced = {
        ...product,
        variant_stocks: [
            {
                variation_key: { Cor: 'Azul', Tamanho: 'P' },
                quantity: 2,
                price_cents: 1500,
            },
        ],
    };
    const lines = [
        {
            key: 'missing',
            product: priced,
            quantity: 2,
            selected_variations: { Cor: 'Azul' },
        },
        {
            key: 'correct',
            product: priced,
            quantity: 5,
            selected_variations: { Cor: 'Azul', Tamanho: 'P' },
        },
        { key: 'unknown', product: { ...priced, id: 999 }, quantity: 2 },
    ];
    const result = exports.reconcileCatalogPreviewCart(lines, [priced], false);
    assert.equal(result.length, 1);
    assert.equal(result[0].key, 'correct');
    assert.equal(result[0].quantity, 2);
    assert.equal(result[0].unit_price_cents, 1500);
});

test('preview filters match name, SKU, accents, category and combinations without a request', () => {
    assert.equal(
        exports.matchesCatalogPreviewFilters(
            product,
            { ...filter, search: 'Verão VER-01' },
            types,
            false,
        ),
        false,
    );
    assert.equal(
        exports.matchesCatalogPreviewFilters(
            product,
            { ...filter, search: 'MACACAO' },
            types,
            false,
        ),
        true,
    );
    assert.equal(
        exports.matchesCatalogPreviewFilters(
            product,
            { ...filter, search: 'ver-01' },
            types,
            false,
        ),
        true,
    );
    assert.equal(
        exports.matchesCatalogPreviewFilters(
            product,
            { ...filter, category_id: '2' },
            types,
            false,
        ),
        true,
    );
    assert.equal(
        exports.matchesCatalogPreviewFilters(
            product,
            { ...filter, category_id: '3' },
            types,
            false,
        ),
        false,
    );
    assert.equal(
        exports.matchesCatalogPreviewFilters(
            product,
            { ...filter, variations: { 5: ['Azul'] } },
            types,
            false,
        ),
        true,
    );
    assert.equal(
        exports.matchesCatalogPreviewFilters(
            product,
            { ...filter, variations: { 5: ['Verde'] } },
            types,
            false,
        ),
        false,
    );
    assert.equal(
        exports.matchesCatalogPreviewFilters(
            product,
            { ...filter, variations: { 5: ['Verde'] } },
            types,
            true,
        ),
        true,
    );
    assert.equal(
        exports.matchesCatalogPreviewFilters(
            { ...product, allow_quote_when_out_of_stock: true },
            { ...filter, variations: { 5: ['Verde'] } },
            types,
            false,
        ),
        true,
    );
});

test('preview pagination follows the Laravel window for small, beginning, middle and ending collections', () => {
    const window = (page, pages) =>
        Array.from(exports.catalogPreviewPageNumbers(page, pages));
    assert.deepEqual(window(1, 1), [1]);
    assert.deepEqual(window(2, 3), [1, 2, 3]);
    assert.deepEqual(window(1, 14), [
        1,
        2,
        3,
        4,
        5,
        6,
        7,
        8,
        9,
        10,
        null,
        13,
        14,
    ]);
    assert.deepEqual(window(15, 30), [
        1,
        2,
        null,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        null,
        29,
        30,
    ]);
    assert.deepEqual(window(30, 30), [
        1,
        2,
        null,
        21,
        22,
        23,
        24,
        25,
        26,
        27,
        28,
        29,
        30,
    ]);
});

test('preview combos follow public behavior: category and search apply, variation filter does not', () => {
    const combo = { ...product, product_type: 'combo', variant_stocks: [] };
    assert.equal(
        exports.matchesCatalogPreviewFilters(
            combo,
            { ...filter, variations: { 5: ['Verde'] } },
            types,
            false,
        ),
        true,
    );
    assert.equal(
        exports.matchesCatalogPreviewFilters(
            combo,
            { ...filter, search: 'inexistente' },
            types,
            false,
        ),
        false,
    );
});

test('preview reflects unsaved out-of-stock setting without losing complete source values', () => {
    const restricted = exports.catalogPreviewProduct(product, false);
    assert.equal(restricted.variations[0].values.length, 1);
    assert.equal(restricted.variations[0].values[0].hex, '#00f');
    assert.equal(product.variations[0].values.length, 2);
    assert.equal(
        exports.catalogPreviewProduct(product, true).variations[0].values
            .length,
        2,
    );
    assert.equal(
        exports.catalogPreviewProduct(
            { ...product, allow_quote_when_out_of_stock: true },
            false,
        ).variations[0].values.length,
        2,
    );
});

test('real renderer preview isolates storage, checkout and WhatsApp and validates message source', () => {
    const page = readFileSync(
        new URL('../resources/js/pages/public/catalog.tsx', import.meta.url),
        'utf8',
    );
    assert.match(page, /event\.source !== window\.parent/);
    assert.match(page, /event\.origin !== window\.location\.origin/);
    assert.match(page, /if \(preview_mode\) return;\s*if \(restoredCatalogRef/);
    assert.match(page, /if \(preview_mode\) return;\s*if \(hydratedCatalog/);
    assert.match(
        page,
        /const handleCheckout = \(\) => \{\s*if \(preview_mode\)/,
    );
    assert.match(
        page,
        /if \(preview_mode\) \{\s*event\.preventDefault\(\);\s*setPreviewNotice\(true\)/,
    );
    assert.match(
        page,
        /<CatalogPreviewContext.Provider value=\{previewContext\}>/,
    );
    assert.match(page, /data-catalog-section="hero"/);
    assert.match(page, /data-catalog-section="collections"/);
    assert.match(page, /data-catalog-section="product_grid"/);
    assert.match(
        page,
        /if \(previewMode === 'test'\) \{\s*lastPreviewSection.current = null;/,
    );
    assert.match(
        page,
        /!preview_mode[\s\S]*?previewMode !== 'test'[\s\S]*?!catalog_settings\.hide_prices[\s\S]*?!checkoutOpen/,
    );
    assert.match(
        page,
        /setCheckoutOpen\(false\);\s*setCheckoutErrors\(\{\}\);\s*setCartOpen\(true\)/,
    );
});
