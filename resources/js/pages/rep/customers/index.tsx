import { Form, Head, Link } from '@inertiajs/react';
import { ArrowRight, Search, Users } from 'lucide-react';
import { AppPageHeader } from '@/components/app-page-header';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import rep from '@/routes/rep';

export type PageSet<T> = {
    data: T[];
    current_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
};

type Customer = {
    id: number;
    name: string;
    brand: string;
    last_order_at: string | null;
    orders_count: number;
    quotes_count: number;
    net_cents: number;
};
type Props = {
    customers: PageSet<Customer>;
    brands: { id: number; name: string }[];
    filters: { search: string; brand: number };
};

export default function Customers({ customers, brands, filters }: Props) {
    const filtered = Boolean(filters.search || filters.brand);

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Clientes', href: rep.customers.index().url },
            ]}
        >
            <Head title="Clientes" />
            <div className="mx-auto w-full max-w-[1720px] px-5 py-8 sm:px-7 md:px-9 xl:px-12 2xl:px-14">
                <AppPageHeader
                    eyebrow="Carteira comercial"
                    title={
                        <>
                            Clientes<span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description="Acompanhe os lojistas que fizeram pedidos ou solicitaram orçamentos pelo seu link."
                />
                {(filtered || customers.total > 0) && (
                    <Form
                        action={rep.customers.index()}
                        className="my-7 flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:flex-wrap sm:items-end"
                    >
                        <label className="grid flex-1 gap-2 text-sm font-semibold">
                            Buscar lojista
                            <Input
                                name="search"
                                type="search"
                                placeholder="Nome do lojista"
                                defaultValue={filters.search}
                                maxLength={100}
                                className="min-h-11 bg-background"
                            />
                        </label>
                        <label className="grid gap-2 text-sm font-semibold">
                            Marca
                            <select
                                name="brand"
                                defaultValue={filters.brand || ''}
                                className="min-h-11 rounded-sm border border-input bg-background px-3 text-sm"
                            >
                                <option value="">Todas as marcas</option>
                                {brands.map((brand) => (
                                    <option key={brand.id} value={brand.id}>
                                        {brand.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <Button type="submit" className="min-h-11">
                            <Search className="size-4" /> Filtrar
                        </Button>
                        {filtered && (
                            <Button
                                asChild
                                variant="ghost"
                                className="min-h-11"
                            >
                                <Link href={rep.customers.index()}>
                                    Limpar filtros
                                </Link>
                            </Button>
                        )}
                    </Form>
                )}
                {customers.data.length ? (
                    <section
                        aria-label="Lojistas da carteira"
                        className="mt-7 border border-border bg-background"
                    >
                        <h2 className="border-b border-border px-5 py-4 font-zouth-display text-lg font-semibold">
                            {customers.total}{' '}
                            {customers.total === 1
                                ? 'lojista na seleção'
                                : 'lojistas na seleção'}
                        </h2>
                        <ul className="divide-y divide-border">
                            {customers.data.map((customer) => (
                                <li key={customer.id}>
                                    <Link
                                        href={rep.customers.show(customer.id, {
                                            query: {
                                                ...filters,
                                                portfolio_page:
                                                    customers.current_page,
                                            },
                                        })}
                                        className="group grid gap-4 px-5 py-5 hover:bg-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#ff4d3d] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.65fr)_auto] md:items-center"
                                    >
                                        <div className="min-w-0">
                                            <h3 className="font-zouth-display text-lg font-semibold break-words">
                                                {customer.name}
                                            </h3>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                {customer.brand}
                                            </p>
                                        </div>
                                        <div className="text-sm">
                                            <p>
                                                {customer.orders_count}{' '}
                                                {customer.orders_count === 1
                                                    ? 'pedido'
                                                    : 'pedidos'}
                                                {customer.quotes_count > 0 &&
                                                    ` · ${customer.quotes_count} ${customer.quotes_count === 1 ? 'orçamento' : 'orçamentos'}`}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                {customer.last_order_at
                                                    ? `Último pedido: ${formatDateTime(customer.last_order_at)}`
                                                    : 'Sem pedidos ainda'}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 md:block">
                                            <p className="text-sm font-semibold tabular-nums">
                                                {formatCurrency(
                                                    customer.net_cents / 100,
                                                )}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Valor líquido
                                            </p>
                                        </div>
                                        <ArrowRight
                                            className="hidden size-4 group-hover:text-[#b63329] md:block"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                ) : (
                    <section className="mt-7 border border-border bg-background p-6 sm:p-9">
                        <Users
                            className="size-5 text-[#b63329]"
                            aria-hidden="true"
                        />
                        <h2 className="mt-4 font-zouth-display text-xl font-semibold">
                            {filtered
                                ? 'Nenhum lojista encontrado'
                                : 'Sua carteira ainda está vazia'}
                        </h2>
                        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                            {filtered
                                ? 'Tente outro nome ou escolha todas as marcas.'
                                : 'Compartilhe o catálogo de uma marca parceira. Quando um lojista fizer um pedido pelo seu link, ele aparecerá aqui.'}
                        </p>
                        {!filtered && (
                            <Button asChild variant="outline" className="mt-5">
                                <Link href={rep.manufacturers.index()}>
                                    Ir para a Vitrine{' '}
                                    <ArrowRight className="size-4" />
                                </Link>
                            </Button>
                        )}
                    </section>
                )}
                <Pagination links={customers.links} />
            </div>
        </AppLayout>
    );
}
