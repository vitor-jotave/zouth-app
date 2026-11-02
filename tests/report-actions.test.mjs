import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const nativeRequire = createRequire(import.meta.url);
let access = { is_owner: true, capabilities: [] };
const exports = {};
const source = readFileSync(
    new URL(
        '../resources/js/pages/manufacturer/reports/index.tsx',
        import.meta.url,
    ),
    'utf8',
);
const edit = (id) => ({ url: `/products/${id}/edit` });
const editCombo = (id) => ({ url: `/combos/${id}/edit` });
runInNewContext(
    ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            jsx: ts.JsxEmit.ReactJSX,
            target: ts.ScriptTarget.ES2022,
        },
    }).outputText +
        '\nexports.ReportAction = ReportAction; exports.reportProductUrl = reportProductUrl;',
    {
        exports,
        require: (name) => {
            if (name === '@inertiajs/react') {
                return {
                    usePage: () => ({ props: { auth: { access } } }),
                    Link: ({ children, ...props }) =>
                        React.createElement('a', props, children),
                };
            }
            if (name === 'lucide-react') {
                return new Proxy(
                    {},
                    { get: () => (props) => React.createElement('svg', props) },
                );
            }
            if (name === '@/routes/manufacturer') {
                return {
                    default: {
                        products: { edit, combos: { edit: editCombo } },
                        reports: { index: () => ({ url: '/reports' }) },
                    },
                };
            }
            if (name === '@/routes') {
                return { dashboard: () => ({ url: '/dashboard' }) };
            }
            if (name.startsWith('@/')) {
                return {};
            }
            return nativeRequire(name);
        },
    },
);

test('report actions respect capabilities and never turn missing historical entities into broken links', () => {
    const props = {
        href: '/products/42/edit',
        capability: 'collection.manage',
        label: 'Editar vestido',
        children: 'Vestido',
    };
    access = { is_owner: true, capabilities: [] };
    assert.match(
        renderToStaticMarkup(React.createElement(exports.ReportAction, props)),
        /href="\/products\/42\/edit"/,
    );
    access = { is_owner: false, capabilities: ['reports.view'] };
    assert.equal(
        renderToStaticMarkup(React.createElement(exports.ReportAction, props)),
        '<span>Vestido</span>',
    );
    access = { is_owner: false, capabilities: ['collection.manage'] };
    assert.match(
        renderToStaticMarkup(React.createElement(exports.ReportAction, props)),
        /aria-label="Editar vestido"/,
    );
    assert.equal(
        renderToStaticMarkup(
            React.createElement(exports.ReportAction, { ...props, href: null }),
        ),
        '<span>Vestido</span>',
    );
});

test('product shortcuts distinguish the combo editor and historical snapshots', () => {
    assert.equal(
        exports.reportProductUrl({ id: 42, product_type: 'product' }),
        '/products/42/edit',
    );
    assert.equal(
        exports.reportProductUrl({ id: 77, product_type: 'combo' }),
        '/combos/77/edit',
    );
    assert.equal(
        exports.reportProductUrl({ id: null, product_type: null }),
        null,
    );
});
