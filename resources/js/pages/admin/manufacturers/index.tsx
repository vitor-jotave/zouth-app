import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
    store,
    update,
    toggle as toggleManufacturer,
} from '@/actions/App/Http/Controllers/Admin/ManufacturerController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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

interface Owner {
    id: number;
    name: string;
    email: string;
}

interface Manufacturer {
    id: number;
    name: string;
    slug: string;
    cnpj: string | null;
    phone: string | null;
    logo_url: string | null;
    zip_code: string | null;
    state: string | null;
    city: string | null;
    neighborhood: string | null;
    street: string | null;
    address_number: string | null;
    complement: string | null;
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
        title: 'Fabricantes',
        href: '/admin/manufacturers',
    },
];

function formatCnpj(raw: string | null): string {
    if (!raw) return '—';
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 14) return raw;
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

type AddressFields = {
    zip_code: string;
    state: string;
    city: string;
    neighborhood: string;
    street: string;
    address_number: string;
    complement: string;
};

type CreateFormData = {
    manufacturer_name: string;
    owner_name: string;
    owner_email: string;
    owner_temporary_password: string;
    cnpj: string;
    phone: string;
    logo: File | null;
} & AddressFields;

type EditFormData = {
    name: string;
    cnpj: string;
    phone: string;
    logo: File | null;
    remove_logo: boolean;
} & AddressFields;

export default function ManufacturersIndex({ manufacturers }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editingManufacturer, setEditingManufacturer] = useState<Manufacturer | null>(null);
    const [linkModalOpen, setLinkModalOpen] = useState(false);
    const [planSelectionUrl, setPlanSelectionUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const copyToClipboard = (text: string) => {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const createForm = useForm<CreateFormData>({
        manufacturer_name: '',
        owner_name: '',
        owner_email: '',
        owner_temporary_password: '',
        cnpj: '',
        phone: '',
        logo: null,
        zip_code: '',
        state: '',
        city: '',
        neighborhood: '',
        street: '',
        address_number: '',
        complement: '',
    });

    const editForm = useForm<EditFormData>({
        name: '',
        cnpj: '',
        phone: '',
        logo: null,
        remove_logo: false,
        zip_code: '',
        state: '',
        city: '',
        neighborhood: '',
        street: '',
        address_number: '',
        complement: '',
    });

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post(store.url(), {
            forceFormData: true,
            onSuccess: (page) => {
                createForm.reset();
                setCreateOpen(false);
                const url = (page.props as { flash?: { plan_selection_url?: string | null } }).flash?.plan_selection_url ?? null;
                if (url) {
                    setPlanSelectionUrl(url);
                    setLinkModalOpen(true);
                }
            },
        });
    };

    const handleEditOpen = (manufacturer: Manufacturer) => {
        setEditingManufacturer(manufacturer);
        editForm.setData({
            name: manufacturer.name,
            cnpj: manufacturer.cnpj ?? '',
            phone: manufacturer.phone ?? '',
            logo: null,
            remove_logo: false,
            zip_code: manufacturer.zip_code ?? '',
            state: manufacturer.state ?? '',
            city: manufacturer.city ?? '',
            neighborhood: manufacturer.neighborhood ?? '',
            street: manufacturer.street ?? '',
            address_number: manufacturer.address_number ?? '',
            complement: manufacturer.complement ?? '',
        });
        setEditOpen(true);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingManufacturer) return;
        editForm.put(update.url(editingManufacturer.id), {
            forceFormData: true,
            onSuccess: () => {
                setEditOpen(false);
            },
        });
    };

    const handleToggle = (manufacturerId: number) => {
        router.post(toggleManufacturer.url(manufacturerId), {}, {
            preserveScroll: true,
        });
    };

    const addressFields = (form: ReturnType<typeof useForm<AddressFields>>, prefix?: 'create' | 'edit') => {
        const id = (name: string) => `${prefix ?? 'f'}-${name}`;
        return (
            <>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor={id('zip_code')}>CEP</Label>
                        <Input
                            id={id('zip_code')}
                            value={form.data.zip_code}
                            onChange={(e) => form.setData('zip_code', e.target.value)}
                            placeholder="00000-000"
                            className="mt-1"
                        />
                        <InputError message={form.errors.zip_code} className="mt-2" />
                    </div>
                    <div>
                        <Label htmlFor={id('state')}>Estado (UF)</Label>
                        <Input
                            id={id('state')}
                            value={form.data.state}
                            onChange={(e) => form.setData('state', e.target.value.toUpperCase().slice(0, 2))}
                            placeholder="SP"
                            maxLength={2}
                            className="mt-1"
                        />
                        <InputError message={form.errors.state} className="mt-2" />
                    </div>
                </div>

                <div>
                    <Label htmlFor={id('city')}>Cidade</Label>
                    <Input
                        id={id('city')}
                        value={form.data.city}
                        onChange={(e) => form.setData('city', e.target.value)}
                        className="mt-1"
                    />
                    <InputError message={form.errors.city} className="mt-2" />
                </div>

                <div>
                    <Label htmlFor={id('neighborhood')}>Bairro</Label>
                    <Input
                        id={id('neighborhood')}
                        value={form.data.neighborhood}
                        onChange={(e) => form.setData('neighborhood', e.target.value)}
                        className="mt-1"
                    />
                    <InputError message={form.errors.neighborhood} className="mt-2" />
                </div>

                <div>
                    <Label htmlFor={id('street')}>Rua / Logradouro</Label>
                    <Input
                        id={id('street')}
                        value={form.data.street}
                        onChange={(e) => form.setData('street', e.target.value)}
                        className="mt-1"
                    />
                    <InputError message={form.errors.street} className="mt-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor={id('address_number')}>Número</Label>
                        <Input
                            id={id('address_number')}
                            value={form.data.address_number}
                            onChange={(e) => form.setData('address_number', e.target.value)}
                            className="mt-1"
                        />
                        <InputError message={form.errors.address_number} className="mt-2" />
                    </div>
                    <div>
                        <Label htmlFor={id('complement')}>Complemento</Label>
                        <Input
                            id={id('complement')}
                            value={form.data.complement}
                            onChange={(e) => form.setData('complement', e.target.value)}
                            placeholder="Apto, Sala, etc."
                            className="mt-1"
                        />
                        <InputError message={form.errors.complement} className="mt-2" />
                    </div>
                </div>
            </>
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Fabricantes" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Fabricantes</h1>
                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger asChild>
                            <Button>Novo Fabricante</Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Criar Novo Fabricante</DialogTitle>
                                <DialogDescription>
                                    Preencha os dados do fabricante e do responsável. Um link de redefinição de senha será enviado ao responsável.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreateSubmit} className="space-y-4">
                                <div>
                                    <Label htmlFor="create-manufacturer_name">Nome do Fabricante</Label>
                                    <Input
                                        id="create-manufacturer_name"
                                        value={createForm.data.manufacturer_name}
                                        onChange={(e) => createForm.setData('manufacturer_name', e.target.value)}
                                        className="mt-1"
                                        autoFocus
                                    />
                                    <InputError message={createForm.errors.manufacturer_name} className="mt-2" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="create-cnpj">CNPJ</Label>
                                        <Input
                                            id="create-cnpj"
                                            value={createForm.data.cnpj}
                                            onChange={(e) => createForm.setData('cnpj', e.target.value)}
                                            placeholder="00.000.000/0000-00"
                                            className="mt-1"
                                        />
                                        <InputError message={createForm.errors.cnpj} className="mt-2" />
                                    </div>
                                    <div>
                                        <Label htmlFor="create-phone">Telefone</Label>
                                        <Input
                                            id="create-phone"
                                            value={createForm.data.phone}
                                            onChange={(e) => createForm.setData('phone', e.target.value)}
                                            placeholder="(11) 99999-9999"
                                            className="mt-1"
                                        />
                                        <InputError message={createForm.errors.phone} className="mt-2" />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="create-logo">Logo</Label>
                                    <Input
                                        id="create-logo"
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => createForm.setData('logo', e.target.files?.[0] ?? null)}
                                        className="mt-1"
                                    />
                                    <InputError message={createForm.errors.logo} className="mt-2" />
                                </div>

                                <p className="text-sm font-medium text-muted-foreground">Endereço</p>
                                {addressFields(createForm, 'create')}

                                <p className="text-sm font-medium text-muted-foreground">Responsável</p>

                                <div>
                                    <Label htmlFor="create-owner_name">Nome do Responsável</Label>
                                    <Input
                                        id="create-owner_name"
                                        value={createForm.data.owner_name}
                                        onChange={(e) => createForm.setData('owner_name', e.target.value)}
                                        className="mt-1"
                                    />
                                    <InputError message={createForm.errors.owner_name} className="mt-2" />
                                </div>

                                <div>
                                    <Label htmlFor="create-owner_email">E-mail do Responsável</Label>
                                    <Input
                                        id="create-owner_email"
                                        type="email"
                                        value={createForm.data.owner_email}
                                        onChange={(e) => createForm.setData('owner_email', e.target.value)}
                                        className="mt-1"
                                    />
                                    <InputError message={createForm.errors.owner_email} className="mt-2" />
                                </div>

                                <div>
                                    <Label htmlFor="create-owner_temporary_password">Senha Temporária</Label>
                                    <Input
                                        id="create-owner_temporary_password"
                                        type="text"
                                        value={createForm.data.owner_temporary_password}
                                        onChange={(e) => createForm.setData('owner_temporary_password', e.target.value)}
                                        placeholder="Opcional — mínimo 6 caracteres"
                                        className="mt-1"
                                        autoComplete="off"
                                    />
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Se informada, a conta será criada com esta senha. O e-mail de redefinição de senha continua sendo enviado normalmente.
                                    </p>
                                    <InputError message={createForm.errors.owner_temporary_password} className="mt-2" />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setCreateOpen(false)}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={createForm.processing}>
                                        Criar Fabricante
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Edit Dialog */}
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Editar Fabricante</DialogTitle>
                            <DialogDescription>
                                Atualize os dados do fabricante.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="edit-name">Nome do Fabricante</Label>
                                <Input
                                    id="edit-name"
                                    value={editForm.data.name}
                                    onChange={(e) => editForm.setData('name', e.target.value)}
                                    className="mt-1"
                                    autoFocus
                                />
                                <InputError message={editForm.errors.name} className="mt-2" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="edit-cnpj">CNPJ</Label>
                                    <Input
                                        id="edit-cnpj"
                                        value={editForm.data.cnpj}
                                        onChange={(e) => editForm.setData('cnpj', e.target.value)}
                                        placeholder="00.000.000/0000-00"
                                        className="mt-1"
                                    />
                                    <InputError message={editForm.errors.cnpj} className="mt-2" />
                                </div>
                                <div>
                                    <Label htmlFor="edit-phone">Telefone</Label>
                                    <Input
                                        id="edit-phone"
                                        value={editForm.data.phone}
                                        onChange={(e) => editForm.setData('phone', e.target.value)}
                                        placeholder="(11) 99999-9999"
                                        className="mt-1"
                                    />
                                    <InputError message={editForm.errors.phone} className="mt-2" />
                                </div>
                            </div>

                            <div>
                                <Label>Logo</Label>
                                {editingManufacturer?.logo_url && !editForm.data.remove_logo && (
                                    <div className="mt-1 mb-2">
                                        <img
                                            src={editingManufacturer.logo_url}
                                            alt="Logo atual"
                                            className="h-16 w-auto rounded border object-contain"
                                        />
                                    </div>
                                )}
                                {editingManufacturer?.logo_url && (
                                    <div className="mb-2 flex items-center gap-2">
                                        <Checkbox
                                            id="edit-remove_logo"
                                            checked={editForm.data.remove_logo}
                                            onCheckedChange={(checked) =>
                                                editForm.setData('remove_logo', checked === true)
                                            }
                                        />
                                        <Label htmlFor="edit-remove_logo" className="cursor-pointer font-normal">
                                            Remover logo atual
                                        </Label>
                                    </div>
                                )}
                                {!editForm.data.remove_logo && (
                                    <>
                                        <Input
                                            id="edit-logo"
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => editForm.setData('logo', e.target.files?.[0] ?? null)}
                                            className="mt-1"
                                        />
                                        <InputError message={editForm.errors.logo} className="mt-2" />
                                    </>
                                )}
                            </div>

                            <p className="text-sm font-medium text-muted-foreground">Endereço</p>
                            {addressFields(editForm, 'edit')}

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEditOpen(false)}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={editForm.processing}>
                                    Salvar Alterações
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead>CNPJ</TableHead>
                                <TableHead>Telefone</TableHead>
                                <TableHead>Cidade/UF</TableHead>
                                <TableHead>Responsável</TableHead>
                                <TableHead>Usuários</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Criado</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {manufacturers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                                        Nenhum fabricante encontrado. Crie um para começar.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                manufacturers.map((manufacturer) => (
                                    <TableRow key={manufacturer.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {manufacturer.logo_url && (
                                                    <img
                                                        src={manufacturer.logo_url}
                                                        alt={manufacturer.name}
                                                        className="h-6 w-6 rounded object-contain"
                                                    />
                                                )}
                                                {manufacturer.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {formatCnpj(manufacturer.cnpj)}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {manufacturer.phone ?? '—'}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {manufacturer.city && manufacturer.state
                                                ? `${manufacturer.city}/${manufacturer.state}`
                                                : manufacturer.city ?? manufacturer.state ?? '—'}
                                        </TableCell>
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
                                                    Sem responsável
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>{manufacturer.users_count}</TableCell>
                                        <TableCell>
                                            {manufacturer.is_active ? (
                                                <Badge variant="default">Ativo</Badge>
                                            ) : (
                                                <Badge variant="secondary">Inativo</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(manufacturer.created_at).toLocaleDateString('pt-BR')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEditOpen(manufacturer)}
                                                >
                                                    Editar
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleToggle(manufacturer.id)}
                                                >
                                                    {manufacturer.is_active ? 'Desativar' : 'Ativar'}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Plan selection link modal — shown after creating a manufacturer */}
            <Dialog open={linkModalOpen} onOpenChange={setLinkModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Link de seleção de plano</DialogTitle>
                        <DialogDescription>
                            O link abaixo foi enviado ao responsável por e-mail. Guarde-o caso precise reenviar manualmente ou acompanhar o processo de ativação.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-2">
                        <Input
                            readOnly
                            value={planSelectionUrl ?? ''}
                            className="font-mono text-xs"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => {
                                if (planSelectionUrl) {
                                    copyToClipboard(planSelectionUrl);
                                }
                            }}
                        >
                            {copied ? 'Copiado!' : 'Copiar'}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Este link expira em 3 dias.
                    </p>
                    <DialogFooter>
                        <Button onClick={() => setLinkModalOpen(false)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
