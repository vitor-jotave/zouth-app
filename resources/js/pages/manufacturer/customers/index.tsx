import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    CircleAlert,
    Clock3,
    Edit3,
    MapPin,
    MoreHorizontal,
    RefreshCw,
    Search,
    UserPlus,
    UsersRound,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AppPageHeader } from '@/components/app-page-header';
import type { CustomerFormData } from '@/components/customer-form-dialog';
import { CustomerFormDialog } from '@/components/customer-form-dialog';
import { EmptyState } from '@/components/empty-state';
import { MetricRail } from '@/components/metric-rail';
import { Pagination } from '@/components/pagination';
import { ResourceToolbar } from '@/components/resource-toolbar';
import { StatusLabel, type StatusLabelTone } from '@/components/status-label';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import manufacturer from '@/routes/manufacturer';
import type { BreadcrumbItem } from '@/types';

type RelationshipFilter = 'all' | 'recent' | 'repeat' | 'attention';

interface Customer extends CustomerFormData {
    id: number;
    orders_count: number;
    commercial_orders_count: number;
    total_spent: string;
    last_order_at: string | null;
    created_at: string;
}

interface Paginated<T> {
    data: T[];
    links?: Array<{ url: string | null; label: string; active: boolean }>;
    meta?: {
        total: number;
        from?: number | null;
        to?: number | null;
        current_page: number;
        last_page: number;
        links?: Array<{ url: string | null; label: string; active: boolean }>;
    };
}

interface CustomerSummary {
    total_customers: number;
    buyers: number;
    recurring: number;
    attention: number;
}

interface Props {
    customers: Paginated<Customer>;
    attention_customer: Customer | null;
    customer_summary: CustomerSummary;
    filters: {
        search: string;
        relationship: RelationshipFilter;
    };
}

type RelationshipPresentation = {
    label: string;
    detail: string;
    tone: StatusLabelTone;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Visão geral', href: dashboard().url },
    { title: 'Clientes', href: manufacturer.customers.index().url },
];

const relationshipSegments: Array<{
    value: RelationshipFilter;
    label: string;
}> = [
    { value: 'all', label: 'Todos' },
    { value: 'recent', label: 'Recentes' },
    { value: 'repeat', label: 'Recorrentes' },
    { value: 'attention', label: 'Atenção' },
];

function formatCurrency(value: string | number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(Number(value));
}

function formatDate(value: string | null): string {
    if (!value) {
        return 'Ainda sem pedido';
    }

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    })
        .format(new Date(value))
        .replace('.', '');
}

function daysSince(value: string | null): number | null {
    if (!value) {
        return null;
    }

    const difference = Date.now() - new Date(value).getTime();

    return Math.max(0, Math.floor(difference / 86_400_000));
}

function recencyLabel(value: string | null): string {
    const days = daysSince(value);

    if (days === null) {
        return 'Primeira compra em aberto';
    }

    if (days === 0) {
        return 'Hoje';
    }

    if (days === 1) {
        return 'Há 1 dia';
    }

    return `Há ${days} dias`;
}

function orderCountLabel(count: number): string {
    return count === 1 ? '1 pedido' : `${count} pedidos`;
}

function customerInitials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) {
        return 'CL';
    }

    return [words[0], words[words.length - 1]]
        .map((word) => word[0])
        .join('')
        .toUpperCase();
}

function customerLocation(customer: Customer): string {
    const location = [customer.city, customer.state]
        .filter(Boolean)
        .join(' · ');

    return location || 'Localização não informada';
}

function relationshipFor(customer: Customer): RelationshipPresentation {
    const days = daysSince(customer.last_order_at);

    if (customer.commercial_orders_count === 0) {
        return {
            label: 'Sem pedido',
            detail: 'Primeira compra ainda em aberto',
            tone: 'muted',
        };
    }

    if (days !== null && days >= 60) {
        return {
            label: 'Retomar contato',
            detail: `${days} dias sem comprar`,
            tone: 'coral',
        };
    }

    if (customer.commercial_orders_count >= 2) {
        return {
            label: 'Recorrente',
            detail: `${customer.commercial_orders_count} compras na relação`,
            tone: 'mineral',
        };
    }

    return {
        label: 'Novo cliente',
        detail: 'Primeiro pedido realizado',
        tone: 'neutral',
    };
}

type CustomerRowProps = {
    customer: Customer;
    ordinal: number;
    onEdit: (customer: Customer) => void;
};

function CustomerRow({ customer, ordinal, onEdit }: CustomerRowProps) {
    const relationship = relationshipFor(customer);
    const customerUrl = manufacturer.customers.show(customer.id).url;

    return (
        <article className="group relative border-b border-border py-5 last:border-b-0 focus-within:bg-[#e7e3dc]/20 hover:bg-[#e7e3dc]/20 sm:px-4 xl:px-0">
            <div className="grid min-w-0 gap-5 xl:grid-cols-[2rem_3rem_minmax(155px,1.25fr)_minmax(120px,0.82fr)_minmax(112px,0.72fr)_minmax(96px,0.58fr)_3.25rem] xl:items-center xl:gap-3">
                <span className="hidden text-xs font-semibold text-muted-foreground tabular-nums xl:block">
                    {String(ordinal).padStart(2, '0')}
                </span>

                <span className="hidden size-12 items-center justify-center bg-[#e7e3dc]/70 font-zouth-display text-sm font-semibold tracking-[-0.02em] text-foreground sm:flex">
                    {customerInitials(customer.name)}
                </span>

                <div className="min-w-0">
                    <Link
                        href={customerUrl}
                        className="font-zouth-display text-[1.05rem] leading-5 font-semibold tracking-[-0.025em] text-foreground outline-none hover:text-[#d9382b] focus-visible:underline focus-visible:decoration-[#ff4d3d] focus-visible:decoration-2 focus-visible:underline-offset-4"
                    >
                        {customer.name}
                    </Link>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="size-3.5" aria-hidden="true" />
                        {customerLocation(customer)}
                    </p>
                    <div className="mt-1 flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
                        {customer.phone && <span>{customer.phone}</span>}
                        {customer.email && (
                            <span className="truncate">{customer.email}</span>
                        )}
                        {!customer.phone && !customer.email && (
                            <span>Contato não informado</span>
                        )}
                    </div>
                </div>

                <div className="min-w-0">
                    <p className="mb-2 text-[0.62rem] font-bold tracking-[0.15em] text-muted-foreground uppercase xl:hidden">
                        Relação
                    </p>
                    <StatusLabel tone={relationship.tone}>
                        {relationship.label}
                    </StatusLabel>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        {relationship.detail}
                    </p>
                </div>

                <div>
                    <p className="mb-1.5 text-[0.62rem] font-bold tracking-[0.15em] text-muted-foreground uppercase xl:hidden">
                        Último pedido
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                        {formatDate(customer.last_order_at)}
                    </p>
                    <p
                        className={cn(
                            'mt-1 text-xs font-semibold',
                            relationship.tone === 'coral'
                                ? 'text-[#d63227]'
                                : relationship.tone === 'mineral'
                                  ? 'text-[#2e705a]'
                                  : 'text-muted-foreground',
                        )}
                    >
                        {recencyLabel(customer.last_order_at)}
                    </p>
                </div>

                <div>
                    <p className="mb-1.5 text-[0.62rem] font-bold tracking-[0.15em] text-muted-foreground uppercase xl:hidden">
                        Movimentou
                    </p>
                    <p className="font-zouth-display text-sm font-semibold tracking-[-0.02em] text-foreground tabular-nums">
                        {formatCurrency(customer.total_spent)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {orderCountLabel(customer.commercial_orders_count)}
                    </p>
                </div>

                <div className="flex items-center justify-end gap-1">
                    <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        className="rounded-[2px] hover:bg-[#18181f] hover:text-[#f6f4f0]"
                    >
                        <Link
                            href={customerUrl}
                            aria-label={`Abrir ${customer.name}`}
                        >
                            <ArrowRight className="size-4" aria-hidden="true" />
                        </Link>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="rounded-[2px]"
                                aria-label={`Mais ações para ${customer.name}`}
                            >
                                <MoreHorizontal
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            sideOffset={8}
                            className="w-48 rounded-[2px] border-[#18181f] bg-[#f6f4f0] p-2 shadow-none"
                        >
                            <DropdownMenuItem asChild>
                                <Link href={customerUrl}>
                                    <ArrowRight
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Ver perfil
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem onSelect={() => onEdit(customer)}>
                                <Edit3 className="size-4" aria-hidden="true" />
                                Editar cadastro
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </article>
    );
}

type AttentionPanelProps = {
    customer: Customer | null;
};

function CustomerAttentionPanel({ customer }: AttentionPanelProps) {
    if (!customer) {
        return (
            <aside className="border-l-2 border-[#2e705a] pl-5">
                <p className="text-[0.68rem] font-bold tracking-[0.2em] text-[#2e705a] uppercase">
                    Carteira em dia
                </p>
                <p className="mt-4 font-zouth-display text-xl font-semibold tracking-[-0.035em] text-foreground">
                    Nenhuma relação esfriando agora.
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Continue acompanhando a recência para manter a recompra em
                    movimento.
                </p>
            </aside>
        );
    }

    const customerUrl = manufacturer.customers.show(customer.id).url;

    return (
        <aside className="border-l-2 border-[#ff4d3d] pl-5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[0.68rem] font-bold tracking-[0.2em] text-[#d9382b] uppercase">
                        Atenção agora
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Cliente há mais tempo sem compra
                    </p>
                </div>
                <CircleAlert
                    className="size-5 text-[#ff4d3d]"
                    aria-hidden="true"
                />
            </div>

            <div className="mt-6 border-y border-border py-6">
                <div className="flex items-start gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center bg-[#e7e3dc]/70 font-zouth-display text-sm font-semibold text-foreground">
                        {customerInitials(customer.name)}
                    </span>
                    <div className="min-w-0">
                        <h2 className="font-zouth-display text-base leading-5 font-semibold tracking-[-0.025em] text-foreground">
                            {customer.name}
                        </h2>
                        <p className="mt-2 text-sm font-semibold text-[#d63227]">
                            {recencyLabel(customer.last_order_at)} sem comprar
                        </p>
                    </div>
                </div>

                <dl className="mt-6 space-y-4 text-sm">
                    <div>
                        <dt className="text-xs text-muted-foreground">
                            Último pedido
                        </dt>
                        <dd className="mt-1 font-semibold text-foreground">
                            {formatDate(customer.last_order_at)}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-muted-foreground">
                            Valor total em pedidos
                        </dt>
                        <dd className="mt-1 font-zouth-display font-semibold text-foreground tabular-nums">
                            {formatCurrency(customer.total_spent)}
                        </dd>
                    </div>
                </dl>
            </div>

            <Link
                href={customerUrl}
                className="mt-5 flex min-h-11 items-center justify-between text-sm font-bold text-foreground hover:text-[#d9382b] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]"
            >
                Ver relação completa
                <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
        </aside>
    );
}

export default function CustomersIndex({
    customers,
    attention_customer: attentionCustomer,
    customer_summary: customerSummary,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [createOpen, setCreateOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(
        null,
    );
    const [isFiltering, setIsFiltering] = useState(false);
    const searchTimer = useRef<number | null>(null);

    useEffect(() => {
        setSearch(filters.search ?? '');
    }, [filters.search]);

    useEffect(
        () => () => {
            if (searchTimer.current !== null) {
                window.clearTimeout(searchTimer.current);
            }
        },
        [],
    );

    const navigate = (nextSearch: string) => {
        setIsFiltering(true);
        router.get(
            manufacturer.customers.index().url,
            {
                search: nextSearch || undefined,
                relationship:
                    filters.relationship === 'all'
                        ? undefined
                        : filters.relationship,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onFinish: () => setIsFiltering(false),
            },
        );
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);

        if (searchTimer.current !== null) {
            window.clearTimeout(searchTimer.current);
        }

        searchTimer.current = window.setTimeout(() => navigate(value), 280);
    };

    const clearSelection = () => {
        setSearch('');
        setIsFiltering(true);
        router.get(
            manufacturer.customers.index().url,
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                onFinish: () => setIsFiltering(false),
            },
        );
    };

    const selectionCount = customers.meta?.total ?? customers.data.length;
    const hasPortfolioFilters = Boolean(
        filters.search || filters.relationship !== 'all',
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Clientes" />

            <div className="mx-auto flex w-full max-w-[1720px] flex-1 flex-col px-5 py-8 sm:px-7 md:px-9 lg:pt-8 lg:pb-12 xl:px-12 2xl:px-14">
                <AppPageHeader
                    eyebrow="Comercial"
                    title={
                        <>
                            Clientes
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description="Histórico de quem comprou, recomprou e inativos."
                    aside={
                        <div>
                            <div className="border-l-2 border-[#ff4d3d] pl-5">
                                <p className="mt-3 text-sm leading-6 text-foreground">
                                    Fortaleça quem já comprou com você e
                                    recupere relações que perderam ritmo.
                                </p>
                            </div>
                            <Button
                                type="button"
                                onClick={() => setCreateOpen(true)}
                                className="mt-6 min-h-12 w-full rounded-[2px] bg-[#ff4d3d] px-5 text-[#18181f] shadow-none hover:bg-[#f23c2e] sm:ml-auto sm:flex sm:w-fit"
                            >
                                <UserPlus
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                Novo cliente
                            </Button>
                        </div>
                    }
                />

                <MetricRail
                    variant="open"
                    className="mt-7"
                    items={[
                        {
                            label: 'Lojistas',
                            value: customerSummary.total_customers,
                            supportingText: 'na carteira comercial',
                            icon: (
                                <UsersRound
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                        },
                        {
                            label: 'Compraram',
                            value: customerSummary.buyers,
                            supportingText: 'com pedido registrado',
                            icon: (
                                <ArrowRight
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                        },
                        {
                            label: 'Recorrentes',
                            value: customerSummary.recurring,
                            supportingText: 'compraram mais de uma vez',
                            icon: (
                                <RefreshCw
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                        },
                        {
                            label: 'Pedem atenção',
                            value: customerSummary.attention,
                            supportingText: 'sem compra recente',
                            icon: (
                                <Clock3 className="size-4" aria-hidden="true" />
                            ),
                            className:
                                customerSummary.attention > 0
                                    ? '[&_dd:first-of-type]:text-[#d63227]'
                                    : undefined,
                        },
                    ]}
                />

                <ResourceToolbar
                    className="mt-7"
                    isBusy={isFiltering}
                    search={
                        <div className="relative">
                            <Search
                                className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    handleSearchChange(event.target.value)
                                }
                                placeholder="Buscar por nome, telefone ou e-mail"
                                aria-label="Buscar clientes"
                                className="min-h-11 rounded-[2px] border-border bg-background pr-10 pl-10 shadow-none"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => handleSearchChange('')}
                                    className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-[#ff4d3d]"
                                    aria-label="Limpar busca"
                                >
                                    <X className="size-4" aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    }
                    views={
                        <div
                            className="flex min-w-max border border-border bg-background"
                            aria-label="Segmentar carteira"
                        >
                            {relationshipSegments.map((segment) => (
                                <Link
                                    key={segment.value}
                                    href={
                                        manufacturer.customers.index({
                                            query: {
                                                search: search || undefined,
                                                relationship:
                                                    segment.value === 'all'
                                                        ? undefined
                                                        : segment.value,
                                            },
                                        }).url
                                    }
                                    preserveScroll
                                    preserveState
                                    replace
                                    className={cn(
                                        'flex min-h-11 items-center border-r border-border px-4 text-sm font-semibold whitespace-nowrap transition-colors last:border-r-0 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-[#ff4d3d]',
                                        filters.relationship === segment.value
                                            ? 'bg-[#18181f] text-[#f6f4f0]'
                                            : 'bg-background text-foreground hover:bg-[#e7e3dc]/45',
                                    )}
                                >
                                    {segment.label}
                                </Link>
                            ))}
                        </div>
                    }
                    supporting={
                        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                            <p>
                                {selectionCount}{' '}
                                {selectionCount === 1
                                    ? 'cliente nesta seleção.'
                                    : 'clientes nesta seleção.'}
                            </p>
                            {hasPortfolioFilters && (
                                <button
                                    type="button"
                                    onClick={clearSelection}
                                    className="font-bold text-foreground underline decoration-[#ff4d3d] underline-offset-4"
                                >
                                    Ver carteira completa
                                </button>
                            )}
                        </div>
                    }
                />

                {customers.data.length > 0 ? (
                    <div className="mt-4 grid gap-10 xl:grid-cols-[minmax(0,1fr)_250px]">
                        <section aria-labelledby="portfolio-heading">
                            <div className="hidden grid-cols-[2rem_3rem_minmax(155px,1.25fr)_minmax(120px,0.82fr)_minmax(112px,0.72fr)_minmax(96px,0.58fr)_3.25rem] gap-3 border-b border-border py-3 text-[0.6rem] font-bold tracking-[0.14em] text-muted-foreground uppercase xl:grid">
                                <span aria-hidden="true" />
                                <span aria-hidden="true" />
                                <span>Lojista</span>
                                <span>Relação</span>
                                <span>Último pedido</span>
                                <span>Movimentou</span>
                                <span className="sr-only">Ações</span>
                            </div>

                            <div>
                                {customers.data.map((customer, index) => (
                                    <CustomerRow
                                        key={customer.id}
                                        customer={customer}
                                        ordinal={
                                            (customers.meta?.from ?? 1) + index
                                        }
                                        onEdit={setEditingCustomer}
                                    />
                                ))}
                            </div>

                            <Pagination
                                links={customers.meta?.links ?? customers.links}
                            />
                        </section>

                        <div className="hidden xl:block">
                            <CustomerAttentionPanel
                                customer={attentionCustomer}
                            />
                        </div>
                    </div>
                ) : (
                    <EmptyState
                        className="mt-7"
                        visual={
                            <UsersRound
                                className="size-8 text-muted-foreground"
                                aria-hidden="true"
                            />
                        }
                        eyebrow={
                            hasPortfolioFilters
                                ? 'Nenhuma relação encontrada'
                                : 'Sua carteira começa aqui'
                        }
                        title={
                            hasPortfolioFilters
                                ? 'Nenhum lojista combina com esta seleção.'
                                : 'Cadastre o primeiro lojista da sua coleção.'
                        }
                        description={
                            hasPortfolioFilters
                                ? 'Tente outro nome, contato ou volte para a carteira completa.'
                                : 'Os pedidos do catálogo também criam clientes automaticamente e alimentam esta visão.'
                        }
                        actions={
                            hasPortfolioFilters ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={clearSelection}
                                    className="min-h-12 rounded-[2px] px-6 shadow-none"
                                >
                                    Ver carteira completa
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    onClick={() => setCreateOpen(true)}
                                    className="min-h-12 rounded-[2px] bg-[#ff4d3d] px-6 text-[#18181f] shadow-none hover:bg-[#f23c2e]"
                                >
                                    <UserPlus
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Novo cliente
                                </Button>
                            )
                        }
                    />
                )}
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
