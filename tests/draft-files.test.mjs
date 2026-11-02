import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const exports = {};
runInNewContext(
    ts.transpileModule(
        readFileSync(
            new URL('../resources/js/lib/draft-files.ts', import.meta.url),
            'utf8',
        ),
        {
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                target: ts.ScriptTarget.ES2022,
            },
        },
    ).outputText,
    { exports, Blob, crypto },
);

test('nested campaign and audio files stay in memory while history stores only serializable references', () => {
    const photo = new File(['photo'], 'campaign.png', { type: 'image/png' });
    const audio = new File(['audio'], 'voice.ogg', { type: 'audio/ogg' });
    const serialized = exports.serializeDraft({
        name: 'Coleção',
        cover_image: photo,
        steps: [{ audio_file: audio, body: 'Olá' }],
    });
    const history = JSON.parse(JSON.stringify(serialized));
    assert.equal(JSON.stringify(history).includes('campaign.png'), false);
    const restored = exports.restoreDraft(history);
    assert.equal(restored.cover_image, photo);
    assert.equal(restored.steps[0].audio_file, audio);
    assert.equal(restored.steps[0].body, 'Olá');
    assert.equal(
        exports.serializeDraft(photo).__zouthDraftFile,
        serialized.cover_image.__zouthDraftFile,
    );
    assert.equal(exports.restoreDraft({ __zouthDraftFile: 'missing' }), null);
});

test('file recovery also works on local HTTP without crypto.randomUUID', () => {
    const fallback = {};
    runInNewContext(
        ts.transpileModule(
            readFileSync(
                new URL('../resources/js/lib/draft-files.ts', import.meta.url),
                'utf8',
            ),
            {
                compilerOptions: {
                    module: ts.ModuleKind.CommonJS,
                    target: ts.ScriptTarget.ES2022,
                },
            },
        ).outputText,
        { exports: fallback, Blob },
    );
    const file = new File(['image'], 'cover.png');
    const value = fallback.serializeDraft(file);
    assert.equal(typeof value.__zouthDraftFile, 'string');
    assert.equal(
        fallback.restoreDraft(JSON.parse(JSON.stringify(value))),
        file,
    );
});
