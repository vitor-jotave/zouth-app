import { Mic, Pause, Play } from 'lucide-react';
import {
    type MouseEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const WAVEFORM_BAR_COUNT = 48;

interface VoiceMessagePreviewProps {
    appearance?: 'preview' | 'incoming' | 'outgoing';
    file?: File | null;
    profileName?: string | null;
    profilePictureUrl?: string | null;
    sourceUrl?: string | null;
    timestamp?: string | null;
}

interface WaveformState {
    source: string;
    values: number[];
}

function formatDuration(value: number): string {
    if (!Number.isFinite(value) || value < 0) {
        return '0:00';
    }

    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function initials(name?: string | null): string {
    const value = name?.trim();

    if (!value) {
        return 'Z';
    }

    return value
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

function sampleWaveform(audioBuffer: AudioBuffer): number[] {
    const channel = audioBuffer.getChannelData(0);
    const blockSize = Math.max(
        1,
        Math.floor(channel.length / WAVEFORM_BAR_COUNT),
    );
    const samples = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, index) => {
        const start = index * blockSize;
        const end = Math.min(start + blockSize, channel.length);
        let energy = 0;

        for (let cursor = start; cursor < end; cursor += 1) {
            energy += channel[cursor] ** 2;
        }

        return Math.sqrt(energy / Math.max(1, end - start));
    });
    const highestPeak = Math.max(...samples, 0.01);

    return samples.map((sample) =>
        Math.max(0.14, Math.pow(sample / highestPeak, 0.8)),
    );
}

export function VoiceMessagePreview({
    appearance = 'preview',
    file,
    profileName,
    profilePictureUrl,
    sourceUrl,
    timestamp,
}: VoiceMessagePreviewProps) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [waveform, setWaveform] = useState<WaveformState | null>(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [sentAt] = useState(() =>
        new Intl.DateTimeFormat('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date()),
    );
    const objectUrl = useMemo(
        () => (file ? URL.createObjectURL(file) : null),
        [file],
    );
    const source = objectUrl ?? sourceUrl ?? '';
    const waveformValues = waveform?.source === source ? waveform.values : null;
    const isPreview = appearance === 'preview';
    const showsAvatar = appearance !== 'outgoing';
    const playedColor = isPreview ? '#10bd68' : '#ff4d3d';
    const restingColor = isPreview ? '#cfd3d4' : '#77776f';
    const messageTime = timestamp || sentAt;

    useEffect(() => {
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [objectUrl]);

    useEffect(() => {
        setCurrentTime(0);
        setIsPlaying(false);

        if (!source) {
            setWaveform(null);
            setDuration(0);

            return;
        }

        const abortController = new AbortController();
        let audioContext: AudioContext | null = null;

        const loadWaveform = async () => {
            const response = await fetch(source, {
                credentials: 'same-origin',
                signal: abortController.signal,
            });

            if (!response.ok) {
                throw new Error('Não foi possível carregar a mensagem de voz.');
            }

            const audioData = await response.arrayBuffer();
            audioContext = new AudioContext();
            const decodedAudio = await audioContext.decodeAudioData(audioData);

            if (!abortController.signal.aborted) {
                setWaveform({
                    source,
                    values: sampleWaveform(decodedAudio),
                });
                setDuration(decodedAudio.duration);
            }

            await audioContext.close();
            audioContext = null;
        };

        void loadWaveform().catch(() => undefined);

        return () => {
            abortController.abort();
            void audioContext?.close();
        };
    }, [source]);

    const drawWaveform = useCallback(() => {
        const canvas = canvasRef.current;

        if (!canvas) {
            return;
        }

        const context = canvas.getContext('2d');

        if (!context) {
            return;
        }

        const bounds = canvas.getBoundingClientRect();
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
        canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        context.clearRect(0, 0, bounds.width, bounds.height);

        if (!waveformValues?.length) {
            return;
        }

        const horizontalInset = 8;
        const gap = 3;
        const barWidth = Math.max(
            2,
            (bounds.width -
                horizontalInset * 2 -
                gap * (waveformValues.length - 1)) /
                waveformValues.length,
        );
        const waveformWidth =
            barWidth * waveformValues.length +
            gap * (waveformValues.length - 1);
        const startX = horizontalInset;
        const progress = duration > 0 ? currentTime / duration : 0;

        context.lineCap = 'round';
        context.lineWidth = barWidth;

        waveformValues.forEach((value, index) => {
            const x = startX + index * (barWidth + gap) + barWidth / 2;
            const height = Math.max(5, value * (bounds.height - 6));
            const completed = index / waveformValues.length <= progress;

            context.strokeStyle = completed ? playedColor : restingColor;
            context.beginPath();
            context.moveTo(x, (bounds.height - height) / 2);
            context.lineTo(x, (bounds.height + height) / 2);
            context.stroke();
        });

        const playheadX =
            startX +
            Math.min(1, Math.max(0, progress)) * (waveformWidth - barWidth);
        context.fillStyle = playedColor;
        context.beginPath();
        context.arc(playheadX, bounds.height / 2, 7, 0, Math.PI * 2);
        context.fill();
    }, [currentTime, duration, playedColor, restingColor, waveformValues]);

    useEffect(() => {
        drawWaveform();
        window.addEventListener('resize', drawWaveform);

        return () => window.removeEventListener('resize', drawWaveform);
    }, [drawWaveform]);

    const togglePlayback = async () => {
        const audio = audioRef.current;

        if (!audio || !source) {
            return;
        }

        if (audio.paused) {
            await audio.play();
        } else {
            audio.pause();
        }
    };

    const seek = (event: MouseEvent<HTMLButtonElement>) => {
        const audio = audioRef.current;

        if (!audio || !duration) {
            return;
        }

        const bounds = event.currentTarget.getBoundingClientRect();
        const ratio = Math.min(
            1,
            Math.max(0, (event.clientX - bounds.left) / bounds.width),
        );
        audio.currentTime = ratio * duration;
        setCurrentTime(audio.currentTime);
    };

    return (
        <div
            data-testid="voice-message-preview"
            data-appearance={appearance}
            className={
                isPreview
                    ? 'ml-auto w-full max-w-[390px] rounded-[18px] border border-[#deded8] bg-[#f8f9f6] px-4 py-3 text-[#171817] shadow-[0_1px_0_rgba(0,0,0,0.08)]'
                    : `w-[min(24rem,78vw)] rounded-[2px] border px-4 py-3 text-[#f6f4f0] ${appearance === 'outgoing' ? 'border-[#ff4d3d]/30 bg-[#5a2a4f]/28' : 'border-[#f6f4f0]/14 bg-[#18181f]'}`
            }
        >
            <audio
                ref={audioRef}
                className="hidden"
                src={source || undefined}
                preload="metadata"
                onLoadedMetadata={(event) =>
                    setDuration(event.currentTarget.duration)
                }
                onTimeUpdate={(event) =>
                    setCurrentTime(event.currentTarget.currentTime)
                }
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                }}
            />

            <div
                className={`grid items-center gap-3 ${!showsAvatar ? 'grid-cols-[36px_minmax(0,1fr)]' : isPreview ? 'grid-cols-[36px_minmax(0,1fr)_58px]' : 'grid-cols-[36px_minmax(0,1fr)_48px]'}`}
            >
                <button
                    type="button"
                    disabled={!source}
                    onClick={() => void togglePlayback()}
                    aria-label={
                        isPlaying
                            ? 'Pausar mensagem de voz'
                            : 'Ouvir mensagem de voz'
                    }
                    className={`flex size-9 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-zouth-coral focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-35 ${isPreview ? 'text-[#111211] hover:bg-black/[0.05]' : 'text-[#f6f4f0] hover:bg-white/[0.06]'}`}
                >
                    {isPlaying ? (
                        <Pause className="size-6 fill-current" />
                    ) : (
                        <Play className="size-6 fill-current" />
                    )}
                </button>

                <div className="min-w-0">
                    <button
                        type="button"
                        disabled={!source || !duration}
                        onClick={seek}
                        aria-label="Escolher posição da mensagem de voz"
                        className="block h-11 w-full focus-visible:ring-2 focus-visible:ring-zouth-coral focus-visible:outline-none disabled:cursor-default"
                    >
                        <canvas
                            ref={canvasRef}
                            aria-hidden="true"
                            className="h-11 w-full"
                        />
                    </button>
                    <div
                        className={`mt-0.5 flex items-center justify-between text-xs ${isPreview ? 'text-[#6f7475]' : 'text-[#98968d]'}`}
                    >
                        <span>
                            {formatDuration(
                                isPlaying || currentTime > 0
                                    ? currentTime
                                    : duration,
                            )}
                        </span>
                        <span>{messageTime}</span>
                    </div>
                </div>

                {showsAvatar && (
                    <div className="relative">
                        <Avatar
                            className={`${isPreview ? 'size-14' : 'size-12'} border border-black/5`}
                        >
                            <AvatarImage
                                src={profilePictureUrl || undefined}
                                alt={
                                    profileName ||
                                    (isPreview
                                        ? 'Foto do número conectado'
                                        : 'Foto do contato')
                                }
                                className="object-cover"
                            />
                            <AvatarFallback className="bg-zouth-charcoal font-zouth-display font-semibold text-zouth-ivory">
                                {initials(profileName)}
                            </AvatarFallback>
                        </Avatar>
                        <span
                            className={`absolute -bottom-1 -left-1 flex size-6 items-center justify-center rounded-full border-2 text-white ${isPreview ? 'border-[#f8f9f6] bg-[#10bd68]' : 'border-[#18181f] bg-[#ff4d3d]'}`}
                        >
                            <Mic className="size-3.5" strokeWidth={3} />
                        </span>
                    </div>
                )}
            </div>

            {!source && (
                <p
                    className={`mt-2 text-center text-xs ${isPreview ? 'text-[#6f7475]' : 'text-[#98968d]'}`}
                >
                    Escolha uma mensagem de voz para ver a prévia.
                </p>
            )}
        </div>
    );
}
