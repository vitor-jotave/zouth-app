import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
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
import { Badge } from '@/components/ui/badge';
import InputError from '@/components/input-error';
import type { BreadcrumbItem } from '@/types';

interface Owner {
    id: number;
    name: string;
    email: string;
}

interface Manufacturer {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
    users_count: number;
    owner: Owner | null;
    created_at: string;
}

interface Props {
    manufacturers: Manufacturer[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Admin',
        href: '/admin/dashboard',
    },
    {
        title: 'Manufacturers',
        href: '/admin/manufacturers',
    },
];

export default function ManufacturersIndex({ manufacturers }: Props) {
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        manufacturer_name: '',
        owner_name: '',
        owner_email: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/manufacturers', {
            onSuccess: () => {
                reset();
                setOpen(false);
            },
        });
    };

    const handleToggle = (manufacturerId: number) => {
        router.post(`/admin/manufacturers/${manufacturerId}/toggle`, {}, {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Manufacturers" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Manufacturers</h1>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button>Create Manufacturer</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Manufacturer</DialogTitle>
                                <DialogDescription>
                                    Create a new manufacturer and assign an owner. A password reset
                                    link will be sent to the owner.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <Label htmlFor="manufacturer_name">Manufacturer Name</Label>
                                    <Input
                                        id="manufacturer_name"
                                        value={data.manufacturer_name}
                                        onChange={(e) =>
                                            setData('manufacturer_name', e.target.value)
                                        }
                                        className="mt-1"
                                        autoFocus
                                    />
                                    <InputError message={errors.manufacturer_name} className="mt-2" />
                                </div>

                                <div>
                                    <Label htmlFor="owner_name">Owner Name</Label>
                                    <Input
                                        id="owner_name"
                                        value={data.owner_name}
                                        onChange={(e) => setData('owner_name', e.target.value)}
                                        className="mt-1"
                                    />
                                    <InputError message={errors.owner_name} className="mt-2" />
                                </div>

                                <div>
                                    <Label htmlFor="owner_email">Owner Email</Label>
                                    <Input
                                        id="owner_email"
                                        type="email"
                                        value={data.owner_email}
                                        onChange={(e) => setData('owner_email', e.target.value)}
                                        className="mt-1"
                                    />
                                    <InputError message={errors.owner_email} className="mt-2" />
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        Create Manufacturer
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Slug</TableHead>
                                <TableHead>Owner</TableHead>
                                <TableHead>Users</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {manufacturers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                                        No manufacturers found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                manufacturers.map((manufacturer) => (
                                    <TableRow key={manufacturer.id}>
                                        <TableCell className="font-medium">
                                            {manufacturer.name}
                                        </TableCell>
                                        <TableCell>{manufacturer.slug}</TableCell>
                                        <TableCell>
                                            {manufacturer.owner ? (
                                                <div className="flex flex-col">
                                                    <span className="text-sm">
                                                        {manufacturer.owner.name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {manufacturer.owner.email}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">
                                                    No owner
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>{manufacturer.users_count}</TableCell>
                                        <TableCell>
                                            {manufacturer.is_active ? (
                                                <Badge variant="default">Active</Badge>
                                            ) : (
                                                <Badge variant="secondary">Inactive</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(manufacturer.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleToggle(manufacturer.id)}
                                            >
                                                {manufacturer.is_active ? 'Deactivate' : 'Activate'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}
