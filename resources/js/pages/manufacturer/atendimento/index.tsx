import { Head, router } from '@inertiajs/react';
import {
    AlertCircle,
    Bot,
    Check,
    FileText,
    LoaderCircle,
    MessageSquare,
    Play,
    RadioTower,
    Search,
    Shirt,
} from 'lucide-react';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import AppLayout from '@/layouts/app-layout';
import atendimento from '@/routes/manufacturer/atendimento';
import { reaction as messageReactionRoute } from '@/routes/manufacturer/atendimento/messages';
import type { BreadcrumbItem } from '@/types';
import { AtendimentoWorkspace } from './components/atendimento-workspace';
import type { QuickReply } from './quick-reply-types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Chat', href: '/manufacturer/atendimento' },
];

export interface Conversation {
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

export interface MessageReaction {
    actor: string;
    from_me: boolean;
    emoji: string;
}

export interface Message {
    id: number;
    message_id: string;
    from_me: boolean;
    body: string | null;
    media_type: string | null;
    media_url: string | null;
    media_mimetype: string | null;
    media_file_name: string | null;
    reactions: MessageReaction[];
    status: 'pending' | 'sent' | 'delivered' | 'read' | 'error';
    message_timestamp: string | null;
}

interface WhatsappProduct {
    id: number;
    name: string;
    sku: string | null;
    description: string | null;
    price_cents: number | null;
    primary_image_url: string | null;
}

interface ProductSendOptions {
    include_photo: boolean;
    include_price: boolean;
    include_description: boolean;
    include_sku: boolean;
}

export interface WhatsappFunnelStep {
    id: number;
    type: 'wait' | 'text' | 'audio' | 'product';
    sort_order: number;
    payload: Record<string, string | number | boolean | null | undefined>;
}

export interface WhatsappFunnel {
    id: number;
    name: string;
    code: string;
    steps: WhatsappFunnelStep[];
}

export type FunnelTriggerLocation = 'composer' | 'sidebar';

export interface FunnelActionFeedback {
    funnelId: number;
    trigger: FunnelTriggerLocation;
    status: 'sending' | 'sent';
}

export interface WhatsappFunnelRunStep extends WhatsappFunnelStep {
    status: 'pending' | 'waiting' | 'sending' | 'sent' | 'failed';
    message_id: number | null;
    error_message: string | null;
}

export interface WhatsappFunnelRun {
    id: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    funnel: {
        id: number;
        name: string;
        code: string;
    };
    steps: WhatsappFunnelRunStep[];
}

export interface ActiveConversation {
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
    funnels: WhatsappFunnel[];
    quick_replies: QuickReply[];
}

function xsrfToken(): string {
    return decodeURIComponent(
        document.cookie
            .split('; ')
            .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
            ?.split('=')[1] ?? '',
    );
}

function formatPrice(priceCents: number | null): string | null {
    if (priceCents === null) {
        return null;
    }

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(priceCents / 100);
}

function buildProductCaption(
    product: WhatsappProduct,
    options: ProductSendOptions,
): string {
    const lines = [`*${product.name}*`];
    const price = formatPrice(product.price_cents);

    if (options.include_price && price) {
        lines.push(`Preço: ${price}`);
    }

    if (options.include_description && product.description) {
        lines.push(product.description);
    }

    if (options.include_sku && product.sku) {
        lines.push(`SKU: ${product.sku}`);
    }

    return lines.join('\n');
}

function funnelStepLabel(step: WhatsappFunnelStep): string {
    switch (step.type) {
        case 'wait':
            return `Aguardar ${step.payload.seconds ?? 1}s`;
        case 'text':
            return String(step.payload.body ?? 'Mensagem de texto');
        case 'audio':
            return String(step.payload.file_name ?? 'Enviar áudio');
        case 'product':
            return 'Enviar produto';
        default:
            return 'Passo';
    }
}

function messageCollectionsAreEqual(
    current: Message[],
    incoming: Message[],
): boolean {
    return (
        current.length === incoming.length &&
        current.every((message, index) => {
            const nextMessage = incoming[index];

            return (
                message.id === nextMessage.id &&
                message.status === nextMessage.status &&
                message.body === nextMessage.body &&
                message.media_type === nextMessage.media_type &&
                message.media_url === nextMessage.media_url &&
                JSON.stringify(message.reactions) ===
                    JSON.stringify(nextMessage.reactions) &&
                message.message_timestamp === nextMessage.message_timestamp
            );
        })
    );
}

export default function AtendimentoIndex({
    instance_connected,
    conversations: initialConversations,
    active_conversation,
    messages: initialMessages,
    funnels,
    quick_replies,
}: Props) {
    const [conversations, setConversations] = useState(initialConversations);
    const [messages, setMessages] = useState(initialMessages);
    const [messageInput, setMessageInput] = useState('');
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [productDialogOpen, setProductDialogOpen] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [products, setProducts] = useState<WhatsappProduct[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [productError, setProductError] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] =
        useState<WhatsappProduct | null>(null);
    const [selectedProducts, setSelectedProducts] = useState<WhatsappProduct[]>(
        [],
    );
    const [productOptions, setProductOptions] = useState<ProductSendOptions>({
        include_photo: true,
        include_price: true,
        include_description: true,
        include_sku: false,
    });
    const [sendingProduct, setSendingProduct] = useState(false);
    const [reactingMessageId, setReactingMessageId] = useState<number | null>(
        null,
    );
    const [selectedFunnel, setSelectedFunnel] = useState<WhatsappFunnel | null>(
        null,
    );
    const [selectedFunnelTrigger, setSelectedFunnelTrigger] =
        useState<FunnelTriggerLocation | null>(null);
    const [funnelActionFeedback, setFunnelActionFeedback] =
        useState<FunnelActionFeedback | null>(null);
    const [funnelDialogOpen, setFunnelDialogOpen] = useState(false);
    const [startingFunnel, setStartingFunnel] = useState(false);
    const [activeRun, setActiveRun] = useState<WhatsappFunnelRun | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const funnelFeedbackTimeoutRef = useRef<number | null>(null);
    const shouldScrollMessagesRef = useRef(true);
    const messageScrollBehaviorRef = useRef<ScrollBehavior>('auto');
    const previousConversationIdRef = useRef(active_conversation?.id ?? null);
    const funnelRunning =
        activeRun?.status === 'pending' || activeRun?.status === 'running';
    const selectedProductIds = selectedProducts.map((product) => product.id);
    const sendingMultipleProducts = selectedProducts.length > 1;

    // Update state when props change (Inertia navigation)
    useEffect(() => {
        setConversations(initialConversations);
    }, [initialConversations]);

    const isNearMessagesEnd = useCallback((): boolean => {
        const viewport = messagesEndRef.current?.closest<HTMLElement>(
            '[data-slot="scroll-area-viewport"]',
        );

        if (!viewport) {
            return true;
        }

        return (
            viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <
            120
        );
    }, []);

    const replacePolledMessages = useCallback(
        (incomingMessages: Message[]) => {
            setMessages((currentMessages) => {
                if (
                    messageCollectionsAreEqual(
                        currentMessages,
                        incomingMessages,
                    )
                ) {
                    return currentMessages;
                }

                shouldScrollMessagesRef.current = isNearMessagesEnd();
                messageScrollBehaviorRef.current = 'smooth';

                return incomingMessages;
            });
        },
        [isNearMessagesEnd],
    );

    useEffect(() => {
        const activeConversationId = active_conversation?.id ?? null;
        const conversationChanged =
            previousConversationIdRef.current !== activeConversationId;

        if (conversationChanged) {
            shouldScrollMessagesRef.current = true;
            messageScrollBehaviorRef.current = 'auto';
            previousConversationIdRef.current = activeConversationId;
        } else {
            shouldScrollMessagesRef.current = isNearMessagesEnd();
        }

        setMessages((currentMessages) =>
            messageCollectionsAreEqual(currentMessages, initialMessages)
                ? currentMessages
                : initialMessages,
        );
    }, [active_conversation?.id, initialMessages, isNearMessagesEnd]);

    useEffect(() => {
        const previousDocumentOverflow =
            document.documentElement.style.overflow;
        const previousBodyOverflow = document.body.style.overflow;

        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';

        return () => {
            document.documentElement.style.overflow = previousDocumentOverflow;
            document.body.style.overflow = previousBodyOverflow;
        };
    }, []);

    useLayoutEffect(() => {
        if (!shouldScrollMessagesRef.current) {
            return;
        }

        const frame = window.requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({
                behavior: messageScrollBehaviorRef.current,
                block: 'end',
            });
            shouldScrollMessagesRef.current = false;
        });

        return () => window.cancelAnimationFrame(frame);
    }, [messages]);

    // Focus input when a conversation is selected
    useEffect(() => {
        if (active_conversation) {
            inputRef.current?.focus({ preventScroll: true });
        }
    }, [active_conversation]);

    useEffect(() => {
        if (!productDialogOpen) return;

        const controller = new AbortController();
        const timeout = window.setTimeout(async () => {
            setProductsLoading(true);

            try {
                const params = new URLSearchParams();
                if (productSearch.trim()) {
                    params.set('search', productSearch.trim());
                }

                const res = await fetch(
                    `/manufacturer/atendimento/products?${params.toString()}`,
                    {
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                        signal: controller.signal,
                    },
                );

                if (res.ok) {
                    const data = await res.json();
                    setProducts(data.products);
                }
            } catch {
                // Ignore
            } finally {
                setProductsLoading(false);
            }
        }, 250);

        return () => {
            controller.abort();
            window.clearTimeout(timeout);
        };
    }, [productDialogOpen, productSearch]);

    useEffect(() => {
        if (!activeRun || !funnelRunning) return;

        const interval = window.setInterval(async () => {
            try {
                const res = await fetch(
                    `/manufacturer/atendimento/funnel-runs/${activeRun.id}`,
                    {
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                    },
                );

                if (res.ok) {
                    const data = await res.json();
                    setActiveRun(data.run);
                }
            } catch {
                // Ignore
            }

            if (active_conversation) {
                try {
                    const res = await fetch(
                        `/manufacturer/atendimento/conversations/${active_conversation.id}/messages`,
                        {
                            headers: {
                                Accept: 'application/json',
                                'X-Requested-With': 'XMLHttpRequest',
                            },
                        },
                    );

                    if (res.ok) {
                        const data = await res.json();
                        replacePolledMessages(data.messages);
                    }
                } catch {
                    // Ignore
                }
            }
        }, 2000);

        return () => window.clearInterval(interval);
    }, [activeRun, funnelRunning, active_conversation, replacePolledMessages]);

    useEffect(() => {
        if (
            !activeRun ||
            !funnelActionFeedback ||
            funnelActionFeedback.status !== 'sending' ||
            activeRun.funnel.id !== funnelActionFeedback.funnelId
        ) {
            return;
        }

        if (activeRun.status === 'failed') {
            setFunnelActionFeedback(null);

            return;
        }

        if (activeRun.status !== 'completed') {
            return;
        }

        const completedFeedback = {
            ...funnelActionFeedback,
            status: 'sent' as const,
        };

        setFunnelActionFeedback(completedFeedback);
        funnelFeedbackTimeoutRef.current = window.setTimeout(() => {
            setFunnelActionFeedback((current) => {
                if (
                    current?.funnelId !== completedFeedback.funnelId ||
                    current.trigger !== completedFeedback.trigger ||
                    current.status !== 'sent'
                ) {
                    return current;
                }

                return null;
            });
            funnelFeedbackTimeoutRef.current = null;
        }, 2000);
    }, [activeRun, funnelActionFeedback]);

    useEffect(() => {
        return () => {
            if (funnelFeedbackTimeoutRef.current !== null) {
                window.clearTimeout(funnelFeedbackTimeoutRef.current);
            }
        };
    }, []);

    // Poll for new messages every 5s
    useEffect(() => {
        if (!instance_connected) return;

        const interval = setInterval(async () => {
            // Poll conversation list
            try {
                const res = await fetch(
                    '/manufacturer/atendimento/conversations/list',
                    {
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                    },
                );
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
                    const res = await fetch(
                        `/manufacturer/atendimento/conversations/${active_conversation.id}/messages`,
                        {
                            headers: {
                                Accept: 'application/json',
                                'X-Requested-With': 'XMLHttpRequest',
                            },
                        },
                    );
                    if (res.ok) {
                        const data = await res.json();
                        replacePolledMessages(data.messages);
                    }
                } catch {
                    // Ignore
                }
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [instance_connected, active_conversation, replacePolledMessages]);

    const selectConversation = useCallback((conv: Conversation) => {
        router.visit(`/manufacturer/atendimento?conversation=${conv.id}`, {
            preserveState: false,
        });
    }, []);

    const sendMessage = useCallback(async () => {
        if (
            !active_conversation ||
            !messageInput.trim() ||
            sending ||
            funnelRunning
        ) {
            return;
        }
        setSending(true);

        try {
            const res = await fetch(
                `/manufacturer/atendimento/conversations/${active_conversation.id}/messages`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': xsrfToken(),
                    },
                    body: JSON.stringify({ body: messageInput.trim() }),
                },
            );

            if (res.ok) {
                const data = await res.json();
                shouldScrollMessagesRef.current = true;
                messageScrollBehaviorRef.current = 'smooth';
                setMessages((prev) => [...prev, data.message]);
                setMessageInput('');
                inputRef.current?.focus({ preventScroll: true });
            }
        } catch {
            // Ignore
        } finally {
            setSending(false);
        }
    }, [active_conversation, messageInput, sending, funnelRunning]);

    const reactToMessage = useCallback(
        async (message: Message, reaction: string) => {
            if (reactingMessageId !== null) {
                return;
            }

            const previousReactions = message.reactions;
            const ownReaction = previousReactions.find(
                (messageReaction) => messageReaction.from_me,
            )?.emoji;
            const optimisticReactions = previousReactions.filter(
                (messageReaction) => !messageReaction.from_me,
            );

            if (ownReaction !== reaction) {
                optimisticReactions.push({
                    actor: 'self',
                    from_me: true,
                    emoji: reaction,
                });
            }

            setReactingMessageId(message.id);
            setMessages((currentMessages) =>
                currentMessages.map((currentMessage) =>
                    currentMessage.id === message.id
                        ? {
                              ...currentMessage,
                              reactions: optimisticReactions,
                          }
                        : currentMessage,
                ),
            );

            try {
                const endpoint = messageReactionRoute(message.id);
                const response = await fetch(endpoint.url, {
                    method: endpoint.method.toUpperCase(),
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': xsrfToken(),
                    },
                    body: JSON.stringify({ reaction }),
                });

                if (!response.ok) {
                    throw new Error('Reaction request failed.');
                }

                const data = await response.json();
                setMessages((currentMessages) =>
                    currentMessages.map((currentMessage) =>
                        currentMessage.id === message.id
                            ? {
                                  ...currentMessage,
                                  reactions: data.reactions,
                              }
                            : currentMessage,
                    ),
                );
            } catch {
                setMessages((currentMessages) =>
                    currentMessages.map((currentMessage) =>
                        currentMessage.id === message.id
                            ? {
                                  ...currentMessage,
                                  reactions: previousReactions,
                              }
                            : currentMessage,
                    ),
                );
            } finally {
                setReactingMessageId(null);
            }
        },
        [reactingMessageId],
    );

    const selectProduct = useCallback(
        (product: WhatsappProduct) => {
            setSelectedProduct(product);
            setSelectedProducts((current) => {
                const isSelected = current.some(
                    (item) => item.id === product.id,
                );

                if (isSelected) {
                    return current.filter((item) => item.id !== product.id);
                }

                return [...current, product];
            });
            setProductOptions((current) => ({
                include_photo:
                    selectedProducts.length > 0
                        ? current.include_photo
                        : Boolean(product.primary_image_url),
                include_price:
                    selectedProducts.length > 0
                        ? current.include_price
                        : product.price_cents !== null,
                include_description:
                    selectedProducts.length > 0
                        ? current.include_description
                        : Boolean(product.description),
                include_sku: current.include_sku,
            }));
        },
        [selectedProducts.length],
    );

    const sendProduct = useCallback(async () => {
        if (
            !active_conversation ||
            selectedProducts.length === 0 ||
            sendingProduct ||
            funnelRunning
        ) {
            return;
        }

        setSendingProduct(true);
        setProductError(null);

        try {
            const endpoint =
                selectedProducts.length > 1
                    ? `/manufacturer/atendimento/conversations/${active_conversation.id}/products/pdf`
                    : `/manufacturer/atendimento/conversations/${active_conversation.id}/products/${selectedProducts[0].id}`;
            const payload =
                selectedProducts.length > 1
                    ? {
                          product_ids: selectedProducts.map(
                              (product) => product.id,
                          ),
                          ...productOptions,
                      }
                    : productOptions;

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': xsrfToken(),
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                setProductError(
                    data?.error ??
                        'Não foi possível enviar os produtos. Tente novamente.',
                );

                return;
            }

            shouldScrollMessagesRef.current = true;
            messageScrollBehaviorRef.current = 'smooth';
            setMessages((prev) => [...prev, data.message]);
            setProductDialogOpen(false);
            setSelectedProduct(null);
            setSelectedProducts([]);
            setProductSearch('');
            inputRef.current?.focus({ preventScroll: true });
        } catch {
            setProductError(
                'Não foi possível enviar os produtos. Tente novamente.',
            );
        } finally {
            setSendingProduct(false);
        }
    }, [
        active_conversation,
        selectedProducts,
        sendingProduct,
        productOptions,
        funnelRunning,
    ]);

    const openFunnelPreview = useCallback(
        (funnel: WhatsappFunnel, trigger: FunnelTriggerLocation) => {
            setSelectedFunnel(funnel);
            setSelectedFunnelTrigger(trigger);
            setFunnelDialogOpen(true);
        },
        [],
    );

    const startFunnel = useCallback(async () => {
        if (
            !active_conversation ||
            !selectedFunnel ||
            !selectedFunnelTrigger ||
            startingFunnel ||
            funnelRunning
        ) {
            return;
        }

        const feedback: FunnelActionFeedback = {
            funnelId: selectedFunnel.id,
            trigger: selectedFunnelTrigger,
            status: 'sending',
        };

        if (funnelFeedbackTimeoutRef.current !== null) {
            window.clearTimeout(funnelFeedbackTimeoutRef.current);
            funnelFeedbackTimeoutRef.current = null;
        }

        setFunnelActionFeedback(feedback);
        setStartingFunnel(true);

        try {
            const res = await fetch(
                `/manufacturer/atendimento/conversations/${active_conversation.id}/funnels/${selectedFunnel.id}/runs`,
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': xsrfToken(),
                    },
                },
            );

            if (!res.ok) {
                setFunnelActionFeedback(null);

                return;
            }

            const data = await res.json();
            setActiveRun(data.run);
            setFunnelDialogOpen(false);
            setSelectedFunnel(null);
            setSelectedFunnelTrigger(null);
        } catch {
            setFunnelActionFeedback(null);
        } finally {
            setStartingFunnel(false);
        }
    }, [
        active_conversation,
        selectedFunnel,
        selectedFunnelTrigger,
        startingFunnel,
        funnelRunning,
    ]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        },
        [sendMessage],
    );

    const previewProduct =
        selectedProducts.length === 1 ? selectedProducts[0] : selectedProduct;
    const productPreview = previewProduct
        ? buildProductCaption(previewProduct, productOptions)
        : '';

    if (!instance_connected) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Chat" />
                <div className="flex h-[calc(100vh-4rem)] flex-1 flex-col items-center justify-center bg-[#101015] p-8 text-center text-[#f6f4f0]">
                    <span className="flex size-16 items-center justify-center border border-[#f6f4f0]/14 text-[#ff4d3d]">
                        <MessageSquare className="size-7" />
                    </span>
                    <p className="mt-6 text-[0.66rem] font-bold tracking-[0.18em] text-[#98968d] uppercase">
                        Atendimento
                    </p>
                    <h2 className="mt-2 font-zouth-display text-3xl font-semibold tracking-[-0.05em]">
                        Abra seu canal<span className="text-[#ff4d3d]">.</span>
                    </h2>
                    <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#98968d]">
                        Conecte o WhatsApp da marca para transformar conversas
                        em relações comerciais.
                    </p>
                    <Button
                        className="mt-6 rounded-[2px] bg-[#ff4d3d] font-bold text-[#18181f] hover:bg-[#ff6a5c]"
                        onClick={() => router.visit(atendimento.channels().url)}
                    >
                        <RadioTower className="mr-2 size-4" />
                        Ir para Canais
                    </Button>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Chat" />
            <AtendimentoWorkspace
                conversations={conversations}
                activeConversation={active_conversation}
                messages={messages}
                funnels={funnels}
                quickReplies={quick_replies}
                funnelActionFeedback={funnelActionFeedback}
                funnelRunning={funnelRunning}
                searchQuery={searchQuery}
                messageInput={messageInput}
                sending={sending}
                sendingProduct={sendingProduct}
                reactingMessageId={reactingMessageId}
                inputRef={inputRef}
                messagesEndRef={messagesEndRef}
                onSearchChange={setSearchQuery}
                onMessageChange={setMessageInput}
                onMessageKeyDown={handleKeyDown}
                onSelectConversation={selectConversation}
                onBackToInbox={() => router.visit('/manufacturer/atendimento')}
                onOpenProducts={() => {
                    setProductError(null);
                    setProductDialogOpen(true);
                }}
                onOpenFunnel={openFunnelPreview}
                onSendMessage={sendMessage}
                onReactToMessage={reactToMessage}
            />

            <Dialog
                open={productDialogOpen}
                onOpenChange={setProductDialogOpen}
            >
                <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[2px] border-[#f6f4f0]/14 bg-[#18181f] font-zouth-body text-[#f6f4f0] shadow-none sm:max-w-5xl [&_[data-slot=dialog-close]]:text-[#cac4ba]">
                    <DialogHeader className="border-b border-[#f6f4f0]/12 pb-5">
                        <p className="text-[0.66rem] font-bold tracking-[0.18em] text-[#ff4d3d] uppercase">
                            Vitrine na conversa
                        </p>
                        <DialogTitle className="font-zouth-display text-3xl tracking-[-0.05em]">
                            Apresentar coleção
                            <span className="text-[#ff4d3d]">.</span>
                        </DialogTitle>
                        <DialogDescription className="text-[#98968d]">
                            Escolha as peças e monte o material que o lojista
                            vai receber.
                        </DialogDescription>
                    </DialogHeader>

                    {productError && (
                        <Alert variant="destructive">
                            <AlertCircle className="size-4" />
                            <AlertDescription>{productError}</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                        <div className="space-y-3">
                            <div className="relative">
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#98968d]" />
                                <Input
                                    value={productSearch}
                                    onChange={(e) =>
                                        setProductSearch(e.target.value)
                                    }
                                    placeholder="Buscar por produto ou SKU..."
                                    className="h-12 rounded-[2px] border-[#f6f4f0]/14 bg-[#101015] pl-10 text-[#f6f4f0] placeholder:text-[#98968d] focus-visible:border-[#ff4d3d] focus-visible:ring-[#ff4d3d]/20"
                                />
                            </div>

                            <ScrollArea className="h-80 rounded-[2px] border border-[#f6f4f0]/14 bg-[#101015]">
                                {productsLoading ? (
                                    <div className="p-6 text-center text-sm text-[#98968d]">
                                        Buscando produtos...
                                    </div>
                                ) : products.length === 0 ? (
                                    <div className="p-6 text-center text-sm text-[#98968d]">
                                        Nenhum produto encontrado.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-[#f6f4f0]/10">
                                        {products.map((product) => {
                                            const isSelected =
                                                selectedProductIds.includes(
                                                    product.id,
                                                );

                                            return (
                                                <button
                                                    key={product.id}
                                                    type="button"
                                                    onClick={() =>
                                                        selectProduct(product)
                                                    }
                                                    className={`flex w-full gap-3 p-3 text-left transition-colors hover:bg-[#f6f4f0]/5 ${
                                                        isSelected
                                                            ? 'bg-[#ff4d3d]/8'
                                                            : ''
                                                    }`}
                                                >
                                                    <span
                                                        className={`mt-4 flex size-5 shrink-0 items-center justify-center border ${
                                                            isSelected
                                                                ? 'border-[#ff4d3d] bg-[#ff4d3d] text-[#18181f]'
                                                                : 'border-[#f6f4f0]/25 bg-[#18181f]'
                                                        }`}
                                                    >
                                                        {isSelected && (
                                                            <Check className="size-3" />
                                                        )}
                                                    </span>
                                                    {product.primary_image_url ? (
                                                        <img
                                                            src={
                                                                product.primary_image_url
                                                            }
                                                            alt={product.name}
                                                            className="size-14 shrink-0 rounded-[2px] object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex size-14 shrink-0 items-center justify-center bg-[#f6f4f0]/6">
                                                            <Shirt className="size-5 text-[#98968d]" />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium">
                                                            {product.name}
                                                        </p>
                                                        <p className="text-xs text-[#cac4ba]">
                                                            {formatPrice(
                                                                product.price_cents,
                                                            ) ??
                                                                'Preço não informado'}
                                                        </p>
                                                        {product.sku && (
                                                            <p className="truncate text-xs text-[#98968d]">
                                                                SKU{' '}
                                                                {product.sku}
                                                            </p>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </ScrollArea>
                        </div>

                        <div className="space-y-4 rounded-[2px] border border-[#f6f4f0]/14 bg-[#101015] p-4">
                            {selectedProducts.length > 0 ? (
                                <>
                                    <div className="border-l-2 border-[#ff4d3d] bg-[#f6f4f0]/5 p-3 text-sm">
                                        <p className="font-medium">
                                            {selectedProducts.length === 1
                                                ? '1 produto selecionado'
                                                : `${selectedProducts.length} produtos selecionados`}
                                        </p>
                                        {selectedProducts.length > 1 && (
                                            <p className="mt-1 text-xs text-[#98968d]">
                                                Vários produtos serão enviados
                                                em um PDF formatado.
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="include-photo"
                                                className="rounded-[2px] border-[#f6f4f0]/25 data-[state=checked]:border-[#ff4d3d] data-[state=checked]:bg-[#ff4d3d] data-[state=checked]:text-[#18181f]"
                                                checked={
                                                    productOptions.include_photo
                                                }
                                                disabled={
                                                    selectedProducts.length ===
                                                        1 &&
                                                    !selectedProducts[0]
                                                        .primary_image_url
                                                }
                                                onCheckedChange={(checked) =>
                                                    setProductOptions(
                                                        (prev) => ({
                                                            ...prev,
                                                            include_photo:
                                                                checked ===
                                                                true,
                                                        }),
                                                    )
                                                }
                                            />
                                            <label
                                                htmlFor="include-photo"
                                                className="text-sm"
                                            >
                                                Foto
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="include-price"
                                                className="rounded-[2px] border-[#f6f4f0]/25 data-[state=checked]:border-[#ff4d3d] data-[state=checked]:bg-[#ff4d3d] data-[state=checked]:text-[#18181f]"
                                                checked={
                                                    productOptions.include_price
                                                }
                                                disabled={
                                                    selectedProducts.length ===
                                                        1 &&
                                                    selectedProducts[0]
                                                        .price_cents === null
                                                }
                                                onCheckedChange={(checked) =>
                                                    setProductOptions(
                                                        (prev) => ({
                                                            ...prev,
                                                            include_price:
                                                                checked ===
                                                                true,
                                                        }),
                                                    )
                                                }
                                            />
                                            <label
                                                htmlFor="include-price"
                                                className="text-sm"
                                            >
                                                Preço
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="include-description"
                                                className="rounded-[2px] border-[#f6f4f0]/25 data-[state=checked]:border-[#ff4d3d] data-[state=checked]:bg-[#ff4d3d] data-[state=checked]:text-[#18181f]"
                                                checked={
                                                    productOptions.include_description
                                                }
                                                disabled={
                                                    selectedProducts.length ===
                                                        1 &&
                                                    !selectedProducts[0]
                                                        .description
                                                }
                                                onCheckedChange={(checked) =>
                                                    setProductOptions(
                                                        (prev) => ({
                                                            ...prev,
                                                            include_description:
                                                                checked ===
                                                                true,
                                                        }),
                                                    )
                                                }
                                            />
                                            <label
                                                htmlFor="include-description"
                                                className="text-sm"
                                            >
                                                Descrição
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Checkbox
                                                id="include-sku"
                                                className="rounded-[2px] border-[#f6f4f0]/25 data-[state=checked]:border-[#ff4d3d] data-[state=checked]:bg-[#ff4d3d] data-[state=checked]:text-[#18181f]"
                                                checked={
                                                    productOptions.include_sku
                                                }
                                                disabled={
                                                    selectedProducts.length ===
                                                        1 &&
                                                    !selectedProducts[0].sku
                                                }
                                                onCheckedChange={(checked) =>
                                                    setProductOptions(
                                                        (prev) => ({
                                                            ...prev,
                                                            include_sku:
                                                                checked ===
                                                                true,
                                                        }),
                                                    )
                                                }
                                            />
                                            <label
                                                htmlFor="include-sku"
                                                className="text-sm"
                                            >
                                                SKU
                                            </label>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-sm font-bold">
                                            Prévia
                                        </p>
                                        <div className="border border-[#ff4d3d]/30 bg-[#5a2a4f]/28 p-3 text-sm">
                                            {sendingMultipleProducts ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 font-medium">
                                                        <FileText className="size-4" />
                                                        PDF com produtos
                                                        selecionados
                                                    </div>
                                                    <ul className="space-y-1 text-xs text-[#cac4ba]">
                                                        {selectedProducts.map(
                                                            (product) => (
                                                                <li
                                                                    key={
                                                                        product.id
                                                                    }
                                                                    className="truncate"
                                                                >
                                                                    {
                                                                        product.name
                                                                    }
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                </div>
                                            ) : (
                                                <>
                                                    {productOptions.include_photo &&
                                                        previewProduct?.primary_image_url && (
                                                            <img
                                                                src={
                                                                    previewProduct.primary_image_url
                                                                }
                                                                alt={
                                                                    previewProduct.name
                                                                }
                                                                className="mb-3 max-h-48 w-full object-cover"
                                                            />
                                                        )}
                                                    <p className="whitespace-pre-wrap">
                                                        {productPreview}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-center text-sm text-[#98968d]">
                                    <Shirt className="size-8 text-[#ff4d3d]" />
                                    Selecione uma peça para construir a
                                    apresentação.
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="border-t border-[#f6f4f0]/12 pt-5">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setProductDialogOpen(false)}
                            className="rounded-[2px] border-[#f6f4f0]/18 bg-transparent text-[#f6f4f0] hover:bg-[#f6f4f0]/6 hover:text-[#f6f4f0]"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={sendProduct}
                            disabled={
                                selectedProducts.length === 0 || sendingProduct
                            }
                            className="rounded-[2px] bg-[#ff4d3d] font-bold text-[#18181f] hover:bg-[#ff6a5c]"
                        >
                            {sendingProduct
                                ? 'Enviando...'
                                : sendingMultipleProducts
                                  ? 'Enviar seleção em PDF'
                                  : 'Apresentar peça'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={funnelDialogOpen} onOpenChange={setFunnelDialogOpen}>
                <DialogContent className="rounded-[2px] border-[#f6f4f0]/14 bg-[#18181f] font-zouth-body text-[#f6f4f0] shadow-none [&_[data-slot=dialog-close]]:text-[#cac4ba]">
                    <DialogHeader className="border-b border-[#f6f4f0]/12 pb-5">
                        <p className="text-[0.66rem] font-bold tracking-[0.18em] text-[#ff4d3d] uppercase">
                            Cadência comercial
                        </p>
                        <DialogTitle className="font-zouth-display text-3xl tracking-[-0.05em]">
                            Iniciar sequência
                            <span className="text-[#ff4d3d]">.</span>
                        </DialogTitle>
                        <DialogDescription className="text-[#98968d]">
                            Revise os movimentos antes de iniciar a conversa.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedFunnel && (
                        <div className="space-y-3">
                            <div className="border border-[#ff4d3d]/30 bg-[#ff4d3d]/6 p-3">
                                <div className="flex items-center gap-2 font-medium">
                                    <Bot className="size-4" />
                                    {selectedFunnel.name}
                                </div>
                                <p className="mt-1 font-mono text-xs text-[#98968d]">
                                    {selectedFunnel.code}
                                </p>
                            </div>

                            <div className="space-y-2">
                                {selectedFunnel.steps.map((step) => (
                                    <div
                                        key={step.id}
                                        className="flex items-start gap-3 border border-[#f6f4f0]/12 bg-[#101015] p-3 text-sm"
                                    >
                                        <div className="flex size-7 shrink-0 items-center justify-center bg-[#ff4d3d] text-xs font-bold text-[#18181f]">
                                            {step.sort_order}
                                        </div>
                                        <div>
                                            <p className="font-medium">
                                                {funnelStepLabel(step)}
                                            </p>
                                            <p className="text-xs text-[#98968d]">
                                                {step.type === 'product'
                                                    ? 'Produto com as informações configuradas no funil'
                                                    : step.type === 'audio'
                                                      ? 'Áudio enviado como mídia'
                                                      : step.type === 'wait'
                                                        ? 'Pausa antes do próximo passo'
                                                        : 'Mensagem de texto'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="border-t border-[#f6f4f0]/12 pt-5">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setFunnelDialogOpen(false)}
                            className="rounded-[2px] border-[#f6f4f0]/18 bg-transparent text-[#f6f4f0] hover:bg-[#f6f4f0]/6 hover:text-[#f6f4f0]"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={startFunnel}
                            disabled={
                                !selectedFunnel ||
                                startingFunnel ||
                                funnelRunning
                            }
                            className="rounded-[2px] bg-[#ff4d3d] font-bold text-[#18181f] hover:bg-[#ff6a5c]"
                        >
                            {startingFunnel ? (
                                <>
                                    <LoaderCircle className="mr-2 size-4 animate-spin" />
                                    Enviando Funil
                                </>
                            ) : (
                                <>
                                    <Play className="mr-2 size-4" />
                                    Iniciar agora
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
