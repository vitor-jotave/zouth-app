import { Head, router } from '@inertiajs/react';
import { ArrowLeft, Check, Clock, Package, Truck, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface OrderItem {
    id: number;
    product_id: number | null;
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
    id: number;
    public_token: string;
    status: string;
    status_label: string;
    customer_name: string;
    customer_phone: string | null;
    customer_email: string | null;
    customer_notes: string | null;
    internal_notes: string | null;
    tracking_ref: string | null;
    items: OrderItem[];
    total_items: number;
    status_history: StatusHistory[];
    sales_rep: { id: number; name: string } | null;
    allowed_transitions: Array<{ value: string; label: string }>;
    created_at: string;
}

interface Props {
    order: Order;
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    new: 'default',
    confirmed: 'secondary',
    preparing: 'outline',
    shipped: 'secondary',
    delivered: 'default',
    cancelled: 'destructive',
};

const transitionIcons: Record<string, typeof Check> = {
    confirmed: Check,
    preparing: Package,
    shipped: Truck,
    delivered: Check,
    cancelled: XCircle,
};

const transitionVariants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    confirmed: 'default',
    preparing: 'secondary',
    shipped: 'secondary',
    delivered: 'default',
    cancelled: 'destructive',
};

export default function OrderShow({ order }: Props) {
    const [internalNotes, setInternalNotes] = useState(order.internal_notes ?? '');
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Pedidos', href: '/manufacturer/orders' },
        { title: `#${order.id}`, href: `/manufacturer/orders/${order.id}` },
    ];

    const handleStatusChange = (status: string) => {
        setUpdatingStatus(true);
        router.post(
            `/manufacturer/orders/${order.id}/status`,
            { status },
            {
                preserveScroll: true,
                onFinish: () => setUpdatingStatus(false),
            },
        );
    };

    const handleNotesUpdate = () => {
        router.put(
            `/manufacturer/orders/${order.id}/notes`,
            { internal_notes: internalNotes },
            { preserveScroll: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Pedido #${order.id}`} />

            <div className="flex h-full flex-1 flex-col gap-6 p-4">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mb-2"
                            onClick={() => router.get('/manufacturer/orders')}
                        >
                            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
                        </Button>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Pedido #{order.id}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                            })}
                        </p>
                    </div>
                    <Badge
                        variant={statusVariant[order.status] ?? 'outline'}
                        className="text-sm px-4 py-1"
                    >
                        {order.status_label}
                    </Badge>
                </div>

                {/* Status transitions */}
                {order.allowed_transitions.length > 0 && (
                    <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-4">
                        <span className="mr-2 self-center text-sm font-medium">Alterar status:</span>
                        {order.allowed_transitions.map(transition => {
                            const Icon = transitionIcons[transition.value] ?? Clock;
                            const variant = transitionVariants[transition.value] ?? 'outline';
                            return (
                                <Button
                                    key={transition.value}
                                    variant={variant}
                                    size="sm"
                                    disabled={updatingStatus}
                                    onClick={() => handleStatusChange(transition.value)}
                                >
                                    <Icon className="mr-1 h-4 w-4" />
                                    {transition.label}
                                </Button>
                            );
                        })}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main content */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Items table */}
                        <div className="rounded-lg border">
                            <div className="border-b p-4">
                                <h2 className="font-semibold">Itens ({order.total_items})</h2>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Produto</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Tam.</TableHead>
                                        <TableHead>Cor</TableHead>
                                        <TableHead className="text-right">Preco</TableHead>
                                        <TableHead className="text-right">Qtd</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Array.isArray(order.items) && order.items.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.product_name}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {item.product_sku ?? '-'}
                                            </TableCell>
                                            <TableCell>{item.size ?? '-'}</TableCell>
                                            <TableCell>{item.color ?? '-'}</TableCell>
                                            <TableCell className="text-right">
                                                {item.unit_price != null
                                                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.unit_price))
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Status history */}
                        {Array.isArray(order.status_history) && order.status_history.length > 0 && (
                            <div className="rounded-lg border">
                                <div className="border-b p-4">
                                    <h2 className="font-semibold">Historico de status</h2>
                                </div>
                                <div className="divide-y">
                                    {order.status_history.map(entry => (
                                        <div key={entry.id} className="flex items-center justify-between p-4">
                                            <div>
                                                <p className="text-sm font-medium">
                                                    {entry.from_label} &rarr; {entry.to_label}
                                                </p>
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
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Customer info */}
                        <div className="rounded-lg border">
                            <div className="border-b p-4">
                                <h2 className="font-semibold">Cliente</h2>
                            </div>
                            <div className="space-y-3 p-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">Nome</p>
                                    <p className="text-sm font-medium">{order.customer_name}</p>
                                </div>
                                {order.customer_phone && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">Telefone</p>
                                        <p className="text-sm">{order.customer_phone}</p>
                                    </div>
                                )}
                                {order.customer_email && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">E-mail</p>
                                        <p className="text-sm">{order.customer_email}</p>
                                    </div>
                                )}
                                {order.customer_notes && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">Observacoes do cliente</p>
                                        <p className="text-sm">{order.customer_notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Rep info */}
                        {(order.sales_rep || order.tracking_ref) && (
                            <div className="rounded-lg border">
                                <div className="border-b p-4">
                                    <h2 className="font-semibold">Representante</h2>
                                </div>
                                <div className="space-y-3 p-4">
                                    {order.sales_rep && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">Nome</p>
                                            <p className="text-sm font-medium">{order.sales_rep.name}</p>
                                        </div>
                                    )}
                                    {order.tracking_ref && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">Referencia</p>
                                            <p className="text-sm">{order.tracking_ref}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Internal notes */}
                        <div className="rounded-lg border">
                            <div className="border-b p-4">
                                <h2 className="font-semibold">Notas internas</h2>
                            </div>
                            <div className="space-y-3 p-4">
                                <textarea
                                    value={internalNotes}
                                    onChange={e => setInternalNotes(e.target.value)}
                                    rows={4}
                                    placeholder="Notas visiveis apenas internamente..."
                                    className="border-input bg-background placeholder:text-muted-foreground w-full rounded-md border px-3 py-2 text-sm"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleNotesUpdate}
                                    disabled={internalNotes === (order.internal_notes ?? '')}
                                >
                                    Salvar notas
                                </Button>
                            </div>
                        </div>

                        {/* Tracking link */}
                        <div className="rounded-lg border">
                            <div className="border-b p-4">
                                <h2 className="font-semibold">Link de acompanhamento</h2>
                            </div>
                            <div className="p-4">
                                <a
                                    href={`/o/${order.public_token}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-blue-600 underline hover:text-blue-800"
                                >
                                    Abrir pagina de acompanhamento
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
