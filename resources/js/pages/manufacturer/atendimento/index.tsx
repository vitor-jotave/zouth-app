import { Head, router } from '@inertiajs/react';
import { Check, CheckCheck, Clock, MessageSquare, Search, Send, Settings } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Atendimento', href: '/manufacturer/atendimento' }];

interface Conversation {
    id: number;
    remote_jid: string;
    is_group: boolean;
    contact_name: string | null;
    contact_phone: string | null;
    contact_picture_url: string | null;
    display_name: string;
    last_message_body: string | null;
    last_message_from_me: boolean;
    last_message_at: string | null;
    unread_count: number;
}

interface Message {
    id: number;
    message_id: string;
    from_me: boolean;
    body: string | null;
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'error';
    message_timestamp: string | null;
}

interface ActiveConversation {
    id: number;
    remote_jid: string;
    is_group: boolean;
    contact_name: string | null;
    contact_phone: string | null;
    contact_picture_url: string | null;
    display_name: string;
}

interface Props {
    instance_connected: boolean;
    conversations: Conversation[];
    active_conversation: ActiveConversation | null;
    messages: Message[];
}

function formatTime(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) {
        return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    }
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
}

function StatusIcon({ status }: { status: Message['status'] }) {
    switch (status) {
        case 'pending':
            return <Clock className="size-3.5 text-gray-400" />;
        case 'sent':
            return <Check className="size-3.5 text-gray-400" />;
        case 'delivered':
            return <CheckCheck className="size-3.5 text-gray-400" />;
        case 'read':
            return <CheckCheck className="size-3.5 text-blue-500" />;
        default:
            return null;
    }
}

export default function AtendimentoIndex({
    instance_connected,
    conversations: initialConversations,
    active_conversation,
    messages: initialMessages,
}: Props) {
    const [conversations, setConversations] = useState(initialConversations);
    const [messages, setMessages] = useState(initialMessages);
    const [messageInput, setMessageInput] = useState('');
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Update state when props change (Inertia navigation)
    useEffect(() => {
        setConversations(initialConversations);
    }, [initialConversations]);

    useEffect(() => {
        setMessages(initialMessages);
    }, [initialMessages]);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when a conversation is selected
    useEffect(() => {
        if (active_conversation) {
            inputRef.current?.focus();
        }
    }, [active_conversation]);

    // Poll for new messages every 5s
    useEffect(() => {
        if (!instance_connected) return;

        const interval = setInterval(async () => {
            // Poll conversation list
            try {
                const res = await fetch('/manufacturer/atendimento/conversations/list', {
                    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                });
                if (res.ok) {
                    const data = await res.json();
                    setConversations(data.conversations);
                }
            } catch {
                // Ignore
            }

            // Poll active conversation messages
            if (active_conversation) {
                try {
                    const res = await fetch(`/manufacturer/atendimento/conversations/${active_conversation.id}/messages`, {
                        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setMessages(data.messages);
                    }
                } catch {
                    // Ignore
                }
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [instance_connected, active_conversation]);

    const selectConversation = useCallback(
        (conv: Conversation) => {
            router.visit(`/manufacturer/atendimento?conversation=${conv.id}`, {
                preserveState: false,
            });
        },
        [],
    );

    const sendMessage = useCallback(async () => {
        if (!active_conversation || !messageInput.trim() || sending) return;
        setSending(true);

        try {
            const res = await fetch(`/manufacturer/atendimento/conversations/${active_conversation.id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': decodeURIComponent(
                        document.cookie
                            .split('; ')
                            .find((c) => c.startsWith('XSRF-TOKEN='))
                            ?.split('=')[1] ?? '',
                    ),
                },
                body: JSON.stringify({ body: messageInput.trim() }),
            });

            if (res.ok) {
                const data = await res.json();
                setMessages((prev) => [...prev, data.message]);
                setMessageInput('');
                inputRef.current?.focus();
            }
        } catch {
            // Ignore
        } finally {
            setSending(false);
        }
    }, [active_conversation, messageInput, sending]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        },
        [sendMessage],
    );

    const filteredConversations = searchQuery
        ? conversations.filter(
              (c) =>
                  c.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  c.contact_phone?.includes(searchQuery),
          )
        : conversations;

    // Not connected — redirect to setup
    if (!instance_connected) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Atendimento" />
                <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 p-8">
                    <MessageSquare className="size-16 text-gray-300" />
                    <h2 className="text-xl font-semibold">WhatsApp não conectado</h2>
                    <p className="text-muted-foreground text-center">
                        Configure seu WhatsApp para começar a atender seus clientes.
                    </p>
                    <Button onClick={() => router.visit('/manufacturer/atendimento/setup')}>
                        <Settings className="mr-2 size-4" />
                        Configurar WhatsApp
                    </Button>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Atendimento" />
            <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border">
                {/* Conversation list */}
                <div className="flex w-80 shrink-0 flex-col border-r bg-white">
                    {/* Search */}
                    <div className="flex items-center gap-2 border-b p-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 size-4 text-gray-400" />
                            <Input
                                placeholder="Buscar conversa..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => router.visit('/manufacturer/atendimento/setup')}
                            title="Configurações"
                        >
                            <Settings className="size-4" />
                        </Button>
                    </div>

                    {/* Conversation items */}
                    <ScrollArea className="flex-1">
                        {filteredConversations.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 p-8 text-center">
                                <MessageSquare className="size-10 text-gray-300" />
                                <p className="text-muted-foreground text-sm">
                                    {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
                                </p>
                            </div>
                        ) : (
                            filteredConversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    type="button"
                                    onClick={() => selectConversation(conv)}
                                    className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-gray-50 ${
                                        active_conversation?.id === conv.id ? 'bg-gray-100' : ''
                                    }`}
                                >
                                    <Avatar className="size-10 shrink-0">
                                        <AvatarFallback className="bg-emerald-100 text-sm text-emerald-700">
                                            {getInitials(conv.display_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="truncate text-sm font-medium">{conv.display_name}</span>
                                            <span className="shrink-0 text-xs text-gray-500">{formatTime(conv.last_message_at)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="truncate text-xs text-gray-500">
                                                {conv.last_message_from_me && <span className="text-gray-400">Você: </span>}
                                                {conv.last_message_body ?? '...'}
                                            </p>
                                            {conv.unread_count > 0 && (
                                                <Badge className="ml-1 h-5 min-w-5 shrink-0 rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white hover:bg-emerald-500">
                                                    {conv.unread_count}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </ScrollArea>
                </div>

                {/* Chat area */}
                <div className="flex flex-1 flex-col bg-[#f0f2f5]">
                    {!active_conversation ? (
                        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                            <MessageSquare className="size-16 text-gray-300" />
                            <p className="text-muted-foreground">Selecione uma conversa para começar</p>
                        </div>
                    ) : (
                        <>
                            {/* Chat header */}
                            <div className="flex items-center gap-3 border-b bg-white px-4 py-3">
                                <Avatar className="size-10">
                                    <AvatarFallback className="bg-emerald-100 text-sm text-emerald-700">
                                        {getInitials(active_conversation.display_name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-medium">{active_conversation.display_name}</p>
                                    {active_conversation.contact_phone && (
                                        <p className="text-xs text-gray-500">{active_conversation.contact_phone}</p>
                                    )}
                                </div>
                            </div>

                            {/* Messages */}
                            <ScrollArea className="flex-1 px-4 py-3">
                                <div className="mx-auto max-w-3xl space-y-1">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}>
                                            <div
                                                className={`relative max-w-[70%] rounded-lg px-3 py-2 shadow-sm ${
                                                    msg.from_me
                                                        ? 'rounded-tr-none bg-[#d9fdd3]'
                                                        : 'rounded-tl-none bg-white'
                                                }`}
                                            >
                                                <p className="whitespace-pre-wrap text-sm">{msg.body}</p>
                                                <div className="mt-0.5 flex items-center justify-end gap-1">
                                                    <span className="text-[10px] text-gray-500">{formatTime(msg.message_timestamp)}</span>
                                                    {msg.from_me && <StatusIcon status={msg.status} />}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                            </ScrollArea>

                            {/* Message input */}
                            <div className="border-t bg-white px-4 py-3">
                                <div className="mx-auto flex max-w-3xl items-center gap-2">
                                    <Input
                                        ref={inputRef}
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Digite uma mensagem..."
                                        className="flex-1"
                                        disabled={sending}
                                    />
                                    <Button
                                        size="icon"
                                        onClick={sendMessage}
                                        disabled={!messageInput.trim() || sending}
                                        className="shrink-0 bg-emerald-500 hover:bg-emerald-600"
                                    >
                                        <Send className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
