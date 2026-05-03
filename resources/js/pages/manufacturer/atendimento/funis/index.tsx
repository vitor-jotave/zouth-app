import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Bot,
    Edit,
    GripVertical,
    Plus,
    Save,
    ToggleLeft,
    ToggleRight,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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

interface WhatsappFunnel {
    id: number;
    name: string;
    code: string;
    is_active: boolean;
    sort_order: number;
    steps_count: number;
}

interface Paginated<T> {
    data: T[];
    links?: Array<{ url: string | null; label: string; active: boolean }>;
    meta?: {
        links?: Array<{ url: string | null; label: string; active: boolean }>;
    };
}

interface Props {
    funnels: Paginated<WhatsappFunnel>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Atendimento', href: '/manufacturer/atendimento' },
    { title: 'Funis', href: '/manufacturer/atendimento/funis' },
];

export default function AtendimentoFunisIndex({ funnels }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [orders, setOrders] = useState<Record<number, number>>(() =>
        Object.fromEntries(
            funnels.data.map((funnel) => [funnel.id, funnel.sort_order]),
        ),
    );
    const createForm = useForm({
        name: '',
        code: '',
        is_active: true,
        steps: [{ type: 'text', body: '' }],
    });

    const createFunnel = (event: FormEvent) => {
        event.preventDefault();

        createForm.post('/manufacturer/atendimento/funis', {
            preserveScroll: true,
            onSuccess: () => {
                createForm.reset();
                setCreateOpen(false);
            },
        });
    };

    const saveOrder = () => {
        router.put(
            '/manufacturer/atendimento/funis/order',
            {
                funnels: Object.entries(orders).map(([id, sortOrder]) => ({
                    id: Number(id),
                    sort_order: Number(sortOrder),
                })),
            },
            { preserveScroll: true },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Funis" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            Funis
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Fluxos sequenciais para disparo no atendimento
                            WhatsApp
                        </p>
                    </div>

                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="mr-2 size-4" />
                        Novo funil
                    </Button>
                </div>

                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Funil</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead>Passos</TableHead>
                                <TableHead>Ordem</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">
                                    Ações
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {funnels.data.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="py-10 text-center"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <Bot className="size-8 text-muted-foreground" />
                                            <p className="text-muted-foreground">
                                                Nenhum funil cadastrado.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}

                            {funnels.data.map((funnel) => (
                                <TableRow key={funnel.id}>
                                    <TableCell className="font-medium">
                                        {funnel.name}
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {funnel.code}
                                    </TableCell>
                                    <TableCell>{funnel.steps_count}</TableCell>
                                    <TableCell>
                                        <div className="flex w-28 items-center gap-2">
                                            <GripVertical className="size-4 text-muted-foreground" />
                                            <Input
                                                type="number"
                                                min={0}
                                                value={
                                                    orders[funnel.id] ??
                                                    funnel.sort_order
                                                }
                                                onChange={(event) =>
                                                    setOrders((current) => ({
                                                        ...current,
                                                        [funnel.id]: Number(
                                                            event.target.value,
                                                        ),
                                                    }))
                                                }
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                router.post(
                                                    `/manufacturer/atendimento/funis/${funnel.id}/toggle`,
                                                    {},
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            {funnel.is_active ? (
                                                <ToggleRight className="mr-2 size-4 text-emerald-600" />
                                            ) : (
                                                <ToggleLeft className="mr-2 size-4 text-muted-foreground" />
                                            )}
                                            {funnel.is_active
                                                ? 'Ativo'
                                                : 'Inativo'}
                                        </Button>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Link
                                            href={`/manufacturer/atendimento/funis/${funnel.id}/edit`}
                                        >
                                            <Button variant="outline" size="sm">
                                                <Edit className="mr-2 size-4" />
                                                Editar
                                            </Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="flex items-center justify-between">
                    <Pagination links={funnels.meta?.links ?? funnels.links} />
                    {funnels.data.length > 0 && (
                        <Button variant="outline" onClick={saveOrder}>
                            <Save className="mr-2 size-4" />
                            Salvar ordem
                        </Button>
                    )}
                </div>
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Novo funil</DialogTitle>
                        <DialogDescription>
                            Crie o funil com uma primeira mensagem. Depois, use
                            a edição para adicionar espera, áudio e produto.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={createFunnel} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="funnel-name">Nome</Label>
                            <Input
                                id="funnel-name"
                                value={createForm.data.name}
                                onChange={(event) =>
                                    createForm.setData(
                                        'name',
                                        event.target.value,
                                    )
                                }
                            />
                            <InputError message={createForm.errors.name} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="funnel-code">Código curto</Label>
                            <Input
                                id="funnel-code"
                                value={createForm.data.code}
                                onChange={(event) =>
                                    createForm.setData(
                                        'code',
                                        event.target.value.toUpperCase(),
                                    )
                                }
                            />
                            <InputError message={createForm.errors.code} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="funnel-first-message">
                                Primeira mensagem
                            </Label>
                            <Input
                                id="funnel-first-message"
                                value={createForm.data.steps[0].body}
                                onChange={(event) =>
                                    createForm.setData('steps', [
                                        {
                                            type: 'text',
                                            body: event.target.value,
                                        },
                                    ])
                                }
                            />
                            <InputError
                                message={
                                    (
                                        createForm.errors as Record<
                                            string,
                                            string
                                        >
                                    )['steps.0.body']
                                }
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Switch
                                id="funnel-active"
                                checked={createForm.data.is_active}
                                onCheckedChange={(checked) =>
                                    createForm.setData('is_active', checked)
                                }
                            />
                            <Label htmlFor="funnel-active">Ativo</Label>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCreateOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={createForm.processing}
                            >
                                {createForm.processing
                                    ? 'Criando...'
                                    : 'Criar funil'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
