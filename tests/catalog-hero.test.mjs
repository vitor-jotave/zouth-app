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

test('cover fitting controls reach the shared image in all compositions', () => {
    for (const alignment of ['left', 'right', 'center', 'background']) {
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

test('background photos have no mandatory overlay and allow adjustable dimming', () => {
    const base = { alignment: 'background', coverImage: '/campaign.jpg' };
    assert.doesNotMatch(render(base), /catalog-hero-overlay/);
    assert.doesNotMatch(
        render({ ...base, overlayOpacity: 0 }),
        /catalog-hero-overlay/,
    );
    assert.match(
        render({ ...base, overlayOpacity: 45 }),
        /catalog-hero-overlay[^>]*style="opacity:0.45"/,
    );
    assert.match(
        render({ ...base, overlayOpacity: 999 }),
        /style="opacity:0.8"/,
    );
    assert.doesNotMatch(
        render({ ...base, alignment: 'left', overlayOpacity: 45 }),
        /catalog-hero-overlay/,
    );
});

test('split compositions place the photo on either side without changing the brand flow', () => {
    const imageLeft = render({
        alignment: 'right',
        coverImage: '/campaign.jpg',
    });
    const imageRight = render({
        alignment: 'left',
        coverImage: '/campaign.jpg',
    });
    assert.match(
        imageLeft,
        /catalog-brand-bar[^>]*@min-\[768px\]\/catalog-hero:col-start-2/,
    );
    assert.match(
        imageLeft,
        /catalog-hero-media[^>]*@min-\[768px\]\/catalog-hero:col-start-1/,
    );
    assert.match(
        imageRight,
        /catalog-hero-media[^>]*@min-\[768px\]\/catalog-hero:col-start-2/,
    );
    assert.doesNotMatch(imageLeft, /catalog-hero-background/);
});

test('background composition covers the brand and copy without a separate image pane', () => {
    const html = render({
        alignment: 'background',
        coverImage: '/campaign.jpg',
    });
    assert.match(html, /data-testid="catalog-hero-background"/);
    assert.doesNotMatch(html, /data-testid="catalog-hero-media"/);
    assert.ok(
        html.indexOf('catalog-hero-background') <
            html.indexOf('catalog-brand-bar'),
    );
    assert.match(html, /text-white/);
    assert.doesNotMatch(html, /text-center/);
    assert.doesNotMatch(html, /grid-cols-\[/);
});

test('background composition without a campaign image leaves no empty image area', () => {
    const html = render({ alignment: 'background' });
    assert.doesNotMatch(
        html,
        /catalog-hero-background|catalog-hero-media|text-white/,
    );
    assert.match(html, /src="\/logo.png"/);
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

test('logo and product count share the requested alignment in every cover composition', () => {
    for (const alignment of ['left', 'right', 'center', 'background']) {
        for (const [logoAlignment, items, justify] of [
            ['left', 'items-start', 'justify-start'],
            ['center', 'items-center', 'justify-center'],
            ['right', 'items-end', 'justify-end'],
        ]) {
            const html = render({
                alignment,
                logoAlignment,
                coverImage: '/campaign.jpg',
                showProductCount: true,
            });
            assert.match(html, new RegExp(`catalog-brand-bar[^>]*${items}`));
            assert.ok(html.includes(justify));
            assert.match(
                html,
                /catalog-hero-product-count[^>]*>20 produtos<\/span>/,
            );
            const brandBar = html.slice(
                html.indexOf('catalog-brand-bar'),
                html.indexOf('catalog-hero-copy'),
            );
            assert.ok(brandBar.includes('catalog-hero-product-count'));
            assert.doesNotMatch(brandBar, /justify-between/);
        }
    }
});

test('showing product count does not change centered logo alignment', () => {
    for (const showProductCount of [false, true]) {
        const html = render({ alignment: 'center', showProductCount });
        assert.match(html, /catalog-brand-bar[^>]*items-center/);
        assert.ok(html.includes('justify-center'));
    }
});

test('product count badge uses the catalog color without depending on a missing CSS variable', () => {
    const html = render({ showProductCount: true, primaryColor: '#123456' });
    assert.match(
        html,
        /catalog-hero-product-count[^>]*background-color:#123456/,
    );
    assert.doesNotMatch(html, /var\(--brand-primary\)/);
});
