import { Head, Link, router } from '@inertiajs/react';
import { Package, Search } from 'lucide-react';
import { useState } from 'react';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    product_name: string;
    quantity: number;
}

interface Order {
    id: number;
    public_token: string;
    status: string;
    status_label: string;
    customer_name: string;
    customer_phone: string | null;
    customer_email: string | null;
    tracking_ref: string | null;
    total_items: number;
    sales_rep: { id: number; name: string } | null;
    created_at: string;
}

interface Paginated<T> {
    data: T[];
    links?: Array<{ url: string | null; label: string; active: boolean }>;
    meta?: { total: number; current_page: number; last_page: number; links?: Array<{ url: string | null; label: string; active: boolean }> };
}

interface Props {
    orders: Paginated<Order>;
    filters: {
        status: string;
        search: string;
    };
    statuses: Array<{ value: string; label: string }>;
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
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Pedidos', href: '/manufacturer/orders' },
];

export default function OrdersIndex({ orders, filters, statuses }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const updateFilters = (payload: Record<string, unknown>) => {
        router.get(
            '/manufacturer/orders',
            { search, status: filters.status ?? '', ...payload },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);
        updateFilters({ search: value });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pedidos" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
                        <p className="text-sm text-muted-foreground">
                            Gerencie os pedidos recebidos
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 rounded-lg border p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={e => handleSearchChange(e.target.value)}
                            placeholder="Buscar por nome, telefone, email ou numero"
                            className="pl-9"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Select
                            value={filters.status || 'all'}
                            onValueChange={v => updateFilters({ status: v === 'all' ? '' : v })}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os status</SelectItem>
                                {statuses.map(s => (
                                    <SelectItem key={s.value} value={s.value}>
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Itens</TableHead>
                                <TableHead>Ref</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead className="text-right">Acoes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-10 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Package className="h-8 w-8 text-muted-foreground" />
                                            <p className="text-muted-foreground">Nenhum pedido encontrado.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {orders.data.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-mono text-xs">
                                        #{order.id}
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{order.customer_name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {order.customer_phone ?? order.customer_email}
                                            </p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={statusVariant[order.status] ?? 'outline'}>
                                            {order.status_label}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{order.total_items}</TableCell>
                                    <TableCell>
                                        {order.tracking_ref ? (
                                            <span className="text-xs text-muted-foreground">{order.tracking_ref}</span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {new Date(order.created_at).toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link href={`/manufacturer/orders/${order.id}`}>
                                            <Button variant="outline" size="sm">
                                                Ver
                                            </Button>
                                        </Link>
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
