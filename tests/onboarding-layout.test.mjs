import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const nativeRequire = createRequire(import.meta.url);
let stage = 1;
const exports = {};
const source = readFileSync(
    new URL('../resources/js/pages/onboarding/index.tsx', import.meta.url),
    'utf8',
);
const route = () => '/test-route';
route.url = route;
runInNewContext(
    ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            jsx: ts.JsxEmit.ReactJSX,
            target: ts.ScriptTarget.ES2022,
        },
    }).outputText,
    {
        exports,
        require: (name) => {
            if (name === 'lucide-react') {
                return new Proxy(
                    {},
                    { get: () => (props) => React.createElement('svg', props) },
                );
            }
            if (name === '@inertiajs/react') {
                return {
                    Head: () => null,
                    Link: ({ children, ...props }) =>
                        React.createElement('a', props, children),
                    useRemember: React.useState,
                    usePage: () => ({
                        props: {
                            stage,
                            incompatibleAccount: null,
                            manufacturer: null,
                            catalogPreview: null,
                            session: {
                                current_step: stage,
                                context: {
                                    brand_name: 'Coleção Aurora',
                                    selling_method: 'pdf_whatsapp',
                                },
                            },
                            errors: {},
                        },
                    }),
                };
            }
            if (name === 'gsap' || name.endsWith('.css')) {
                return {};
            }
            if (name.startsWith('@/actions/')) {
                return {
                    complete: route,
                    preview: route,
                    progress: route,
                    store: route,
                };
            }
            if (name === '@/routes') {
                return { logout: route };
            }
            if (name === '@/routes/legal') {
                return { terms: route, privacy: route };
            }
            if (name === '@/components/password-requirements') {
                return {
                    default: () =>
                        React.createElement('p', null, 'Requisitos da senha'),
                };
            }
            return nativeRequire(name);
        },
    },
);

test('mobile preview is optional after the first step and retains the brand context', () => {
    stage = 1;
    const first = renderToStaticMarkup(React.createElement(exports.default));
    assert.match(first, /data-stage="1"/);
    assert.doesNotMatch(first, /aria-controls="onboarding-brand-preview"/);
    stage = 2;
    const second = renderToStaticMarkup(React.createElement(exports.default));
    assert.match(second, /data-stage="2"/);
    assert.match(
        second,
        /aria-expanded="false" aria-controls="onboarding-brand-preview"/,
    );
    assert.match(second, /id="onboarding-brand-preview"/);
    assert.match(second, /Coleção Aurora/);
    assert.match(second, /role="radiogroup"/);
});

test('compact account step preserves explicit consent, password guidance and the trial CTA', () => {
    stage = 3;
    const html = renderToStaticMarkup(React.createElement(exports.default));
    assert.match(html, /data-stage="3"/);
    assert.match(html, /Seu nome/);
    assert.match(html, /E-mail profissional/);
    assert.match(html, /type="password"/);
    assert.match(html, /type="checkbox"/);
    assert.doesNotMatch(html, /checked=""/);
    assert.match(html, /Termos/);
    assert.match(html, /7 dias grátis/);
    assert.match(html, /Sem cartão/);
});
