import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function historyHooks(history = new Map()) {
    const cells = [];
    let cursor = 0;
    let effects = [];
    let lastKey;
    const exports = {};
    const restore = (key) => history.get(key);
    const useState = (initial) => {
        const index = cursor++;
        cells[index] ??= {
            value: typeof initial === 'function' ? initial() : initial,
            set: (value) => {
                cells[index].value =
                    typeof value === 'function'
                        ? value(cells[index].value)
                        : value;
            },
        };
        return [cells[index].value, cells[index].set];
    };
    runInNewContext(
        ts.transpileModule(
            readFileSync(
                new URL(
                    '../resources/js/hooks/use-draft-history.ts',
                    import.meta.url,
                ),
                'utf8',
            ),
            {
                compilerOptions: { module: ts.ModuleKind.CommonJS },
            },
        ).outputText,
        {
            exports,
            require: (name) => {
                if (name === 'react')
                    return {
                        useState,
                        useRef: (initial) => {
                            const index = cursor++;
                            cells[index] ??= { current: initial };
                            return cells[index];
                        },
                        useEffect: (effect) => effects.push(effect),
                    };
                if (name === '@/lib/draft-files')
                    return {
                        restoreDraft: (value) => value,
                        serializeDraft: (value) => value,
                    };
                return {
                    router: {
                        restore,
                        remember: (value, key) => history.set(key, value),
                    },
                    useForm: (defaults) => {
                        const [data, setData] = useState(defaults);
                        return { data, setData };
                    },
                    useRemember: (initial, key) => {
                        lastKey = key;
                        return [
                            restore(key) ?? initial,
                            (value) => history.set(key, value),
                        ];
                    },
                };
            },
        },
    );
    return {
        ...exports,
        useDraftForm(key, defaults) {
            let form;
            for (let index = 0; index < 3; index++) {
                cursor = 0;
                effects = [];
                form = exports.useDraftForm(key, defaults);
                effects.forEach((effect) => effect());
            }
            return { ...form, key: lastKey };
        },
        useDraftState(key, initial) {
            cursor = 0;
            return exports.useDraftState(key, initial);
        },
    };
}

test('history restores unsaved form fields and editor state on browser return', () => {
    const history = new Map([
        [
            'zouth:draft:funnel:1:initial:data',
            { name: 'Rascunho', steps: ['edited'] },
        ],
        ['zouth:draft:funnel-step:1:initial', 'step-2'],
    ]);
    const hooks = historyHooks(history);
    assert.equal(
        hooks.useDraftForm('funnel:1', { name: 'Salvo' }).data.name,
        'Rascunho',
    );
    assert.equal(hooks.useDraftState('funnel-step:1', 'step-1')[0], 'step-2');
    assert.equal(
        historyHooks(history).useDraftForm('funnel:2', { name: 'Outro funil' })
            .data.name,
        'Outro funil',
    );
});

test('explicit discard invalidates old drafts without repopulating the next history generation', () => {
    const history = new Map([
        ['zouth:draft:funnel:1:initial:data', { name: 'Rascunho' }],
    ]);
    const mounted = historyHooks(history);
    const originalKey = mounted.useDraftForm('funnel:1', { name: 'Salvo' }).key;
    mounted.discardPageDraftHistory();
    assert.equal(
        mounted.useDraftForm('funnel:1', { name: 'Salvo' }).key,
        originalKey,
    );
    const returned = historyHooks(history);
    assert.notEqual(
        returned.useDraftForm('funnel:1', { name: 'Salvo' }).key,
        originalKey,
    );
    assert.equal(
        returned.useDraftForm('funnel:1', { name: 'Salvo' }).data.name,
        'Salvo',
    );
});
