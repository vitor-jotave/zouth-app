import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

function loadHistory() {
    const exports = {};
    runInNewContext(
        ts.transpileModule(
            readFileSync(
                new URL(
                    '../resources/js/lib/editor-history.ts',
                    import.meta.url,
                ),
                'utf8',
            ),
            { compilerOptions: { module: ts.ModuleKind.CommonJS } },
        ).outputText,
        { exports, Blob, File, Date },
    );
    return exports;
}

const {
    createEditorHistory,
    recordEditorHistory,
    undoEditorHistory,
    redoEditorHistory,
    flushEditorHistory,
    equalEditorSnapshots,
} = loadHistory();

function historyHook(initial, enabled = true) {
    const cells = [];
    let cursor = 0;
    let effects = [];
    let dirty = true;
    let changes = 0;
    let props = { value: initial, enabled };
    const sameDependencies = (left, right) =>
        left?.length === right?.length &&
        left.every((value, index) => Object.is(value, right[index]));
    const react = {
        useState(initializer) {
            const index = cursor++;
            cells[index] ??= {
                value:
                    typeof initializer === 'function'
                        ? initializer()
                        : initializer,
                set(value) {
                    const next =
                        typeof value === 'function'
                            ? value(cells[index].value)
                            : value;
                    if (!Object.is(next, cells[index].value)) dirty = true;
                    cells[index].value = next;
                },
            };
            return [cells[index].value, cells[index].set];
        },
        useRef(initializer) {
            const index = cursor++;
            cells[index] ??= { current: initializer };
            return cells[index];
        },
        useCallback(callback, dependencies) {
            const index = cursor++;
            if (!sameDependencies(cells[index]?.dependencies, dependencies)) {
                cells[index] = { callback, dependencies };
            }
            return cells[index].callback;
        },
        useEffect(effect, dependencies) {
            const index = cursor++;
            if (!sameDependencies(cells[index]?.dependencies, dependencies)) {
                cells[index] = { dependencies };
                effects.push(effect);
            }
        },
    };
    const exports = {};
    runInNewContext(
        ts.transpileModule(
            readFileSync(
                new URL(
                    '../resources/js/hooks/use-editor-history.ts',
                    import.meta.url,
                ),
                'utf8',
            ),
            { compilerOptions: { module: ts.ModuleKind.CommonJS } },
        ).outputText,
        {
            exports,
            require: (name) => (name === 'react' ? react : loadHistory()),
        },
    );
    const onChange = (value) => {
        changes++;
        props = { ...props, value };
        dirty = true;
    };
    function render(nextProps = {}) {
        props = { ...props, ...nextProps };
        dirty = true;
        let result;
        let renders = 0;
        while (dirty) {
            assert.ok(
                ++renders < 20,
                'history effects must settle without a render loop',
            );
            dirty = false;
            cursor = 0;
            effects = [];
            result = exports.useEditorHistory({ ...props, onChange });
            effects.forEach((effect) => effect());
        }
        return result;
    }
    return { render, value: () => props.value, changes: () => changes };
}

test('undo and redo preserve the complete visual snapshot', () => {
    const original = {
        brand: 'Minha marca',
        sections: [{ enabled: true }],
        overlay: 0,
    };
    const changed = { ...original, overlay: 25 };
    const state = recordEditorHistory(createEditorHistory(original), changed);
    assert.ok(equalEditorSnapshots(state.present, changed));
    const undone = undoEditorHistory(state);
    assert.ok(equalEditorSnapshots(undone.present, original));
    assert.equal(undone.past.length, 0);
    assert.equal(undone.future.length, 1);
    assert.ok(equalEditorSnapshots(redoEditorHistory(undone).present, changed));
    assert.equal(undoEditorHistory(undone), undone);
    assert.equal(redoEditorHistory(state), state);
});

test('continuous typing and sliders become one step until a pause', () => {
    let state = createEditorHistory({ title: '' });
    state = recordEditorHistory(state, { title: 'O' }, { now: 100 });
    state = recordEditorHistory(state, { title: 'Olá' }, { now: 200 });
    state = recordEditorHistory(state, { title: 'Olá mundo' }, { now: 500 });
    assert.equal(state.past.length, 1);
    assert.equal(undoEditorHistory(state).present.title, '');
    state = recordEditorHistory(
        state,
        { title: 'Nova coleção' },
        { now: 1000 },
    );
    assert.equal(state.past.length, 2);
    assert.equal(undoEditorHistory(state).present.title, 'Olá mundo');
});

test('flushing and discrete actions keep rapid removals separate from text edits', () => {
    let state = createEditorHistory({ title: '', image: '/saved.jpg' });
    state = recordEditorHistory(
        state,
        { title: 'Coleção', image: '/saved.jpg' },
        { now: 100 },
    );
    state = flushEditorHistory(state);
    state = recordEditorHistory(
        state,
        { title: 'Coleção', image: null },
        { now: 150, coalesce: false },
    );
    state = recordEditorHistory(
        state,
        { title: 'Verão', image: null },
        { now: 200 },
    );
    assert.equal(state.past.length, 3);
    state = undoEditorHistory(state);
    assert.equal(state.present.title, 'Coleção');
    assert.equal(state.present.image, null);
    state = undoEditorHistory(state);
    assert.equal(state.present.image, '/saved.jpg');
});

test('pending files keep their identity through replacement undo and redo', () => {
    const first = new File(['logo one'], 'logo.png', { type: 'image/png' });
    const second = new File(['logo two'], 'logo.png', { type: 'image/png' });
    let state = createEditorHistory({ logo: first, nested: { cover: first } });
    state = recordEditorHistory(state, {
        logo: second,
        nested: { cover: first },
    });
    assert.equal(state.present.logo, second);
    assert.equal(state.present.nested.cover, first);
    state = undoEditorHistory(state);
    assert.equal(state.present.logo, first);
    assert.equal(redoEditorHistory(state).present.logo, second);
    assert.equal(equalEditorSnapshots(first, second), false);
});

test('snapshots are detached from later object mutations without serializing files or dates', () => {
    const date = new Date('2026-11-02T12:00:00Z');
    const source = {
        sections: [{ title: 'Antes' }],
        date,
        optional: undefined,
    };
    const state = createEditorHistory(source);
    source.sections[0].title = 'Depois';
    source.date.setFullYear(2030);
    assert.equal(state.present.sections[0].title, 'Antes');
    assert.equal(state.present.date.getFullYear(), 2026);
    assert.ok(Object.hasOwn(state.present, 'optional'));
    assert.equal(state.present.optional, undefined);
});

test('editing after undo discards the redo branch and does not merge into an old change', () => {
    let state = createEditorHistory(0);
    state = recordEditorHistory(state, 1, { now: 100 });
    state = recordEditorHistory(state, 2, { now: 600 });
    state = undoEditorHistory(state);
    state = recordEditorHistory(state, 3, { now: 610 });
    assert.equal(state.future.length, 0);
    assert.equal(undoEditorHistory(state).present, 1);
    assert.equal(state.past.length, 2);
});

test('history is bounded and resetting creates a clean published baseline', () => {
    let state = createEditorHistory(0, 3);
    for (let value = 1; value <= 10; value++) {
        state = recordEditorHistory(state, value, { coalesce: false });
    }
    assert.equal(state.past.length, 3);
    state = undoEditorHistory(undoEditorHistory(undoEditorHistory(state)));
    assert.equal(state.present, 7);
    assert.equal(state.future.length, 3);
    state = createEditorHistory(10, 3);
    assert.equal(state.past.length, 0);
    assert.equal(state.future.length, 0);
    assert.equal(state.present, 10);
});

test('equivalent values and a coalesced round trip do not produce phantom undo steps', () => {
    let state = createEditorHistory({ opacity: 0 });
    assert.equal(recordEditorHistory(state, { opacity: 0 }), state);
    state = recordEditorHistory(state, { opacity: 10 }, { now: 100 });
    state = recordEditorHistory(state, { opacity: 0 }, { now: 200 });
    assert.equal(state.past.length, 0);
    assert.equal(state.present.opacity, 0);
});

test('the hook does not record restored snapshots again or loop after undo and redo', () => {
    const hook = historyHook({ title: 'Antes' });
    assert.equal(hook.render().canUndo, false);
    let controls = hook.render({ value: { title: 'Depois' } });
    assert.equal(controls.canUndo, true);
    controls.undo();
    controls = hook.render();
    assert.equal(hook.value().title, 'Antes');
    assert.equal(controls.canUndo, false);
    assert.equal(controls.canRedo, true);
    controls.redo();
    controls = hook.render();
    assert.equal(hook.value().title, 'Depois');
    assert.equal(controls.canUndo, true);
    assert.equal(controls.canRedo, false);
    assert.equal(hook.changes(), 2);
});

test('disabled bootstrap accepts restored drafts as baseline and publication reset clears the hook history', () => {
    const hook = historyHook({ title: 'Publicado' }, false);
    hook.render();
    hook.render({ value: { title: 'Rascunho recuperado' } });
    let controls = hook.render({ enabled: true });
    assert.equal(controls.canUndo, false);
    controls.flush();
    controls = hook.render({ value: { title: 'Rascunho novo' } });
    assert.equal(controls.canUndo, true);
    controls.undo();
    controls = hook.render();
    assert.equal(hook.value().title, 'Rascunho recuperado');
    controls.reset();
    controls = hook.render();
    assert.equal(controls.canUndo, false);
    assert.equal(controls.canRedo, false);
    assert.equal(hook.changes(), 1);
});
