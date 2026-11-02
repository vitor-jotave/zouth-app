import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const source = readFileSync(
    new URL('../resources/js/components/ui/slider.tsx', import.meta.url),
    'utf8',
);
const exports = {};
runInNewContext(
    ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            jsx: ts.JsxEmit.ReactJSX,
        },
    }).outputText,
    {
        exports,
        require: (name) =>
            name === '@/lib/utils'
                ? { cn: (...classes) => classes.filter(Boolean).join(' ') }
                : require(name),
    },
);

function renderSlider(props) {
    return renderToStaticMarkup(createElement(exports.Slider, props));
}

test('accessible names and descriptions are applied to the actual slider thumb', () => {
    const html = renderSlider({
        value: [35],
        'aria-label': 'Intensidade do fundo',
        'aria-describedby': 'background-help',
        'aria-valuetext': '35%',
    });
    const thumb = html.match(/<span[^>]+role="slider"[^>]*>/)?.[0];
    assert.ok(thumb);
    assert.match(thumb, /aria-label="Intensidade do fundo"/);
    assert.match(thumb, /aria-describedby="background-help"/);
    assert.match(thumb, /aria-valuetext="35%"/);
    assert.match(thumb, /after:size-11/);
    assert.match(thumb, /size-4/);
});

test('external labels name single thumbs and multi-thumb values have distinct labels', () => {
    const single = renderSlider({
        value: [30],
        'aria-labelledby': 'opacity-label',
    });
    assert.match(
        single.match(/<span[^>]+role="slider"[^>]*>/)?.[0] ?? '',
        /aria-labelledby="opacity-label"/,
    );
    const multiple = renderSlider({
        value: [10, 90],
        'aria-label': 'Faixa de preço',
    });
    assert.match(multiple, /aria-label="Faixa de preço — valor 1 de 2"/);
    assert.match(multiple, /aria-label="Faixa de preço — valor 2 de 2"/);
});

test('multi-thumb referenced labels include unique Portuguese value suffixes', () => {
    const html = renderSlider({
        defaultValue: [10, 90],
        'aria-labelledby': 'range-label',
        'aria-describedby': 'range-help',
    });
    const thumbs = [...html.matchAll(/<span[^>]+role="slider"[^>]*>/g)].map(
        (match) => match[0],
    );
    assert.equal(thumbs.length, 2);
    for (const [index, thumb] of thumbs.entries()) {
        const labelledBy = thumb.match(/aria-labelledby="([^"]+)"/)?.[1];
        assert.ok(labelledBy.startsWith('range-label '));
        assert.match(thumb, /aria-describedby="range-help"/);
        const suffixId = labelledBy.split(' ')[1];
        assert.ok(html.includes(`id="${suffixId}"`));
        assert.ok(html.includes(`Valor ${index + 1} de 2`));
    }
    assert.notEqual(
        thumbs[0].match(/aria-labelledby="([^"]+)"/)?.[1],
        thumbs[1].match(/aria-labelledby="([^"]+)"/)?.[1],
    );
});
