import { Head, Link, router } from '@inertiajs/react';
import { Package, Plus, Search, Trash2 } from 'lucide-react';
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

interface Category {
    id: number;
    name: string;
}

interface Product {
    id: number;
    name: string;
    sku: string;
    is_active: boolean;
    total_stock: number;
    price_cents?: number | null;
    category?: { id: number; name: string } | null;
    media?: Array<{ id: number; type: 'image' | 'video'; path: string }>;
}

function formatPrice(priceCents?: number | null): string {
    if (priceCents == null) {
        return 'Sob consulta';
    }

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(priceCents / 100);
}

interface Paginated<T> {
    data: T[];
    links?: Array<{ url: string | null; label: string; active: boolean }>;
    meta?: { total: number; current_page: number; last_page: number; links?: Array<{ url: string | null; label: string; active: boolean }> };
}

interface Props {
    products: Paginated<Product>;
    categories: Category[];
    filters: {
        search?: string;
        category_id?: string | number | null;
        is_active?: string | boolean | null;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Produtos', href: '/manufacturer/products' },
];

export default function ProductsIndex({ products, categories, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const updateFilters = (payload: Record<string, unknown>) => {
        router.get(
            '/manufacturer/products',
            {
                search,
                category_id: filters.category_id ?? '',
                is_active: filters.is_active ?? '',
                ...payload,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const handleSearchChange = (value: string) => {
        setSearch(value);
        updateFilters({ search: value });
    };

    const handleDelete = (productId: number) => {
        const confirmed = window.confirm('Deseja excluir este produto?');
        if (!confirmed) {
            return;
        }

        router.delete(`/manufacturer/products/${productId}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Produtos" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
                        <p className="text-sm text-muted-foreground">
                            Gerencie seu catalogo de produtos
                        </p>
                    </div>
                    <Link href="/manufacturer/products/create">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Novo produto
                        </Button>
                    </Link>
                </div>

                <div className="flex flex-col gap-3 rounded-lg border p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) =>
                                handleSearchChange(event.target.value)
                            }
                            placeholder="Buscar por nome ou SKU"
                            className="pl-9"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Select
                            value={filters.category_id ? String(filters.category_id) : 'all'}
                            onValueChange={(value) =>
                                updateFilters({
                                    category_id: value === 'all' ? '' : value,
                                })
                            }
                        >
                            <SelectTrigger className="w-[220px]">
                                <SelectValue placeholder="Categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as categorias</SelectItem>
                                {categories.map((category) => (
                                    <SelectItem key={category.id} value={String(category.id)}>
                                        {category.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={
                                filters.is_active === undefined ||
                                filters.is_active === null ||
                                filters.is_active === ''
                                    ? 'all'
                                    : String(filters.is_active)
                            }
                            onValueChange={(value) =>
                                updateFilters({
                                    is_active: value === 'all' ? '' : value,
                                })
                            }
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="true">Ativos</SelectItem>
                                <SelectItem value="false">Inativos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Produto</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Preco</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Estoque</TableHead>
                                <TableHead className="text-right">Acoes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-10 text-center">
                                        Nenhum produto encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                            {products.data.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {product.media?.[0]?.type === 'image' ? (
                                                <img
                                                    src={`/storage/${product.media[0].path}`}
                                                    alt={product.name}
                                                    className="h-10 w-10 rounded-md object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                                                    <Package className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div className="font-medium">
                                                {product.name}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{product.sku}</TableCell>
                                    <TableCell>
                                        {product.category?.name ?? 'Sem categoria'}
                                    </TableCell>
                                    <TableCell>
                                        <span className={product.price_cents == null ? 'text-muted-foreground italic' : ''}>
                                            {formatPrice(product.price_cents)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={product.is_active ? 'default' : 'secondary'}>
                                            {product.is_active ? 'Ativo' : 'Inativo'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{product.total_stock}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link href={`/manufacturer/products/${product.id}/edit`}>
                                                <Button variant="outline" size="sm">
                                                    Editar
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDelete(product.id)}
                                            >
                                                <Trash2 className="mr-1 h-4 w-4" />
                                                Excluir
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <Pagination links={products.meta?.links ?? products.links} />
            </div>
        </AppLayout>
    );
}
