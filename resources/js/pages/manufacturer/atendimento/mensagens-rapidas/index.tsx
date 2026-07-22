import { Head, router, useForm } from '@inertiajs/react';
import {
    Check,
    ChevronRight,
    Copy,
    MessageSquareQuote,
    MoreHorizontal,
    Plus,
    Search,
    Send,
    Trash2,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import AppLayout from '@/layouts/app-layout';
import {
    destroy,
    index,
    store,
    update,
} from '@/routes/manufacturer/atendimento/quick-replies';
import type { BreadcrumbItem } from '@/types';
import type { QuickReply } from '../quick-reply-types';

interface Props {
    quick_replies: QuickReply[];
}

interface QuickReplyForm {
    shortcut: string;
    title: string;
    body: string;
    is_active: boolean;
}

const emptyForm: QuickReplyForm = {
    shortcut: '',
    title: '',
    body: '',
    is_active: true,
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Chat', href: '/manufacturer/atendimento' },
    { title: 'Mensagens rápidas', href: index().url },
];

function formValues(quickReply: QuickReply): QuickReplyForm {
    return {
        shortcut: quickReply.shortcut,
        title: quickReply.title,
        body: quickReply.body,
        is_active: quickReply.is_active,
    };
}

function normalizedSearch(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR');
}

export default function AtendimentoMensagensRapidasIndex({
    quick_replies,
}: Props) {
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(
        quick_replies[0]?.id ?? null,
    );
    const [creating, setCreating] = useState(quick_replies.length === 0);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const selectedReply = quick_replies.find(
        (quickReply) => quickReply.id === selectedId,
    );
    const form = useForm<QuickReplyForm>(
        selectedReply ? formValues(selectedReply) : emptyForm,
    );

    const filteredReplies = useMemo(() => {
        const query = normalizedSearch(search.trim());

        if (!query) {
            return quick_replies;
        }

        return quick_replies.filter((quickReply) =>
            normalizedSearch(
                `${quickReply.shortcut} ${quickReply.title} ${quickReply.body}`,
            ).includes(query),
        );
    }, [quick_replies, search]);

    const startCreating = () => {
        setCreating(true);
        setSelectedId(null);
        setCopied(false);
        form.clearErrors();
        form.setData(emptyForm);
    };

    const selectReply = (quickReply: QuickReply) => {
        setCreating(false);
        setSelectedId(quickReply.id);
        setCopied(false);
        form.clearErrors();
        form.setData(formValues(quickReply));
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (creating) {
            form.post(store().url, {
                preserveScroll: true,
                onSuccess: (page) => {
                    const replies = (page.props.quick_replies ??
                        []) as QuickReply[];
                    const normalizedShortcut = form.data.shortcut
                        .trim()
                        .replace(/^\{+|\}+$/g, '')
                        .toLocaleLowerCase('pt-BR');
                    const createdReply = replies.find(
                        (quickReply) =>
                            quickReply.shortcut === normalizedShortcut,
                    );

                    if (createdReply) {
                        selectReply(createdReply);
                    }
                },
            });

            return;
        }

        if (!selectedReply) {
            return;
        }

        form.put(update(selectedReply.id).url, {
            preserveScroll: true,
        });
    };

    const deleteReply = () => {
        if (!selectedReply) {
            return;
        }

        router.delete(destroy(selectedReply.id).url, {
            preserveScroll: true,
            onSuccess: (page) => {
                const replies = (page.props.quick_replies ??
                    []) as QuickReply[];
                setDeleteOpen(false);

                if (replies[0]) {
                    selectReply(replies[0]);
                } else {
                    startCreating();
                }
            },
        });
    };

    const copyShortcut = async () => {
        if (!form.data.shortcut) {
            return;
        }

        await navigator.clipboard.writeText(`{${form.data.shortcut}}`);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
    };

    const previewBody =
        form.data.body.trim() ||
        'A mensagem que o lead receberá aparece aqui enquanto você escreve.';
    const previewShortcut = form.data.shortcut.trim() || 'atalho';
    const previewTitle = form.data.title.trim() || 'Nome da mensagem';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Mensagens rápidas" />

            <main
                data-theme="dark"
                className="min-h-[calc(100svh-4rem)] bg-[#101014] px-5 py-8 text-zouth-ivory sm:px-8 lg:px-10 lg:py-10"
            >
                <div className="mx-auto max-w-[1480px]">
                    <header className="flex flex-col gap-7 border-b border-white/12 pb-8 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="mb-3 font-zouth-display text-xs font-bold tracking-[0.18em] text-zouth-coral uppercase">
                                Atendimento
                            </p>
                            <h1 className="font-zouth-display text-4xl font-semibold tracking-[-0.055em] sm:text-5xl">
                                Mensagens rápidas
                                <span className="text-zouth-coral">.</span>
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-zouth-warm-gray sm:text-base">
                                Responda com consistência e agilidade, sem fazer
                                a conversa parecer automática.
                            </p>
                        </div>

                        <Button
                            type="button"
                            onClick={startCreating}
                            className="h-12 rounded-[2px] bg-zouth-coral px-6 font-zouth-display font-semibold text-[#18181f] hover:bg-[#ff6a5c]"
                        >
                            <Plus className="size-4" />
                            Criar mensagem
                        </Button>
                    </header>

                    <div className="grid items-start gap-7 pt-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.8fr)]">
                        <section aria-labelledby="quick-replies-library">
                            <div className="flex flex-col gap-4 border-b border-white/12 pb-5 sm:flex-row sm:items-center sm:justify-between">
                                <label className="relative block w-full max-w-md">
                                    <span className="sr-only">
                                        Buscar mensagens rápidas
                                    </span>
                                    <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-zouth-warm-gray" />
                                    <input
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        placeholder="Buscar por atalho ou conteúdo"
                                        className="h-12 w-full rounded-[2px] border border-white/14 bg-transparent pr-4 pl-11 text-sm text-zouth-ivory outline-none placeholder:text-zouth-warm-gray focus:border-zouth-coral focus:ring-2 focus:ring-zouth-coral/15"
                                    />
                                </label>

                                <p className="text-xs text-zouth-warm-gray">
                                    <strong className="font-bold text-zouth-ivory">
                                        {quick_replies.length}
                                    </strong>{' '}
                                    {quick_replies.length === 1
                                        ? 'mensagem'
                                        : 'mensagens'}
                                </p>
                            </div>

                            <h2 id="quick-replies-library" className="sr-only">
                                Biblioteca de mensagens rápidas
                            </h2>

                            {filteredReplies.length > 0 ? (
                                <div className="divide-y divide-white/12">
                                    {filteredReplies.map((quickReply) => {
                                        const isSelected =
                                            !creating &&
                                            selectedId === quickReply.id;

                                        return (
                                            <button
                                                key={quickReply.id}
                                                type="button"
                                                onClick={() =>
                                                    selectReply(quickReply)
                                                }
                                                className={`group relative grid w-full gap-4 px-5 py-6 text-left transition-colors sm:grid-cols-[9.5rem_minmax(0,1fr)_auto] sm:items-center ${
                                                    isSelected
                                                        ? 'bg-[#2a1725]'
                                                        : 'hover:bg-white/[0.025]'
                                                }`}
                                            >
                                                {isSelected && (
                                                    <span className="absolute inset-y-0 left-0 w-1 bg-zouth-coral" />
                                                )}

                                                <span className="font-zouth-display text-base font-semibold whitespace-nowrap text-zouth-ivory">
                                                    {'{'}
                                                    {quickReply.shortcut}
                                                    {'}'}
                                                </span>

                                                <span className="min-w-0">
                                                    <span className="flex items-center gap-2 font-zouth-display text-base font-semibold text-zouth-ivory">
                                                        <span className="truncate">
                                                            {quickReply.title}
                                                        </span>
                                                        {!quickReply.is_active && (
                                                            <span className="shrink-0 text-[0.6rem] font-bold tracking-[0.14em] text-zouth-warm-gray uppercase">
                                                                Pausada
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className="mt-1 line-clamp-2 block text-sm leading-6 text-zouth-warm-gray">
                                                        {quickReply.body}
                                                    </span>
                                                </span>

                                                <span className="flex size-10 items-center justify-center border border-white/14 text-zouth-stone transition-colors group-hover:border-zouth-coral group-hover:text-zouth-coral">
                                                    <ChevronRight className="size-4" />
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex min-h-72 flex-col items-start justify-center border-b border-white/12 px-5 py-12">
                                    <MessageSquareQuote className="size-8 text-zouth-coral" />
                                    <h3 className="mt-5 font-zouth-display text-2xl font-semibold tracking-[-0.04em]">
                                        {search
                                            ? 'Nenhuma mensagem encontrada.'
                                            : 'Seu repertório começa aqui.'}
                                    </h3>
                                    <p className="mt-2 max-w-md text-sm leading-6 text-zouth-warm-gray">
                                        {search
                                            ? 'Tente buscar pelo atalho, título ou por uma frase da resposta.'
                                            : 'Crie respostas para as dúvidas que aparecem todos os dias e deixe a equipe livre para personalizar a conversa.'}
                                    </p>
                                    {!search && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={startCreating}
                                            className="mt-6 rounded-[2px] border-white/15 bg-transparent text-zouth-ivory hover:border-zouth-coral hover:bg-transparent hover:text-zouth-coral"
                                        >
                                            Criar primeira mensagem
                                        </Button>
                                    )}
                                </div>
                            )}
                        </section>

                        <aside className="border border-white/14 bg-white/[0.02] xl:sticky xl:top-6">
                            <form onSubmit={submit}>
                                <div className="flex items-start justify-between gap-4 border-b border-white/12 px-5 py-5 sm:px-6">
                                    <div>
                                        <p className="text-[0.66rem] font-bold tracking-[0.18em] text-zouth-coral uppercase">
                                            {creating
                                                ? 'Nova mensagem'
                                                : 'Mensagem selecionada'}
                                        </p>
                                        <h2 className="mt-2 font-zouth-display text-xl font-semibold tracking-[-0.04em]">
                                            {creating
                                                ? 'Criar atalho.'
                                                : 'Prévia e uso do atalho.'}
                                        </h2>
                                    </div>

                                    {!creating && selectedReply && (
                                        <button
                                            type="button"
                                            onClick={() => setDeleteOpen(true)}
                                            className="flex size-10 items-center justify-center border border-white/14 text-zouth-warm-gray hover:border-zouth-coral hover:text-zouth-coral"
                                            aria-label="Excluir mensagem rápida"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="grid gap-5 px-5 py-6 sm:px-6">
                                    <label>
                                        <span className="mb-2 block text-xs text-zouth-warm-gray">
                                            Atalho
                                        </span>
                                        <span className="flex h-12 items-center border border-white/14 bg-[#101014] focus-within:border-zouth-coral focus-within:ring-2 focus-within:ring-zouth-coral/15">
                                            <span className="pl-4 font-zouth-display text-lg font-semibold text-zouth-coral">
                                                {'{'}
                                            </span>
                                            <input
                                                value={form.data.shortcut}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'shortcut',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="catálogo"
                                                maxLength={60}
                                                className="h-full min-w-0 flex-1 bg-transparent px-1 font-zouth-display text-lg font-semibold text-zouth-ivory outline-none placeholder:text-zouth-warm-gray/50"
                                            />
                                            <span className="pr-2 font-zouth-display text-lg font-semibold text-zouth-coral">
                                                {'}'}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={copyShortcut}
                                                disabled={!form.data.shortcut}
                                                className="mr-1 flex size-9 items-center justify-center text-zouth-warm-gray hover:text-zouth-coral disabled:opacity-30"
                                                aria-label="Copiar atalho"
                                            >
                                                {copied ? (
                                                    <Check className="size-4" />
                                                ) : (
                                                    <Copy className="size-4" />
                                                )}
                                            </button>
                                        </span>
                                        <InputError
                                            message={form.errors.shortcut}
                                        />
                                    </label>

                                    <label>
                                        <span className="mb-2 block text-xs text-zouth-warm-gray">
                                            Nome para a equipe
                                        </span>
                                        <input
                                            value={form.data.title}
                                            onChange={(event) =>
                                                form.setData(
                                                    'title',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Enviar coleção completa"
                                            maxLength={120}
                                            className="h-12 w-full rounded-[2px] border border-white/14 bg-[#101014] px-4 text-sm text-zouth-ivory outline-none placeholder:text-zouth-warm-gray/60 focus:border-zouth-coral focus:ring-2 focus:ring-zouth-coral/15"
                                        />
                                        <InputError
                                            message={form.errors.title}
                                        />
                                    </label>

                                    <label>
                                        <span className="mb-2 flex items-center justify-between gap-3 text-xs text-zouth-warm-gray">
                                            <span>Mensagem</span>
                                            <span>
                                                {form.data.body.length} / 2.000
                                            </span>
                                        </span>
                                        <textarea
                                            value={form.data.body}
                                            onChange={(event) =>
                                                form.setData(
                                                    'body',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Escreva exatamente o que o lead deve receber."
                                            maxLength={2000}
                                            rows={5}
                                            className="block min-h-32 w-full resize-y rounded-[2px] border border-white/14 bg-[#101014] px-4 py-3 text-sm leading-6 text-zouth-ivory outline-none placeholder:text-zouth-warm-gray/60 focus:border-zouth-coral focus:ring-2 focus:ring-zouth-coral/15"
                                        />
                                        <InputError
                                            message={form.errors.body}
                                        />
                                    </label>

                                    <div className="flex items-center justify-between gap-5 border-y border-white/12 py-4">
                                        <div>
                                            <p className="text-sm font-semibold text-zouth-ivory">
                                                Disponível no Chat
                                            </p>
                                            <p className="mt-1 text-xs text-zouth-warm-gray">
                                                A equipe encontra este atalho ao
                                                digitar {'{'}.
                                            </p>
                                        </div>
                                        <Switch
                                            checked={form.data.is_active}
                                            onCheckedChange={(checked) =>
                                                form.setData(
                                                    'is_active',
                                                    checked,
                                                )
                                            }
                                            className="data-[state=checked]:bg-zouth-coral data-[state=unchecked]:bg-white/15"
                                            aria-label="Disponível no Chat"
                                        />
                                    </div>

                                    <div>
                                        <p className="text-xs text-zouth-warm-gray">
                                            O lead recebe
                                        </p>
                                        <div className="mt-3 flex min-h-36 items-end justify-end border border-white/12 bg-[#0c0c10] p-4">
                                            <div className="max-w-[88%] bg-[#2e705a] px-4 py-3 text-sm leading-6 text-white">
                                                <p className="whitespace-pre-wrap">
                                                    {previewBody}
                                                </p>
                                                <p className="mt-1 text-right text-[0.62rem] text-white/65">
                                                    11:42&nbsp; ✓✓
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs text-zouth-warm-gray">
                                            Como aparece no Chat
                                        </p>
                                        <p className="mt-2 text-xs leading-5 text-zouth-warm-gray">
                                            Digite {'{'} e continue escrevendo o
                                            atalho. A mensagem entra no campo
                                            antes do envio.
                                        </p>
                                        <div className="mt-3 border border-white/14 bg-[#101014]">
                                            <div className="border-b border-white/12 px-4 py-3">
                                                <p className="flex items-center gap-2 text-sm">
                                                    <span className="font-zouth-display font-semibold text-zouth-coral">
                                                        {'{'}
                                                        {previewShortcut}
                                                        {'}'}
                                                    </span>
                                                    <span className="text-zouth-warm-gray">
                                                        — {previewTitle}
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="flex h-12 items-center gap-3 px-4 text-sm text-zouth-stone">
                                                <MoreHorizontal className="size-4 text-zouth-warm-gray" />
                                                <span className="flex-1">
                                                    {'{'}
                                                    {previewShortcut.slice(
                                                        0,
                                                        3,
                                                    )}
                                                </span>
                                                <Send className="size-4" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-4 border-t border-white/12 px-5 py-5 sm:px-6">
                                    {creating && quick_replies.length > 0 ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() =>
                                                selectReply(quick_replies[0])
                                            }
                                            className="rounded-[2px] text-zouth-warm-gray hover:bg-transparent hover:text-zouth-ivory"
                                        >
                                            Cancelar
                                        </Button>
                                    ) : (
                                        <span />
                                    )}
                                    <Button
                                        type="submit"
                                        disabled={form.processing}
                                        className="h-11 rounded-[2px] bg-zouth-coral px-5 font-zouth-display font-semibold text-[#18181f] hover:bg-[#ff6a5c] disabled:opacity-45"
                                    >
                                        {form.processing
                                            ? 'Salvando…'
                                            : creating
                                              ? 'Criar mensagem'
                                              : 'Salvar alterações'}
                                    </Button>
                                </div>
                            </form>
                        </aside>
                    </div>
                </div>
            </main>

            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <AlertDialogContent className="rounded-[2px] border-white/14 bg-[#18181f] font-zouth-body text-zouth-ivory shadow-none">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-zouth-display text-2xl font-semibold tracking-[-0.04em]">
                            Excluir mensagem rápida?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="leading-6 text-zouth-warm-gray">
                            O atalho deixa de aparecer imediatamente para toda a
                            equipe. Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-[2px] border-white/15 bg-transparent text-zouth-ivory hover:bg-white/5 hover:text-zouth-ivory">
                            Manter mensagem
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={deleteReply}
                            className="rounded-[2px] bg-zouth-coral text-[#18181f] hover:bg-[#ff6a5c]"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    );
}
