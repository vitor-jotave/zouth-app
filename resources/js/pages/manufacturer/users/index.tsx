import { Head, router, useForm } from '@inertiajs/react';
import { Users as UsersIcon } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
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

interface User {
    id: number;
    name: string;
    email: string;
    role: 'owner' | 'staff';
    status: 'active' | 'blocked';
    created_at: string;
}

interface Manufacturer {
    id: number;
    name: string;
}

interface Props {
    users: User[];
    manufacturer: Manufacturer;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Usuários',
        href: '/users',
    },
];

export default function UsersIndex({ users, manufacturer }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        role: 'staff' as 'owner' | 'staff',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/users', {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                setDialogOpen(false);
            },
        });
    };

    const toggleStatus = (userId: number, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
        router.post(`/users/${userId}/status`, {
            status: newStatus,
        });
    };

    const updateRole = (userId: number, newRole: string) => {
        router.post(`/users/${userId}/role`, {
            role: newRole,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Usuários" />

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Usuários
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Gerencie os usuários de {manufacturer.name}
                        </p>
                    </div>

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <UsersIcon className="mr-2 h-4 w-4" />
                                Adicionar Usuário
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Adicionar Usuário</DialogTitle>
                                <DialogDescription>
                                    Crie um novo usuário para o fabricante. Um
                                    email de definição de senha será enviado.
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nome</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) =>
                                            setData('name', e.target.value)
                                        }
                                        placeholder="Nome do usuário"
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) =>
                                            setData('email', e.target.value)
                                        }
                                        placeholder="email@exemplo.com"
                                    />
                                    <InputError message={errors.email} />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="role">Função</Label>
                                    <Select
                                        value={data.role}
                                        onValueChange={(value) =>
                                            setData(
                                                'role',
                                                value as 'owner' | 'staff',
                                            )
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="staff">
                                                Equipe
                                            </SelectItem>
                                            <SelectItem value="owner">
                                                Proprietário
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.role} />
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setDialogOpen(false)}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        Criar Usuário
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Função</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Criado em</TableHead>
                                <TableHead className="text-right">
                                    Ações
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="h-24 text-center"
                                    >
                                        Nenhum usuário encontrado.
                                    </TableCell>
                                </TableRow>
                            )}
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">
                                        {user.name}
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Select
                                            value={user.role}
                                            onValueChange={(value) =>
                                                updateRole(user.id, value)
                                            }
                                        >
                                            <SelectTrigger className="w-24">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="staff">
                                                    Staff
                                                </SelectItem>
                                                <SelectItem value="owner">
                                                    Owner
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                user.status === 'active'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {user.status === 'active'
                                                ? 'Ativo'
                                                : 'Bloqueado'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{user.created_at}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                toggleStatus(
                                                    user.id,
                                                    user.status,
                                                )
                                            }
                                        >
                                            {user.status === 'active'
                                                ? 'Bloquear'
                                                : 'Ativar'}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}
