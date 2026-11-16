import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';
import { jsx } from 'react/jsx-runtime';
import ts from 'typescript';

test('voice notes record and review inline before explicit send or discard', async () => {
    const source = readFileSync(
        new URL(
            '../resources/js/pages/manufacturer/atendimento/components/chat-attachments.tsx',
            import.meta.url,
        ),
        'utf8',
    );
    const exports = {};
    const hooks = [];
    const intervals = new Map();
    const Dialog = () => null;
    const VoiceMessagePreview = () => null;
    let cursor;
    let effects;
    let stopped = 0;
    let payload;

    runInNewContext(
        ts.transpileModule(source, {
            compilerOptions: {
                module: ts.ModuleKind.CommonJS,
                jsx: ts.JsxEmit.ReactJSX,
                target: ts.ScriptTarget.ES2022,
                esModuleInterop: true,
            },
        }).outputText,
        {
            exports,
            require: (name) => {
                if (name === 'react/jsx-runtime')
                    return { jsx, jsxs: jsx, Fragment: Symbol('fragment') };
                if (name === 'react')
                    return {
                        useRef: (current) => (hooks[cursor++] ??= { current }),
                        useState: (initial) => {
                            const slot = (hooks[cursor++] ??= {
                                value:
                                    typeof initial === 'function'
                                        ? initial()
                                        : initial,
                            });
                            return [
                                slot.value,
                                (next) => {
                                    slot.value =
                                        typeof next === 'function'
                                            ? next(slot.value)
                                            : next;
                                },
                            ];
                        },
                        useEffect: (effect, dependencies) => {
                            const slot = (hooks[cursor++] ??= {});
                            if (
                                dependencies.every(
                                    (value, index) =>
                                        slot.dependencies &&
                                        Object.is(
                                            slot.dependencies[index],
                                            value,
                                        ),
                                ) &&
                                slot.dependencies
                            )
                                return;
                            effects.push(() => {
                                slot.cleanup?.();
                                slot.dependencies = dependencies;
                                slot.cleanup = effect();
                            });
                        },
                    };
                if (name === '@/components/ui/dialog') return { Dialog };
                if (name === './voice-message-preview')
                    return { VoiceMessagePreview };
                if (name === '@/routes/manufacturer/atendimento')
                    return {
                        conversations: {
                            attachments: { url: () => '/test-upload' },
                        },
                    };
                return new Proxy({}, { get: () => () => null });
            },
            window: {
                isSecureContext: true,
                setInterval: (callback, delay) =>
                    intervals.set(delay, callback) && delay,
                clearInterval: (id) => intervals.delete(id),
            },
            navigator: {
                mediaDevices: {
                    getUserMedia: async () => ({
                        getTracks: () => [{ stop: () => stopped++ }],
                    }),
                },
            },
            AudioContext: class {
                createMediaStreamSource() {
                    return { connect() {} };
                }
                createAnalyser() {
                    return {
                        getByteTimeDomainData: (samples) => samples.fill(160),
                    };
                }
                async resume() {}
                async close() {}
            },
            MediaRecorder: class {
                static isTypeSupported() {
                    return true;
                }
                mimeType = 'audio/webm';
                start() {
                    this.state = 'recording';
                }
                stop() {
                    this.state = 'inactive';
                    this.ondataavailable({ data: new Blob(['voice']) });
                    this.onstop();
                }
            },
            File,
            FormData,
            Blob,
            performance,
            document: { cookie: '' },
            fetch: async (_url, request) => {
                payload = request.body;
                return { ok: true, json: async () => ({ message: { id: 9 } }) };
            },
        },
    );

    let sent;
    function render() {
        cursor = 0;
        effects = [];
        const tree = exports.ChatAttachments({
            conversationId: 12,
            children: jsx('textarea', {}),
            onSent: (...args) => {
                sent = args;
            },
        });
        effects.forEach((effect) => effect());
        const walk = (node) =>
            node?.props
                ? [node, ...[node.props.children].flat(Infinity).flatMap(walk)]
                : [];
        const elements = walk(tree);
        assert.equal(
            Boolean(elements.find(({ type }) => type === Dialog).props.open),
            false,
        );
        return elements;
    }
    function button(label) {
        const element = render().find(
            ({ props }) => props['aria-label'] === label,
        );
        assert.ok(element, label);
        return element.props.onClick;
    }

    button('Gravar áudio')();
    await setImmediate();
    button('Parar gravação');
    intervals.get(90)();
    assert.ok(
        render()
            .filter(({ type }) => type === 'rect')
            .some(({ props }) => props.height > 2),
    );
    button('Parar gravação')();
    assert.ok(render().some(({ type }) => type === VoiceMessagePreview));
    assert.equal(stopped, 1);
    assert.equal(payload, undefined);
    button('Descartar áudio')();
    button('Gravar áudio')();
    assert.equal(payload, undefined);
    await setImmediate();
    button('Parar gravação')();
    button('Enviar áudio')();
    await setImmediate();
    assert.equal(payload.get('recorded'), '1');
    assert.deepEqual(sent, [12, { id: 9 }]);
    button('Gravar áudio');
});
