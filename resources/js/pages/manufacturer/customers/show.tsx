import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    Edit3,
    Mail,
    MapPin,
    Package,
    Phone,
    ReceiptText,
    ShoppingBag,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { AppPageHeader } from '@/components/app-page-header';
import type { CustomerFormData } from '@/components/customer-form-dialog';
import { CustomerFormDialog } from '@/components/customer-form-dialog';
import { MetricRail } from '@/components/metric-rail';
import { Pagination } from '@/components/pagination';
import { StatusLabel, type StatusLabelTone } from '@/components/status-label';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import manufacturer from '@/routes/manufacturer';
import type { BreadcrumbItem } from '@/types';

interface Customer extends CustomerFormData {
    id: number;
    orders_count: number;
    commercial_orders_count: number;
    total_spent: string;
    last_order_at: string | null;
    created_at: string;
}

interface Order {
    id: number;
    status: string;
    status_label: string;
    total_items: number;
    total_amount: string;
    tracking_ref: string | null;
    sales_rep: { id: number; name: string } | null;
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

type RelationshipPresentation = {
    label: string;
    detail: string;
    tone: StatusLabelTone;
};

const statusTone: Record<string, StatusLabelTone> = {
    new: 'coral',
    confirmed: 'plum',
    preparing: 'neutral',
    shipped: 'muted',
    delivered: 'mineral',
    cancelled: 'coral',
};

function formatCurrency(value: string | number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(Number(value));
}

function formatDocument(type: string, document: string): string {
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
}

function formatPhone(phone: string | null): string | null {
    if (!phone) {
        return null;
    }

    const digits = phone.replace(/\D/g, '');

    if (digits.length === 11) {
        return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    }

    if (digits.length === 10) {
        return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }

    return phone;
}

function formatZipCode(zipCode: string | null): string | null {
    if (!zipCode) {
        return null;
    }

    const digits = zipCode.replace(/\D/g, '');

    return digits.length === 8
        ? digits.replace(/^(\d{5})(\d{3})$/, '$1-$2')
        : zipCode;
}

function formatMetricDate(value: string | null): string {
    if (!value) {
        return 'SEM PEDIDO';
    }

    const date = new Date(value);
    const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(
        date,
    );
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
        .format(date)
        .replace('.', '')
        .toLocaleUpperCase('pt-BR');
    const year = new Intl.DateTimeFormat('pt-BR', { year: 'numeric' }).format(
        date,
    );

    return `${day} ${month} ${year}`;
}

function orderDateParts(value: string): { day: string; monthYear: string } {
    const date = new Date(value);
    const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit' }).format(
        date,
    );
    const month = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
        .format(date)
        .replace('.', '')
        .toLocaleUpperCase('pt-BR');
    const year = new Intl.DateTimeFormat('pt-BR', { year: 'numeric' }).format(
        date,
    );

    return { day, monthYear: `${month} ${year}` };
}

function daysSince(value: string | null): number | null {
    if (!value) {
        return null;
    }

    return Math.max(
        0,
        Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000),
    );
}

function recencyLabel(value: string | null): string {
    const days = daysSince(value);

    if (days === null) {
        return 'Primeira compra ainda em aberto';
    }

    if (days === 0) {
        return 'Última compra hoje';
    }

    if (days === 1) {
        return 'Última compra há 1 dia';
    }

    return `Última compra há ${days} dias`;
}

function relationshipFor(customer: Customer): RelationshipPresentation {
    const days = daysSince(customer.last_order_at);

    if (customer.commercial_orders_count === 0) {
        return {
            label: 'Sem pedido',
            detail: 'Primeira compra ainda em aberto.',
            tone: 'muted',
        };
    }

    if (days !== null && days >= 60) {
        return {
            label: 'Retomar contato',
            detail: `${days} dias sem uma nova compra.`,
            tone: 'coral',
        };
    }

    if (customer.commercial_orders_count >= 2) {
        return {
            label: 'Recorrente',
            detail: `${customer.commercial_orders_count} compras registradas nesta relação.`,
            tone: 'mineral',
        };
    }

    return {
        label: 'Novo cliente',
        detail: 'Primeira compra registrada.',
        tone: 'neutral',
    };
}

function orderItemsLabel(count: number): string {
    return count === 1 ? '1 peça' : `${count} peças`;
}

function CustomerFact({
    icon,
    label,
    children,
}: {
    icon: ReactNode;
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3 py-2.5">
            <span className="mt-0.5 text-muted-foreground" aria-hidden="true">
                {icon}
            </span>
            <div className="min-w-0">
                <p className="text-[0.62rem] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                    {label}
                </p>
                <div className="mt-1 min-w-0 text-sm leading-6 font-semibold text-foreground">
                    {children}
                </div>
            </div>
        </div>
    );
}

function OrderJourneyRow({ order }: { order: Order }) {
    const date = orderDateParts(order.created_at);

    return (
        <article className="group grid gap-5 border-b border-border py-7 last:border-b-0 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto] sm:items-center sm:gap-7">
            <div className="font-zouth-display text-foreground tabular-nums">
                <p className="text-3xl leading-none font-semibold tracking-[-0.04em]">
                    {date.day}
                </p>
                <p className="mt-2 text-xs font-semibold tracking-[0.12em] uppercase">
                    {date.monthYear}
                </p>
            </div>

            <div className="min-w-0 border-l border-border pl-6 sm:pl-8">
                <div className="flex flex-wrap items-center gap-3">
                    <p className="text-[0.68rem] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                        Pedido #{String(order.id).padStart(4, '0')}
                    </p>
                    <StatusLabel tone={statusTone[order.status] ?? 'neutral'}>
                        {order.status_label}
                    </StatusLabel>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    <span className="font-semibold text-foreground">
                        {orderItemsLabel(order.total_items)}
                    </span>
                    <span className="h-4 w-px bg-border" aria-hidden="true" />
                    <span className="font-zouth-display font-semibold text-foreground tabular-nums">
                        {formatCurrency(order.total_amount)}
                    </span>
                    {order.sales_rep && (
                        <>
                            <span
                                className="h-4 w-px bg-border"
                                aria-hidden="true"
                            />
                            <span className="text-muted-foreground">
                                {order.sales_rep.name}
                            </span>
                        </>
                    )}
                </div>
                {order.tracking_ref && (
                    <p className="mt-3 text-xs text-muted-foreground">
                        Rastreio {order.tracking_ref}
                    </p>
                )}
            </div>

            <Button
                asChild
                variant="ghost"
                size="icon"
                className="justify-self-start rounded-[2px] transition-colors group-hover:bg-[#18181f] group-hover:text-[#f6f4f0] sm:justify-self-end"
            >
                <Link
                    href={manufacturer.orders.show(order.id).url}
                    prefetch
                    aria-label={`Abrir pedido ${order.id}`}
                >
                    <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
            </Button>
        </article>
    );
}

export default function CustomersShow({ customer, orders }: Props) {
    const [editOpen, setEditOpen] = useState(false);
    const relationship = relationshipFor(customer);
    const averageTicket =
        customer.commercial_orders_count > 0
            ? Number(customer.total_spent) / customer.commercial_orders_count
            : 0;
    const formattedPhone = formatPhone(customer.phone);
    const location = [customer.city, customer.state]
        .filter(Boolean)
        .join(' · ');
    const addressLine = [customer.street, customer.address_number]
        .filter(Boolean)
        .join(', ');
    const cityLine = [customer.neighborhood, customer.city, customer.state]
        .filter(Boolean)
        .join(' · ');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Visão geral', href: dashboard().url },
        { title: 'Clientes', href: manufacturer.customers.index().url },
        {
            title: customer.name,
            href: manufacturer.customers.show(customer.id).url,
        },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Cliente ${customer.name}`} />

            <div className="mx-auto flex w-full max-w-[1720px] flex-1 flex-col px-5 py-8 sm:px-7 md:px-9 lg:pt-8 lg:pb-12 xl:px-12 2xl:px-14">
                <Link
                    href={manufacturer.customers.index().url}
                    prefetch
                    className="mb-8 inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-foreground transition-colors hover:text-[#d9382b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]"
                >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Voltar para clientes
                </Link>

                <AppPageHeader
                    eyebrow="Relação comercial"
                    title={
                        <>
                            {customer.name}
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description={
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                            <span className="inline-flex items-center gap-2">
                                <MapPin className="size-4" aria-hidden="true" />
                                {location || 'Localização não informada'}
                            </span>
                            <span className="hidden h-5 w-px bg-border sm:block" />
                            <StatusLabel tone={relationship.tone}>
                                {relationship.label}
                            </StatusLabel>
                            <span className="hidden h-5 w-px bg-border sm:block" />
                            <span className="inline-flex items-center gap-2">
                                <CalendarDays
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                {recencyLabel(customer.last_order_at)}
                            </span>
                        </div>
                    }
                    aside={
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setEditOpen(true)}
                            className="min-h-11 rounded-[2px] px-4 text-[#d9382b] hover:bg-[#ff4d3d]/10 hover:text-[#b52a20] lg:ml-auto lg:flex"
                        >
                            <Edit3 className="size-4" aria-hidden="true" />
                            Editar cadastro
                        </Button>
                    }
                />

                <MetricRail
                    variant="open"
                    className="mt-7"
                    items={[
                        {
                            label: 'Movimentou',
                            value: formatCurrency(customer.total_spent),
                            supportingText: 'em pedidos válidos',
                            icon: (
                                <ReceiptText
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                        },
                        {
                            label: 'Compras',
                            value: customer.commercial_orders_count,
                            supportingText:
                                customer.commercial_orders_count === 1
                                    ? 'pedido comercial'
                                    : 'pedidos comerciais',
                            icon: (
                                <ShoppingBag
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                        },
                        {
                            label: 'Ticket médio',
                            value: formatCurrency(averageTicket),
                            supportingText: 'por compra registrada',
                            icon: (
                                <Package
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                        },
                        {
                            label: 'Último pedido',
                            value: formatMetricDate(customer.last_order_at),
                            supportingText: recencyLabel(
                                customer.last_order_at,
                            ),
                            icon: (
                                <CalendarDays
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                            className:
                                relationship.tone === 'coral'
                                    ? '[&_dd:first-of-type]:text-[#d63227]'
                                    : undefined,
                        },
                    ]}
                />

                <div className="mt-10 grid gap-12 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.7fr)] xl:gap-16">
                    <section aria-labelledby="journey-heading">
                        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
                            <div>
                                <p className="text-[0.68rem] font-bold tracking-[0.2em] text-[#d9382b] uppercase">
                                    Histórico em movimento
                                </p>
                                <h2
                                    id="journey-heading"
                                    className="mt-2 font-zouth-display text-2xl font-semibold tracking-[-0.035em] text-foreground"
                                >
                                    Jornada de compra
                                </h2>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {orders.meta?.total ?? orders.data.length}{' '}
                                {(orders.meta?.total ?? orders.data.length) ===
                                1
                                    ? 'pedido na história'
                                    : 'pedidos na história'}
                            </p>
                        </div>

                        {orders.data.length > 0 ? (
                            <div>
                                {orders.data.map((order) => (
                                    <OrderJourneyRow
                                        key={order.id}
                                        order={order}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="border-b border-border py-12">
                                <ShoppingBag
                                    className="size-7 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <p className="mt-4 font-zouth-display text-xl font-semibold tracking-[-0.03em] text-foreground">
                                    A primeira compra ainda está por vir.
                                </p>
                                <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                                    Quando este lojista fizer um pedido, a
                                    jornada aparecerá aqui em ordem cronológica.
                                </p>
                            </div>
                        )}

                        <Pagination
                            links={orders.meta?.links ?? orders.links}
                        />
                    </section>

                    <aside aria-labelledby="retailer-heading">
                        <div className="border-b border-border pb-5">
                            <p className="text-[0.68rem] font-bold tracking-[0.2em] text-[#d9382b] uppercase">
                                Cadastro vivo
                            </p>
                            <h2
                                id="retailer-heading"
                                className="mt-2 font-zouth-display text-2xl font-semibold tracking-[-0.035em] text-foreground"
                            >
                                Ficha do lojista
                            </h2>
                        </div>

                        <div className="border-b border-border py-5">
                            <p className="mb-2 text-[0.64rem] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                                Contato
                            </p>
                            {formattedPhone && (
                                <CustomerFact
                                    icon={<Phone className="size-4" />}
                                    label="Telefone"
                                >
                                    <a
                                        href={`tel:${customer.phone}`}
                                        className="transition-colors hover:text-[#d9382b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]"
                                    >
                                        {formattedPhone}
                                    </a>
                                </CustomerFact>
                            )}
                            {customer.email && (
                                <CustomerFact
                                    icon={<Mail className="size-4" />}
                                    label="E-mail"
                                >
                                    <a
                                        href={`mailto:${customer.email}`}
                                        className="break-all transition-colors hover:text-[#d9382b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]"
                                    >
                                        {customer.email}
                                    </a>
                                </CustomerFact>
                            )}
                            <CustomerFact
                                icon={<ReceiptText className="size-4" />}
                                label={
                                    customer.customer_document_type === 'cnpj'
                                        ? 'CNPJ'
                                        : 'CPF'
                                }
                            >
                                {formatDocument(
                                    customer.customer_document_type,
                                    customer.customer_document,
                                )}
                            </CustomerFact>
                        </div>

                        <div className="border-b border-border py-5">
                            <p className="mb-2 text-[0.64rem] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                                Endereço de entrega
                            </p>
                            <CustomerFact
                                icon={<MapPin className="size-4" />}
                                label="Destino"
                            >
                                {addressLine ? (
                                    <address className="space-y-0.5 font-[inherit] not-italic">
                                        <p>{addressLine}</p>
                                        {cityLine && <p>{cityLine}</p>}
                                        {customer.zip_code && (
                                            <p>
                                                CEP{' '}
                                                {formatZipCode(
                                                    customer.zip_code,
                                                )}
                                            </p>
                                        )}
                                        {customer.address_complement && (
                                            <p>{customer.address_complement}</p>
                                        )}
                                        {customer.address_reference && (
                                            <p className="pt-1 text-xs font-normal text-muted-foreground">
                                                Ref.{' '}
                                                {customer.address_reference}
                                            </p>
                                        )}
                                    </address>
                                ) : (
                                    <span className="font-normal text-muted-foreground">
                                        Endereço não informado
                                    </span>
                                )}
                            </CustomerFact>
                        </div>

                        <div
                            className={cn(
                                'mt-7 border-l-2 pl-5',
                                relationship.tone === 'coral'
                                    ? 'border-[#ff4d3d]'
                                    : relationship.tone === 'mineral'
                                      ? 'border-[#2e705a]'
                                      : 'border-[#18181f]',
                            )}
                        >
                            <p className="text-[0.68rem] font-bold tracking-[0.18em] text-muted-foreground uppercase">
                                Estado da relação
                            </p>
                            <p
                                className={cn(
                                    'mt-3 font-zouth-display text-lg font-semibold tracking-[-0.025em]',
                                    relationship.tone === 'coral'
                                        ? 'text-[#d63227]'
                                        : relationship.tone === 'mineral'
                                          ? 'text-[#2e705a]'
                                          : 'text-foreground',
                                )}
                            >
                                {relationship.label}
                            </p>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {relationship.detail}
                            </p>
                        </div>
                    </aside>
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
