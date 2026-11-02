import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
runInNewContext(
    ts.transpileModule(
        readFileSync(
            new URL(
                '../resources/js/lib/catalog-editor-guidance.ts',
                import.meta.url,
            ),
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
const {
    catalogContrastRatio,
    catalogLegibilityWarnings,
    materializeCatalogHeroCopy,
} = exports;

test('contrast follows sRGB luminance with symmetric 1 to 21 ratios', () => {
    assert.equal(catalogContrastRatio('#000000', '#ffffff'), 21);
    assert.equal(catalogContrastRatio('#fff', '#000'), 21);
    assert.equal(catalogContrastRatio('#18181f', '#18181f'), 1);
    assert.equal(
        catalogContrastRatio('#ff4d3d', '#f6f4f0'),
        catalogContrastRatio('#f6f4f0', '#ff4d3d'),
    );
    assert.ok(
        Math.abs(
            catalogContrastRatio('#ff0000', '#00ff00') - 2.9139375476009137,
        ) < 0.000000001,
    );
});

test('short hexadecimal colors expand exactly and case or surrounding whitespace does not matter', () => {
    assert.equal(
        catalogContrastRatio(' #AbC ', '#DEF'),
        catalogContrastRatio('#aabbcc', '#ddeeff'),
    );
});

test('unsupported and partial colors have no fabricated contrast result', () => {
    for (const value of [
        '',
        '#',
        '#12',
        '#12345',
        '#1234567',
        '#fff0',
        '#00000000',
        'transparent',
        'red',
        'rgb(0 0 0)',
        null,
    ]) {
        assert.equal(catalogContrastRatio(value, '#fff'), null);
        assert.equal(catalogContrastRatio('#000', value), null);
    }
});

test('the 4.5 threshold is never rounded up when issuing nonblocking guidance', () => {
    const warnings = catalogLegibilityWarnings({
        textColor: '#777',
        accentColor: '#767676',
        backgroundColor: '#fff',
    });
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].id, 'text-contrast');
    assert.ok(warnings[0].contrastRatio < 4.5);
    assert.ok(catalogContrastRatio('#767676', '#fff') > 4.5);
    assert.equal(Object.hasOwn(warnings[0], 'blocking'), false);
});

test('text and accent are checked independently without changing selected colors', () => {
    const colors = {
        textColor: '#eee',
        accentColor: '#ddd',
        backgroundColor: '#fff',
    };
    const before = { ...colors };
    const warnings = catalogLegibilityWarnings(colors);
    assert.equal(warnings.length, 2);
    assert.equal(warnings[0].id, 'text-contrast');
    assert.equal(warnings[1].id, 'accent-contrast');
    assert.deepEqual(colors, before);
    assert.equal(
        catalogLegibilityWarnings({
            textColor: '#18181f',
            accentColor: '#000',
            backgroundColor: '#f6f4f0',
        }).length,
        0,
    );
});

test('variable backgrounds ask for visual review instead of claiming an exact image contrast', () => {
    const warnings = catalogLegibilityWarnings({
        textColor: '#fff',
        accentColor: '#fff',
        backgroundColor: '#fff',
        backgroundIsVariable: true,
    });
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].id, 'variable-background');
    assert.equal(warnings[0].contrastRatio, null);
    assert.match(warnings[0].message, /celular/);
    assert.doesNotMatch(warnings[0].message, /obrigatóri|não pode salvar/i);
});

test('legacy hero text is materialized into visible fields and then stops falling back', () => {
    const brand = {
        brand_name: 'Zouth',
        tagline: ' Feita para descobrir ',
        description: 'Descrição publicada',
        show_brand_name: true,
    };
    const props = {
        align: 'left',
        headline: '',
        subtitle: null,
        logo_size: 150,
    };
    const result = materializeCatalogHeroCopy(props, brand);
    assert.equal(result.headline, 'Feita para descobrir');
    assert.equal(result.subtitle, 'Descrição publicada');
    assert.equal(result.headline_fallback, false);
    assert.equal(result.subtitle_fallback, false);
    assert.equal(result.eyebrow, 'Nova coleção');
    assert.equal(result.eyebrow_fallback, false);
    assert.equal(result.cta_text, 'Conheça a coleção');
    assert.equal(result.cta_text_fallback, false);
    assert.equal(result.logo_size, 150);
    assert.equal(result.align, 'left');
    assert.equal(props.headline, '');
    assert.equal(props.subtitle, null);
});

test('explicit empty hero text remains empty even when legacy text still exists', () => {
    const result = materializeCatalogHeroCopy(
        {
            headline: '',
            subtitle: '',
            headline_fallback: false,
            subtitle_fallback: false,
        },
        {
            brand_name: 'Zouth',
            tagline: 'Não ressuscitar',
            description: 'Não ressuscitar',
            show_brand_name: true,
        },
    );
    assert.equal(result.headline, '');
    assert.equal(result.subtitle, '');
});

test('logo-only mode hides a brand-name headline but preserves a distinct campaign headline', () => {
    const brand = { brand_name: 'Zouth', show_brand_name: false };
    assert.equal(
        materializeCatalogHeroCopy({ headline: ' ZOUTH ' }, brand).headline,
        '',
    );
    assert.equal(
        materializeCatalogHeroCopy({ headline: 'Dias leves' }, brand).headline,
        'Dias leves',
    );
    assert.equal(materializeCatalogHeroCopy({}, brand).headline, '');
});

test('brand-name and legacy subtitle fallbacks match the current published hero semantics', () => {
    assert.equal(
        materializeCatalogHeroCopy(undefined, {
            brand_name: 'Zouth',
            show_brand_name: true,
        }).headline,
        'Zouth',
    );
    assert.equal(
        materializeCatalogHeroCopy(
            {},
            {
                brand_name: 'Zouth',
                show_brand_name: false,
                tagline: 'Dias leves',
            },
        ).headline,
        'Dias leves',
    );
    assert.equal(
        materializeCatalogHeroCopy(
            { subtitle: '  ' },
            { description: 'Descrição antiga' },
        ).subtitle,
        '  ',
    );
    assert.equal(
        materializeCatalogHeroCopy(
            { subtitle: 'Descrição nova' },
            { description: 'Descrição antiga' },
        ).subtitle,
        'Descrição nova',
    );
});

test('materialized hero copy is idempotent even if the legacy brand text later changes', () => {
    const first = materializeCatalogHeroCopy(
        {},
        {
            brand_name: 'Zouth',
            tagline: 'Dias leves',
            description: 'Coleção atual',
        },
    );
    const second = materializeCatalogHeroCopy(first, {
        brand_name: 'Outra marca',
        tagline: 'Outra campanha',
        description: 'Outra descrição',
    });
    assert.equal(second.headline, first.headline);
    assert.equal(second.subtitle, first.subtitle);
});

test('explicit empty eyebrow and call to action remain empty after multipart null conversion', () => {
    for (const empty of ['', null]) {
        const result = materializeCatalogHeroCopy(
            {
                eyebrow: empty,
                cta_text: empty,
                eyebrow_fallback: false,
                cta_text_fallback: false,
            },
            {},
        );
        assert.equal(result.eyebrow, '');
        assert.equal(result.cta_text, '');
        assert.equal(result.eyebrow_fallback, false);
        assert.equal(result.cta_text_fallback, false);
    }
});

test('custom eyebrow and call to action are preserved when materialized', () => {
    const result = materializeCatalogHeroCopy(
        {
            eyebrow: 'Verão 2027',
            cta_text: 'Descobrir as peças',
        },
        {},
    );
    assert.equal(result.eyebrow, 'Verão 2027');
    assert.equal(result.cta_text, 'Descobrir as peças');
});
