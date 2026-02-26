import { Head, router, useForm } from '@inertiajs/react';
import { CheckCircle, Loader2, QrCode, Smartphone, Trash2, Wifi, WifiOff } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Atendimento', href: '/manufacturer/atendimento' },
    { title: 'Configuração WhatsApp', href: '/manufacturer/atendimento/setup' },
];

interface Instance {
    id: number;
    instance_name: string;
    status: 'disconnected' | 'connecting' | 'connected';
    phone_number: string | null;
    profile_name: string | null;
    profile_picture_url: string | null;
}

interface Props {
    instance: Instance | null;
}

export default function AtendimentoSetup({ instance }: Props) {
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [polling, setPolling] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(instance?.status ?? 'disconnected');
    const [profileInfo, setProfileInfo] = useState({
        phone_number: instance?.phone_number,
        profile_name: instance?.profile_name,
        profile_picture_url: instance?.profile_picture_url,
    });
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const createForm = useForm({
        instance_name: '',
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/manufacturer/atendimento/instances', {
            preserveScroll: true,
        });
    };

    const fetchQrCode = useCallback(async () => {
        if (!instance) return;
        try {
            const res = await fetch(`/manufacturer/atendimento/instances/${instance.id}/qr`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (res.ok) {
                const data = await res.json();
                if (data.base64) {
                    setQrCode(data.base64);
                }
                if (data.status) {
                    setCurrentStatus(data.status);
                }
            }
        } catch {
            // Ignore
        }
    }, [instance]);

    const pollStatus = useCallback(async () => {
        if (!instance) return;
        try {
            const res = await fetch(`/manufacturer/atendimento/instances/${instance.id}/status`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (res.ok) {
                const data = await res.json();
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
        } catch {
            // Ignore
        }
    }, [instance]);

    // Start polling when we have an instance that's not connected
    useEffect(() => {
        if (instance && currentStatus !== 'connected') {
            setPolling(true);
            fetchQrCode();
        }
    }, [instance, currentStatus, fetchQrCode]);

    useEffect(() => {
        if (polling) {
            pollRef.current = setInterval(pollStatus, 3000);
            return () => {
                if (pollRef.current) clearInterval(pollRef.current);
            };
        }
        if (pollRef.current) clearInterval(pollRef.current);
    }, [polling, pollStatus]);

    const handleDisconnect = () => {
        if (!instance) return;
        if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;
        router.delete(`/manufacturer/atendimento/instances/${instance.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Configuração WhatsApp" />
            <div className="mx-auto w-full max-w-2xl p-4 md:p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">Configuração do WhatsApp</h1>
                    <p className="text-muted-foreground mt-1">
                        Conecte seu WhatsApp para atender seus clientes diretamente pelo ZouthAtendimento.
                    </p>
                </div>

                {/* No instance: show create form */}
                {!instance && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Smartphone className="size-5" />
                                Conectar WhatsApp
                            </CardTitle>
                            <CardDescription>
                                Crie uma conexão para vincular seu número de WhatsApp ao sistema.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="instance_name">Nome da instância</Label>
                                    <Input
                                        id="instance_name"
                                        value={createForm.data.instance_name}
                                        onChange={(e) => createForm.setData('instance_name', e.target.value)}
                                        placeholder="minha-empresa"
                                        className="max-w-xs"
                                    />
                                    {createForm.errors.instance_name && (
                                        <p className="text-sm text-red-500">{createForm.errors.instance_name}</p>
                                    )}
                                    <p className="text-muted-foreground text-xs">
                                        Use apenas letras, números, hífens e underscores.
                                    </p>
                                </div>
                                <Button type="submit" disabled={createForm.processing}>
                                    {createForm.processing && <Loader2 className="mr-2 size-4 animate-spin" />}
                                    Criar conexão
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Instance exists but not connected: show QR code */}
                {instance && currentStatus !== 'connected' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <QrCode className="size-5" />
                                Escanear QR Code
                            </CardTitle>
                            <CardDescription>
                                Abra o WhatsApp no celular → Configurações → Aparelhos conectados → Conectar um aparelho
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-4">
                            {qrCode ? (
                                <div className="rounded-xl border bg-white p-4">
                                    <img src={qrCode} alt="QR Code do WhatsApp" className="size-64" />
                                </div>
                            ) : (
                                <div className="flex size-64 items-center justify-center rounded-xl border">
                                    <Loader2 className="size-8 animate-spin text-gray-400" />
                                </div>
                            )}

                            <div className="flex items-center gap-2 text-sm text-amber-600">
                                <Loader2 className="size-4 animate-spin" />
                                Aguardando conexão...
                            </div>

                            <Button variant="outline" size="sm" onClick={fetchQrCode}>
                                Gerar novo QR Code
                            </Button>

                            <Button variant="ghost" size="sm" className="text-red-500" onClick={handleDisconnect}>
                                <Trash2 className="mr-1 size-4" />
                                Remover instância
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Connected */}
                {instance && currentStatus === 'connected' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="size-5" />
                                WhatsApp conectado
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4 rounded-lg border p-4">
                                <div className="flex size-12 items-center justify-center rounded-full bg-green-100">
                                    <Wifi className="size-6 text-green-600" />
                                </div>
                                <div>
                                    {profileInfo.profile_name && (
                                        <p className="font-medium">{profileInfo.profile_name}</p>
                                    )}
                                    {profileInfo.phone_number && (
                                        <p className="text-muted-foreground text-sm">{profileInfo.phone_number}</p>
                                    )}
                                    <p className="text-xs text-green-600">Conectado</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="default"
                                    onClick={() => router.visit('/manufacturer/atendimento')}
                                >
                                    Ir para o chat
                                </Button>
                                <Button variant="outline" className="text-red-500" onClick={handleDisconnect}>
                                    <WifiOff className="mr-1 size-4" />
                                    Desconectar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
