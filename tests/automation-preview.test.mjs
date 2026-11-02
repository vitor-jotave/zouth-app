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
                '../resources/js/lib/automation-preview.ts',
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
const { inspectAutomation, previewAutomation } = exports;
function flow() {
    return {
        nodes: [
            {
                id: 'start',
                kind: 'trigger',
                movement: 'message_received',
                position: { x: 500, y: 0 },
                data: { title: 'Início' },
            },
            {
                id: 'condition',
                kind: 'condition',
                movement: 'message_contains',
                position: { x: 100, y: 0 },
                data: {
                    title: 'Interesse',
                    keywords: ['preço', 'coleção'],
                    match: 'any',
                },
            },
            {
                id: 'send',
                kind: 'action',
                movement: 'send_funnel',
                position: { x: 0, y: 0 },
                data: { title: 'Enviar', funnel_id: 1 },
            },
            {
                id: 'wait',
                kind: 'action',
                movement: 'wait_reply',
                position: { x: 300, y: 0 },
                data: { title: 'Aguardar' },
            },
        ],
        edges: [
            { id: 'a', from: 'start', to: 'condition', branch: null },
            { id: 'b', from: 'condition', to: 'send', branch: 'sim' },
            { id: 'c', from: 'condition', to: 'wait', branch: 'não' },
        ],
    };
}
test('simulation follows connections rather than screen positions and evaluates accented keywords', () => {
    assert.equal(inspectAutomation(flow(), [{ id: 1 }]).length, 0);
    assert.equal(
        previewAutomation(flow(), 'Qual o PRECO?')
            .map((x) => x.id)
            .join(','),
        'start,condition,send',
    );
    assert.equal(
        previewAutomation(flow(), 'Bom dia')
            .map((x) => x.id)
            .join(','),
        'start,condition,wait',
    );
});
test('all keywords, case sensitivity and blank messages match runtime semantics', () => {
    const definition = flow();
    definition.nodes[1].data.match = 'all';
    assert.equal(previewAutomation(definition, 'preço')[2].id, 'wait');
    assert.equal(
        previewAutomation(definition, 'PRECO da COLECAO')[2].id,
        'send',
    );
    definition.nodes[1].data.case_sensitive = true;
    assert.equal(
        previewAutomation(definition, 'PRECO da COLECAO')[2].id,
        'wait',
    );
    assert.equal(previewAutomation(definition, '')[2].id, 'wait');
});
test('missing funnels, disconnected nodes, cycles, ambiguity and invalid branch labels are reported', () => {
    assert.match(inspectAutomation(flow(), []).join(' '), /funil ativo/);
    const disconnected = flow();
    disconnected.edges.pop();
    assert.match(
        inspectAutomation(disconnected, [{ id: 1 }]).join(' '),
        /desconectados/,
    );
    const cycle = flow();
    cycle.edges.push({ id: 'd', from: 'send', to: 'start', branch: null });
    assert.match(inspectAutomation(cycle, [{ id: 1 }]).join(' '), /circular/);
    assert.equal(previewAutomation(cycle, 'preço').length, 3);
    const ambiguous = flow();
    ambiguous.edges.push({ ...ambiguous.edges[1], id: 'duplicate' });
    assert.match(
        inspectAutomation(ambiguous, [{ id: 1 }]).join(' '),
        /mesmo caminho/,
    );
    const invalid = flow();
    invalid.edges[1].branch = null;
    assert.match(inspectAutomation(invalid, [{ id: 1 }]).join(' '), /saída/);
});
