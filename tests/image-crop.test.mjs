import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const passthrough = ({ children }) => children;
let cropProps;
let sliderProps;
const source = readFileSync(
    new URL(
        '../resources/js/components/image-crop-dialog.tsx',
        import.meta.url,
    ),
    'utf8',
);
const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
    },
});
const exports = {};
runInNewContext(outputText, {
    exports,
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    require: (name) => {
        if (name.endsWith('.css')) return {};
        if (name === '@/lib/utils')
            return { cn: (...classes) => classes.filter(Boolean).join(' ') };
        if (name === '@/lib/image-utils') return {};
        if (name === '@/components/ui/slider')
            return {
                Slider: (props) => {
                    sliderProps = props;
                    return null;
                },
            };
        if (name === '@/components/ui/label')
            return { Label: (props) => createElement('label', props) };
        if (name === '@/components/ui/button')
            return { Button: (props) => createElement('button', props) };
        if (name.startsWith('@/components/') || name === 'lucide-react') {
            return new Proxy({}, { get: () => passthrough });
        }
        if (name === 'react-image-crop')
            return {
                default: (props) => {
                    cropProps = props;
                    return props.children;
                },
            };
        return require(name);
    },
});

test('crop instructions and zoom control are accessible in Portuguese', () => {
    const html = renderToStaticMarkup(
        createElement(exports.ImageCropDialog, {
            open: true,
            imageFile: { name: 'logo.png', type: 'image/png' },
            onOpenChange() {},
            onCropped() {},
        }),
    );
    assert.equal(Object.keys(cropProps.ariaLabels).length, 9);
    for (const label of Object.values(cropProps.ariaLabels)) {
        assert.match(label, /setas/);
        assert.match(label, /recorte/);
        assert.doesNotMatch(label, /arrow|crop|handle/);
    }
    assert.match(html, /alt="Imagem para recortar"/);
    assert.match(html, /Pelo teclado, use Tab/);
    assert.ok(html.includes(`id="${sliderProps['aria-labelledby']}"`));
    assert.ok(html.includes(`id="${sliderProps['aria-describedby']}"`));
    assert.equal(sliderProps['aria-valuetext'], '100%');
    assert.match(sliderProps.className, /min-h-11/);
    assert.match(html, /min-h-11[^>]*>Cancelar<\/button>/);
    assert.match(html, />Usar imagem ajustada<\/button>/);
});

test('skip action describes skipping the image and background controls have touch-sized targets', () => {
    const html = renderToStaticMarkup(
        createElement(exports.ImageCropDialog, {
            open: true,
            imageFile: { name: 'logo.png', type: 'image/png' },
            allowTransparentBackground: true,
            onOpenChange() {},
            onCropped() {},
            onSkip() {},
        }),
    );
    assert.match(html, />Pular imagem<\/button>/);
    assert.doesNotMatch(html, /Usar imagem original/);
    assert.match(
        html,
        /aria-label="Preservar transparência"[^>]*class="[^"]*min-h-11/,
    );
    assert.match(
        html,
        /aria-label="Usar fundo branco"[^>]*class="[^"]*size-11/,
    );
    assert.match(
        html,
        /aria-label="Escolher cor de fundo personalizada"[^>]*class="[^"]*size-11/,
    );
});

for (const type of [
    'image/png',
    'image/svg+xml',
    'image/webp',
    'application/octet-stream',
]) {
    test(`logo cropping defaults to transparency for ${type}`, () => {
        const html = renderToStaticMarkup(
            createElement(exports.ImageCropDialog, {
                open: true,
                imageFile: { name: 'logo', type },
                allowTransparentBackground: true,
                onOpenChange() {},
                onCropped() {},
            }),
        );
        assert.match(
            html,
            /aria-label="Preservar transparência" aria-pressed="true"/,
        );
        assert.match(html, />Transparente<\/button>/);
        assert.doesNotMatch(
            html,
            /aria-label="Usar fundo branco" aria-pressed="true"/,
        );
    });
}

test('product cropping retains the existing white background default', () => {
    const html = renderToStaticMarkup(
        createElement(exports.ImageCropDialog, {
            open: true,
            imageFile: { name: 'product.jpg', type: 'image/jpeg' },
            onOpenChange() {},
            onCropped() {},
        }),
    );
    assert.doesNotMatch(html, /aria-label="Preservar transparência"/);
    assert.match(html, /aria-label="Usar fundo branco" aria-pressed="true"/);
});

test('transparent logo processing produces PNG without painting a background', async () => {
    const operations = [];
    const imageSource = readFileSync(
        new URL('../resources/js/lib/image-utils.ts', import.meta.url),
        'utf8',
    );
    const compiled = ts.transpileModule(imageSource, {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
    });
    const imageExports = {};
    runInNewContext(compiled.outputText, {
        exports: imageExports,
        File,
        console: { debug() {} },
        document: {
            createElement: () => ({
                width: 0,
                height: 0,
                getContext: () => ({
                    fillRect: () => operations.push('fill'),
                    drawImage: () => operations.push('draw'),
                }),
                toBlob: (callback, type) =>
                    callback(new Blob(['image'], { type })),
            }),
        },
    });
    for (const name of ['logo.png', 'logo.svg']) {
        const result = await imageExports.cropAndCompress(
            { naturalWidth: 100, naturalHeight: 100, width: 100, height: 100 },
            { x: 0, y: 0, width: 100, height: 100 },
            name,
            { backgroundColor: null, preserveTransparency: true },
        );
        assert.equal(result.name, 'logo.png');
        assert.equal(result.type, 'image/png');
    }
    assert.deepEqual(operations, ['draw', 'draw']);
});
