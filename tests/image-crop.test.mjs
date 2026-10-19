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
        if (name.startsWith('@/components/') || name === 'lucide-react') {
            return new Proxy({}, { get: () => passthrough });
        }
        if (name === 'react-image-crop') return { default: passthrough };
        return require(name);
    },
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
