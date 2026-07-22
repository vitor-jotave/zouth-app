import {
    ArrowLeft,
    Bot,
    Check,
    CheckCheck,
    Clock,
    FileText,
    ImageIcon,
    LoaderCircle,
    MessageSquare,
    Search,
    Send,
    Shirt,
    Sparkles,
    Video,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import type {
    ActiveConversation,
    Conversation,
    FunnelActionFeedback,
    FunnelTriggerLocation,
    Message,
    WhatsappFunnel,
} from '../index';
import type { QuickReply } from '../quick-reply-types';
import {
    MessageReactionBadges,
    MessageReactionMenu,
} from './message-reaction-menu';
import { VoiceMessagePreview } from './voice-message-preview';

type InboxMode = 'all' | 'unread';

interface AtendimentoWorkspaceProps {
    conversations: Conversation[];
    activeConversation: ActiveConversation | null;
    messages: Message[];
    funnels: WhatsappFunnel[];
    quickReplies: QuickReply[];
    funnelActionFeedback: FunnelActionFeedback | null;
    funnelRunning: boolean;
    searchQuery: string;
    messageInput: string;
    sending: boolean;
    sendingProduct: boolean;
    reactingMessageId: number | null;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    onSearchChange: (value: string) => void;
    onMessageChange: (value: string) => void;
    onMessageKeyDown: (event: React.KeyboardEvent) => void;
    onSelectConversation: (conversation: Conversation) => void;
    onBackToInbox: () => void;
    onOpenProducts: () => void;
    onOpenFunnel: (
        funnel: WhatsappFunnel,
        trigger: FunnelTriggerLocation,
    ) => void;
    onSendMessage: () => void;
    onReactToMessage: (message: Message, reaction: string) => void;
}

function formatTime(dateString: string | null): string {
    if (!dateString) {
        return '';
    }

    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (diffDays === 0) {
        return date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    if (diffDays === 1) {
        return 'Ontem';
    }

    if (diffDays < 7) {
        return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    }

    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
    });
}

function normalizeQuickReplySearch(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('pt-BR');
}

function quickReplyTokenAtCursor(value: string, cursor: number) {
    const beforeCursor = value.slice(0, cursor);
    const match = beforeCursor.match(/\{([^{}\s]*)$/u);

    if (!match || match.index === undefined) {
        return null;
    }

    return {
        query: match[1],
        start: match.index,
        end: cursor,
    };
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase();
}

function StatusIcon({ status }: { status: Message['status'] }) {
    switch (status) {
        case 'pending':
            return <Clock className="size-3.5 text-[#98968d]" />;
        case 'sent':
            return <Check className="size-3.5 text-[#98968d]" />;
        case 'delivered':
            return <CheckCheck className="size-3.5 text-[#98968d]" />;
        case 'read':
            return <CheckCheck className="size-3.5 text-[#ff4d3d]" />;
        default:
            return null;
    }
}

function funnelFeedbackStatus(
    funnel: WhatsappFunnel,
    trigger: FunnelTriggerLocation,
    feedback: FunnelActionFeedback | null,
): FunnelActionFeedback['status'] | null {
    if (feedback?.funnelId !== funnel.id || feedback.trigger !== trigger) {
        return null;
    }

    return feedback.status;
}

function FunnelActionLabel({
    funnel,
    trigger,
    feedback,
    idleLabel,
    showArrow = false,
}: {
    funnel: WhatsappFunnel;
    trigger: FunnelTriggerLocation;
    feedback: FunnelActionFeedback | null;
    idleLabel: string;
    showArrow?: boolean;
}) {
    const status = funnelFeedbackStatus(funnel, trigger, feedback);

    if (status === 'sending') {
        return (
            <span className="flex min-w-0 items-center gap-3">
                <LoaderCircle className="size-4 shrink-0 animate-spin text-[#ff4d3d]" />
                <span className="truncate">Enviando Funil</span>
            </span>
        );
    }

    if (status === 'sent') {
        return (
            <span className="flex min-w-0 items-center gap-3">
                <Check className="size-4 shrink-0 text-[#ff4d3d]" />
                <span className="truncate">Enviado</span>
            </span>
        );
    }

    return (
        <>
            <span className="flex min-w-0 items-center gap-3">
                <Bot className="size-4 shrink-0 text-[#ff4d3d]" />
                <span className="truncate">{idleLabel}</span>
            </span>
            {showArrow && <span aria-hidden="true">→</span>}
        </>
    );
}

function ContactAvatar({
    name,
    pictureUrl,
    size = 'regular',
}: {
    name: string;
    pictureUrl: string | null;
    size?: 'regular' | 'large';
}) {
    return (
        <Avatar
            className={
                size === 'large'
                    ? 'size-12 rounded-full'
                    : 'size-10 rounded-full'
            }
        >
            {pictureUrl && (
                <AvatarImage
                    src={pictureUrl}
                    alt=""
                    className="rounded-full object-cover"
                />
            )}
            <AvatarFallback className="rounded-full bg-[#e7e3dc] font-zouth-display text-sm font-semibold text-[#18181f]">
                {getInitials(name)}
            </AvatarFallback>
        </Avatar>
    );
}

export function AtendimentoWorkspace({
    conversations,
    activeConversation,
    messages,
    funnels,
    quickReplies,
    funnelActionFeedback,
    funnelRunning,
    searchQuery,
    messageInput,
    sending,
    sendingProduct,
    reactingMessageId,
    inputRef,
    messagesEndRef,
    onSearchChange,
    onMessageChange,
    onMessageKeyDown,
    onSelectConversation,
    onBackToInbox,
    onOpenProducts,
    onOpenFunnel,
    onSendMessage,
    onReactToMessage,
}: AtendimentoWorkspaceProps) {
    const [inboxMode, setInboxMode] = useState<InboxMode>('all');
    const [highlightedQuickReply, setHighlightedQuickReply] = useState(0);
    const [quickRepliesDismissed, setQuickRepliesDismissed] = useState(false);
    const [composerCursor, setComposerCursor] = useState(messageInput.length);
    const unreadTotal = conversations.reduce(
        (total, conversation) => total + conversation.unread_count,
        0,
    );
    const visibleConversations = useMemo(() => {
        const normalizedSearch = searchQuery.trim().toLocaleLowerCase('pt-BR');

        return conversations.filter((conversation) => {
            const matchesMode =
                inboxMode === 'all' || conversation.unread_count > 0;
            const matchesSearch =
                normalizedSearch.length === 0 ||
                conversation.display_name
                    .toLocaleLowerCase('pt-BR')
                    .includes(normalizedSearch) ||
                conversation.contact_phone?.includes(normalizedSearch);

            return matchesMode && matchesSearch;
        });
    }, [conversations, inboxMode, searchQuery]);
    const activeConversationSummary = conversations.find(
        (conversation) => conversation.id === activeConversation?.id,
    );
    const sharedMaterials = messages.filter(
        (message) => message.from_me && Boolean(message.media_url),
    ).length;
    const lastActivity =
        [...messages].reverse().find((message) => message.message_timestamp)
            ?.message_timestamp ??
        activeConversationSummary?.last_message_at ??
        null;
    const primaryFunnel = funnels[0] ?? null;
    const quickReplyToken = quickReplyTokenAtCursor(
        messageInput,
        Math.min(composerCursor, messageInput.length),
    );
    const suggestedQuickReplies = useMemo(() => {
        if (!quickReplyToken || quickRepliesDismissed) {
            return [];
        }

        const query = normalizeQuickReplySearch(quickReplyToken.query);

        return quickReplies
            .filter((quickReply) =>
                normalizeQuickReplySearch(
                    `${quickReply.shortcut} ${quickReply.title}`,
                ).includes(query),
            )
            .slice(0, 5);
    }, [quickReplies, quickRepliesDismissed, quickReplyToken]);

    useEffect(() => {
        setHighlightedQuickReply(0);
    }, [quickReplyToken?.query]);

    const insertQuickReply = useCallback(
        (quickReply: QuickReply) => {
            const cursor = Math.min(composerCursor, messageInput.length);
            const token = quickReplyTokenAtCursor(messageInput, cursor);

            if (!token) {
                return;
            }

            const nextValue = `${messageInput.slice(0, token.start)}${quickReply.body}${messageInput.slice(token.end)}`;
            const nextCursor = token.start + quickReply.body.length;

            onMessageChange(nextValue);
            setComposerCursor(nextCursor);
            setQuickRepliesDismissed(false);
            window.requestAnimationFrame(() => {
                inputRef.current?.focus({ preventScroll: true });
                inputRef.current?.setSelectionRange(nextCursor, nextCursor);
            });
        },
        [composerCursor, inputRef, messageInput, onMessageChange],
    );

    const handleMessageChange = (
        event: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
        const nextValue = event.target.value;
        const cursor = event.target.selectionStart ?? nextValue.length;
        const beforeCursor = nextValue.slice(0, cursor);
        const completeToken = beforeCursor.match(/\{([^{}\s]+)\}$/u);

        setQuickRepliesDismissed(false);
        setComposerCursor(cursor);

        if (completeToken && completeToken.index !== undefined) {
            const shortcut = normalizeQuickReplySearch(completeToken[1]);
            const quickReply = quickReplies.find(
                (candidate) =>
                    normalizeQuickReplySearch(candidate.shortcut) === shortcut,
            );

            if (quickReply) {
                const nextMessage = `${nextValue.slice(0, completeToken.index)}${quickReply.body}${nextValue.slice(cursor)}`;
                const nextCursor = completeToken.index + quickReply.body.length;

                onMessageChange(nextMessage);
                setComposerCursor(nextCursor);
                window.requestAnimationFrame(() => {
                    inputRef.current?.setSelectionRange(nextCursor, nextCursor);
                });

                return;
            }
        }

        onMessageChange(nextValue);
    };

    const handleComposerKeyDown = (
        event: React.KeyboardEvent<HTMLTextAreaElement>,
    ) => {
        if (suggestedQuickReplies.length > 0) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setHighlightedQuickReply((current) =>
                    Math.min(current + 1, suggestedQuickReplies.length - 1),
                );

                return;
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setHighlightedQuickReply((current) => Math.max(current - 1, 0));

                return;
            }

            if (
                (event.key === 'Enter' && !event.shiftKey) ||
                event.key === 'Tab'
            ) {
                event.preventDefault();
                insertQuickReply(suggestedQuickReplies[highlightedQuickReply]);

                return;
            }

            if (event.key === 'Escape') {
                event.preventDefault();
                setQuickRepliesDismissed(true);

                return;
            }
        }

        onMessageKeyDown(event);
    };

    return (
        <div
            data-testid="atendimento-workspace"
            className="grid h-[calc(100vh-4rem)] min-h-[34rem] w-full min-w-0 overflow-hidden bg-[#101015] font-zouth-body text-[#f6f4f0] md:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)_18rem]"
        >
            <aside
                className={`${activeConversation ? 'hidden md:flex' : 'flex'} min-h-0 flex-col border-r border-[#f6f4f0]/12 bg-[#18181f]`}
                aria-label="Caixa de entrada"
            >
                <div className="border-b border-[#f6f4f0]/12 px-5 pt-6 pb-5">
                    <div>
                        <p className="text-[0.66rem] font-bold tracking-[0.18em] text-[#98968d] uppercase">
                            Atendimento
                        </p>
                        <h1 className="mt-1 font-zouth-display text-[2.15rem] leading-none font-semibold tracking-[-0.055em]">
                            Conversas
                            <span className="text-[#ff4d3d]">.</span>
                        </h1>
                    </div>
                    <label className="relative mt-5 block">
                        <span className="sr-only">Buscar conversas</span>
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#98968d]" />
                        <input
                            type="search"
                            value={searchQuery}
                            onChange={(event) =>
                                onSearchChange(event.target.value)
                            }
                            placeholder="Buscar conversa…"
                            className="h-11 w-full rounded-[2px] border border-[#f6f4f0]/14 bg-[#101015] pr-3 pl-10 text-sm text-[#f6f4f0] outline-none placeholder:text-[#98968d] focus:border-[#ff4d3d] focus:ring-2 focus:ring-[#ff4d3d]/20"
                        />
                    </label>
                    <div className="mt-3 grid grid-cols-2 border border-[#f6f4f0]/14 p-1">
                        <button
                            type="button"
                            onClick={() => setInboxMode('all')}
                            className={`min-h-9 px-3 text-xs font-bold ${
                                inboxMode === 'all'
                                    ? 'bg-[#ff4d3d] text-[#18181f]'
                                    : 'text-[#cac4ba] hover:text-[#f6f4f0]'
                            }`}
                        >
                            Todas {conversations.length}
                        </button>
                        <button
                            type="button"
                            onClick={() => setInboxMode('unread')}
                            className={`min-h-9 px-3 text-xs font-bold ${
                                inboxMode === 'unread'
                                    ? 'bg-[#ff4d3d] text-[#18181f]'
                                    : 'text-[#cac4ba] hover:text-[#f6f4f0]'
                            }`}
                        >
                            Não lidas {unreadTotal}
                        </button>
                    </div>
                </div>

                <ScrollArea className="min-h-0 flex-1">
                    {visibleConversations.length === 0 ? (
                        <div className="flex min-h-56 flex-col items-start justify-center gap-3 px-6 text-left">
                            <MessageSquare className="size-6 text-[#98968d]" />
                            <p className="font-zouth-display text-lg font-semibold">
                                Nada por aqui
                                <span className="text-[#ff4d3d]">.</span>
                            </p>
                            <p className="max-w-52 text-xs leading-relaxed text-[#98968d]">
                                {searchQuery
                                    ? 'Tente buscar por outro nome ou telefone.'
                                    : 'As novas conversas aparecem aqui quando chegarem.'}
                            </p>
                        </div>
                    ) : (
                        visibleConversations.map((conversation) => {
                            const isActive =
                                activeConversation?.id === conversation.id;

                            return (
                                <button
                                    key={conversation.id}
                                    type="button"
                                    onClick={() =>
                                        onSelectConversation(conversation)
                                    }
                                    className={`relative flex w-full gap-3 border-b border-[#f6f4f0]/8 px-5 py-4 text-left focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#ff4d3d] ${
                                        isActive
                                            ? 'bg-[#f6f4f0]/7'
                                            : 'hover:bg-[#f6f4f0]/4'
                                    }`}
                                >
                                    {isActive && (
                                        <span className="absolute inset-y-0 left-0 w-0.5 bg-[#ff4d3d]" />
                                    )}
                                    <ContactAvatar
                                        name={conversation.display_name}
                                        pictureUrl={
                                            conversation.contact_picture_url
                                        }
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-start justify-between gap-3">
                                            <span className="truncate text-sm font-bold">
                                                {conversation.display_name}
                                            </span>
                                            <span className="shrink-0 text-[0.66rem] text-[#98968d]">
                                                {formatTime(
                                                    conversation.last_message_at,
                                                )}
                                            </span>
                                        </span>
                                        <span className="mt-1 flex items-center gap-2">
                                            <span className="min-w-0 flex-1 truncate text-xs text-[#98968d]">
                                                {conversation.last_message_from_me && (
                                                    <span className="text-[#cac4ba]">
                                                        Você:{' '}
                                                    </span>
                                                )}
                                                {conversation.last_message_body ??
                                                    'Conversa iniciada'}
                                            </span>
                                            {conversation.unread_count > 0 && (
                                                <span className="flex min-w-5 items-center justify-center bg-[#ff4d3d] px-1.5 py-0.5 text-[0.62rem] font-extrabold text-[#18181f]">
                                                    {conversation.unread_count}
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                </button>
                            );
                        })
                    )}
                </ScrollArea>
            </aside>

            <main
                className={`${activeConversation ? 'flex' : 'hidden md:flex'} min-h-0 min-w-0 flex-col overflow-hidden bg-[#101015]`}
            >
                {!activeConversation ? (
                    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
                        <span className="flex size-16 items-center justify-center border border-[#f6f4f0]/14 text-[#ff4d3d]">
                            <MessageSquare className="size-7" />
                        </span>
                        <h2 className="mt-6 font-zouth-display text-3xl font-semibold tracking-[-0.05em]">
                            Abra uma conversa
                            <span className="text-[#ff4d3d]">.</span>
                        </h2>
                        <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#98968d]">
                            Produtos, mensagens e próximos movimentos reunidos
                            no mesmo lugar.
                        </p>
                    </div>
                ) : (
                    <>
                        <header className="flex min-h-20 items-center justify-between gap-4 border-b border-[#f6f4f0]/12 px-4 sm:px-6">
                            <div className="flex min-w-0 items-center gap-3">
                                <button
                                    type="button"
                                    onClick={onBackToInbox}
                                    className="flex size-10 shrink-0 items-center justify-center border border-[#f6f4f0]/14 text-[#cac4ba] hover:border-[#ff4d3d] hover:text-[#f6f4f0] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d] md:hidden"
                                    aria-label="Voltar para conversas"
                                >
                                    <ArrowLeft className="size-4" />
                                </button>
                                <ContactAvatar
                                    name={activeConversation.display_name}
                                    pictureUrl={
                                        activeConversation.contact_picture_url
                                    }
                                    size="large"
                                />
                                <div className="min-w-0">
                                    <p className="truncate font-zouth-display text-base font-semibold tracking-[-0.03em] sm:text-lg">
                                        {activeConversation.display_name}
                                    </p>
                                    <div className="mt-0.5 flex items-center gap-2 text-xs text-[#98968d]">
                                        <span className="size-1.5 rounded-full bg-[#2e705a]" />
                                        <span className="truncate">
                                            {activeConversation.contact_phone ??
                                                'Canal ativo'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={onOpenProducts}
                                disabled={
                                    sending || sendingProduct || funnelRunning
                                }
                                className="hidden min-h-10 items-center gap-2 border border-[#f6f4f0]/14 px-4 text-xs font-bold text-[#f6f4f0] hover:border-[#ff4d3d] disabled:cursor-not-allowed disabled:opacity-45 sm:flex"
                            >
                                <Shirt className="size-4 text-[#ff4d3d]" />
                                Apresentar coleção
                            </button>
                        </header>

                        <ScrollArea className="min-h-0 flex-1">
                            <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-end gap-4 px-4 py-7 sm:px-7">
                                {messages.length === 0 && (
                                    <div className="my-auto flex flex-col items-center py-16 text-center">
                                        <Sparkles className="size-6 text-[#ff4d3d]" />
                                        <p className="mt-4 font-zouth-display text-xl font-semibold">
                                            O começo de uma relação
                                            <span className="text-[#ff4d3d]">
                                                .
                                            </span>
                                        </p>
                                        <p className="mt-2 text-xs text-[#98968d]">
                                            Envie uma mensagem ou apresente uma
                                            peça.
                                        </p>
                                    </div>
                                )}
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex ${message.from_me ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <MessageReactionMenu
                                            message={message}
                                            pending={
                                                reactingMessageId === message.id
                                            }
                                            onReact={onReactToMessage}
                                        >
                                            <div
                                                data-message-id={message.id}
                                                className={`relative flex w-fit max-w-[86%] cursor-context-menu flex-col sm:max-w-[72%] ${message.from_me ? 'items-end' : 'items-start'} ${message.reactions.length > 0 ? 'mb-2' : ''}`}
                                            >
                                                {message.media_url &&
                                                message.media_type ===
                                                    'audio' ? (
                                                    <VoiceMessagePreview
                                                        appearance={
                                                            message.from_me
                                                                ? 'outgoing'
                                                                : 'incoming'
                                                        }
                                                        sourceUrl={
                                                            message.media_url
                                                        }
                                                        profileName={
                                                            activeConversation.display_name
                                                        }
                                                        profilePictureUrl={
                                                            activeConversation.contact_picture_url
                                                        }
                                                        timestamp={formatTime(
                                                            message.message_timestamp,
                                                        )}
                                                    />
                                                ) : message.media_url &&
                                                  message.media_type ===
                                                      'sticker' ? (
                                                    <div
                                                        className={`flex w-fit max-w-[11rem] flex-col ${message.from_me ? 'items-end' : 'items-start'}`}
                                                    >
                                                        <a
                                                            href={
                                                                message.media_url
                                                            }
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            aria-label="Abrir figurinha em tamanho real"
                                                            className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]"
                                                        >
                                                            <img
                                                                src={
                                                                    message.media_url
                                                                }
                                                                alt="Figurinha"
                                                                loading="lazy"
                                                                decoding="async"
                                                                className="block max-h-40 w-auto max-w-40 object-contain drop-shadow-[0_5px_12px_rgba(0,0,0,0.28)] sm:max-h-44 sm:max-w-44"
                                                            />
                                                        </a>
                                                        <div className="mt-1 flex items-center gap-1.5 px-0.5">
                                                            <span className="text-[0.62rem] text-[#98968d]">
                                                                {formatTime(
                                                                    message.message_timestamp,
                                                                )}
                                                            </span>
                                                            {message.from_me && (
                                                                <StatusIcon
                                                                    status={
                                                                        message.status
                                                                    }
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className={`w-fit max-w-full border px-3 py-2.5 sm:px-4 ${
                                                            message.from_me
                                                                ? 'border-[#ff4d3d]/30 bg-[#5a2a4f]/28'
                                                                : 'border-[#f6f4f0]/14 bg-[#18181f]'
                                                        }`}
                                                    >
                                                        {message.media_url &&
                                                            message.media_type ===
                                                                'document' && (
                                                                <a
                                                                    href={
                                                                        message.media_url
                                                                    }
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="mb-2 flex min-w-56 items-center gap-3 border border-[#f6f4f0]/14 bg-[#101015] p-3 text-sm hover:border-[#ff4d3d] sm:min-w-72"
                                                                >
                                                                    <span className="flex size-10 shrink-0 items-center justify-center bg-[#ff4d3d] text-[#18181f]">
                                                                        <FileText className="size-5" />
                                                                    </span>
                                                                    <span className="min-w-0 flex-1">
                                                                        <span className="block truncate font-bold">
                                                                            {message.media_file_name ??
                                                                                'Documento compartilhado'}
                                                                        </span>
                                                                        <span className="mt-0.5 block text-xs text-[#98968d]">
                                                                            Abrir
                                                                            documento
                                                                        </span>
                                                                    </span>
                                                                </a>
                                                            )}
                                                        {message.media_url &&
                                                            message.media_type ===
                                                                'image' && (
                                                                <a
                                                                    href={
                                                                        message.media_url
                                                                    }
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    aria-label="Abrir imagem em tamanho real"
                                                                    className="mb-3 block overflow-hidden bg-[#101015] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]"
                                                                >
                                                                    <img
                                                                        src={
                                                                            message.media_url
                                                                        }
                                                                        alt={
                                                                            message.body ||
                                                                            message.media_file_name ||
                                                                            'Imagem compartilhada'
                                                                        }
                                                                        loading="lazy"
                                                                        decoding="async"
                                                                        className="max-h-[28rem] w-full object-contain"
                                                                    />
                                                                </a>
                                                            )}
                                                        {message.media_url &&
                                                            message.media_type ===
                                                                'video' && (
                                                                <video
                                                                    controls
                                                                    preload="metadata"
                                                                    src={
                                                                        message.media_url
                                                                    }
                                                                    className="mb-3 max-h-[28rem] w-full bg-black object-contain"
                                                                >
                                                                    Seu
                                                                    navegador
                                                                    não consegue
                                                                    reproduzir
                                                                    este vídeo.
                                                                </video>
                                                            )}
                                                        {!message.body &&
                                                            !message.media_url && (
                                                                <div className="flex min-w-48 items-center gap-3 py-1 text-[#cac4ba]">
                                                                    <span className="flex size-9 shrink-0 items-center justify-center border border-[#f6f4f0]/14 text-[#ff4d3d]">
                                                                        {message.media_type ===
                                                                        'video' ? (
                                                                            <Video className="size-4" />
                                                                        ) : (
                                                                            <ImageIcon className="size-4" />
                                                                        )}
                                                                    </span>
                                                                    <span className="text-xs">
                                                                        Mídia
                                                                        ainda
                                                                        não
                                                                        disponível
                                                                    </span>
                                                                </div>
                                                            )}
                                                        {message.body && (
                                                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-[#f6f4f0]">
                                                                {message.body}
                                                            </p>
                                                        )}
                                                        <div className="mt-1.5 flex items-center justify-end gap-1.5">
                                                            <span className="text-[0.62rem] text-[#98968d]">
                                                                {formatTime(
                                                                    message.message_timestamp,
                                                                )}
                                                            </span>
                                                            {message.from_me && (
                                                                <StatusIcon
                                                                    status={
                                                                        message.status
                                                                    }
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                                <MessageReactionBadges
                                                    message={message}
                                                    reactions={
                                                        message.reactions
                                                    }
                                                    fromMe={message.from_me}
                                                    pending={
                                                        reactingMessageId ===
                                                        message.id
                                                    }
                                                    onReact={onReactToMessage}
                                                />
                                            </div>
                                        </MessageReactionMenu>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        <footer className="border-t border-[#f6f4f0]/12 bg-[#18181f] px-4 py-3 sm:px-6">
                            <div className="mx-auto max-w-4xl">
                                <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                                    <button
                                        type="button"
                                        onClick={onOpenProducts}
                                        disabled={
                                            sending ||
                                            sendingProduct ||
                                            funnelRunning
                                        }
                                        className="flex min-h-9 shrink-0 items-center gap-2 border border-[#f6f4f0]/14 px-3 text-xs font-bold text-[#f6f4f0] hover:border-[#ff4d3d] disabled:opacity-45"
                                    >
                                        <Shirt className="size-4 text-[#ff4d3d]" />
                                        Apresentar coleção
                                    </button>
                                    {funnels.map((funnel) => {
                                        const hasFeedback = Boolean(
                                            funnelFeedbackStatus(
                                                funnel,
                                                'composer',
                                                funnelActionFeedback,
                                            ),
                                        );

                                        return (
                                            <button
                                                key={funnel.id}
                                                type="button"
                                                onClick={() =>
                                                    onOpenFunnel(
                                                        funnel,
                                                        'composer',
                                                    )
                                                }
                                                disabled={
                                                    funnelRunning || hasFeedback
                                                }
                                                className={`flex min-h-9 shrink-0 items-center gap-2 border px-3 text-xs font-bold transition-colors disabled:cursor-not-allowed ${hasFeedback ? 'border-[#ff4d3d]/45 text-[#f6f4f0]' : 'border-[#f6f4f0]/14 text-[#cac4ba] hover:border-[#ff4d3d] hover:text-[#f6f4f0] disabled:opacity-45'}`}
                                            >
                                                <FunnelActionLabel
                                                    funnel={funnel}
                                                    trigger="composer"
                                                    feedback={
                                                        funnelActionFeedback
                                                    }
                                                    idleLabel={funnel.name}
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="flex items-end gap-2">
                                    <label className="relative min-w-0 flex-1">
                                        <span className="sr-only">
                                            Escreva uma resposta
                                        </span>
                                        {suggestedQuickReplies.length > 0 && (
                                            <div
                                                role="listbox"
                                                aria-label="Mensagens rápidas"
                                                className="absolute right-0 bottom-full left-0 z-30 mb-2 border border-[#f6f4f0]/14 bg-[#18181f] p-1 shadow-[0_16px_48px_rgba(0,0,0,0.32)]"
                                            >
                                                <div className="flex items-center justify-between border-b border-[#f6f4f0]/10 px-3 py-2">
                                                    <p className="text-[0.62rem] font-bold tracking-[0.16em] text-[#98968d] uppercase">
                                                        Mensagens rápidas
                                                    </p>
                                                    <span className="text-[0.62rem] text-[#6f6c65]">
                                                        ↑↓ escolhe · Enter
                                                        insere
                                                    </span>
                                                </div>
                                                {suggestedQuickReplies.map(
                                                    (
                                                        quickReply,
                                                        indexValue,
                                                    ) => (
                                                        <button
                                                            key={quickReply.id}
                                                            type="button"
                                                            role="option"
                                                            aria-selected={
                                                                indexValue ===
                                                                highlightedQuickReply
                                                            }
                                                            onMouseDown={(
                                                                event,
                                                            ) => {
                                                                event.preventDefault();
                                                                insertQuickReply(
                                                                    quickReply,
                                                                );
                                                            }}
                                                            className={`grid w-full grid-cols-[8.5rem_minmax(0,1fr)] items-center gap-3 px-3 py-2.5 text-left ${
                                                                indexValue ===
                                                                highlightedQuickReply
                                                                    ? 'bg-[#2a1725]'
                                                                    : 'hover:bg-white/[0.035]'
                                                            }`}
                                                        >
                                                            <span className="truncate font-zouth-display text-sm font-semibold text-[#ff4d3d]">
                                                                {'{'}
                                                                {
                                                                    quickReply.shortcut
                                                                }
                                                                {'}'}
                                                            </span>
                                                            <span className="truncate text-xs text-[#cac4ba]">
                                                                {
                                                                    quickReply.title
                                                                }
                                                            </span>
                                                        </button>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                        <textarea
                                            ref={inputRef}
                                            value={messageInput}
                                            onChange={handleMessageChange}
                                            onKeyDown={handleComposerKeyDown}
                                            onSelect={(event) =>
                                                setComposerCursor(
                                                    event.currentTarget
                                                        .selectionStart ??
                                                        event.currentTarget
                                                            .value.length,
                                                )
                                            }
                                            rows={2}
                                            placeholder={
                                                funnelRunning
                                                    ? 'Cadência em andamento…'
                                                    : 'Escreva uma resposta…'
                                            }
                                            disabled={sending || funnelRunning}
                                            className="block min-h-14 w-full resize-none rounded-[2px] border border-[#f6f4f0]/14 bg-[#101015] px-3 py-2.5 text-sm leading-5 text-[#f6f4f0] outline-none placeholder:text-[#98968d] focus:border-[#ff4d3d] focus:ring-2 focus:ring-[#ff4d3d]/20 disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </label>
                                    <button
                                        type="button"
                                        onClick={onSendMessage}
                                        disabled={
                                            !messageInput.trim() ||
                                            sending ||
                                            funnelRunning
                                        }
                                        className="flex size-14 shrink-0 items-center justify-center bg-[#ff4d3d] text-[#18181f] hover:bg-[#ff6a5c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6f4f0] disabled:cursor-not-allowed disabled:opacity-35"
                                        aria-label="Enviar mensagem"
                                    >
                                        <Send className="size-5" />
                                    </button>
                                </div>
                                <p className="mt-1.5 hidden text-[0.62rem] text-[#6f6c65] sm:block">
                                    Enter envia · Shift + Enter cria uma nova
                                    linha
                                </p>
                            </div>
                        </footer>
                    </>
                )}
            </main>

            <aside className="hidden min-h-0 flex-col border-l border-[#f6f4f0]/12 bg-[#18181f] xl:flex">
                {activeConversation ? (
                    <ScrollArea className="min-h-0 flex-1">
                        <div className="px-6 py-7">
                            <p className="text-[0.66rem] font-bold tracking-[0.18em] text-[#ff4d3d] uppercase">
                                Pulso comercial
                            </p>
                            <div className="mt-6 flex items-center gap-3">
                                <ContactAvatar
                                    name={activeConversation.display_name}
                                    pictureUrl={
                                        activeConversation.contact_picture_url
                                    }
                                    size="large"
                                />
                                <div className="min-w-0">
                                    <p className="truncate font-zouth-display text-base font-semibold">
                                        {activeConversation.display_name}
                                    </p>
                                    <p className="mt-0.5 truncate text-xs text-[#98968d]">
                                        {activeConversation.contact_phone ??
                                            'Telefone não informado'}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-5 flex items-center gap-2 border-b border-[#f6f4f0]/12 pb-5 text-xs text-[#cac4ba]">
                                <span className="size-1.5 rounded-full bg-[#2e705a]" />
                                WhatsApp conectado
                            </div>

                            <div className="grid gap-4 border-b border-[#f6f4f0]/12 py-6">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-xs text-[#98968d]">
                                        Histórico
                                    </span>
                                    <strong className="text-sm font-bold">
                                        {messages.length}{' '}
                                        {messages.length === 1
                                            ? 'mensagem'
                                            : 'mensagens'}
                                    </strong>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-xs text-[#98968d]">
                                        Materiais enviados
                                    </span>
                                    <strong className="text-sm font-bold">
                                        {sharedMaterials}
                                    </strong>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-xs text-[#98968d]">
                                        Última atividade
                                    </span>
                                    <strong className="text-sm font-bold">
                                        {formatTime(lastActivity) || 'Agora'}
                                    </strong>
                                </div>
                            </div>

                            <div className="pt-6">
                                <p className="font-zouth-display text-lg font-semibold tracking-[-0.04em]">
                                    Próximo movimento
                                    <span className="text-[#ff4d3d]">.</span>
                                </p>
                                <div className="mt-4 grid gap-2">
                                    <button
                                        type="button"
                                        onClick={onOpenProducts}
                                        disabled={
                                            sending ||
                                            sendingProduct ||
                                            funnelRunning
                                        }
                                        className="flex min-h-12 items-center justify-between gap-3 border border-[#f6f4f0]/14 px-4 text-left text-sm font-bold hover:border-[#ff4d3d] disabled:opacity-45"
                                    >
                                        <span className="flex items-center gap-3">
                                            <Shirt className="size-4 text-[#ff4d3d]" />
                                            Apresentar coleção
                                        </span>
                                        <span aria-hidden="true">→</span>
                                    </button>
                                    {primaryFunnel && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onOpenFunnel(
                                                    primaryFunnel,
                                                    'sidebar',
                                                )
                                            }
                                            disabled={
                                                funnelRunning ||
                                                Boolean(
                                                    funnelFeedbackStatus(
                                                        primaryFunnel,
                                                        'sidebar',
                                                        funnelActionFeedback,
                                                    ),
                                                )
                                            }
                                            className={`flex min-h-12 items-center justify-between gap-3 border px-4 text-left text-sm font-bold transition-colors disabled:cursor-not-allowed ${funnelFeedbackStatus(primaryFunnel, 'sidebar', funnelActionFeedback) ? 'border-[#ff4d3d]/45 text-[#f6f4f0]' : 'border-[#f6f4f0]/14 hover:border-[#ff4d3d] disabled:opacity-45'}`}
                                        >
                                            <FunnelActionLabel
                                                funnel={primaryFunnel}
                                                trigger="sidebar"
                                                feedback={funnelActionFeedback}
                                                idleLabel={`Iniciar ${primaryFunnel.name}`}
                                                showArrow
                                            />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                ) : (
                    <div className="flex flex-1 flex-col justify-end p-6">
                        <p className="text-xs leading-relaxed text-[#98968d]">
                            O pulso comercial aparece quando uma conversa está
                            aberta.
                        </p>
                    </div>
                )}
            </aside>
        </div>
    );
}
