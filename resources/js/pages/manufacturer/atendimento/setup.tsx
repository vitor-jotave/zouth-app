import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    Clock3,
    LoaderCircle,
    MessageCircle,
    MessageSquare,
    QrCode,
    RadioTower,
    RefreshCw,
    Smartphone,
    Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AppLayout from '@/layouts/app-layout';
import atendimento from '@/routes/manufacturer/atendimento';
import instances from '@/routes/manufacturer/atendimento/instances';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Chat', href: atendimento.index().url },
    { title: 'Canais', href: atendimento.channels().url },
];

interface Instance {
    id: number;
    instance_name: string;
    status: 'disconnected' | 'connecting' | 'connected';
    phone_number: string | null;
    profile_name: string | null;
    profile_picture_url: string | null;
    conversation_count: number;
    last_activity_at: string | null;
}

interface Props {
    connection_key: string;
    instance: Instance | null;
}

function initials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('');
}

function formatPhoneNumber(phoneNumber: string | null): string {
    if (!phoneNumber) {
        return 'Número conectado';
    }

    return phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
}

function formatLastActivity(value: string | null): string {
    if (!value) {
        return 'Ainda sem conversas';
    }

    const date = new Date(value);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    return isToday
        ? date.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
          })
        : date.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
          });
}

export default function AtendimentoSetup({ connection_key, instance }: Props) {
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [polling, setPolling] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(
        instance?.status ?? 'disconnected',
    );
    const [profileInfo, setProfileInfo] = useState({
        phone_number: instance?.phone_number ?? null,
        profile_name: instance?.profile_name ?? null,
        profile_picture_url: instance?.profile_picture_url ?? null,
    });
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const createForm = useForm({
        instance_name: connection_key,
    });

    const handleCreate = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        createForm.post(instances.store().url, {
            preserveScroll: true,
        });
    };

    const fetchQrCode = useCallback(async () => {
        if (!instance) {
            return;
        }

        try {
            const response = await fetch(instances.qr(instance).url, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (response.ok) {
                const data = await response.json();

                if (data.base64) {
                    setQrCode(data.base64);
                }

                if (data.status) {
                    setCurrentStatus(data.status);
                }
            }
        } catch {
            setQrCode(null);
        }
    }, [instance]);

    const pollStatus = useCallback(async () => {
        if (!instance) {
            return;
        }

        try {
            const response = await fetch(instances.status(instance).url, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setCurrentStatus(data.status);
                setProfileInfo({
                    phone_number: data.phone_number,
                    profile_name: data.profile_name,
                    profile_picture_url: data.profile_picture_url,
                });

                if (data.status === 'connected') {
                    setPolling(false);
                }
            }
        } finally {
            setCheckingStatus(false);
        }
    }, [instance]);

    useEffect(() => {
        if (instance && currentStatus !== 'connected') {
            setPolling(true);
            fetchQrCode();
        }
    }, [instance, currentStatus, fetchQrCode]);

    useEffect(() => {
        if (!polling) {
            if (pollRef.current) {
                clearInterval(pollRef.current);
            }

            return;
        }

        pollRef.current = setInterval(() => {
            pollStatus();

            if (!qrCode) {
                fetchQrCode();
            }
        }, 3000);

        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
            }
        };
    }, [fetchQrCode, pollStatus, polling, qrCode]);

    const handleCheckStatus = () => {
        setCheckingStatus(true);
        pollStatus();
    };

    const handleDisconnect = () => {
        if (!instance) {
            return;
        }

        if (
            !confirm(
                'Desconectar este canal? As conversas continuarão salvas na Zouth.',
            )
        ) {
            return;
        }

        router.delete(instances.destroy(instance).url, {
            preserveScroll: true,
        });
    };

    const channelName = profileInfo.profile_name ?? 'Canal da marca';
    const isConnected = instance && currentStatus === 'connected';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Canais" />
            <main className="min-h-[calc(100vh-4rem)] bg-[#101015] font-zouth-body text-[#f6f4f0]">
                <div className="mx-auto w-full max-w-[96rem] px-6 py-10 sm:px-8 lg:px-12 lg:py-14 xl:px-16">
                    <header className="max-w-3xl">
                        <p className="text-[0.68rem] font-bold tracking-[0.23em] text-[#ff4d3d] uppercase">
                            Atendimento
                        </p>
                        <h1 className="mt-3 font-zouth-display text-5xl leading-[0.92] font-semibold tracking-[-0.065em] sm:text-6xl lg:text-[5.4rem]">
                            Canais<span className="text-[#ff4d3d]">.</span>
                        </h1>
                        <p className="mt-6 max-w-2xl text-base leading-7 text-[#98968d] sm:text-lg">
                            Conecte o número oficial da whatsapp da sua marca
                            para atender seus clientes pelo chat.
                        </p>
                    </header>

                    <div className="mt-12 border-t border-[#f6f4f0]/14 lg:mt-14">
                        {!instance && (
                            <section className="grid min-h-[28rem] gap-10 border-b border-[#f6f4f0]/14 py-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(24rem,1.15fr)] lg:items-center lg:py-14">
                                <div>
                                    <p className="text-[0.66rem] font-bold tracking-[0.2em] text-[#98968d] uppercase">
                                        Primeiro canal
                                    </p>
                                    <span className="mt-7 flex size-20 items-center justify-center rounded-full border border-[#f6f4f0]/18 text-[#ff4d3d]">
                                        <RadioTower className="size-8" />
                                    </span>
                                </div>

                                <div className="max-w-2xl lg:border-l lg:border-[#f6f4f0]/14 lg:pl-12">
                                    <h2 className="font-zouth-display text-4xl leading-[0.98] font-semibold tracking-[-0.05em] sm:text-5xl">
                                        Abra uma nova frente de conversa
                                        <span className="text-[#ff4d3d]">
                                            .
                                        </span>
                                    </h2>
                                    <p className="mt-5 max-w-xl leading-7 text-[#98968d]">
                                        Conecte o WhatsApp da marca uma única
                                        vez. Depois disso, sua equipe atende,
                                        apresenta produtos e acompanha cada
                                        oportunidade direto no Chat.
                                    </p>
                                    <form
                                        onSubmit={handleCreate}
                                        className="mt-8"
                                    >
                                        <button
                                            type="submit"
                                            disabled={createForm.processing}
                                            className="inline-flex min-h-14 items-center gap-5 rounded-[2px] bg-[#ff4d3d] px-6 text-sm font-bold text-[#18181f] transition-colors hover:bg-[#ff6a5c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d] disabled:cursor-wait disabled:opacity-60"
                                        >
                                            {createForm.processing ? (
                                                <LoaderCircle className="size-5 animate-spin" />
                                            ) : (
                                                <Smartphone className="size-5" />
                                            )}
                                            Conectar meu número
                                            <ArrowRight className="size-5" />
                                        </button>
                                        {createForm.errors.instance_name && (
                                            <p className="mt-4 text-sm text-[#ff776b]">
                                                Não foi possível iniciar a
                                                conexão. Tente novamente.
                                            </p>
                                        )}
                                    </form>
                                </div>
                            </section>
                        )}

                        {instance && !isConnected && (
                            <section className="grid gap-10 border-b border-[#f6f4f0]/14 py-10 lg:grid-cols-[minmax(22rem,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:py-14">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <span className="size-2 animate-pulse rounded-full bg-[#ff4d3d]" />
                                        <p className="text-[0.66rem] font-bold tracking-[0.2em] text-[#cac4ba] uppercase">
                                            Aguardando seu celular
                                        </p>
                                    </div>
                                    <h2 className="mt-6 max-w-lg font-zouth-display text-4xl leading-[0.98] font-semibold tracking-[-0.05em] sm:text-5xl">
                                        Aponte a câmera. O canal abre daqui
                                        <span className="text-[#ff4d3d]">
                                            .
                                        </span>
                                    </h2>
                                    <ol className="mt-8 space-y-5 text-sm leading-6 text-[#98968d]">
                                        <li className="flex gap-4">
                                            <span className="text-[#f6f4f0]">
                                                01
                                            </span>
                                            Abra o WhatsApp no celular.
                                        </li>
                                        <li className="flex gap-4">
                                            <span className="text-[#f6f4f0]">
                                                02
                                            </span>
                                            Vá até Aparelhos conectados.
                                        </li>
                                        <li className="flex gap-4">
                                            <span className="text-[#f6f4f0]">
                                                03
                                            </span>
                                            Escolha Conectar aparelho e leia o
                                            código ao lado.
                                        </li>
                                    </ol>
                                </div>

                                <div className="flex flex-col items-start border-t border-[#f6f4f0]/14 pt-8 lg:items-end lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12">
                                    <div className="relative flex size-[18rem] items-center justify-center bg-white p-4 sm:size-[21rem]">
                                        {qrCode ? (
                                            <img
                                                src={qrCode}
                                                alt="QR Code para conectar o canal"
                                                className="size-full object-contain"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-4 text-[#18181f]">
                                                <LoaderCircle className="size-8 animate-spin" />
                                                <span className="text-xs font-bold tracking-[0.12em] uppercase">
                                                    Preparando código
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-5 flex flex-wrap items-center gap-5">
                                        <button
                                            type="button"
                                            onClick={fetchQrCode}
                                            className="inline-flex items-center gap-2 text-sm font-bold text-[#f6f4f0] hover:text-[#ff4d3d] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]"
                                        >
                                            <RefreshCw className="size-4" />
                                            Renovar código
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDisconnect}
                                            className="text-sm text-[#98968d] hover:text-[#ff776b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]"
                                        >
                                            Cancelar conexão
                                        </button>
                                    </div>
                                </div>
                            </section>
                        )}

                        {isConnected && (
                            <>
                                <section className="border-b border-[#f6f4f0]/14 py-9 lg:py-11">
                                    <div className="flex items-center justify-between gap-4">
                                        <p className="text-[0.66rem] font-bold tracking-[0.2em] text-[#98968d] uppercase">
                                            Canal principal
                                        </p>
                                        <span className="inline-flex items-center gap-2 text-xs font-bold text-[#43c979]">
                                            <span className="size-2 rounded-full bg-[#43c979]" />
                                            Disponível para conversar
                                        </span>
                                    </div>

                                    <div className="mt-9 grid gap-8 lg:grid-cols-[4rem_minmax(0,1fr)_auto] lg:items-center lg:gap-10">
                                        <span className="font-zouth-display text-3xl font-semibold text-[#67645e]">
                                            01
                                        </span>

                                        <div className="flex min-w-0 items-center gap-5 sm:gap-7">
                                            <div className="relative">
                                                <Avatar className="size-20 border border-[#f6f4f0]/16 sm:size-24">
                                                    {profileInfo.profile_picture_url && (
                                                        <AvatarImage
                                                            src={
                                                                profileInfo.profile_picture_url
                                                            }
                                                            alt={channelName}
                                                            className="rounded-full object-cover"
                                                        />
                                                    )}
                                                    <AvatarFallback className="bg-[#e7e3dc] font-zouth-display text-xl font-semibold text-[#18181f]">
                                                        {initials(channelName)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="absolute -right-1 -bottom-1 flex size-8 items-center justify-center rounded-full border-2 border-[#101015] bg-[#25d366] text-white">
                                                    <MessageCircle className="size-4" />
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <h2 className="truncate font-zouth-display text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
                                                    {channelName}
                                                    <span className="text-[#ff4d3d]">
                                                        .
                                                    </span>
                                                </h2>
                                                <p className="mt-2 text-sm text-[#98968d] sm:text-base">
                                                    {formatPhoneNumber(
                                                        profileInfo.phone_number,
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-3 lg:justify-end">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.visit(
                                                        atendimento.index().url,
                                                    )
                                                }
                                                className="inline-flex min-h-13 items-center gap-5 rounded-[2px] bg-[#ff4d3d] px-6 text-sm font-bold text-[#18181f] transition-colors hover:bg-[#ff6a5c] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]"
                                            >
                                                Abrir Chat
                                                <ArrowRight className="size-5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCheckStatus}
                                                disabled={checkingStatus}
                                                className="inline-flex min-h-13 items-center gap-3 rounded-[2px] border border-[#f6f4f0]/16 px-5 text-sm font-bold text-[#cac4ba] hover:border-[#f6f4f0]/35 hover:text-[#f6f4f0] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d] disabled:cursor-wait disabled:opacity-60"
                                            >
                                                {checkingStatus ? (
                                                    <LoaderCircle className="size-4 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="size-4" />
                                                )}
                                                Verificar conexão
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                <section className="border-b border-[#f6f4f0]/14 py-9 lg:py-11">
                                    <p className="text-[0.66rem] font-bold tracking-[0.2em] text-[#98968d] uppercase">
                                        Pulso do canal
                                    </p>
                                    <div className="mt-8 grid gap-8 md:grid-cols-2 md:gap-0">
                                        <div className="flex items-center gap-5 md:border-r md:border-[#f6f4f0]/14 md:pr-10">
                                            <span className="flex size-14 items-center justify-center rounded-full bg-[#ff4d3d]/12 text-[#ff6a5c]">
                                                <MessageSquare className="size-5" />
                                            </span>
                                            <div>
                                                <p className="font-zouth-display text-2xl font-semibold">
                                                    {
                                                        instance.conversation_count
                                                    }
                                                </p>
                                                <p className="mt-1 text-sm text-[#98968d]">
                                                    {instance.conversation_count ===
                                                    1
                                                        ? 'conversa centralizada'
                                                        : 'conversas centralizadas'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-5 md:pl-10">
                                            <span className="flex size-14 items-center justify-center rounded-full bg-[#ff4d3d]/12 text-[#ff6a5c]">
                                                <Clock3 className="size-5" />
                                            </span>
                                            <div>
                                                <p className="text-sm text-[#98968d]">
                                                    Última movimentação
                                                </p>
                                                <p className="mt-1 font-zouth-display text-2xl font-semibold">
                                                    {formatLastActivity(
                                                        instance.last_activity_at,
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <footer className="flex flex-col gap-5 py-8 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-3 text-sm text-[#98968d]">
                                        <Check className="size-4 text-[#43c979]" />
                                        Canal pronto para receber e enviar
                                        mensagens.
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleDisconnect}
                                        className="inline-flex items-center gap-2 self-start text-sm font-bold text-[#ff6a5c] hover:text-[#ff8b81] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d] sm:self-auto"
                                    >
                                        <Trash2 className="size-4" />
                                        Desconectar canal
                                    </button>
                                </footer>
                            </>
                        )}
                    </div>

                    {!instance && (
                        <div className="mt-8 flex items-center gap-3 text-sm text-[#98968d]">
                            <QrCode className="size-4" />A conexão é concluída
                            pelo QR Code do WhatsApp.
                        </div>
                    )}
                </div>
            </main>
        </AppLayout>
    );
}
