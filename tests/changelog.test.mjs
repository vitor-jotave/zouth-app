import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const nativeRequire = createRequire(import.meta.url);
function load(path, overrides = {}) {
    const exports = {};
    runInNewContext(
        ts.transpileModule(
            readFileSync(
                new URL(`../resources/js/${path}`, import.meta.url),
                'utf8',
            ),
            {
                compilerOptions: {
                    module: ts.ModuleKind.CommonJS,
                    jsx: ts.JsxEmit.ReactJSX,
                    target: ts.ScriptTarget.ES2022,
                },
            },
        ).outputText,
        {
            exports,
            Intl,
            require: (name) => overrides[name] ?? nativeRequire(name),
        },
    );
    return exports;
}
const releases = load('lib/changelog.ts');
test('catalog refinement release records the requested improvements without replacing earlier history', () => {
    const release = releases.changelog.find(
        (entry) => entry.id === '2026-11-02-editor-catalogo',
    );
    assert.equal(release.date, '2026-11-02');
    assert.equal(release.updates.length, 7);
    assert.ok(
        release.updates.some(
            (entry) => entry.title === 'Experimente como lojista',
        ),
    );
    assert.ok(
        releases.changelog.some(
            (entry) => entry.id === '2026-11-02-experiencia',
        ),
    );
});
const ui = new Proxy(
    {},
    {
        get:
            (_target, name) =>
            ({ children, ...props }) =>
                React.createElement(
                    name === 'DialogTitle'
                        ? 'h1'
                        : name === 'DialogDescription'
                          ? 'p'
                          : 'div',
                    props,
                    children,
                ),
    },
);
const { ChangelogContent } = load('components/changelog-provider.tsx', {
    '@/components/ui/dialog': ui,
    '@/lib/changelog': releases,
});

test('changelog begins with the requested dated UX update and uses valid unique entries', () => {
    const ids = new Set();
    for (const release of releases.changelog) {
        assert.equal(ids.has(release.id), false);
        ids.add(release.id);
        assert.match(release.date, /^\d{4}-\d{2}-\d{2}$/);
        assert.equal(
            new Date(`${release.date}T12:00:00Z`).toISOString().slice(0, 10),
            release.date,
        );
        assert.ok(release.updates.length > 0);
        assert.equal(
            new Set(release.updates.map((update) => update.title)).size,
            release.updates.length,
        );
        for (const update of release.updates) {
            assert.ok(releases.changelogKindLabels[update.kind]);
            assert.ok(update.description.length > 20);
        }
    }
    const uxRelease = releases.changelog.find(
        (release) => release.id === '2026-11-02-experiencia',
    );
    assert.equal(uxRelease.date, '2026-11-02');
    assert.equal(uxRelease.updates.length, 10);
    assert.equal(
        releases.formatChangelogDate('2026-11-02'),
        '2 de novembro de 2026',
    );
});

test('changelog renders a dated readable history and all approved UX topics', () => {
    const html = renderToStaticMarkup(React.createElement(ChangelogContent));
    assert.match(html, /<time dateTime="2026-11-02"/);
    assert.match(html, /10 atualizações/);
    for (const topic of [
        'preenchimento',
        'Estoque preservado',
        'seleção do lojista',
        'Automações',
        'celular',
        'Foto de campanha',
        'Regras de pedido',
        'Histórico de pedidos',
        'Relatórios',
        'Primeiros passos',
    ])
        assert.ok(html.includes(topic), topic);
    assert.match(html, /Correção/);
    assert.match(html, /Melhoria/);
});

test('dates are displayed newest first even when manual entries are appended out of order', () => {
    const base = releases.changelog[0];
    const { ChangelogContent: OrderedContent } = load(
        'components/changelog-provider.tsx',
        {
            '@/components/ui/dialog': ui,
            '@/lib/changelog': {
                ...releases,
                changelog: [{ ...base, id: 'older', date: '2026-10-31' }, base],
            },
        },
    );
    const html = renderToStaticMarkup(React.createElement(OrderedContent));
    assert.ok(
        html.indexOf(`dateTime="${base.date}"`) <
            html.indexOf('dateTime="2026-10-31"'),
    );
});

test('the shared user menu exposes Changelog between settings and logout', () => {
    const components = new Proxy(
        {},
        {
            get:
                () =>
                ({ children }) =>
                    React.createElement('div', null, children),
        },
    );
    const { UserMenuContent } = load('components/user-menu-content.tsx', {
        '@inertiajs/react': {
            Link: ({ children }) => React.createElement('span', null, children),
            router: {},
        },
        'lucide-react': new Proxy({}, { get: () => () => null }),
        '@/components/changelog-provider': { useChangelog: () => () => {} },
        '@/components/ui/dropdown-menu': components,
        '@/components/user-info': { UserInfo: () => null },
        '@/hooks/use-mobile-navigation': {
            useMobileNavigation: () => () => {},
        },
        '@/routes': { logout: () => '/logout' },
        '@/routes/profile': { edit: () => '/profile' },
    });
    const html = renderToStaticMarkup(
        React.createElement(UserMenuContent, { user: { name: 'Teste' } }),
    );
    assert.ok(html.indexOf('Configurações') < html.indexOf('Changelog'));
    assert.ok(html.indexOf('Changelog') < html.indexOf('Sair'));
});
