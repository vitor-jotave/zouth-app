import { Head, Link, router } from '@inertiajs/react';
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
    combo_components: Array<{
        product_id: number;
        product_name: string | null;
        product_sku: string | null;
        variation_key: Record<string, string> | null;
        quantity: number;
    }> | null;
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
    customer_id: number | null;
    status: string;
    status_label: string;
    customer_name: string;
    customer_phone: string | null;
    customer_email: string | null;
    customer_document_type: string | null;
    customer_document: string | null;
    customer_notes: string | null;
    customer_zip_code: string | null;
    customer_state: string | null;
    customer_city: string | null;
    customer_neighborhood: string | null;
    customer_street: string | null;
    customer_address_number: string | null;
    customer_address_complement: string | null;
    customer_address_reference: string | null;
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

const transitionIcons: Record<string, typeof Check> = {
    confirmed: Check,
    preparing: Package,
    shipped: Truck,
    delivered: Check,
    cancelled: XCircle,
};

function variationSummary(key: Record<string, string> | null): string | null {
    if (!key) {
        return null;
    }

    return Object.entries(key)
        .map(([name, value]) => `${name}: ${value}`)
        .join(' / ');
}

const transitionVariants: Record<
    string,
    'default' | 'secondary' | 'destructive' | 'outline'
> = {
    confirmed: 'default',
    preparing: 'secondary',
    shipped: 'secondary',
    delivered: 'default',
    cancelled: 'destructive',
};

function formatDocument(
    type: string | null,
    document: string | null,
): string | null {
    if (!document) return null;

    const digits = document.replace(/\D/g, '');

    if (type === 'cpf' && digits.length === 11) {
        return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    }

    if (type === 'cnpj' && digits.length === 14) {
        return digits.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
            '$1.$2.$3/$4-$5',
        );
    }

    return document;
}

function formatZipCode(zipCode: string | null): string | null {
    if (!zipCode) return null;

    const digits = zipCode.replace(/\D/g, '');

    if (digits.length !== 8) return zipCode;

    return digits.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

export default function OrderShow({ order }: Props) {
    const [internalNotes, setInternalNotes] = useState(
        order.internal_notes ?? '',
    );
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const formattedDocument = formatDocument(
        order.customer_document_type,
        order.customer_document,
    );
    const formattedZipCode = formatZipCode(order.customer_zip_code);

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
                            {new Date(order.created_at).toLocaleDateString(
                                'pt-BR',
                                {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                },
                            )}
                        </p>
                    </div>
                    <Badge
                        variant={statusVariant[order.status] ?? 'outline'}
                        className="px-4 py-1 text-sm"
                    >
                        {order.status_label}
                    </Badge>
                </div>

                {/* Status transitions */}
                {order.allowed_transitions.length > 0 && (
                    <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-4">
                        <span className="mr-2 self-center text-sm font-medium">
                            Alterar status:
                        </span>
                        {order.allowed_transitions.map((transition) => {
                            const Icon =
                                transitionIcons[transition.value] ?? Clock;
                            const variant =
                                transitionVariants[transition.value] ??
                                'outline';
                            return (
                                <Button
                                    key={transition.value}
                                    variant={variant}
                                    size="sm"
                                    disabled={updatingStatus}
                                    onClick={() =>
                                        handleStatusChange(transition.value)
                                    }
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
                                <h2 className="font-semibold">
                                    Itens ({order.total_items})
                                </h2>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Produto</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Tam.</TableHead>
                                        <TableHead>Cor</TableHead>
                                        <TableHead className="text-right">
                                            Preco
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Qtd
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Array.isArray(order.items) &&
                                        order.items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell>
                                                    <div className="font-medium">
                                                        {item.product_name}
                                                    </div>
                                                    {item.combo_components &&
                                                        item.combo_components
                                                            .length > 0 && (
                                                            <div className="mt-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">
                                                                <p className="mb-1 font-medium text-foreground">
                                                                    Itens do
                                                                    combo
                                                                </p>
                                                                {item.combo_components.map(
                                                                    (
                                                                        component,
                                                                        index,
                                                                    ) => (
                                                                        <p
                                                                            key={`${component.product_id}-${index}`}
                                                                        >
                                                                            {
                                                                                component.quantity
                                                                            }
                                                                            x{' '}
                                                                            {
                                                                                component.product_name
                                                                            }
                                                                            {variationSummary(
                                                                                component.variation_key,
                                                                            ) && (
                                                                                <span>
                                                                                    {' '}
                                                                                    (
                                                                                    {variationSummary(
                                                                                        component.variation_key,
                                                                                    )}

                                                                                    )
                                                                                </span>
                                                                            )}
                                                                        </p>
                                                                    ),
                                                                )}
                                                            </div>
                                                        )}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {item.product_sku ?? '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {item.size ?? '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {item.color ?? '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {item.unit_price != null
                                                        ? new Intl.NumberFormat(
                                                              'pt-BR',
                                                              {
                                                                  style: 'currency',
                                                                  currency:
                                                                      'BRL',
                                                              },
                                                          ).format(
                                                              Number(
                                                                  item.unit_price,
                                                              ),
                                                          )
                                                        : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {item.quantity}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Status history */}
                        {Array.isArray(order.status_history) &&
                            order.status_history.length > 0 && (
                                <div className="rounded-lg border">
                                    <div className="border-b p-4">
                                        <h2 className="font-semibold">
                                            Historico de status
                                        </h2>
                                    </div>
                                    <div className="divide-y">
                                        {order.status_history.map((entry) => (
                                            <div
                                                key={entry.id}
                                                className="flex items-center justify-between p-4"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {entry.from_label}{' '}
                                                        &rarr; {entry.to_label}
                                                    </p>
                                                    {entry.changed_by && (
                                                        <p className="text-xs text-muted-foreground">
                                                            por{' '}
                                                            {entry.changed_by}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(
                                                        entry.created_at,
                                                    ).toLocaleDateString(
                                                        'pt-BR',
                                                        {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        },
                                                    )}
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
                                    <p className="text-xs text-muted-foreground">
                                        Nome
                                    </p>
                                    <p className="text-sm font-medium">
                                        {order.customer_name}
                                    </p>
                                </div>
                                {order.customer_phone && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            Telefone
                                        </p>
                                        <p className="text-sm">
                                            {order.customer_phone}
                                        </p>
                                    </div>
                                )}
                                {order.customer_email && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            E-mail
                                        </p>
                                        <p className="text-sm">
                                            {order.customer_email}
                                        </p>
                                    </div>
                                )}
                                {formattedDocument && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            {order.customer_document_type ===
                                            'cnpj'
                                                ? 'CNPJ'
                                                : 'CPF'}
                                        </p>
                                        <p className="text-sm">
                                            {formattedDocument}
                                        </p>
                                    </div>
                                )}
                                {order.customer_id && (
                                    <Link
                                        href={`/manufacturer/customers/${order.customer_id}`}
                                        className="block"
                                    >
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full"
                                        >
                                            Ver cadastro do cliente
                                        </Button>
                                    </Link>
                                )}
                                {order.customer_notes && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            Observacoes do cliente
                                        </p>
                                        <p className="text-sm">
                                            {order.customer_notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Delivery address */}
                        {(order.customer_street ||
                            order.customer_city ||
                            order.customer_zip_code) && (
                            <div className="rounded-lg border">
                                <div className="border-b p-4">
                                    <h2 className="font-semibold">
                                        Endereco de entrega
                                    </h2>
                                </div>
                                <div className="space-y-3 p-4">
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            Logradouro
                                        </p>
                                        <p className="text-sm font-medium">
                                            {[
                                                order.customer_street,
                                                order.customer_address_number,
                                            ]
                                                .filter(Boolean)
                                                .join(', ')}
                                        </p>
                                    </div>
                                    {order.customer_neighborhood && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                Bairro
                                            </p>
                                            <p className="text-sm">
                                                {order.customer_neighborhood}
                                            </p>
                                        </div>
                                    )}
                                    {(order.customer_city ||
                                        order.customer_state) && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                Cidade/UF
                                            </p>
                                            <p className="text-sm">
                                                {[
                                                    order.customer_city,
                                                    order.customer_state,
                                                ]
                                                    .filter(Boolean)
                                                    .join('/')}
                                            </p>
                                        </div>
                                    )}
                                    {formattedZipCode && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                CEP
                                            </p>
                                            <p className="text-sm">
                                                {formattedZipCode}
                                            </p>
                                        </div>
                                    )}
                                    {order.customer_address_complement && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                Complemento
                                            </p>
                                            <p className="text-sm">
                                                {
                                                    order.customer_address_complement
                                                }
                                            </p>
                                        </div>
                                    )}
                                    {order.customer_address_reference && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                Referencia
                                            </p>
                                            <p className="text-sm">
                                                {
                                                    order.customer_address_reference
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Rep info */}
                        {(order.sales_rep || order.tracking_ref) && (
                            <div className="rounded-lg border">
                                <div className="border-b p-4">
                                    <h2 className="font-semibold">
                                        Representante
                                    </h2>
                                </div>
                                <div className="space-y-3 p-4">
                                    {order.sales_rep && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                Nome
                                            </p>
                                            <p className="text-sm font-medium">
                                                {order.sales_rep.name}
                                            </p>
                                        </div>
                                    )}
                                    {order.tracking_ref && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">
                                                Referencia
                                            </p>
                                            <p className="text-sm">
                                                {order.tracking_ref}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Internal notes */}
                        <div className="rounded-lg border">
                            <div className="border-b p-4">
                                <h2 className="font-semibold">
                                    Notas internas
                                </h2>
                            </div>
                            <div className="space-y-3 p-4">
                                <textarea
                                    value={internalNotes}
                                    onChange={(e) =>
                                        setInternalNotes(e.target.value)
                                    }
                                    rows={4}
                                    placeholder="Notas visiveis apenas internamente..."
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleNotesUpdate}
                                    disabled={
                                        internalNotes ===
                                        (order.internal_notes ?? '')
                                    }
                                >
                                    Salvar notas
                                </Button>
                            </div>
                        </div>

                        {/* Tracking link */}
                        <div className="rounded-lg border">
                            <div className="border-b p-4">
                                <h2 className="font-semibold">
                                    Link de acompanhamento
                                </h2>
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
