import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function guard(dirty, answer) {
    let before;
    let unload;
    let cleanup;
    let removed = false;
    const visits = [];
    const confirmations = [];
    const router = {
        on: (_event, listener) => {
            before = listener;
            return () => {
                removed = true;
            };
        },
        visit: (url, options) => {
            const event = {
                detail: { visit: options },
                preventDefault() {
                    throw new Error('Confirmed navigation was blocked again');
                },
            };
            before(event);
            visits.push({ url, options });
        },
    };
    const { outputText } = ts.transpileModule(
        readFileSync(
            new URL(
                '../resources/js/hooks/use-unsaved-changes-guard.ts',
                import.meta.url,
            ),
            'utf8',
        ),
        {
            compilerOptions: { module: ts.ModuleKind.CommonJS },
        },
    );
    const exports = {};
    runInNewContext(outputText, {
        exports,
        window: {
            addEventListener: (_name, listener) => {
                unload = listener;
            },
            removeEventListener: () => {
                unload = undefined;
            },
        },
        require: (name) => {
            if (name === '@/hooks/use-draft-history')
                return { discardPageDraftHistory: () => {} };
            if (name === '@inertiajs/react') return { router };
            if (name === 'react')
                return {
                    useRef: (current) => ({ current }),
                    useEffect: (effect) => {
                        cleanup = effect();
                    },
                };
            return {
                useConfirmDiscardChanges: () => async (value) => {
                    confirmations.push(value);
                    return answer;
                },
            };
        },
    });
    exports.useUnsavedChangesGuard(dirty);
    return {
        navigate(method = 'get') {
            let prevented = false;
            const visit = {
                method,
                url: new URL('https://example.test/products'),
                preserveScroll: true,
            };
            before({
                detail: { visit },
                preventDefault() {
                    prevented = true;
                },
            });
            return { prevented, visit };
        },
        unload() {
            const event = {
                prevented: false,
                preventDefault() {
                    this.prevented = true;
                },
            };
            unload(event);
            return event;
        },
        visits,
        confirmations,
        cleanup() {
            cleanup();
            return removed && unload === undefined;
        },
    };
}

test('clean forms and form submissions do not prompt', async () => {
    const clean = guard(false, false);
    assert.equal(clean.navigate().prevented, false);
    assert.equal(clean.unload().prevented, false);
    assert.equal(guard(true, false).navigate('put').prevented, false);
    assert.deepEqual(clean.confirmations, []);
});

test('cancel keeps the current page and protects reload', async () => {
    const state = guard(true, false);
    assert.equal(state.navigate().prevented, true);
    await Promise.resolve();
    assert.equal(state.visits.length, 0);
    assert.equal(state.unload().prevented, true);
    assert.equal(state.cleanup(), true);
});

test('confirmed discard replays the original visit exactly once without another prompt', async () => {
    const state = guard(true, true);
    const { visit } = state.navigate();
    await Promise.resolve();
    assert.equal(state.visits.length, 1);
    assert.equal(state.visits[0].options, visit);
    assert.deepEqual(state.confirmations, [true]);
});
