import { Head, router, useForm } from '@inertiajs/react';
import { Plus, Tags, Trash2 } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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

interface Category {
    id: number;
    name: string;
    slug: string;
    products_count?: number;
}

interface Paginated<T> {
    data: T[];
    links?: Array<{ url: string | null; label: string; active: boolean }>;
    meta?: { links?: Array<{ url: string | null; label: string; active: boolean }> };
}

interface Props {
    categories: Paginated<Category>;
    filters: {
        search?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Categorias', href: '/manufacturer/categories' },
];

export default function CategoriesIndex({ categories, filters }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const createForm = useForm({ name: '' });
    const editForm = useForm({ name: '' });

    const handleCreate = (event: React.FormEvent) => {
        event.preventDefault();
        createForm.post('/manufacturer/categories', {
            onSuccess: () => {
                createForm.reset();
                setDialogOpen(false);
            },
        });
    };

    const handleEdit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!editingCategory) {
            return;
        }

        editForm.put(`/manufacturer/categories/${editingCategory.id}`, {
            onSuccess: () => {
                setEditingCategory(null);
            },
        });
    };

    const handleDelete = (categoryId: number) => {
        const confirmed = window.confirm('Deseja excluir esta categoria?');
        if (!confirmed) {
            return;
        }

        router.delete(`/manufacturer/categories/${categoryId}`);
    };

    const handleSearch = (value: string) => {
        router.get(
            '/manufacturer/categories',
            { search: value },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Categorias" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Categorias
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Organize o catalogo por categorias
                        </p>
                    </div>

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Nova categoria
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Nova categoria</DialogTitle>
                                <DialogDescription>
                                    Crie uma nova categoria para organizar os produtos.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category-name">Nome</Label>
                                    <Input
                                        id="category-name"
                                        value={createForm.data.name}
                                        onChange={(event) =>
                                            createForm.setData('name', event.target.value)
                                        }
                                    />
                                    <InputError message={createForm.errors.name} />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setDialogOpen(false)}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={createForm.processing}>
                                        Criar categoria
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="rounded-lg border p-4">
                    <div className="relative">
                        <Tags className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            defaultValue={filters.search ?? ''}
                            onChange={(event) => handleSearch(event.target.value)}
                            placeholder="Buscar categoria"
                            className="pl-9"
                        />
                    </div>
                </div>

                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Produtos</TableHead>
                                <TableHead className="text-right">Acoes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-10 text-center">
                                        Nenhuma categoria encontrada.
                                    </TableCell>
                                </TableRow>
                            )}
                            {categories.data.map((category) => (
                                <TableRow key={category.id}>
                                    <TableCell className="font-medium">
                                        {category.name}
                                    </TableCell>
                                    <TableCell>{category.slug}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {category.products_count ?? 0}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setEditingCategory(category);
                                                    editForm.setData('name', category.name);
                                                }}
                                            >
                                                Editar
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDelete(category.id)}
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

                <Pagination links={categories.meta?.links ?? categories.links} />
            </div>

            <Dialog
                open={Boolean(editingCategory)}
                onOpenChange={(open) => {
                    if (!open) {
                        setEditingCategory(null);
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar categoria</DialogTitle>
                        <DialogDescription>
                            Atualize o nome da categoria selecionada.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-category-name">Nome</Label>
                            <Input
                                id="edit-category-name"
                                value={editForm.data.name}
                                onChange={(event) =>
                                    editForm.setData('name', event.target.value)
                                }
                            />
                            <InputError message={editForm.errors.name} />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingCategory(null)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={editForm.processing}>
                                Salvar
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
