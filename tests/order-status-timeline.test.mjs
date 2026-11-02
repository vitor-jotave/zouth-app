import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
runInNewContext(
    ts.transpileModule(
        readFileSync(
            new URL(
                '../resources/js/lib/order-status-timeline.ts',
                import.meta.url,
            ),
            'utf8',
        ),
        {
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2022,
            },
        },
    ).outputText,
    { exports },
);
const { orderStatusTimeline, isCurrentStatusMovement } = exports;

test('keeps repeated statuses and sorts same-second movements by their immutable ID', () => {
    const history = [
        { id: 3, to_status: 'confirmed', created_at: '2026-11-02T10:00:00Z' },
        { id: 1, to_status: 'confirmed', created_at: '2026-11-02T10:00:00Z' },
        { id: 4, to_status: 'new', created_at: '2026-11-02T10:01:00Z' },
        { id: 2, to_status: 'preparing', created_at: '2026-11-02T10:00:00Z' },
    ];
    const sorted = orderStatusTimeline(history);
    assert.deepEqual(
        Array.from(sorted, (entry) => entry.id),
        [1, 2, 3, 4],
    );
    assert.deepEqual(
        history.map((entry) => entry.id),
        [3, 1, 4, 2],
    );
    assert.equal(
        isCurrentStatusMovement(sorted[0], sorted, 'confirmed'),
        false,
    );
    assert.equal(isCurrentStatusMovement(sorted[3], sorted, 'new'), true);
    assert.equal(
        isCurrentStatusMovement(sorted[3], sorted, 'delivered'),
        false,
    );
    assert.equal(orderStatusTimeline([]).length, 0);
});
