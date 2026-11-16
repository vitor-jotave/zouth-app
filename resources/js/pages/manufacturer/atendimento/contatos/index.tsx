import { Form, Head, Link } from '@inertiajs/react';
import { ArrowUpRight, RadioTower, Search, Users } from 'lucide-react';
import { Pagination } from '@/components/pagination';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import atendimento from '@/routes/manufacturer/atendimento';
import {
    ContactLabelChips,
    ContactLabelEditor,
    type ContactLabel,
} from '../components/contact-labels';

type Contact = {
    id: number;
    name: string;
    phone: string | null;
    picture_url: string | null;
    last_message_at: string | null;
    labels: ContactLabel[];
};
type Props = {
    contacts: {
        data: Contact[];
        total: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
    contact_labels: ContactLabel[];
    filters: { search: string; label: number };
    connected: boolean;
};
const formatInteraction = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

export default function Contacts({
    contacts,
    contact_labels,
    filters,
    connected,
}: Props) {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Chat', href: atendimento.index().url },
                { title: 'Contatos', href: atendimento.contacts.index().url },
            ]}
        >
            <Head title="Contatos" />
            <div
                data-theme="dark"
                className="min-h-[calc(100svh-4rem)] bg-[#101014] px-5 py-8 text-zouth-ivory sm:px-8 lg:px-10 lg:py-10"
            >
                <div className="mx-auto max-w-[1480px]">
                    <header className="flex flex-wrap items-end justify-between gap-5 border-b border-white/12 pb-7">
                        <div>
                            <p className="mb-3 font-zouth-display text-xs font-bold tracking-[0.18em] text-zouth-coral uppercase">
                                Atendimento
                            </p>
                            <h1 className="font-zouth-display text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
                                Contatos
                                <span className="text-zouth-coral">.</span>
                            </h1>
                            <p className="mt-3 text-sm text-zouth-warm-gray sm:text-base">
                                Encontre seus contatos do WhatsApp e organize as
                                conversas com etiquetas.
                            </p>
                        </div>
                        <ContactLabelEditor labels={contact_labels} />
                    </header>
                    {!connected && (
                        <div className="mt-5 flex flex-wrap items-center gap-3 border border-white/12 bg-[#18181f] p-4 text-sm">
                            <RadioTower
                                className="size-4 text-zouth-coral"
                                aria-hidden="true"
                            />
                            <span>
                                Conecte o WhatsApp para abrir conversas.
                            </span>
                            <Link
                                href={atendimento.channels()}
                                className="font-semibold underline underline-offset-4"
                            >
                                Abrir Canais
                            </Link>
                        </div>
                    )}
                    <Form
                        key={`${filters.search}:${filters.label}`}
                        action={atendimento.contacts.index()}
                        className="my-6 flex flex-col gap-3 border-y border-white/12 py-4 sm:flex-row sm:flex-wrap sm:items-end"
                    >
                        <label className="grid min-w-0 flex-1 gap-2 text-sm font-semibold">
                            Buscar contato
                            <Input
                                type="search"
                                name="search"
                                placeholder="Nome ou telefone"
                                defaultValue={filters.search}
                                maxLength={100}
                                className="min-h-11 border-white/15 bg-[#18181f]"
                            />
                        </label>
                        <label className="grid min-w-0 gap-2 text-sm font-semibold">
                            Etiqueta
                            <select
                                name="label"
                                defaultValue={filters.label || ''}
                                className="min-h-11 max-w-full rounded-sm border border-white/15 bg-[#18181f] px-3 text-sm"
                            >
                                <option value="">Todas as etiquetas</option>
                                {contact_labels.map((label) => (
                                    <option key={label.id} value={label.id}>
                                        {label.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <Button
                            type="submit"
                            className="min-h-11 bg-zouth-coral text-[#18181f] hover:bg-[#f23c2e]"
                        >
                            <Search className="size-4" aria-hidden="true" />{' '}
                            Filtrar
                        </Button>
                        {(filters.search || filters.label > 0) && (
                            <Link
                                href={atendimento.contacts.index()}
                                className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
                            >
                                Limpar filtros
                            </Link>
                        )}
                    </Form>
                    {contacts.data.length > 0 ? (
                        <section
                            aria-label="Lista de contatos"
                            className="border border-white/12 bg-[#18181f]"
                        >
                            <h2 className="border-b border-white/12 px-4 py-4 font-zouth-display text-sm font-semibold sm:px-6">
                                {contacts.total}{' '}
                                {contacts.total === 1 ? 'contato' : 'contatos'}
                            </h2>
                            <ul className="divide-y divide-white/12">
                                {contacts.data.map((contact) => (
                                    <li
                                        key={contact.id}
                                        className="grid min-w-0 gap-4 px-4 py-5 sm:px-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)_auto] xl:items-center"
                                    >
                                        <div className="flex min-w-0 items-center gap-3">
                                            <Avatar className="size-11 shrink-0 rounded-full">
                                                <AvatarImage
                                                    src={
                                                        contact.picture_url ??
                                                        undefined
                                                    }
                                                    alt=""
                                                />
                                                <AvatarFallback className="rounded-full bg-white/10 text-zouth-ivory">
                                                    {contact.name
                                                        .trim()
                                                        .split(/\s+/)
                                                        .slice(0, 2)
                                                        .map((part) => part[0])
                                                        .join('')
                                                        .toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <h3 className="font-zouth-display font-semibold break-words">
                                                    {contact.name}
                                                </h3>
                                                <p className="text-sm text-zouth-warm-gray">
                                                    {contact.phone ??
                                                        'Telefone não disponível'}
                                                </p>
                                                <p className="mt-1 text-xs text-zouth-warm-gray">
                                                    {contact.last_message_at
                                                        ? `Última interação: ${formatInteraction.format(new Date(contact.last_message_at))}`
                                                        : 'Ainda sem mensagens'}
                                                </p>
                                            </div>
                                        </div>
                                        {contact.labels.length > 0 ? (
                                            <ContactLabelChips
                                                labels={contact.labels}
                                            />
                                        ) : (
                                            <span className="text-xs text-zouth-warm-gray">
                                                Sem etiquetas
                                            </span>
                                        )}
                                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                                            <ContactLabelEditor
                                                contact={contact}
                                                labels={contact_labels}
                                            />
                                            {connected && (
                                                <Link
                                                    href={atendimento.index({
                                                        query: {
                                                            conversation:
                                                                contact.id,
                                                        },
                                                    })}
                                                    className="inline-flex min-h-11 items-center gap-2 rounded-sm px-2 text-sm font-semibold text-zouth-ivory underline-offset-4 hover:text-zouth-coral hover:underline"
                                                >
                                                    Abrir conversa{' '}
                                                    <ArrowUpRight
                                                        className="size-4"
                                                        aria-hidden="true"
                                                    />
                                                </Link>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ) : (
                        <section className="border border-white/12 bg-[#18181f] p-6">
                            <Users
                                className="size-5 text-zouth-coral"
                                aria-hidden="true"
                            />
                            <h2 className="mt-4 font-zouth-display text-xl font-semibold">
                                {filters.search || filters.label
                                    ? 'Nenhum contato encontrado'
                                    : 'Ainda não há contatos'}
                            </h2>
                            <p className="mt-2 text-sm text-zouth-warm-gray">
                                {filters.search || filters.label
                                    ? 'Tente outro nome, telefone ou etiqueta.'
                                    : 'Os contatos individuais aparecem aqui quando uma conversa começa no WhatsApp ou por um pedido.'}
                            </p>
                        </section>
                    )}
                    <Pagination links={contacts.links} />
                </div>
            </div>
        </AppLayout>
    );
}
