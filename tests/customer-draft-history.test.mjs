import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const nativeRequire = createRequire(import.meta.url);
test('opening a restored customer dialog does not erase its draft during repeated mount effects', () => {
    const exports = {};
    let context;
    let effects = [];
    const changes = [];
    const component = () => null;
    runInNewContext(
        ts.transpileModule(
            readFileSync(
                new URL(
                    '../resources/js/components/customer-form-dialog.tsx',
                    import.meta.url,
                ),
                'utf8',
            ),
            {
                compilerOptions: {
                    module: ts.ModuleKind.CommonJS,
                    jsx: ts.JsxEmit.ReactJSX,
                },
            },
        ).outputText,
        {
            exports,
            require: (name) => {
                if (name === 'react')
                    return {
                        useMemo: (callback) => callback(),
                        useRef: (initial) => {
                            context ??= { current: initial };
                            return context;
                        },
                        useEffect: (effect) => effects.push(effect),
                    };
                if (name === '@/hooks/use-draft-history')
                    return {
                        useDraftForm: (_key, defaults) => ({
                            data: { ...defaults, name: 'Rascunho recuperado' },
                            errors: {},
                            isDirty: true,
                            clearErrors: () => {},
                            setDefaults: () => {},
                            setData: (value) => changes.push(value),
                        }),
                    };
                if (name === '@/hooks/use-unsaved-changes-guard')
                    return { useUnsavedChangesGuard: () => {} };
                if (name === '@/components/unsaved-changes-provider')
                    return { useConfirmDiscardChanges: () => async () => true };
                if (name === '@/lib/document-types')
                    return {
                        DOCUMENT_TYPE_OPTIONS: [],
                        formatDocument: (value) => value,
                        getDocumentLabel: () => 'CPF',
                    };
                if (name.startsWith('@/'))
                    return new Proxy(
                        { default: component },
                        { get: (obj, key) => obj[key] ?? component },
                    );
                return nativeRequire(name);
            },
        },
    );
    const props = { open: true, onOpenChange: () => {} };
    exports.CustomerFormDialog(props);
    effects.forEach((effect) => {
        effect();
        effect();
    });
    assert.equal(changes.length, 0);
    effects = [];
    exports.CustomerFormDialog({ ...props, open: false });
    effects.forEach((effect) => effect());
    effects = [];
    exports.CustomerFormDialog(props);
    effects.forEach((effect) => effect());
    assert.equal(changes.length, 1);
    assert.equal(changes[0].name, '');
});
