import {
    FileText,
    LoaderCircle,
    Mic,
    Paperclip,
    Send,
    Square,
    Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import atendimento from '@/routes/manufacturer/atendimento';
import type { Message } from '../index';
import { VoiceMessagePreview } from './voice-message-preview';

const MAX_BYTES = 20 * 1024 * 1024;
const MAX_SECONDS = 300;
const WAVE_BARS = 32;
const formats = [
    'audio/webm;codecs=opus',
    'audio/mp4',
    'audio/ogg;codecs=opus',
];
const iconButton =
    'flex size-11 shrink-0 items-center justify-center rounded-sm border border-white/15 text-zouth-ivory hover:border-zouth-coral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zouth-coral disabled:opacity-40 sm:size-14';

function draftType(file: File) {
    return file.type.split('/')[0];
}

export function ChatAttachments({
    conversationId,
    disabled,
    onSent,
    children,
    hasText,
}: {
    conversationId: number;
    disabled: boolean;
    children: ReactNode;
    hasText: boolean;
    onSent: (conversationId: number, message: Message) => void;
}) {
    const picker = useRef<HTMLInputElement>(null);
    const recorder = useRef<MediaRecorder | null>(null);
    const stream = useRef<MediaStream | null>(null);
    const revision = useRef(0);
    const [recordingStream, setRecordingStream] = useState<MediaStream | null>(
        null,
    );
    const [wave, setWave] = useState<number[]>(() =>
        Array<number>(WAVE_BARS).fill(2),
    );
    const [open, setOpen] = useState(false);
    const [phase, setPhase] = useState<'waiting' | 'recording' | 'preview'>(
        'preview',
    );
    const [draft, setDraft] = useState<{
        file: File;
        recorded: boolean;
    } | null>(null);
    const [error, setError] = useState('');
    const [seconds, setSeconds] = useState(0);
    const [sending, setSending] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(
        () => () => {
            revision.current++;
            if (recorder.current && recorder.current.state !== 'inactive')
                recorder.current.stop();
            stream.current?.getTracks().forEach((track) => track.stop());
        },
        [],
    );

    useEffect(() => {
        if (!previewUrl) return;
        return () => URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    useEffect(() => {
        if (phase !== 'recording') return;
        const start = performance.now();
        const timer = window.setInterval(() => {
            const elapsed = Math.min(
                MAX_SECONDS,
                Math.floor((performance.now() - start) / 1000),
            );
            setSeconds(elapsed);
            if (
                elapsed >= MAX_SECONDS &&
                recorder.current?.state === 'recording'
            )
                recorder.current.stop();
        }, 250);
        return () => window.clearInterval(timer);
    }, [phase]);

    useEffect(() => {
        if (!recordingStream || typeof AudioContext === 'undefined') return;
        let context: AudioContext | undefined;
        let timer: number | undefined;
        try {
            context = new AudioContext();
            const input = context.createMediaStreamSource(recordingStream);
            const analyser = context.createAnalyser();
            analyser.fftSize = 512;
            input.connect(analyser);
            const samples = new Uint8Array(analyser.fftSize);
            void context.resume().catch(() => {});
            timer = window.setInterval(() => {
                analyser.getByteTimeDomainData(samples);
                const rms = Math.sqrt(
                    samples.reduce(
                        (sum, sample) => sum + ((sample - 128) / 128) ** 2,
                        0,
                    ) / samples.length,
                );
                setWave((previous) => [
                    ...previous.slice(1),
                    Math.min(26, Math.max(2, rms * 115)),
                ]);
            }, 90);
        } catch {
            // Capturing the voice message can continue without visualization.
        }

        return () => {
            if (timer !== undefined) window.clearInterval(timer);
            if (context && context.state !== 'closed')
                void context.close().catch(() => {});
        };
    }, [recordingStream]);

    function discard() {
        if (sending) return;
        revision.current++;
        if (recorder.current && recorder.current.state !== 'inactive')
            recorder.current.stop();
        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = null;
        recorder.current = null;
        setRecordingStream(null);
        setOpen(false);
        setDraft(null);
        setPreviewUrl(null);
        setError('');
        setPhase('preview');
    }

    async function startRecording() {
        const request = ++revision.current;
        setDraft(null);
        setError('');
        setSeconds(0);
        setWave(Array<number>(WAVE_BARS).fill(2));
        setPhase('waiting');

        if (
            !window.isSecureContext ||
            !navigator.mediaDevices?.getUserMedia ||
            typeof MediaRecorder === 'undefined'
        ) {
            setError(
                'Para gravar áudio, abra o Chat em HTTPS em um navegador compatível.',
            );
            setPhase('preview');
            return;
        }

        try {
            const microphone = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            if (revision.current !== request) {
                microphone.getTracks().forEach((track) => track.stop());
                return;
            }
            stream.current = microphone;
            const mimeType =
                typeof MediaRecorder.isTypeSupported === 'function'
                    ? formats.find((type) =>
                          MediaRecorder.isTypeSupported(type),
                      )
                    : undefined;
            const capture = new MediaRecorder(
                microphone,
                mimeType ? { mimeType } : undefined,
            );
            recorder.current = capture;
            const chunks: Blob[] = [];
            capture.ondataavailable = (event) => {
                if (event.data.size > 0) chunks.push(event.data);
            };
            capture.onerror = () => {
                if (revision.current !== request) return;
                revision.current++;
                microphone.getTracks().forEach((track) => track.stop());
                recorder.current = null;
                stream.current = null;
                setRecordingStream(null);
                setError('A gravação foi interrompida. Tente novamente.');
                setPhase('preview');
            };
            capture.onstop = () => {
                microphone.getTracks().forEach((track) => track.stop());
                if (revision.current !== request) return;
                recorder.current = null;
                stream.current = null;
                setRecordingStream(null);
                const type = (
                    capture.mimeType ||
                    chunks[0]?.type ||
                    'audio/webm'
                ).split(';')[0];
                const extension = type.includes('mp4')
                    ? 'm4a'
                    : type.includes('ogg')
                      ? 'ogg'
                      : 'webm';
                const file = new File(chunks, `mensagem-de-voz.${extension}`, {
                    type,
                });
                if (file.size > 0 && file.size <= MAX_BYTES)
                    setDraft({ file, recorded: true });
                else
                    setError(
                        file.size === 0
                            ? 'Nenhum áudio foi gravado. Tente novamente.'
                            : 'A gravação excedeu 20 MB. Grave um áudio mais curto.',
                    );
                setPhase('preview');
            };
            capture.start();
            setRecordingStream(microphone);
            setPhase('recording');
        } catch {
            if (revision.current !== request) return;
            stream.current?.getTracks().forEach((track) => track.stop());
            recorder.current = null;
            stream.current = null;
            setError(
                'Não foi possível acessar o microfone. Verifique a permissão do navegador.',
            );
            setPhase('preview');
        }
    }

    async function send() {
        if (!draft || sending || disabled) return;
        setSending(true);
        setError('');
        try {
            const data = new FormData();
            data.append('attachment', draft.file);
            if (draft.recorded) data.append('recorded', '1');
            const csrf = document.cookie
                .split('; ')
                .find((cookie) => cookie.startsWith('XSRF-TOKEN='));
            const response = await fetch(
                atendimento.conversations.attachments.url(conversationId),
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-XSRF-TOKEN': decodeURIComponent(
                            csrf?.slice('XSRF-TOKEN='.length) ?? '',
                        ),
                    },
                    body: data,
                },
            );
            const payload = await response.json();
            if (!response.ok) {
                const message =
                    payload.errors?.attachment?.[0] ?? payload.message;
                setError(
                    response.status === 413
                        ? 'Selecione um arquivo de até 20 MB.'
                        : typeof message === 'string'
                          ? message
                          : 'Não foi possível enviar o anexo.',
                );
                return;
            }
            onSent(conversationId, payload.message);
            setOpen(false);
            setDraft(null);
            setPreviewUrl(null);
        } catch {
            setError(
                'Não foi possível confirmar o envio. Confira o histórico antes de tentar de novo.',
            );
        } finally {
            setSending(false);
        }
    }

    const recordingVoice = phase !== 'preview' || draft?.recorded;

    return (
        <div className="grid w-full min-w-0 gap-2">
            {recordingVoice ? (
                <div className="flex min-h-14 min-w-0 items-center gap-2 rounded-sm border border-white/15 bg-[#101015] px-2 sm:px-3">
                    <button
                        type="button"
                        className="grid size-10 shrink-0 place-items-center rounded-sm text-zouth-warm-gray hover:text-zouth-coral focus-visible:outline-2 disabled:opacity-40"
                        aria-label="Descartar áudio"
                        onClick={discard}
                        disabled={sending}
                    >
                        <Trash2 className="size-5" aria-hidden="true" />
                    </button>
                    {phase === 'waiting' ? (
                        <p
                            role="status"
                            className="min-w-0 flex-1 text-xs text-zouth-warm-gray"
                        >
                            Aguardando microfone…
                        </p>
                    ) : phase === 'recording' ? (
                        <>
                            <span
                                className="size-2 shrink-0 rounded-full bg-zouth-coral"
                                aria-hidden="true"
                            />
                            <span role="status" className="sr-only">
                                Gravando áudio
                            </span>
                            <span className="shrink-0 text-sm font-semibold text-zouth-ivory tabular-nums">
                                {Math.floor(seconds / 60)}:
                                {String(seconds % 60).padStart(2, '0')}
                            </span>
                            <svg
                                viewBox={`0 0 ${WAVE_BARS * 4} 28`}
                                preserveAspectRatio="none"
                                className="h-7 min-w-0 flex-1 fill-zouth-coral"
                                aria-hidden="true"
                            >
                                {wave.map((height, index) => (
                                    <rect
                                        key={index}
                                        x={index * 4}
                                        y={(28 - height) / 2}
                                        width="2.25"
                                        height={height}
                                        rx="1.1"
                                    />
                                ))}
                            </svg>
                            <button
                                type="button"
                                className="grid size-10 shrink-0 place-items-center rounded-sm text-zouth-coral hover:bg-white/10 focus-visible:outline-2"
                                aria-label="Parar gravação"
                                onClick={() => {
                                    if (recorder.current?.state === 'recording')
                                        recorder.current.stop();
                                }}
                            >
                                <Square className="size-5" aria-hidden="true" />
                            </button>
                        </>
                    ) : draft?.recorded ? (
                        <>
                            <div className="min-w-0 flex-1 overflow-hidden">
                                <VoiceMessagePreview
                                    file={draft.file}
                                    appearance="outgoing"
                                />
                            </div>
                            <button
                                type="button"
                                className="grid size-10 shrink-0 place-items-center rounded-sm bg-zouth-coral text-[#18181f] hover:bg-[#ff6a5c] focus-visible:outline-2 disabled:opacity-40"
                                aria-label={
                                    sending ? 'Enviando áudio' : 'Enviar áudio'
                                }
                                disabled={sending || disabled}
                                onClick={() => void send()}
                            >
                                {sending ? (
                                    <LoaderCircle
                                        className="size-5 motion-safe:animate-spin"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <Send
                                        className="size-5"
                                        aria-hidden="true"
                                    />
                                )}
                            </button>
                        </>
                    ) : null}
                </div>
            ) : (
                <div className="flex min-w-0 items-end gap-2">
                    <input
                        ref={picker}
                        type="file"
                        className="hidden"
                        accept="image/jpeg,image/png,image/webp,audio/*,video/mp4,video/quicktime,video/webm,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                        onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            event.currentTarget.value = '';
                            if (!file) return;
                            setPreviewUrl(
                                file.size > 0 &&
                                    file.size <= MAX_BYTES &&
                                    ['image', 'video'].includes(draftType(file))
                                    ? URL.createObjectURL(file)
                                    : null,
                            );
                            setDraft(
                                file.size > 0 && file.size <= MAX_BYTES
                                    ? { file, recorded: false }
                                    : null,
                            );
                            setError(
                                file.size === 0
                                    ? 'O arquivo está vazio.'
                                    : file.size > MAX_BYTES
                                      ? 'Selecione um arquivo de até 20 MB.'
                                      : '',
                            );
                            setPhase('preview');
                            setOpen(true);
                        }}
                    />
                    <button
                        type="button"
                        className={iconButton}
                        disabled={disabled}
                        aria-label="Anexar arquivo"
                        title="Anexar arquivo"
                        onClick={() => picker.current?.click()}
                    >
                        <Paperclip className="size-5" aria-hidden="true" />
                    </button>
                    {children}
                    {!hasText && (
                        <button
                            type="button"
                            className={`${iconButton} border-zouth-coral bg-zouth-coral text-[#18181f] hover:bg-[#ff6a5c]`}
                            disabled={disabled}
                            aria-label="Gravar áudio"
                            title="Gravar áudio"
                            onClick={() => void startRecording()}
                        >
                            <Mic className="size-5" aria-hidden="true" />
                        </button>
                    )}
                </div>
            )}
            {!open && error && (
                <p role="alert" className="text-xs text-zouth-coral">
                    {error}
                </p>
            )}
            <Dialog
                open={open && !recordingVoice}
                onOpenChange={(value) => {
                    if (!value) discard();
                }}
            >
                <DialogContent
                    data-theme="dark"
                    className="max-h-[85svh] overflow-y-auto border-white/15 bg-[#18181f] text-zouth-ivory sm:max-w-lg"
                >
                    <DialogHeader>
                        <DialogTitle>Enviar anexo</DialogTitle>
                        <DialogDescription className="text-zouth-warm-gray">
                            Nada é enviado até você confirmar.
                        </DialogDescription>
                    </DialogHeader>
                    {draft && (
                        <div className="grid min-w-0 gap-3">
                            <div className="flex min-w-0 items-center gap-2 text-sm">
                                <FileText
                                    className="size-4 shrink-0"
                                    aria-hidden="true"
                                />
                                <span className="min-w-0 break-all">
                                    {draft.file.name}
                                </span>
                            </div>
                            {(draft.recorded ||
                                draftType(draft.file) === 'audio') && (
                                <VoiceMessagePreview file={draft.file} />
                            )}
                            {previewUrl &&
                                draftType(draft.file) === 'image' && (
                                    <img
                                        src={previewUrl}
                                        alt="Prévia do anexo"
                                        className="max-h-56 w-full object-contain"
                                    />
                                )}
                            {previewUrl &&
                                draftType(draft.file) === 'video' && (
                                    <video
                                        src={previewUrl}
                                        controls
                                        preload="metadata"
                                        className="max-h-56 w-full"
                                    />
                                )}
                        </div>
                    )}
                    {error && (
                        <p role="alert" className="text-sm text-zouth-coral">
                            {error}
                        </p>
                    )}
                    <div className="flex flex-wrap justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={discard}
                            disabled={sending}
                        >
                            <Trash2 className="size-4" aria-hidden="true" />{' '}
                            {draft || phase === 'recording'
                                ? 'Descartar'
                                : 'Fechar'}
                        </Button>
                        {draft && (
                            <Button
                                type="button"
                                className="bg-zouth-coral text-[#18181f] hover:bg-[#f23c2e]"
                                onClick={() => void send()}
                                disabled={sending || disabled}
                            >
                                {sending ? (
                                    <LoaderCircle
                                        className="size-4 motion-safe:animate-spin"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <Send
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                )}
                                {sending
                                    ? 'Enviando…'
                                    : draft.recorded
                                      ? 'Enviar áudio'
                                      : 'Enviar arquivo'}
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
