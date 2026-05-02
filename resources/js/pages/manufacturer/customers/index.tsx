import { Head, Link, router } from '@inertiajs/react';
import { Edit, Search, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import {
    CustomerFormData,
    CustomerFormDialog,
} from '@/components/customer-form-dialog';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    customers: Paginated<Customer>;
    filters: {
        search: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Clientes', href: '/manufacturer/customers' },
];

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

const formatDate = (value: string | null) => {
    if (!value) {
        return '-';
    }

    return new Date(value).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
};

export default function CustomersIndex({ customers, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [createOpen, setCreateOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(
        null,
    );

    const handleSearchChange = (value: string) => {
        setSearch(value);
        router.get(
            '/manufacturer/customers',
            { search: value },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Clientes" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Clientes
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Clientes cadastrados manualmente ou gerados por
                            pedidos do catálogo
                        </p>
                    </div>

                    <Button onClick={() => setCreateOpen(true)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Novo cliente
                    </Button>
                </div>

                <div className="rounded-lg border p-4">
                    <div className="relative">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) =>
                                handleSearchChange(event.target.value)
                            }
                            placeholder="Buscar por nome, telefone, email ou documento"
                            className="pl-9"
                        />
                    </div>
                </div>

                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Documento</TableHead>
                                <TableHead>Contato</TableHead>
                                <TableHead>Pedidos</TableHead>
                                <TableHead>Último pedido</TableHead>
                                <TableHead className="text-right">
                                    Ações
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {customers.data.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="py-10 text-center"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <Users className="h-8 w-8 text-muted-foreground" />
                                            <p className="text-muted-foreground">
                                                Nenhum cliente encontrado.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}

                            {customers.data.map((customer) => (
                                <TableRow key={customer.id}>
                                    <TableCell>
                                        <Link
                                            href={`/manufacturer/customers/${customer.id}`}
                                            className="font-medium hover:underline"
                                        >
                                            {customer.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {formatDocument(
                                            customer.customer_document_type,
                                            customer.customer_document,
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm">
                                            <p>{customer.phone ?? '-'}</p>
                                            {customer.email && (
                                                <p className="text-xs text-muted-foreground">
                                                    {customer.email}
                                                </p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {customer.orders_count}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {formatDate(customer.last_order_at)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link
                                                href={`/manufacturer/customers/${customer.id}`}
                                            >
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    Ver
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                aria-label="Editar cliente"
                                                title="Editar cliente"
                                                onClick={() =>
                                                    setEditingCustomer(customer)
                                                }
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <Pagination links={customers.meta?.links ?? customers.links} />
            </div>

            <CustomerFormDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
            />
            <CustomerFormDialog
                open={Boolean(editingCustomer)}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditingCustomer(null);
                    }
                }}
                customer={editingCustomer}
            />
        </AppLayout>
    );
}
