import { Head, router, useForm } from '@inertiajs/react';
import { Layers, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

interface VariationValue {
    id?: number;
    value: string;
    hex: string | null;
    display_order: number;
}

interface VariationType {
    id: number;
    name: string;
    is_color_type: boolean;
    display_order: number;
    values: VariationValue[];
}

interface Props {
    variation_types: VariationType[];
    flash?: {
        success?: string;
        error?: string;
    };
}

interface FormValues {
    id?: number;
    value: string;
    hex: string;
}

interface CreateFormData {
    name: string;
    is_color_type: boolean;
    values: FormValues[];
}

interface EditFormData {
    name: string;
    is_color_type: boolean;
    values: FormValues[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Variações', href: '/manufacturer/variation-types' },
];

function ColorSwatch({ hex }: { hex: string | null }) {
    if (!hex) return null;
    return (
        <span
            className="inline-block size-4 rounded-full border border-gray-300"
            style={{ backgroundColor: hex }}
        />
    );
}

export default function VariationTypesIndex({ variation_types }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editingType, setEditingType] = useState<VariationType | null>(null);

    const createForm = useForm<CreateFormData>({
        name: '',
        is_color_type: false,
        values: [{ value: '', hex: '' }],
    });

    const editForm = useForm<EditFormData>({
        name: '',
        is_color_type: false,
        values: [],
    });

    // --- Create handlers ---
    const handleCreateAddValue = () => {
        createForm.setData('values', [...createForm.data.values, { value: '', hex: '' }]);
    };

    const handleCreateRemoveValue = (index: number) => {
        createForm.setData(
            'values',
            createForm.data.values.filter((_, i) => i !== index),
        );
    };

    const handleCreateValueChange = (index: number, field: 'value' | 'hex', val: string) => {
        const updated = [...createForm.data.values];
        updated[index] = { ...updated[index], [field]: val };
        createForm.setData('values', updated);
    };

    const handleCreate = (event: React.FormEvent) => {
        event.preventDefault();
        createForm.post('/manufacturer/variation-types', {
            onSuccess: () => {
                createForm.reset();
                createForm.setData('values', [{ value: '', hex: '' }]);
                setCreateOpen(false);
            },
        });
    };

    // --- Edit handlers ---
    const openEdit = (type: VariationType) => {
        setEditingType(type);
        editForm.setData({
            name: type.name,
            is_color_type: type.is_color_type,
            values: type.values.map((v) => ({
                id: v.id,
                value: v.value,
                hex: v.hex ?? '',
            })),
        });
    };

    const handleEditAddValue = () => {
        editForm.setData('values', [...editForm.data.values, { value: '', hex: '' }]);
    };

    const handleEditRemoveValue = (index: number) => {
        editForm.setData(
            'values',
            editForm.data.values.filter((_, i) => i !== index),
        );
    };

    const handleEditValueChange = (index: number, field: 'value' | 'hex', val: string) => {
        const updated = [...editForm.data.values];
        updated[index] = { ...updated[index], [field]: val };
        editForm.setData('values', updated);
    };

    const handleEdit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!editingType) return;

        editForm.put(`/manufacturer/variation-types/${editingType.id}`, {
            onSuccess: () => {
                setEditingType(null);
            },
        });
    };

    // --- Delete handler ---
    const handleDelete = (typeId: number) => {
        if (!window.confirm('Deseja excluir este tipo de variação?')) return;
        router.delete(`/manufacturer/variation-types/${typeId}`);
    };

    // --- Value list component ---
    function ValueListEditor({
        values,
        isColorType,
        onAdd,
        onRemove,
        onChange,
        errors,
    }: {
        values: FormValues[];
        isColorType: boolean;
        onAdd: () => void;
        onRemove: (index: number) => void;
        onChange: (index: number, field: 'value' | 'hex', val: string) => void;
        errors: Record<string, string>;
    }) {
        return (
            <div className="space-y-2">
                <Label>Valores</Label>
                <div className="space-y-2">
                    {values.map((v, index) => (
                        <div key={index} className="flex items-start gap-2">
                            <div className="flex-1 space-y-1">
                                <Input
                                    placeholder="Ex: P, M, G ou Azul, Vermelho..."
                                    value={v.value}
                                    onChange={(e) => onChange(index, 'value', e.target.value)}
                                />
                                {errors[`values.${index}.value`] && (
                                    <InputError message={errors[`values.${index}.value`]} />
                                )}
                            </div>
                            {isColorType && (
                                <div className="flex items-center gap-1">
                                    <Input
                                        type="color"
                                        value={v.hex || '#000000'}
                                        onChange={(e) => onChange(index, 'hex', e.target.value)}
                                        className="h-9 w-12 cursor-pointer p-1"
                                    />
                                    {v.hex && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-9 w-9 p-0"
                                            onClick={() => onChange(index, 'hex', '')}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            )}
                            {values.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 w-9 shrink-0 p-0 text-destructive hover:text-destructive"
                                    onClick={() => onRemove(index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={onAdd}>
                    <Plus className="mr-1 h-3 w-3" />
                    Adicionar valor
                </Button>
            </div>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Variações" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Variações</h1>
                        <p className="text-sm text-muted-foreground">
                            Gerencie os tipos de variação dos seus produtos (ex: Tamanho, Cor, Material)
                        </p>
                    </div>

                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Nova variação
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Nova variação</DialogTitle>
                                <DialogDescription>
                                    Crie um novo tipo de variação e seus valores.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="create-name">Nome</Label>
                                    <Input
                                        id="create-name"
                                        placeholder="Ex: Tamanho, Cor, Material..."
                                        value={createForm.data.name}
                                        onChange={(e) => createForm.setData('name', e.target.value)}
                                    />
                                    <InputError message={createForm.errors.name} />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="create-is-color"
                                        checked={createForm.data.is_color_type}
                                        onCheckedChange={(checked) =>
                                            createForm.setData('is_color_type', checked === true)
                                        }
                                    />
                                    <Label htmlFor="create-is-color" className="cursor-pointer">
                                        Este tipo representa cores (exibir swatch de cor)
                                    </Label>
                                </div>

                                <ValueListEditor
                                    values={createForm.data.values}
                                    isColorType={createForm.data.is_color_type}
                                    onAdd={handleCreateAddValue}
                                    onRemove={handleCreateRemoveValue}
                                    onChange={handleCreateValueChange}
                                    errors={createForm.errors}
                                />

                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={createForm.processing}>
                                        Criar variação
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
                                <TableHead>Tipo</TableHead>
                                <TableHead>Valores</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {variation_types.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-10 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Layers className="h-8 w-8 text-muted-foreground" />
                                            <p className="text-muted-foreground">
                                                Nenhum tipo de variação cadastrado.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {variation_types.map((type) => (
                                <TableRow key={type.id}>
                                    <TableCell className="font-medium">{type.name}</TableCell>
                                    <TableCell>
                                        {type.is_color_type ? (
                                            <Badge variant="outline" className="gap-1">
                                                <span className="inline-block size-2.5 rounded-full bg-gradient-to-r from-red-500 via-green-500 to-blue-500" />
                                                Cor
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">Texto</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {type.values.map((v) => (
                                                <Badge key={v.id} variant="outline" className="gap-1">
                                                    <ColorSwatch hex={v.hex ?? null} />
                                                    {v.value}
                                                </Badge>
                                            ))}
                                            {type.values.length === 0 && (
                                                <span className="text-sm text-muted-foreground">Sem valores</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => openEdit(type)}>
                                                Editar
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDelete(type.id)}>
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
            </div>

            {/* Edit Dialog */}
            <Dialog
                open={Boolean(editingType)}
                onOpenChange={(open) => {
                    if (!open) setEditingType(null);
                }}
            >
                <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Editar variação</DialogTitle>
                        <DialogDescription>Atualize o tipo de variação e seus valores.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Nome</Label>
                            <Input
                                id="edit-name"
                                placeholder="Ex: Tamanho, Cor, Material..."
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                            />
                            <InputError message={editForm.errors.name} />
                        </div>

                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="edit-is-color"
                                checked={editForm.data.is_color_type}
                                onCheckedChange={(checked) =>
                                    editForm.setData('is_color_type', checked === true)
                                }
                            />
                            <Label htmlFor="edit-is-color" className="cursor-pointer">
                                Este tipo representa cores (exibir swatch de cor)
                            </Label>
                        </div>

                        <ValueListEditor
                            values={editForm.data.values}
                            isColorType={editForm.data.is_color_type}
                            onAdd={handleEditAddValue}
                            onRemove={handleEditRemoveValue}
                            onChange={handleEditValueChange}
                            errors={editForm.errors}
                        />

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setEditingType(null)}>
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
