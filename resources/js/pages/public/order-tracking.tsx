import { Head } from '@inertiajs/react';
import { Check, ClipboardCopy, Clock, Package, Truck, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface OrderItem {
    id: number;
    product_name: string;
    product_sku: string | null;
    unit_price: string | null;
    quantity: number;
    size: string | null;
    color: string | null;
}

interface StatusHistory {
    id: number;
    from_status: string;
    from_label: string;
    to_status: string;
    to_label: string;
    changed_by: string | null;
    created_at: string;
}

interface Order {
    public_token: string;
    status: string;
    status_label: string;
    customer_name: string;
    items: OrderItem[];
    total_items: number;
    status_history: StatusHistory[];
    created_at: string;
}

interface Props {
    order: Order;
    manufacturer: {
        name: string;
    };
}

const statusConfig: Record<string, { color: string; icon: typeof Check; bgColor: string }> = {
    new: { color: 'text-blue-700', icon: Clock, bgColor: 'bg-blue-50 border-blue-200' },
    confirmed: { color: 'text-indigo-700', icon: Check, bgColor: 'bg-indigo-50 border-indigo-200' },
    preparing: { color: 'text-amber-700', icon: Package, bgColor: 'bg-amber-50 border-amber-200' },
    shipped: { color: 'text-purple-700', icon: Truck, bgColor: 'bg-purple-50 border-purple-200' },
    delivered: { color: 'text-green-700', icon: Check, bgColor: 'bg-green-50 border-green-200' },
    cancelled: { color: 'text-red-700', icon: XCircle, bgColor: 'bg-red-50 border-red-200' },
};

const statusOrder = ['new', 'confirmed', 'preparing', 'shipped', 'delivered'];

export default function OrderTracking({ order, manufacturer }: Props) {
    const [copied, setCopied] = useState(false);
    const config = statusConfig[order.status] ?? statusConfig.new;
    const StatusIcon = config.icon;
    const currentIndex = statusOrder.indexOf(order.status);
    const isCancelled = order.status === 'cancelled';

    const copyLink = () => {
        const url = window.location.href;
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }).catch(() => {
                // Fallback se clipboard falhar
                fallbackCopy(url);
            });
        } else {
            // Fallback para navegadores sem clipboard API
            fallbackCopy(url);
        }
    };

    const fallbackCopy = (text: string) => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Falha ao copiar:', err);
        }
        document.body.removeChild(textArea);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Head title={`Pedido #${order.public_token.slice(0, 8).toUpperCase()}`} />

            <div className="mx-auto max-w-2xl px-4 py-12">
                {/* Header */}
                <div className="mb-8 text-center">
                    <p className="text-sm text-muted-foreground">{manufacturer.name}</p>
                    <h1 className="mt-2 text-2xl font-bold">
                        Pedido #{order.public_token.slice(0, 8).toUpperCase()}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </p>
                </div>

                {/* Status badge */}
                <div className={`mb-8 flex items-center justify-center gap-3 rounded-lg border p-4 ${config.bgColor}`}>
                    <StatusIcon className={`h-6 w-6 ${config.color}`} />
                    <span className={`text-lg font-semibold ${config.color}`}>
                        {order.status_label}
                    </span>
                </div>

                {/* Progress bar */}
                {!isCancelled && (
                    <div className="mb-8">
                        <div className="flex justify-between">
                            {statusOrder.map((step, index) => {
                                const stepConfig = statusConfig[step];
                                const StepIcon = stepConfig.icon;
                                const isActive = index <= currentIndex;
                                const label = { new: 'Novo', confirmed: 'Confirmado', preparing: 'Preparando', shipped: 'Enviado', delivered: 'Entregue' }[step];
                                return (
                                    <div key={step} className="flex flex-1 flex-col items-center gap-1">
                                        <div
                                            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                                                isActive
                                                    ? 'border-green-500 bg-green-500 text-white'
                                                    : 'border-gray-300 bg-white text-gray-400'
                                            }`}
                                        >
                                            <StepIcon className="h-4 w-4" />
                                        </div>
                                        <span className={`text-xs ${isActive ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
                                            {label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-2 flex items-center">
                            {statusOrder.slice(0, -1).map((_, index) => (
                                <div
                                    key={index}
                                    className={`h-1 flex-1 rounded-full ${
                                        index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Items */}
                <div className="mb-6 rounded-lg border bg-white">
                    <div className="border-b p-4">
                        <h2 className="font-semibold">Itens do pedido</h2>
                    </div>
                    <div className="divide-y">
                        {order.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-4">
                                <div>
                                    <p className="font-medium">{item.product_name}</p>
                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                        {item.product_sku && <span>SKU {item.product_sku}</span>}
                                        {item.size && <span>Tam: {item.size}</span>}
                                        {item.color && <span>Cor: {item.color}</span>}
                                    </div>
                                    {item.unit_price != null && (
                                        <p className="mt-1 text-xs font-medium">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.unit_price))}
                                        </p>
                                    )}
                                </div>
                                <Badge variant="outline">Qtd: {item.quantity}</Badge>
                            </div>
                        ))}
                    </div>
                    <div className="border-t p-4">
                        <p className="text-sm font-medium">
                            Total: {order.total_items} item(ns)
                        </p>
                    </div>
                </div>

                {/* Status history */}
                {order.status_history.length > 0 && (
                    <div className="mb-6 rounded-lg border bg-white">
                        <div className="border-b p-4">
                            <h2 className="font-semibold">Historico</h2>
                        </div>
                        <div className="divide-y">
                            {order.status_history.map(entry => (
                                <div key={entry.id} className="flex items-center justify-between p-4">
                                    <div>
                                        <p className="text-sm font-medium">{entry.to_label}</p>
                                        {entry.changed_by && (
                                            <p className="text-xs text-muted-foreground">
                                                por {entry.changed_by}
                                            </p>
                                        )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(entry.created_at).toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Copy link */}
                <div className="text-center">
                    <Button variant="outline" onClick={copyLink} className="gap-2">
                        {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
                        {copied ? 'Link copiado!' : 'Copiar link de acompanhamento'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
