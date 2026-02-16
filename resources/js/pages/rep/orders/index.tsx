import { Head } from '@inertiajs/react';
import { Package } from 'lucide-react';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
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

interface Order {
    id: number;
    public_token: string;
    status: string;
    status_label: string;
    customer_name: string;
    total_items: number;
    created_at: string;
}

interface Paginated<T> {
    data: T[];
    links?: Array<{ url: string | null; label: string; active: boolean }>;
    meta?: { links?: Array<{ url: string | null; label: string; active: boolean }> };
}

interface Props {
    orders: Paginated<Order>;
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    new: 'default',
    confirmed: 'secondary',
    preparing: 'outline',
    shipped: 'secondary',
    delivered: 'default',
    cancelled: 'destructive',
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/rep/dashboard' },
    { title: 'Meus Pedidos', href: '/rep/orders' },
];

export default function RepOrdersIndex({ orders }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Meus Pedidos" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Meus Pedidos</h1>
                    <p className="text-sm text-muted-foreground">
                        Pedidos vinculados a voce como representante
                    </p>
                </div>

                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Itens</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead>Acompanhamento</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-10 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Package className="h-8 w-8 text-muted-foreground" />
                                            <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {orders.data.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-mono text-xs">#{order.id}</TableCell>
                                    <TableCell className="font-medium">{order.customer_name}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusVariant[order.status] ?? 'outline'}>
                                            {order.status_label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{order.total_items}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {new Date(order.created_at).toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: 'short',
                                        })}
                                    </TableCell>
                                    <TableCell>
                                        <a
                                            href={`/o/${order.public_token}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 underline"
                                        >
                                            Ver
                                        </a>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <Pagination links={orders.meta?.links ?? orders.links} />
            </div>
        </AppLayout>
    );
}
