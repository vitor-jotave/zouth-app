import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Edit,
    Mail,
    MapPin,
    Phone,
    ShoppingCart,
} from 'lucide-react';
import { useState } from 'react';
import {
    CustomerFormData,
    CustomerFormDialog,
} from '@/components/customer-form-dialog';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

interface Customer extends CustomerFormData {
    id: number;
    orders_count: number;
    last_order_at: string | null;
}

interface Order {
    id: number;
    status: string;
    status_label: string;
    total_items: number;
    tracking_ref: string | null;
    created_at: string;
}

interface Paginated<T> {
    data: T[];
    links?: Array<{ url: string | null; label: string; active: boolean }>;
    meta?: {
        total: number;
        current_page: number;
        last_page: number;
        links?: Array<{ url: string | null; label: string; active: boolean }>;
    };
}

interface Props {
    customer: Customer;
    orders: Paginated<Order>;
}

const statusVariant: Record<
    string,
    'default' | 'secondary' | 'destructive' | 'outline'
> = {
    new: 'default',
    confirmed: 'secondary',
    preparing: 'outline',
    shipped: 'secondary',
    delivered: 'default',
    cancelled: 'destructive',
};

const formatDocument = (type: string, document: string) => {
    const digits = document.replace(/\D/g, '');

    if (type === 'cnpj' && digits.length === 14) {
        return digits.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
            '$1.$2.$3/$4-$5',
        );
    }

    if (digits.length === 11) {
        return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    }

    return document;
};

const formatZipCode = (zipCode: string | null) => {
    if (!zipCode || zipCode.length !== 8) {
        return zipCode;
    }

    return zipCode.replace(/^(\d{5})(\d{3})$/, '$1-$2');
};

const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

export default function CustomersShow({ customer, orders }: Props) {
    const [editOpen, setEditOpen] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Clientes', href: '/manufacturer/customers' },
        {
            title: customer.name,
            href: `/manufacturer/customers/${customer.id}`,
        },
    ];

    const addressLine = [customer.street, customer.address_number]
        .filter(Boolean)
        .join(', ');
    const cityLine = [customer.neighborhood, customer.city, customer.state]
        .filter(Boolean)
        .join(' - ');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Cliente ${customer.name}`} />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link href="/manufacturer/customers">
                            <Button
                                variant="outline"
                                size="icon"
                                aria-label="Voltar"
                                title="Voltar"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">
                                {customer.name}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {customer.orders_count} pedido
                                {customer.orders_count === 1 ? '' : 's'} até o
                                momento
                            </p>
                        </div>
                    </div>

                    <Button onClick={() => setEditOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar cliente
                    </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
                    <div className="space-y-4">
                        <div className="rounded-lg border p-4">
                            <h2 className="font-semibold">Dados do cliente</h2>
                            <div className="mt-4 space-y-3 text-sm">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase">
                                        {customer.customer_document_type ===
                                        'cnpj'
                                            ? 'CNPJ'
                                            : 'CPF'}
                                    </p>
                                    <p className="font-mono">
                                        {formatDocument(
                                            customer.customer_document_type,
                                            customer.customer_document,
                                        )}
                                    </p>
                                </div>

                                {customer.phone && (
                                    <div className="flex gap-2">
                                        <Phone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                        <span>{customer.phone}</span>
                                    </div>
                                )}

                                {customer.email && (
                                    <div className="flex gap-2">
                                        <Mail className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                        <span>{customer.email}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-lg border p-4">
                            <h2 className="font-semibold">Endereço</h2>
                            <div className="mt-4 flex gap-2 text-sm">
                                <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                                <div className="space-y-1">
                                    {addressLine ? (
                                        <p>{addressLine}</p>
                                    ) : (
                                        <p>Endereço não informado</p>
                                    )}
                                    {cityLine && <p>{cityLine}</p>}
                                    {customer.zip_code && (
                                        <p>
                                            CEP{' '}
                                            {formatZipCode(customer.zip_code)}
                                        </p>
                                    )}
                                    {customer.address_complement && (
                                        <p>
                                            Complemento:{' '}
                                            {customer.address_complement}
                                        </p>
                                    )}
                                    {customer.address_reference && (
                                        <p>
                                            Referência:{' '}
                                            {customer.address_reference}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h2 className="font-semibold">
                                Histórico de pedidos
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Todos os pedidos vinculados a este cliente,
                                independente do status
                            </p>
                        </div>

                        <div className="rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>#</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Itens</TableHead>
                                        <TableHead>Ref</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead className="text-right">
                                            Ações
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {orders.data.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="py-10 text-center"
                                            >
                                                <div className="flex flex-col items-center gap-2">
                                                    <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                                                    <p className="text-muted-foreground">
                                                        Nenhum pedido vinculado.
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}

                                    {orders.data.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-mono text-xs">
                                                #{order.id}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        statusVariant[
                                                            order.status
                                                        ] ?? 'outline'
                                                    }
                                                >
                                                    {order.status_label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {order.total_items}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {order.tracking_ref ?? '-'}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {formatDate(order.created_at)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link
                                                    href={`/manufacturer/orders/${order.id}`}
                                                >
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        Ver pedido
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <Pagination
                            links={orders.meta?.links ?? orders.links}
                        />
                    </div>
                </div>
            </div>

            <CustomerFormDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                customer={customer}
            />
        </AppLayout>
    );
}
