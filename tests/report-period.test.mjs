import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
runInNewContext(
    ts.transpileModule(
        readFileSync(
            new URL('../resources/js/lib/report-period.ts', import.meta.url),
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
const { reportPeriodError } = exports;

test('custom periods require both dates and reject reversed or future ranges', () => {
    assert.match(reportPeriodError('', '2026-11-02', '2026-11-02'), /Informe/);
    assert.match(
        reportPeriodError('2026-11-02', '2026-11-01', '2026-11-02'),
        /início/,
    );
    assert.match(
        reportPeriodError('2026-11-01', '2026-11-03', '2026-11-02'),
        /futuro/,
    );
    assert.equal(
        reportPeriodError('2026-10-27', '2026-11-02', '2026-11-02'),
        null,
    );
    assert.equal(
        reportPeriodError('2026-11-02', '2026-11-02', '2026-11-02'),
        null,
    );
});
