import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const icons =
    await import('../node_modules/lucide-react/dist/esm/lucide-react.js');
function loadComponent(path) {
    const filename = fileURLToPath(
        new URL(`../resources/js/${path}`, import.meta.url),
    );
    const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            jsx: ts.JsxEmit.ReactJSX,
        },
        fileName: filename,
    });
    const exports = {};
    runInNewContext(
        outputText,
        {
            exports,
            require: (name) =>
                name === 'lucide-react'
                    ? icons
                    : name.startsWith('@/')
                      ? loadComponent(`${name.slice(2)}.ts`)
                      : require(name),
            encodeURIComponent,
        },
        { filename },
    );
    return exports;
}

const { CatalogHero } = loadComponent('components/catalog-hero.tsx');

const props = {
    brandName: 'Zouth',
    showBrandName: false,
    showLogo: true,
    logoUrl: '/logo.png',
    logoSize: 100,
    showProductCount: false,
    productCount: 20,
    coverImageFit: 'cover',
    coverImageScale: 100,
    coverImageFocalX: 50,
    coverImageFocalY: 50,
    alignment: 'center',
    eyebrow: 'Nova coleção',
    headline: '',
    showCta: true,
    ctaText: 'Conheça a coleção',
    headingFont: 'Sora',
    accentColor: '#ff4d3d',
};

function render(overrides = {}) {
    return renderToStaticMarkup(
        createElement(CatalogHero, { ...props, ...overrides }),
    );
}

test('logo-only mode renders the logo without a textual brand fallback', () => {
    const html = render();
    assert.match(html, /src="\/logo.png"/);
    assert.doesNotMatch(html, /<h1/);
    assert.doesNotMatch(html, />Zouth</);
});

test('logo-only mode hides an existing headline that repeats the brand name', () => {
    assert.doesNotMatch(render({ headline: ' ZOUTH ' }), /<h1/);
});

test('logo-only mode preserves a distinct campaign title', () => {
    assert.match(
        render({ headline: 'Dias leves' }),
        /<h1[^>]*>Dias leves<\/h1>/,
    );
});

test('name and both modes retain the textual brand fallback', () => {
    for (const showLogo of [false, true]) {
        const html = render({ showBrandName: true, showLogo });
        assert.match(html, /<h1[^>]*>Zouth<\/h1>/);
        assert.equal(html.includes('src="/logo.png"'), showLogo);
    }
});

test('a campaign tagline remains available without restoring the brand name', () => {
    assert.match(
        render({ brandTagline: 'Feita para descobrir' }),
        /<h1[^>]*>Feita para descobrir<\/h1>/,
    );
});

test('cover fitting controls reach the shared image in both compositions', () => {
    for (const alignment of ['left', 'center']) {
        for (const fit of ['cover', 'contain', 'fill', 'manual']) {
            const html = render({
                alignment,
                coverImage: '/campaign.jpg',
                coverImageFit: fit,
                coverImageScale: 150,
                coverImageFocalX: 25,
                coverImageFocalY: 75,
            });
            assert.match(html, /src="\/campaign.jpg"/);
            assert.ok(
                html.includes(
                    `object-fit:${fit === 'manual' ? 'contain' : fit}`,
                ),
            );
            assert.ok(html.includes('object-position:25% 75%'));
            assert.equal(
                html.includes('transform:scale(1.5)'),
                fit === 'manual',
            );
            if (fit === 'manual') {
                assert.ok(html.includes('transform-origin:25% 75%'));
            }
        }
    }
});

test('large logos and long brand names stay in the cover flow', () => {
    const html = render({
        showBrandName: true,
        logoSize: 200,
        brandName: 'Uma marca com um nome muito longo para uma capa mobile',
        coverImage: '/campaign.jpg',
        alignment: 'left',
    });
    assert.match(html, /data-testid="catalog-brand-bar" class="relative/);
    assert.match(html, /data-testid="catalog-hero-copy"/);
    assert.match(html, /data-testid="catalog-hero-media"/);
    assert.doesNotMatch(html, /padding-top:\d+px/);
});
