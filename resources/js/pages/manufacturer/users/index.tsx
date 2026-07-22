import { Head, router, useForm } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    Ban,
    BookOpen,
    Boxes,
    Brush,
    ChartNoAxesCombined,
    Check,
    CheckCircle2,
    Crown,
    KeyRound,
    LockKeyhole,
    MessageCircleMore,
    MoreHorizontal,
    PencilLine,
    Search,
    ShieldCheck,
    ShoppingCart,
    UserCheck,
    UserCog,
    UserPlus,
    UsersRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { AppPageHeader } from '@/components/app-page-header';
import InputError from '@/components/input-error';
import { MetricRail } from '@/components/metric-rail';
import { ResourceToolbar } from '@/components/resource-toolbar';
import { StatusLabel } from '@/components/status-label';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import usersRoutes from '@/routes/users';
import type { BreadcrumbItem } from '@/types';

type MemberRole = 'owner' | 'staff';
type MemberStatus = 'active' | 'blocked';
type MemberSegment = 'all' | 'owner' | 'staff' | 'blocked';

interface TeamMember {
    id: number;
    name: string;
    email: string;
    role: MemberRole;
    status: MemberStatus;
    capabilities: string[];
    created_at: string;
    is_current_user: boolean;
    is_primary_owner: boolean;
}

interface CapabilityOption {
    value: string;
    label: string;
    description: string;
}

interface Manufacturer {
    id: number;
    name: string;
    primary_owner_user_id: number | null;
    current_user_is_primary_owner: boolean;
}

interface TeamMetrics {
    total: number;
    owners: number;
    staff: number;
    blocked: number;
}

interface Props {
    users: TeamMember[];
    manufacturer: Manufacturer;
    metrics: TeamMetrics;
    capabilityOptions: CapabilityOption[];
    suggestedStaffCapabilities: string[];
}

type EditorState = { mode: 'invite' } | { mode: 'edit'; member: TeamMember };

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Visão geral',
        href: '/dashboard',
    },
    {
        title: 'Equipe',
        href: usersRoutes.index().url,
    },
];

const segments: Array<{ value: MemberSegment; label: string }> = [
    { value: 'all', label: 'Todos' },
    { value: 'owner', label: 'Proprietários' },
    { value: 'staff', label: 'Colaboradores' },
    { value: 'blocked', label: 'Bloqueados' },
];

const capabilityIcons: Record<string, LucideIcon> = {
    'collection.manage': Boxes,
    'catalog.manage': Brush,
    'orders.manage': ShoppingCart,
    'customers.manage': BookOpen,
    'affiliations.manage': UserCheck,
    'reports.view': ChartNoAxesCombined,
    'whatsapp.manage': MessageCircleMore,
};

function initials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

function roleLabel(member: TeamMember): string {
    if (member.is_primary_owner) {
        return 'Proprietário principal';
    }

    return member.role === 'owner' ? 'Proprietário' : 'Colaborador';
}

export default function UsersIndex({
    users,
    manufacturer,
    metrics,
    capabilityOptions,
    suggestedStaffCapabilities,
}: Props) {
    const [editor, setEditor] = useState<EditorState | null>(null);
    const [transferTarget, setTransferTarget] = useState<TeamMember | null>(
        null,
    );
    const [search, setSearch] = useState('');
    const [segment, setSegment] = useState<MemberSegment>('all');

    const inviteForm = useForm({
        name: '',
        email: '',
        role: 'staff' as MemberRole,
        capabilities: suggestedStaffCapabilities,
    });

    const accessForm = useForm({
        role: 'staff' as MemberRole,
        capabilities: [] as string[],
    });

    const transferForm = useForm({
        current_password: '',
    });

    const capabilityLabels = useMemo(
        () =>
            new Map(
                capabilityOptions.map((capability) => [
                    capability.value,
                    capability.label,
                ]),
            ),
        [capabilityOptions],
    );

    const visibleMembers = useMemo(() => {
        const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR');

        return users.filter((member) => {
            const matchesSearch =
                normalizedSearch === '' ||
                member.name
                    .toLocaleLowerCase('pt-BR')
                    .includes(normalizedSearch) ||
                member.email
                    .toLocaleLowerCase('pt-BR')
                    .includes(normalizedSearch);
            const matchesSegment =
                segment === 'all' ||
                (segment === 'blocked'
                    ? member.status === 'blocked'
                    : member.role === segment && member.status === 'active');

            return matchesSearch && matchesSegment;
        });
    }, [search, segment, users]);

    const openInviteEditor = () => {
        inviteForm.clearErrors();
        inviteForm.reset();
        inviteForm.setData({
            name: '',
            email: '',
            role: 'staff',
            capabilities: suggestedStaffCapabilities,
        });
        setEditor({ mode: 'invite' });
    };

    const openAccessEditor = (member: TeamMember) => {
        accessForm.clearErrors();
        accessForm.setData({
            role: member.role,
            capabilities: member.capabilities,
        });
        setEditor({ mode: 'edit', member });
    };

    const closeEditor = () => {
        if (inviteForm.processing || accessForm.processing) {
            return;
        }

        setEditor(null);
        inviteForm.clearErrors();
        accessForm.clearErrors();
    };

    const submitEditor = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!editor) {
            return;
        }

        if (editor.mode === 'invite') {
            inviteForm.post(usersRoutes.store().url, {
                preserveScroll: true,
                onSuccess: closeEditor,
            });

            return;
        }

        accessForm.post(usersRoutes.updateRole(editor.member.id).url, {
            preserveScroll: true,
            onSuccess: closeEditor,
        });
    };

    const toggleCapability = (value: string) => {
        const capabilities = activeForm.data.capabilities.includes(value)
            ? activeForm.data.capabilities.filter(
                  (capability) => capability !== value,
              )
            : [...activeForm.data.capabilities, value];

        if (editor?.mode === 'invite') {
            inviteForm.setData('capabilities', capabilities);
        } else {
            accessForm.setData('capabilities', capabilities);
        }
    };

    const setSelectedRole = (role: MemberRole) => {
        if (editor?.mode === 'invite') {
            inviteForm.setData('role', role);
        } else {
            accessForm.setData('role', role);
        }
    };

    const updateStatus = (member: TeamMember) => {
        router.post(
            usersRoutes.updateStatus(member.id).url,
            {
                status: member.status === 'active' ? 'blocked' : 'active',
            },
            {
                preserveScroll: true,
            },
        );
    };

    const openTransferDialog = (member: TeamMember) => {
        transferForm.reset();
        transferForm.clearErrors();
        setTransferTarget(member);
    };

    const closeTransferDialog = () => {
        if (transferForm.processing) {
            return;
        }

        setTransferTarget(null);
        transferForm.reset();
        transferForm.clearErrors();
    };

    const submitOwnershipTransfer = (
        event: React.FormEvent<HTMLFormElement>,
    ) => {
        event.preventDefault();

        if (!transferTarget) {
            return;
        }

        transferForm.post(
            usersRoutes.transferOwnership(transferTarget.id).url,
            {
                preserveScroll: true,
                onSuccess: closeTransferDialog,
            },
        );
    };

    const summarizeAccess = (member: TeamMember): string => {
        if (member.is_primary_owner) {
            return 'Conta, assinatura e acesso total';
        }

        if (member.role === 'owner') {
            return 'Acesso total à operação';
        }

        if (member.capabilities.length === capabilityOptions.length) {
            return 'Todas as áreas da operação';
        }

        return member.capabilities
            .map((capability) => capabilityLabels.get(capability))
            .filter((label): label is string => Boolean(label))
            .join(', ');
    };

    const editingMember = editor?.mode === 'edit' ? editor.member : null;
    const activeForm = editor?.mode === 'invite' ? inviteForm : accessForm;
    const selectedRole = activeForm.data.role;
    const isProtectedOwner = Boolean(
        editingMember?.is_current_user || editingMember?.is_primary_owner,
    );
    const isProcessing = inviteForm.processing || accessForm.processing;
    const primaryOwner = users.find((member) => member.is_primary_owner);
    const transferErrors = transferForm.errors as Record<
        string,
        string | undefined
    >;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Equipe" />

            <div className="mx-auto flex w-full max-w-[1720px] flex-1 flex-col px-5 py-8 sm:px-7 md:px-9 lg:pt-8 lg:pb-12 xl:px-12 2xl:px-14">
                <AppPageHeader
                    eyebrow="Gestão"
                    title={
                        <>
                            Sua Equipe
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description="Cadastre sua equipe e escolha o que cada pessoa terá acesso."
                    aside={
                        <div>
                            <Button
                                type="button"
                                onClick={openInviteEditor}
                                className="mt-6 min-h-12 w-full rounded-[2px] bg-[#ff4d3d] px-5 text-[#18181f] shadow-none hover:bg-[#f23c2e] sm:ml-auto sm:flex sm:w-fit"
                            >
                                <UserPlus
                                    className="size-4"
                                    aria-hidden="true"
                                />
                                Convidar pessoa
                            </Button>
                        </div>
                    }
                />

                <MetricRail
                    variant="open"
                    className="mt-7"
                    items={[
                        {
                            label: metrics.total === 1 ? 'Pessoa' : 'Pessoas',
                            value: metrics.total,
                            supportingText: `na equipe de ${manufacturer.name}`,
                            icon: (
                                <UsersRound
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                        },
                        {
                            label:
                                metrics.owners === 1
                                    ? 'Proprietário'
                                    : 'Proprietários',
                            value: metrics.owners,
                            supportingText: 'com acesso total',
                            icon: (
                                <ShieldCheck
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                        },
                        {
                            label:
                                metrics.staff === 1
                                    ? 'Colaborador'
                                    : 'Colaboradores',
                            value: metrics.staff,
                            supportingText: 'com acesso por área',
                            icon: (
                                <UserCog
                                    className="size-4"
                                    aria-hidden="true"
                                />
                            ),
                        },
                        {
                            label: 'Acessos bloqueados',
                            value: metrics.blocked,
                            supportingText:
                                metrics.blocked === 0
                                    ? 'toda a equipe está ativa'
                                    : 'sem entrada no sistema',
                            icon: <Ban className="size-4" aria-hidden="true" />,
                            className:
                                metrics.blocked > 0
                                    ? '[&_dd:first-of-type]:text-[#d63227]'
                                    : undefined,
                        },
                    ]}
                />

                {primaryOwner && (
                    <div className="mt-7 grid gap-5 border-y border-border py-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
                        <div className="flex size-11 items-center justify-center bg-[#5a2a4f] text-[#f6f4f0]">
                            <Crown className="size-5" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-[0.66rem] font-bold tracking-[0.16em] text-[#5a2a4f] uppercase">
                                Propriedade da conta
                            </p>
                            <p className="mt-1 font-zouth-display text-lg font-semibold tracking-[-0.03em]">
                                {primaryOwner.name} responde pela conta e pela
                                assinatura.
                            </p>
                        </div>
                        <p className="max-w-sm text-xs leading-5 text-muted-foreground md:text-right">
                            {manufacturer.current_user_is_primary_owner
                                ? 'Você pode transferir essa responsabilidade pelo menu de outro proprietário ativo.'
                                : 'Somente o proprietário principal pode transferir essa responsabilidade.'}
                        </p>
                    </div>
                )}

                <ResourceToolbar
                    className="mt-7"
                    label="Encontrar pessoas da equipe"
                    search={
                        <div className="relative">
                            <Search
                                className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Buscar por nome ou e-mail"
                                aria-label="Buscar na equipe"
                                className="min-h-11 rounded-[2px] border-border bg-background pr-4 pl-10 shadow-none"
                            />
                        </div>
                    }
                    views={
                        <div
                            className="flex min-w-max border border-border bg-background"
                            aria-label="Filtrar equipe"
                        >
                            {segments.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setSegment(option.value)}
                                    className={cn(
                                        'min-h-11 border-r border-border px-4 text-sm font-semibold whitespace-nowrap transition-colors last:border-r-0 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-[#ff4d3d]',
                                        segment === option.value
                                            ? 'bg-[#18181f] text-[#f6f4f0]'
                                            : 'bg-background text-foreground hover:bg-[#e7e3dc]/45',
                                    )}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    }
                    supporting={
                        <p className="text-xs text-muted-foreground">
                            {visibleMembers.length}{' '}
                            {visibleMembers.length === 1
                                ? 'pessoa nesta seleção.'
                                : 'pessoas nesta seleção.'}
                        </p>
                    }
                />

                <section className="mt-4" aria-labelledby="team-ledger-title">
                    <div className="flex items-end justify-between gap-6 border-b border-border pb-4">
                        <div>
                            <h2
                                id="team-ledger-title"
                                className="mt-3 font-zouth-display text-2xl font-semibold tracking-[-0.04em]"
                            >
                                Pessoas e acessos
                            </h2>
                        </div>
                        <p className="hidden text-xs text-muted-foreground sm:block">
                            O acesso muda assim que você salva.
                        </p>
                    </div>

                    {visibleMembers.length > 0 ? (
                        <div>
                            <div className="hidden grid-cols-[2rem_3.25rem_minmax(190px,1.2fr)_minmax(130px,0.7fr)_minmax(210px,1.25fr)_7rem_2.5rem] gap-4 border-b border-border px-2 py-3 text-[0.62rem] font-bold tracking-[0.15em] text-muted-foreground uppercase xl:grid">
                                <span aria-hidden="true" />
                                <span aria-hidden="true" />
                                <span>Pessoa</span>
                                <span>Função</span>
                                <span>Acesso</span>
                                <span>Status</span>
                                <span aria-hidden="true" />
                            </div>

                            {visibleMembers.map((member, index) => (
                                <article
                                    key={member.id}
                                    className="group grid gap-5 border-b border-border px-2 py-6 transition-colors hover:bg-white/55 xl:grid-cols-[2rem_3.25rem_minmax(190px,1.2fr)_minmax(130px,0.7fr)_minmax(210px,1.25fr)_7rem_2.5rem] xl:items-center xl:gap-4"
                                >
                                    <span className="hidden text-xs font-semibold text-muted-foreground tabular-nums xl:block">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <div className="flex size-12 items-center justify-center bg-[#e7e3dc] font-zouth-display text-sm font-semibold tracking-[-0.02em] text-[#18181f] xl:size-[3.25rem]">
                                        {initials(member.name)}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-zouth-display text-lg font-semibold tracking-[-0.035em]">
                                                {member.name}
                                            </h3>
                                            {member.is_current_user && (
                                                <span className="text-[0.62rem] font-bold tracking-[0.12em] text-muted-foreground uppercase">
                                                    Você
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 truncate text-sm text-muted-foreground">
                                            {member.email}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StatusLabel
                                            tone={
                                                member.role === 'owner'
                                                    ? 'plum'
                                                    : 'neutral'
                                            }
                                        >
                                            {roleLabel(member)}
                                        </StatusLabel>
                                        {member.is_primary_owner ? (
                                            <Crown
                                                className="size-3.5 text-[#5a2a4f]"
                                                aria-label="Responsável principal pela conta"
                                            />
                                        ) : member.role === 'owner' ? (
                                            <LockKeyhole
                                                className="size-3.5 text-muted-foreground"
                                                aria-label="Acesso total"
                                            />
                                        ) : null}
                                    </div>
                                    <p className="max-w-md text-sm leading-5 text-foreground">
                                        {summarizeAccess(member)}
                                    </p>
                                    <StatusLabel
                                        tone={
                                            member.status === 'active'
                                                ? 'mineral'
                                                : 'coral'
                                        }
                                    >
                                        {member.status === 'active'
                                            ? 'Ativo'
                                            : 'Bloqueado'}
                                    </StatusLabel>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="rounded-[2px]"
                                                aria-label={`Abrir ações de ${member.name}`}
                                            >
                                                <MoreHorizontal className="size-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"
                                            className="min-w-52 rounded-[2px] border-[#18181f] bg-[#f6f4f0] p-1.5 shadow-none"
                                        >
                                            <DropdownMenuItem
                                                onSelect={() =>
                                                    openAccessEditor(member)
                                                }
                                                className="min-h-10 rounded-[2px]"
                                            >
                                                <PencilLine className="size-4" />
                                                {member.is_current_user
                                                    ? 'Ver meu acesso'
                                                    : member.is_primary_owner
                                                      ? 'Ver acesso protegido'
                                                      : 'Editar acesso'}
                                            </DropdownMenuItem>
                                            {manufacturer.current_user_is_primary_owner &&
                                                member.role === 'owner' &&
                                                member.status === 'active' &&
                                                !member.is_primary_owner && (
                                                    <DropdownMenuItem
                                                        onSelect={() =>
                                                            openTransferDialog(
                                                                member,
                                                            )
                                                        }
                                                        className="min-h-10 rounded-[2px]"
                                                    >
                                                        <Crown className="size-4" />
                                                        Transferir propriedade
                                                    </DropdownMenuItem>
                                                )}
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                disabled={
                                                    member.is_current_user ||
                                                    member.is_primary_owner
                                                }
                                                onSelect={() =>
                                                    updateStatus(member)
                                                }
                                                className="min-h-10 rounded-[2px]"
                                            >
                                                {member.status === 'active' ? (
                                                    <Ban className="size-4" />
                                                ) : (
                                                    <CheckCircle2 className="size-4" />
                                                )}
                                                {member.status === 'active'
                                                    ? 'Bloquear acesso'
                                                    : 'Reativar acesso'}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="border-b border-border py-20 text-center">
                            <UsersRound
                                className="mx-auto size-7 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <h3 className="mt-5 font-zouth-display text-xl font-semibold tracking-[-0.035em]">
                                Ninguém por aqui.
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Ajuste a busca ou escolha outro filtro.
                            </p>
                        </div>
                    )}
                </section>
            </div>

            <Sheet
                open={Boolean(editor)}
                onOpenChange={(open) => {
                    if (!open) {
                        closeEditor();
                    }
                }}
            >
                <SheetContent className="w-full gap-0 overflow-hidden border-l border-[#18181f] bg-[#f6f4f0] p-0 shadow-none sm:max-w-[36rem]">
                    <form
                        onSubmit={submitEditor}
                        className="flex h-full min-h-0 flex-col"
                    >
                        <SheetHeader className="border-b border-border px-7 pt-14 pb-7 text-left sm:px-10">
                            <p className="text-[0.68rem] font-bold tracking-[0.22em] text-[#ff4d3d] uppercase">
                                {editor?.mode === 'invite'
                                    ? 'Convidar pessoa'
                                    : 'Editar acesso'}
                            </p>
                            <SheetTitle className="mt-4 pr-10 font-zouth-display text-[clamp(2.1rem,5vw,3.2rem)] leading-[0.96] font-semibold tracking-[-0.055em]">
                                {editor?.mode === 'invite'
                                    ? 'Quem chega para somar?'
                                    : `${editingMember?.name}.`}
                            </SheetTitle>
                            <SheetDescription className="mt-4 max-w-lg text-sm leading-6">
                                {editor?.mode === 'invite' ? (
                                    'A pessoa recebe um e-mail para criar a senha e começa apenas nas áreas que você escolher.'
                                ) : (
                                    <span className="flex flex-wrap items-center gap-3">
                                        <span>{editingMember?.email}</span>
                                        <StatusLabel
                                            tone={
                                                editingMember?.status ===
                                                'active'
                                                    ? 'mineral'
                                                    : 'coral'
                                            }
                                        >
                                            {editingMember?.status === 'active'
                                                ? 'Ativo'
                                                : 'Bloqueado'}
                                        </StatusLabel>
                                    </span>
                                )}
                            </SheetDescription>
                        </SheetHeader>

                        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-8 sm:px-10">
                            {editor?.mode === 'invite' && (
                                <div className="grid gap-5 border-b border-border pb-8 sm:grid-cols-2">
                                    <div className="grid gap-2 sm:col-span-2">
                                        <Label
                                            htmlFor="member-name"
                                            className="text-[0.68rem] font-bold tracking-[0.16em] uppercase"
                                        >
                                            Nome
                                        </Label>
                                        <Input
                                            id="member-name"
                                            value={inviteForm.data.name}
                                            onChange={(event) =>
                                                inviteForm.setData(
                                                    'name',
                                                    event.target.value,
                                                )
                                            }
                                            autoFocus
                                            autoComplete="name"
                                            placeholder="Nome da pessoa"
                                            className="h-13 rounded-[2px] border-border bg-transparent px-4 shadow-none focus-visible:border-[#18181f] focus-visible:ring-0"
                                        />
                                        <InputError
                                            message={inviteForm.errors.name}
                                        />
                                    </div>
                                    <div className="grid gap-2 sm:col-span-2">
                                        <Label
                                            htmlFor="member-email"
                                            className="text-[0.68rem] font-bold tracking-[0.16em] uppercase"
                                        >
                                            E-mail de trabalho
                                        </Label>
                                        <Input
                                            id="member-email"
                                            type="email"
                                            value={inviteForm.data.email}
                                            onChange={(event) =>
                                                inviteForm.setData(
                                                    'email',
                                                    event.target.value,
                                                )
                                            }
                                            autoComplete="email"
                                            placeholder="nome@fabricante.com.br"
                                            className="h-13 rounded-[2px] border-border bg-transparent px-4 shadow-none focus-visible:border-[#18181f] focus-visible:ring-0"
                                        />
                                        <InputError
                                            message={inviteForm.errors.email}
                                        />
                                    </div>
                                </div>
                            )}

                            {editingMember?.is_primary_owner && (
                                <div className="mb-8 flex gap-4 border border-[#5a2a4f] bg-[#5a2a4f]/6 p-5">
                                    <Crown
                                        className="mt-0.5 size-5 shrink-0 text-[#5a2a4f]"
                                        aria-hidden="true"
                                    />
                                    <div>
                                        <p className="font-zouth-display text-base font-semibold tracking-[-0.025em]">
                                            Este acesso protege a conta.
                                        </p>
                                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                            O proprietário principal não pode
                                            ser bloqueado nem virar colaborador.
                                            Antes disso, a propriedade precisa
                                            ser transferida.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <fieldset
                                className={cn(
                                    editor?.mode === 'invite' ? 'pt-8' : '',
                                )}
                            >
                                <legend className="text-[0.68rem] font-bold tracking-[0.18em] uppercase">
                                    Função
                                </legend>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {[
                                        {
                                            value: 'owner' as const,
                                            label: 'Proprietário',
                                            description:
                                                'Acesso total, inclusive equipe e assinatura.',
                                            icon: ShieldCheck,
                                        },
                                        {
                                            value: 'staff' as const,
                                            label: 'Colaborador',
                                            description:
                                                'Acesso definido por áreas da operação.',
                                            icon: UserCog,
                                        },
                                    ].map((option) => {
                                        const OptionIcon = option.icon;
                                        const isSelected =
                                            selectedRole === option.value;
                                        const isDisabled =
                                            isProtectedOwner &&
                                            option.value === 'staff';

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                disabled={isDisabled}
                                                onClick={() =>
                                                    setSelectedRole(
                                                        option.value,
                                                    )
                                                }
                                                className={cn(
                                                    'relative min-h-32 border p-5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#ff4d3d] disabled:cursor-not-allowed disabled:opacity-50',
                                                    isSelected
                                                        ? 'border-[#18181f] bg-[#18181f] text-[#f6f4f0]'
                                                        : 'border-border bg-transparent hover:border-[#18181f]',
                                                )}
                                                aria-pressed={isSelected}
                                            >
                                                <OptionIcon
                                                    className="size-5"
                                                    aria-hidden="true"
                                                />
                                                <span className="mt-4 block font-zouth-display text-lg font-semibold tracking-[-0.03em]">
                                                    {option.label}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'mt-2 block text-xs leading-5',
                                                        isSelected
                                                            ? 'text-[#f6f4f0]/70'
                                                            : 'text-muted-foreground',
                                                    )}
                                                >
                                                    {option.description}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'absolute top-5 right-5 flex size-5 items-center justify-center rounded-full border',
                                                        isSelected
                                                            ? 'border-[#ff4d3d] bg-[#ff4d3d] text-[#18181f]'
                                                            : 'border-muted-foreground/50',
                                                    )}
                                                    aria-hidden="true"
                                                >
                                                    {isSelected && (
                                                        <Check className="size-3" />
                                                    )}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <InputError message={activeForm.errors.role} />
                            </fieldset>

                            {selectedRole === 'staff' ? (
                                <fieldset className="mt-9 border-t border-border pt-8">
                                    <legend className="text-[0.68rem] font-bold tracking-[0.18em] uppercase">
                                        O que essa pessoa pode cuidar
                                    </legend>
                                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                        Cada escolha libera a área no menu e
                                        todas as ações necessárias para
                                        trabalhar nela.
                                    </p>
                                    <div className="mt-5 border-t border-border">
                                        {capabilityOptions.map((capability) => {
                                            const CapabilityIcon =
                                                capabilityIcons[
                                                    capability.value
                                                ] ?? CheckCircle2;
                                            const checked =
                                                activeForm.data.capabilities.includes(
                                                    capability.value,
                                                );

                                            return (
                                                <div
                                                    key={capability.value}
                                                    className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-4"
                                                >
                                                    <CapabilityIcon
                                                        className="size-5 text-foreground"
                                                        aria-hidden="true"
                                                    />
                                                    <div>
                                                        <Label
                                                            htmlFor={`capability-${capability.value}`}
                                                            className="font-zouth-display text-base font-semibold tracking-[-0.025em]"
                                                        >
                                                            {capability.label}
                                                        </Label>
                                                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                            {
                                                                capability.description
                                                            }
                                                        </p>
                                                    </div>
                                                    <Switch
                                                        id={`capability-${capability.value}`}
                                                        checked={checked}
                                                        onCheckedChange={() =>
                                                            toggleCapability(
                                                                capability.value,
                                                            )
                                                        }
                                                        className="data-[state=checked]:bg-[#2e705a]"
                                                        aria-label={`${checked ? 'Remover' : 'Liberar'} acesso a ${capability.label}`}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <InputError
                                        message={activeForm.errors.capabilities}
                                    />
                                    <div className="mt-5 flex gap-3 bg-[#e7e3dc]/65 p-4 text-xs leading-5 text-muted-foreground">
                                        <LockKeyhole
                                            className="mt-0.5 size-4 shrink-0"
                                            aria-hidden="true"
                                        />
                                        <p>
                                            Equipe e assinatura ficam sempre com
                                            proprietários.
                                        </p>
                                    </div>
                                </fieldset>
                            ) : (
                                <div className="mt-9 border-y border-border py-7">
                                    <div className="flex gap-4">
                                        <ShieldCheck
                                            className="mt-0.5 size-5 shrink-0 text-[#5a2a4f]"
                                            aria-hidden="true"
                                        />
                                        <div>
                                            <p className="font-zouth-display text-lg font-semibold tracking-[-0.03em]">
                                                Acesso completo à fabricante.
                                            </p>
                                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                                Proprietários veem todas as
                                                áreas, podem cuidar da equipe e
                                                administrar a assinatura.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <SheetFooter className="grid grid-cols-2 gap-3 border-t border-border bg-[#f6f4f0] px-7 py-5 sm:px-10">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeEditor}
                                className="min-h-12 rounded-[2px] border-[#18181f] bg-transparent shadow-none hover:bg-[#e7e3dc]"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isProcessing || isProtectedOwner}
                                className="min-h-12 rounded-[2px] bg-[#ff4d3d] text-[#18181f] shadow-none hover:-translate-y-px hover:bg-[#ff4d3d]"
                            >
                                {isProcessing
                                    ? 'Salvando...'
                                    : editor?.mode === 'invite'
                                      ? 'Enviar convite'
                                      : editingMember?.is_primary_owner
                                        ? 'Proprietário protegido'
                                        : isProtectedOwner
                                          ? 'Acesso protegido'
                                          : 'Salvar acesso'}
                            </Button>
                        </SheetFooter>
                    </form>
                </SheetContent>
            </Sheet>

            <Dialog
                open={Boolean(transferTarget)}
                onOpenChange={(open) => {
                    if (!open) {
                        closeTransferDialog();
                    }
                }}
            >
                <DialogContent className="gap-0 rounded-[2px] border-[#18181f] bg-[#f6f4f0] p-0 shadow-none sm:max-w-[34rem]">
                    <form onSubmit={submitOwnershipTransfer}>
                        <DialogHeader className="border-b border-border px-7 pt-10 pb-7 text-left sm:px-9">
                            <div className="flex size-11 items-center justify-center bg-[#5a2a4f] text-[#f6f4f0]">
                                <Crown className="size-5" aria-hidden="true" />
                            </div>
                            <p className="mt-5 text-[0.66rem] font-bold tracking-[0.2em] text-[#ff4d3d] uppercase">
                                Transferir propriedade
                            </p>
                            <DialogTitle className="mt-2 font-zouth-display text-3xl leading-none font-semibold tracking-[-0.05em]">
                                {transferTarget?.name} assume a conta.
                            </DialogTitle>
                            <DialogDescription className="mt-3 max-w-md text-sm leading-6">
                                Essa pessoa passará a ser a responsável
                                principal pela fabricante e pela assinatura. O
                                seu acesso continuará como proprietário.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-6 px-7 py-7 sm:px-9">
                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-y border-border py-4">
                                <div>
                                    <p className="text-[0.62rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                                        De
                                    </p>
                                    <p className="mt-1 truncate font-zouth-display font-semibold">
                                        {primaryOwner?.name}
                                    </p>
                                </div>
                                <div className="flex size-8 items-center justify-center bg-[#e7e3dc]">
                                    <Crown
                                        className="size-4 text-[#5a2a4f]"
                                        aria-hidden="true"
                                    />
                                </div>
                                <div className="text-right">
                                    <p className="text-[0.62rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                                        Para
                                    </p>
                                    <p className="mt-1 truncate font-zouth-display font-semibold">
                                        {transferTarget?.name}
                                    </p>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <Label
                                    htmlFor="ownership-current-password"
                                    className="text-[0.68rem] font-bold tracking-[0.16em] uppercase"
                                >
                                    Sua senha atual
                                </Label>
                                <div className="relative">
                                    <KeyRound
                                        className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
                                        aria-hidden="true"
                                    />
                                    <Input
                                        id="ownership-current-password"
                                        type="password"
                                        value={
                                            transferForm.data.current_password
                                        }
                                        onChange={(event) =>
                                            transferForm.setData(
                                                'current_password',
                                                event.target.value,
                                            )
                                        }
                                        autoFocus
                                        autoComplete="current-password"
                                        placeholder="Confirme que é você"
                                        className="h-13 rounded-[2px] border-border bg-transparent pr-4 pl-11 shadow-none focus-visible:border-[#18181f] focus-visible:ring-0"
                                    />
                                </div>
                                <InputError
                                    message={
                                        transferForm.errors.current_password
                                    }
                                />
                                <InputError
                                    message={transferErrors.ownership}
                                />
                            </div>

                            <p className="text-xs leading-5 text-muted-foreground">
                                A transferência não muda o plano, a cobrança ou
                                os dados da fabricante.
                            </p>
                        </div>

                        <DialogFooter className="grid grid-cols-2 gap-3 border-t border-border px-7 py-5 sm:grid sm:px-9">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={closeTransferDialog}
                                disabled={transferForm.processing}
                                className="min-h-12 rounded-[2px] border-[#18181f] bg-transparent shadow-none hover:bg-[#e7e3dc]"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={transferForm.processing}
                                className="min-h-12 rounded-[2px] bg-[#ff4d3d] text-[#18181f] shadow-none hover:bg-[#f23c2e]"
                            >
                                {transferForm.processing
                                    ? 'Transferindo...'
                                    : 'Confirmar transferência'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
