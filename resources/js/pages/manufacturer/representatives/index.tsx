import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    Clock3,
    Copy,
    Mail,
    MapPin,
    RefreshCw,
    ReceiptText,
    Search,
    Send,
    ShieldCheck,
    ShoppingBag,
    UserCheck,
    UserPlus,
    UsersRound,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppPageHeader } from '@/components/app-page-header';
import InputError from '@/components/input-error';
import { MetricRail } from '@/components/metric-rail';
import { StatusLabel, type StatusLabelTone } from '@/components/status-label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import manufacturer from '@/routes/manufacturer';
import type { BreadcrumbItem } from '@/types';

type Segment = 'requests' | 'active' | 'invitations' | 'history';
type AffiliationStatus = 'pending' | 'active' | 'rejected' | 'revoked';
type InvitationStatus = 'pending' | 'accepted' | 'cancelled' | 'expired';

interface Affiliation {
    id: number;
    status: AffiliationStatus;
    source: 'request' | 'invitation';
    application_note: string | null;
    requested_at: string;
    approved_at: string | null;
    rejected_at: string | null;
    revoked_at: string | null;
    updated_at: string;
    user: { id: number; name: string; email: string };
    profile: {
        whatsapp: string | null;
        city: string | null;
        state: string | null;
        territory: string | null;
        presentation: string | null;
    };
    performance: {
        orders_count: number;
        total_cents: number;
        last_order_at: string | null;
    };
    sales_history: {
        orders: Array<{
            id: number;
            status: string;
            status_label: string;
            order_type: 'standard' | 'quote';
            order_type_label: string;
            customer_name: string;
            total_items: number;
            total_cents: number;
            created_at: string;
        }>;
        has_more: boolean;
    };
    catalog_url: string | null;
}

interface Invitation {
    id: number;
    name: string;
    email: string;
    whatsapp: string | null;
    personal_message: string | null;
    status: InvitationStatus;
    expires_at: string;
    last_sent_at: string | null;
    accepted_at: string | null;
    send_count: number;
    invited_by: string;
}

interface Props {
    affiliations: Affiliation[];
    invitations: Invitation[];
    summary: {
        active: number;
        pending_requests: number;
        pending_invitations: number;
        attributed_orders: number;
    };
    capacity: {
        occupied: number;
        limit: number | null;
        has_active_plan: boolean;
        available: boolean;
    };
    filters: {
        segment: Segment;
        search: string;
    };
}

type SelectedItem =
    | { kind: 'affiliation'; value: Affiliation }
    | { kind: 'invitation'; value: Invitation };

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Visão geral', href: dashboard().url },
    {
        title: 'Representantes',
        href: manufacturer.representatives.index().url,
    },
];

const segments: Array<{ value: Segment; label: string }> = [
    { value: 'requests', label: 'Solicitações' },
    { value: 'active', label: 'Rede ativa' },
    { value: 'invitations', label: 'Convites' },
    { value: 'history', label: 'Histórico' },
];

function initials(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);

    return [words[0], words.at(-1)]
        .filter(Boolean)
        .map((word) => word?.[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
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

function formatMoney(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(cents / 100);
}

function locationLabel(affiliation: Affiliation): string {
    return (
        [affiliation.profile.city, affiliation.profile.state]
            .filter(Boolean)
            .join(' · ') || 'Localização não informada'
    );
}

function statusPresentation(status: AffiliationStatus | InvitationStatus): {
    label: string;
    tone: StatusLabelTone;
} {
    const statuses: Record<
        AffiliationStatus | InvitationStatus,
        { label: string; tone: StatusLabelTone }
    > = {
        pending: { label: 'Aguardando', tone: 'coral' },
        active: { label: 'Na rede', tone: 'mineral' },
        rejected: { label: 'Recusada', tone: 'muted' },
        revoked: { label: 'Encerrado', tone: 'muted' },
        accepted: { label: 'Aceito', tone: 'mineral' },
        cancelled: { label: 'Cancelado', tone: 'muted' },
        expired: { label: 'Expirado', tone: 'coral' },
    };

    return statuses[status];
}

const orderStatusTone: Record<string, StatusLabelTone> = {
    new: 'coral',
    confirmed: 'plum',
    preparing: 'neutral',
    shipped: 'muted',
    delivered: 'mineral',
    cancelled: 'coral',
};

function Fact({
    icon,
    label,
    children,
}: {
    icon: ReactNode;
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="grid grid-cols-[1.1rem_minmax(0,1fr)] gap-3 border-b border-border py-4 last:border-b-0">
            <span className="mt-0.5 text-muted-foreground" aria-hidden="true">
                {icon}
            </span>
            <div className="min-w-0">
                <p className="text-[0.61rem] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                    {label}
                </p>
                <div className="mt-1 text-sm leading-6 font-semibold text-foreground">
                    {children}
                </div>
            </div>
        </div>
    );
}

function AffiliationRow({
    affiliation,
    selected,
    onSelect,
}: {
    affiliation: Affiliation;
    selected: boolean;
    onSelect: () => void;
}) {
    const status = statusPresentation(affiliation.status);

    return (
        <article
            className={cn(
                'group relative border-b border-border transition-colors',
                selected ? 'bg-white' : 'hover:bg-white/55',
            )}
        >
            <button
                type="button"
                onClick={onSelect}
                className="grid w-full min-w-0 gap-5 px-5 py-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#ff4d3d] focus-visible:ring-inset sm:grid-cols-[3rem_minmax(180px,1.25fr)_minmax(118px,0.82fr)_minmax(110px,0.72fr)_minmax(92px,0.62fr)] sm:items-center sm:gap-4"
            >
                {selected && (
                    <span className="absolute inset-y-0 left-0 w-[3px] bg-[#ff4d3d]" />
                )}
                <span className="flex size-11 items-center justify-center bg-[#e7e3dc] font-zouth-display text-sm font-semibold tracking-[-0.03em] text-foreground">
                    {initials(affiliation.user.name)}
                </span>
                <span className="min-w-0">
                    <span className="block truncate font-zouth-display text-base font-semibold tracking-[-0.025em] text-foreground">
                        {affiliation.user.name}
                    </span>
                    <span className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="size-3.5" aria-hidden="true" />
                        {locationLabel(affiliation)}
                    </span>
                </span>
                <span>
                    <StatusLabel tone={status.tone}>{status.label}</StatusLabel>
                    <span className="mt-1.5 block text-xs text-muted-foreground">
                        {affiliation.source === 'invitation'
                            ? 'Por convite'
                            : 'Pela vitrine'}
                    </span>
                </span>
                <span>
                    <span className="block text-sm font-semibold text-foreground">
                        {formatDate(affiliation.performance.last_order_at)}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                        {affiliation.performance.orders_count} pedidos
                    </span>
                </span>
                <span>
                    <span className="block text-sm font-semibold text-foreground">
                        {formatMoney(affiliation.performance.total_cents)}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                        movimentado
                    </span>
                </span>
            </button>
        </article>
    );
}

function InvitationRow({
    invitation,
    selected,
    onSelect,
}: {
    invitation: Invitation;
    selected: boolean;
    onSelect: () => void;
}) {
    const status = statusPresentation(invitation.status);

    return (
        <article
            className={cn(
                'relative border-b border-border',
                selected ? 'bg-white' : 'hover:bg-white/55',
            )}
        >
            <button
                type="button"
                onClick={onSelect}
                className="grid w-full min-w-0 gap-5 px-5 py-5 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#ff4d3d] focus-visible:ring-inset sm:grid-cols-[3rem_minmax(180px,1.4fr)_minmax(110px,0.7fr)_minmax(120px,0.72fr)] sm:items-center sm:gap-4"
            >
                {selected && (
                    <span className="absolute inset-y-0 left-0 w-[3px] bg-[#ff4d3d]" />
                )}
                <span className="flex size-11 items-center justify-center bg-[#18181f] font-zouth-display text-sm font-semibold text-white">
                    {initials(invitation.name)}
                </span>
                <span className="min-w-0">
                    <span className="block truncate font-zouth-display text-base font-semibold tracking-[-0.025em] text-foreground">
                        {invitation.name}
                    </span>
                    <span className="mt-1.5 block truncate text-xs text-muted-foreground">
                        {invitation.email}
                    </span>
                </span>
                <span>
                    <StatusLabel tone={status.tone}>{status.label}</StatusLabel>
                    <span className="mt-1.5 block text-xs text-muted-foreground">
                        {invitation.send_count === 1
                            ? '1 envio'
                            : `${invitation.send_count} envios`}
                    </span>
                </span>
                <span>
                    <span className="block text-sm font-semibold text-foreground">
                        {formatDate(invitation.last_sent_at)}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                        último envio
                    </span>
                </span>
            </button>
        </article>
    );
}

function SalesHistory({ affiliation }: { affiliation: Affiliation }) {
    const orders = affiliation.sales_history.orders;

    return (
        <section
            id={`sales-history-${affiliation.id}`}
            className="mt-8 scroll-mt-4 border-t border-border pt-7"
        >
            <div className="flex items-end justify-between gap-4">
                <div>
                    <p className="text-[0.62rem] font-bold tracking-[0.18em] text-[#ff4d3d] uppercase">
                        Histórico de vendas
                    </p>
                    <h3 className="mt-2 font-zouth-display text-xl font-semibold tracking-[-0.035em] text-foreground">
                        Negócios movimentados
                        <span className="text-[#ff4d3d]">.</span>
                    </h3>
                </div>
                <span className="font-zouth-display text-sm font-semibold text-muted-foreground tabular-nums">
                    {affiliation.performance.orders_count}
                </span>
            </div>

            {orders.length > 0 ? (
                <div className="mt-5 border-y border-border">
                    {orders.map((order) => (
                        <Link
                            key={order.id}
                            href={manufacturer.orders.show(order.id).url}
                            prefetch
                            className="group block border-b border-border py-4 outline-none last:border-b-0 focus-visible:ring-2 focus-visible:ring-[#ff4d3d] focus-visible:ring-inset"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[0.62rem] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                                        {order.order_type_label} #
                                        {String(order.id).padStart(4, '0')}
                                    </p>
                                    <p className="mt-1.5 truncate text-sm font-semibold text-foreground">
                                        {order.customer_name}
                                    </p>
                                </div>
                                <ArrowRight
                                    className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-[#d9382b]"
                                    aria-hidden="true"
                                />
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                                <StatusLabel
                                    tone={
                                        orderStatusTone[order.status] ??
                                        'neutral'
                                    }
                                >
                                    {order.status_label}
                                </StatusLabel>
                                <span className="text-xs text-muted-foreground">
                                    {formatDate(order.created_at)}
                                </span>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                                <span className="text-muted-foreground">
                                    {order.total_items === 1
                                        ? '1 peça'
                                        : `${order.total_items} peças`}
                                </span>
                                <span className="font-zouth-display font-semibold text-foreground tabular-nums">
                                    {order.order_type === 'quote'
                                        ? 'Estim. '
                                        : ''}
                                    {formatMoney(order.total_cents)}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="mt-5 border border-dashed border-border bg-[#f6f4f0] px-5 py-6">
                    <ReceiptText
                        className="size-5 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <p className="mt-3 text-sm font-semibold text-foreground">
                        Ainda sem vendas atribuídas.
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Os pedidos gerados pelo link deste representante
                        aparecerão aqui.
                    </p>
                </div>
            )}

            {orders.length > 0 && (
                <Button
                    asChild
                    variant="outline"
                    className="mt-4 min-h-11 w-full rounded-[2px] shadow-none"
                >
                    <Link
                        href={
                            manufacturer.orders.index({
                                query: {
                                    sales_rep: affiliation.user.id,
                                    view: 'list',
                                },
                            }).url
                        }
                        prefetch
                    >
                        {affiliation.sales_history.has_more
                            ? 'Ver histórico completo'
                            : 'Abrir em pedidos'}
                        <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                </Button>
            )}
        </section>
    );
}

function FocusPanel({ item }: { item: SelectedItem | null }) {
    const [copied, setCopied] = useState(false);

    if (!item) {
        return (
            <div className="border border-border bg-[#e7e3dc]/25 p-7">
                <UserCheck
                    className="size-6 text-muted-foreground"
                    aria-hidden="true"
                />
                <p className="mt-5 font-zouth-display text-xl font-semibold tracking-[-0.03em]">
                    Selecione uma pessoa.
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Veja a apresentação, o território e a história comercial sem
                    sair da lista.
                </p>
            </div>
        );
    }

    if (item.kind === 'invitation') {
        const invitation = item.value;
        const status = statusPresentation(invitation.status);

        return (
            <aside className="bg-[#18181f] p-7 text-[#f6f4f0] xl:sticky xl:top-24">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[0.65rem] font-bold tracking-[0.2em] text-[#ff4d3d] uppercase">
                            Convite direto
                        </p>
                        <h2 className="mt-4 font-zouth-display text-3xl leading-none font-semibold tracking-[-0.045em]">
                            {invitation.name}
                            <span className="text-[#ff4d3d]">.</span>
                        </h2>
                    </div>
                </div>
                <StatusLabel tone={status.tone} className="mt-5">
                    {status.label}
                </StatusLabel>

                <div className="mt-7 border-y border-white/15 py-1 [&>div]:border-white/15 [&>div_*]:text-inherit">
                    <Fact icon={<Mail className="size-4" />} label="Contato">
                        {invitation.email}
                    </Fact>
                    <Fact icon={<Clock3 className="size-4" />} label="Validade">
                        Até {formatDate(invitation.expires_at)}
                    </Fact>
                    <Fact
                        icon={<Send className="size-4" />}
                        label="Enviado por"
                    >
                        {invitation.invited_by}
                    </Fact>
                </div>

                {invitation.personal_message && (
                    <p className="mt-6 border-l-2 border-[#ff4d3d] pl-4 text-sm leading-6 text-white/70">
                        “{invitation.personal_message}”
                    </p>
                )}

                {invitation.status === 'pending' && (
                    <div className="mt-8 grid gap-3">
                        <Button
                            type="button"
                            onClick={() =>
                                router.post(
                                    manufacturer.representatives.invitations.resend(
                                        invitation.id,
                                    ).url,
                                )
                            }
                            className="min-h-11 rounded-[2px] bg-[#ff4d3d] text-[#18181f] shadow-none hover:bg-[#f23c2e]"
                        >
                            <RefreshCw className="size-4" /> Reenviar convite
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                router.delete(
                                    manufacturer.representatives.invitations.cancel(
                                        invitation.id,
                                    ).url,
                                )
                            }
                            className="min-h-11 rounded-[2px] border-white/20 bg-transparent text-white shadow-none hover:bg-white/10 hover:text-white"
                        >
                            Cancelar convite
                        </Button>
                    </div>
                )}
            </aside>
        );
    }

    const affiliation = item.value;
    const isPending = affiliation.status === 'pending';
    const isActive = affiliation.status === 'active';

    const copyCatalogLink = async () => {
        if (!affiliation.catalog_url) return;
        await navigator.clipboard.writeText(affiliation.catalog_url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
    };

    return (
        <aside className="border border-border bg-white p-7 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-[0.65rem] font-bold tracking-[0.2em] text-[#ff4d3d] uppercase">
                        {isPending ? 'Para analisar' : 'Representante'}
                    </p>
                    <h2 className="mt-4 font-zouth-display text-3xl leading-none font-semibold tracking-[-0.045em] text-foreground">
                        {affiliation.user.name}
                        <span className="text-[#ff4d3d]">.</span>
                    </h2>
                </div>
            </div>

            <div className="mt-7 border-y border-border py-1">
                <Fact icon={<Mail className="size-4" />} label="Contato">
                    <span className="block break-all">
                        {affiliation.user.email}
                    </span>
                    {affiliation.profile.whatsapp && (
                        <span className="block text-muted-foreground">
                            {affiliation.profile.whatsapp}
                        </span>
                    )}
                </Fact>
                <Fact icon={<MapPin className="size-4" />} label="Território">
                    {affiliation.profile.territory ||
                        locationLabel(affiliation)}
                </Fact>
                <Fact
                    icon={<ShoppingBag className="size-4" />}
                    label="Movimento"
                >
                    {affiliation.performance.orders_count} pedidos ·{' '}
                    {formatMoney(affiliation.performance.total_cents)}
                </Fact>
            </div>

            {!isPending && affiliation.performance.orders_count > 0 && (
                <a
                    href={`#sales-history-${affiliation.id}`}
                    className="mt-5 flex min-h-11 items-center justify-between gap-3 border border-border px-4 text-sm font-semibold text-foreground transition-colors hover:border-[#18181f] hover:bg-[#f6f4f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]"
                >
                    <span className="inline-flex items-center gap-2">
                        <ReceiptText className="size-4" aria-hidden="true" />
                        Ver histórico de vendas
                    </span>
                    <span className="font-zouth-display text-xs text-muted-foreground tabular-nums">
                        {affiliation.performance.orders_count}
                    </span>
                </a>
            )}

            {(affiliation.profile.presentation ||
                affiliation.application_note) && (
                <div className="mt-6 space-y-4">
                    {affiliation.profile.presentation && (
                        <p className="text-sm leading-6 text-muted-foreground">
                            {affiliation.profile.presentation}
                        </p>
                    )}
                    {affiliation.application_note && (
                        <p className="border-l-2 border-[#ff4d3d] pl-4 text-sm leading-6 text-foreground">
                            “{affiliation.application_note}”
                        </p>
                    )}
                </div>
            )}

            {!isPending && <SalesHistory affiliation={affiliation} />}

            {isPending && (
                <div className="mt-8 grid grid-cols-2 gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                            router.post(
                                manufacturer.representatives.reject(
                                    affiliation.id,
                                ).url,
                            )
                        }
                        className="min-h-11 rounded-[2px] shadow-none"
                    >
                        Recusar
                    </Button>
                    <Button
                        type="button"
                        onClick={() =>
                            router.post(
                                manufacturer.representatives.approve(
                                    affiliation.id,
                                ).url,
                            )
                        }
                        className="min-h-11 rounded-[2px] bg-[#18181f] text-white shadow-none hover:bg-[#2a2a32]"
                    >
                        Aprovar <ArrowRight className="size-4" />
                    </Button>
                </div>
            )}

            {isActive && (
                <div className="mt-8 grid gap-3">
                    <Button
                        type="button"
                        disabled={!affiliation.catalog_url}
                        onClick={copyCatalogLink}
                        className="min-h-11 rounded-[2px] bg-[#ff4d3d] text-[#18181f] shadow-none hover:bg-[#f23c2e]"
                    >
                        {copied ? (
                            <Check className="size-4" />
                        ) : (
                            <Copy className="size-4" />
                        )}
                        {copied ? 'Link copiado' : 'Copiar link rastreável'}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                            router.post(
                                manufacturer.representatives.revoke(
                                    affiliation.id,
                                ).url,
                            )
                        }
                        className="min-h-11 rounded-[2px] shadow-none"
                    >
                        Encerrar vínculo
                    </Button>
                </div>
            )}
        </aside>
    );
}

function InviteSheet({
    open,
    onOpenChange,
    capacity,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    capacity: Props['capacity'];
}) {
    const form = useForm({
        name: '',
        email: '',
        whatsapp: '',
        personal_message: '',
    });

    const submit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.submit(manufacturer.representatives.invitations.store(), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full gap-0 overflow-hidden border-l border-[#18181f] bg-[#f6f4f0] p-0 shadow-none sm:max-w-[38rem]">
                <SheetHeader className="border-b border-border px-7 py-10 sm:px-10">
                    <p className="text-[0.68rem] font-bold tracking-[0.24em] text-[#ff4d3d] uppercase">
                        Convite comercial
                    </p>
                    <SheetTitle className="mt-4 font-zouth-display text-4xl leading-none font-semibold tracking-[-0.05em]">
                        Uma nova ponte<span className="text-[#ff4d3d]">.</span>
                    </SheetTitle>
                    <SheetDescription className="mt-4 max-w-md text-sm leading-6">
                        Convide quem já conhece os lojistas certos. Ao aceitar,
                        o vínculo entra direto na rede.
                    </SheetDescription>
                </SheetHeader>

                <form
                    onSubmit={submit}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="flex-1 space-y-6 overflow-y-auto px-7 py-8 sm:px-10">
                        <div className="grid gap-2">
                            <Label htmlFor="invite-name">
                                Nome do representante
                            </Label>
                            <Input
                                id="invite-name"
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                className="min-h-12 rounded-[2px] bg-white shadow-none"
                                autoFocus
                            />
                            <InputError message={form.errors.name} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="invite-email">E-mail</Label>
                            <Input
                                id="invite-email"
                                type="email"
                                value={form.data.email}
                                onChange={(event) =>
                                    form.setData('email', event.target.value)
                                }
                                className="min-h-12 rounded-[2px] bg-white shadow-none"
                            />
                            <InputError message={form.errors.email} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="invite-whatsapp">
                                WhatsApp{' '}
                                <span className="font-normal text-muted-foreground">
                                    (opcional)
                                </span>
                            </Label>
                            <Input
                                id="invite-whatsapp"
                                value={form.data.whatsapp}
                                onChange={(event) =>
                                    form.setData('whatsapp', event.target.value)
                                }
                                className="min-h-12 rounded-[2px] bg-white shadow-none"
                                placeholder="(11) 99999-9999"
                            />
                            <InputError message={form.errors.whatsapp} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="invite-message">
                                Mensagem pessoal{' '}
                                <span className="font-normal text-muted-foreground">
                                    (opcional)
                                </span>
                            </Label>
                            <Textarea
                                id="invite-message"
                                value={form.data.personal_message}
                                onChange={(event) =>
                                    form.setData(
                                        'personal_message',
                                        event.target.value,
                                    )
                                }
                                className="min-h-32 rounded-[2px] bg-white shadow-none"
                                placeholder="Conte por que essa parceria faz sentido para a coleção."
                            />
                            <InputError
                                message={form.errors.personal_message}
                            />
                        </div>

                        <div className="border-l-2 border-[#ff4d3d] bg-white px-5 py-4 text-sm leading-6 text-muted-foreground">
                            {capacity.has_active_plan ? (
                                <>
                                    O convite reserva uma vaga por 7 dias.{' '}
                                    {capacity.limit === null
                                        ? 'Seu plano não limita representantes.'
                                        : `${capacity.occupied} de ${capacity.limit} vagas estão comprometidas.`}
                                </>
                            ) : (
                                'Ative sua assinatura para enviar convites e ampliar a rede.'
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 border-t border-border bg-[#f6f4f0] px-7 py-5 sm:px-10">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="min-h-12 rounded-[2px] shadow-none"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.processing || !capacity.available}
                            className="min-h-12 rounded-[2px] bg-[#ff4d3d] text-[#18181f] shadow-none hover:bg-[#f23c2e]"
                        >
                            {form.processing ? (
                                <Spinner />
                            ) : (
                                <Send className="size-4" />
                            )}
                            Enviar convite
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}

export default function RepresentativesIndex({
    affiliations,
    invitations,
    summary,
    capacity,
    filters,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [inviteOpen, setInviteOpen] = useState(false);
    const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

    const items = useMemo<SelectedItem[]>(() => {
        if (filters.segment === 'invitations') {
            return invitations
                .filter((item) => item.status === 'pending')
                .map((value) => ({ kind: 'invitation' as const, value }));
        }
        if (filters.segment === 'history') {
            return [
                ...affiliations
                    .filter((item) =>
                        ['rejected', 'revoked'].includes(item.status),
                    )
                    .map((value) => ({ kind: 'affiliation' as const, value })),
                ...invitations
                    .filter((item) => item.status !== 'pending')
                    .map((value) => ({ kind: 'invitation' as const, value })),
            ];
        }
        const wantedStatus =
            filters.segment === 'active' ? 'active' : 'pending';
        return affiliations
            .filter((item) => item.status === wantedStatus)
            .map((value) => ({ kind: 'affiliation' as const, value }));
    }, [affiliations, filters.segment, invitations]);

    const visibleItems = useMemo(() => {
        const normalized = search.trim().toLocaleLowerCase('pt-BR');
        if (!normalized) return items;
        return items.filter((item) => {
            const values =
                item.kind === 'affiliation'
                    ? [
                          item.value.user.name,
                          item.value.user.email,
                          item.value.profile.city,
                          item.value.profile.state,
                          item.value.profile.territory,
                      ]
                    : [item.value.name, item.value.email, item.value.whatsapp];
            return values
                .filter(Boolean)
                .join(' ')
                .toLocaleLowerCase('pt-BR')
                .includes(normalized);
        });
    }, [items, search]);

    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const selectedItem =
        visibleItems.find(
            (item) => `${item.kind}-${item.value.id}` === selectedKey,
        ) ??
        visibleItems[0] ??
        null;

    useEffect(() => {
        if (!selectedItem) setSelectedKey(null);
    }, [selectedItem]);

    const selectItem = (item: SelectedItem) => {
        setSelectedKey(`${item.kind}-${item.value.id}`);

        if (!window.matchMedia('(min-width: 1280px)').matches) {
            setMobileDetailOpen(true);
        } else {
            setMobileDetailOpen(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Representantes" />

            <div className="mx-auto flex w-full max-w-[1720px] flex-1 flex-col px-5 py-8 sm:px-7 md:px-9 lg:pb-12 xl:px-12 2xl:px-14">
                <AppPageHeader
                    eyebrow="Comercial"
                    title={
                        <>
                            Representantes
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description="Sua coleção ganha alcance quando a rede certa a coloca em movimento."
                    aside={
                        <div>
                            <div className="border-l-2 border-[#ff4d3d] pl-5">
                                <p className="text-sm leading-6 text-foreground">
                                    Analise novos territórios, convide relações
                                    de confiança e acompanhe quem leva sua
                                    coleção mais longe.
                                </p>
                            </div>
                            <Button
                                type="button"
                                onClick={() => setInviteOpen(true)}
                                className="mt-6 min-h-12 w-full rounded-[2px] bg-[#ff4d3d] px-5 text-[#18181f] shadow-none hover:bg-[#f23c2e] sm:ml-auto sm:flex sm:w-fit"
                            >
                                <UserPlus className="size-4" /> Convidar
                                representante
                            </Button>
                        </div>
                    }
                />

                <MetricRail
                    variant="open"
                    className="mt-7"
                    items={[
                        {
                            label: 'Rede ativa',
                            value: summary.active,
                            supportingText: 'representantes conectados',
                            icon: <UsersRound className="size-4" />,
                        },
                        {
                            label: 'Para analisar',
                            value: summary.pending_requests,
                            supportingText: 'solicitações aguardando',
                            icon: <Clock3 className="size-4" />,
                        },
                        {
                            label: 'Convites enviados',
                            value: summary.pending_invitations,
                            supportingText: 'vagas reservadas',
                            icon: <Send className="size-4" />,
                        },
                        {
                            label: 'Pedidos atribuídos',
                            value: summary.attributed_orders,
                            supportingText: 'movidos pela rede',
                            icon: <ShoppingBag className="size-4" />,
                        },
                    ]}
                />

                <div className="mt-7 flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
                    <nav
                        className="flex min-w-0 overflow-x-auto [scrollbar-width:none] lg:overflow-visible [&::-webkit-scrollbar]:hidden"
                        aria-label="Segmentos da rede"
                    >
                        {segments.map((segment) => (
                            <Link
                                key={segment.value}
                                href={
                                    manufacturer.representatives.index({
                                        query: { segment: segment.value },
                                    }).url
                                }
                                preserveScroll
                                preserveState
                                replace
                                className={cn(
                                    'relative flex min-h-11 items-center px-4 text-sm font-semibold whitespace-nowrap transition-colors',
                                    filters.segment === segment.value
                                        ? 'text-foreground after:absolute after:inset-x-4 after:bottom-[-17px] after:h-[3px] after:bg-[#ff4d3d]'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {segment.label}
                                {segment.value === 'requests' &&
                                    summary.pending_requests > 0 && (
                                        <span className="ml-2 flex size-5 items-center justify-center bg-[#ff4d3d] text-[0.65rem] font-bold text-[#18181f]">
                                            {summary.pending_requests}
                                        </span>
                                    )}
                            </Link>
                        ))}
                    </nav>
                    <div className="relative w-full lg:w-80">
                        <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar na rede"
                            aria-label="Buscar representantes"
                            className="min-h-11 rounded-[2px] bg-white pr-10 pl-10 shadow-none"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center text-muted-foreground"
                            >
                                <X className="size-4" />
                                <span className="sr-only">Limpar busca</span>
                            </button>
                        )}
                    </div>
                </div>

                {visibleItems.length > 0 ? (
                    <div className="mt-4 grid min-h-0 gap-10 xl:grid-cols-[minmax(0,1fr)_22rem]">
                        <section aria-label="Pessoas da rede">
                            <div className="hidden border-b border-border px-5 py-3 text-[0.6rem] font-bold tracking-[0.14em] text-muted-foreground uppercase sm:grid sm:grid-cols-[3rem_minmax(180px,1.25fr)_minmax(118px,0.82fr)_minmax(110px,0.72fr)_minmax(92px,0.62fr)] sm:gap-4">
                                <span />
                                <span>Pessoa e praça</span>
                                <span>Vínculo</span>
                                <span>Último pedido</span>
                                <span>Movimentou</span>
                            </div>
                            <div>
                                {visibleItems.map((item) => {
                                    const key = `${item.kind}-${item.value.id}`;
                                    return item.kind === 'affiliation' ? (
                                        <AffiliationRow
                                            key={key}
                                            affiliation={item.value}
                                            selected={
                                                selectedItem
                                                    ? `${selectedItem.kind}-${selectedItem.value.id}` ===
                                                      key
                                                    : false
                                            }
                                            onSelect={() => selectItem(item)}
                                        />
                                    ) : (
                                        <InvitationRow
                                            key={key}
                                            invitation={item.value}
                                            selected={
                                                selectedItem
                                                    ? `${selectedItem.kind}-${selectedItem.value.id}` ===
                                                      key
                                                    : false
                                            }
                                            onSelect={() => selectItem(item)}
                                        />
                                    );
                                })}
                            </div>
                        </section>

                        <div className="hidden xl:block">
                            <FocusPanel item={selectedItem} />
                        </div>
                    </div>
                ) : (
                    <div className="mt-8 grid min-h-72 place-items-center border border-dashed border-border bg-white/35 px-6 text-center">
                        <div className="max-w-md py-12">
                            <ShieldCheck className="mx-auto size-8 text-muted-foreground" />
                            <p className="mt-5 text-[0.68rem] font-bold tracking-[0.18em] text-[#ff4d3d] uppercase">
                                Rede em construção
                            </p>
                            <h2 className="mt-3 font-zouth-display text-2xl font-semibold tracking-[-0.035em]">
                                {search
                                    ? 'Nenhum nome combina com a busca.'
                                    : filters.segment === 'requests'
                                      ? 'Nenhuma solicitação aguardando.'
                                      : 'Este capítulo ainda está vazio.'}
                            </h2>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                {filters.segment === 'requests'
                                    ? 'Quando um representante se apresentar pela vitrine, o perfil comercial aparecerá aqui.'
                                    : 'Convide uma relação de confiança ou acompanhe os próximos movimentos da rede.'}
                            </p>
                        </div>
                    </div>
                )}

                <InviteSheet
                    open={inviteOpen}
                    onOpenChange={setInviteOpen}
                    capacity={capacity}
                />

                <Sheet
                    open={mobileDetailOpen && selectedItem !== null}
                    onOpenChange={setMobileDetailOpen}
                >
                    <SheetContent className="w-full gap-0 overflow-y-auto border-l border-[#18181f] bg-[#f6f4f0] p-0 shadow-none sm:max-w-[34rem] xl:hidden">
                        <SheetTitle className="sr-only">
                            Detalhes do representante
                        </SheetTitle>
                        <FocusPanel item={selectedItem} />
                    </SheetContent>
                </Sheet>
            </div>
        </AppLayout>
    );
}
