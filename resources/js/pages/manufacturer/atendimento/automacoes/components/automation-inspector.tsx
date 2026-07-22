import {
    Clock3,
    Filter,
    LoaderCircle,
    MessageSquare,
    Plus,
    Route,
    Trash2,
    UserRoundCheck,
    X,
    type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import type {
    AutomationMovement,
    AutomationNode,
    FunnelOption,
} from '../automation-types';

const movementIcons: Record<AutomationMovement, LucideIcon> = {
    message_received: MessageSquare,
    client_replied: UserRoundCheck,
    message_contains: Filter,
    send_funnel: Route,
    wait_reply: Clock3,
};

interface AutomationInspectorProps {
    node: AutomationNode | null;
    funnels: FunnelOption[];
    saving: boolean;
    onChange: (node: AutomationNode) => void;
    onDelete: (nodeId: string) => void;
    onApply: () => void;
}

export function AutomationInspector({
    node,
    funnels,
    saving,
    onChange,
    onDelete,
    onApply,
}: AutomationInspectorProps) {
    const [keyword, setKeyword] = useState('');

    useEffect(() => {
        setKeyword('');
    }, [node?.id]);

    if (!node) {
        return (
            <aside className="flex h-full min-h-0 flex-col border-l border-[#f6f4f0]/12 bg-[#141419] px-5 py-6">
                <p className="text-[0.66rem] font-bold tracking-[0.16em] text-[#98968d] uppercase">
                    Movimento selecionado
                </p>
                <div className="flex flex-1 flex-col items-start justify-center border-y border-[#f6f4f0]/12 py-8">
                    <span className="flex size-12 items-center justify-center border border-[#f6f4f0]/14 text-[#67645e]">
                        <MessageSquare className="size-5" />
                    </span>
                    <p className="mt-5 font-zouth-display text-xl font-semibold text-[#f6f4f0]">
                        Escolha um movimento
                        <span className="text-[#ff4d3d]">.</span>
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#98968d]">
                        Clique em um bloco do quadro para ajustar o que ele faz.
                    </p>
                </div>
            </aside>
        );
    }

    const Icon = movementIcons[node.movement];
    const updateData = (data: Partial<AutomationNode['data']>) => {
        onChange({
            ...node,
            data: {
                ...node.data,
                ...data,
            },
        });
    };
    const addKeyword = () => {
        const normalized = keyword.trim();

        if (!normalized || node.data.keywords?.includes(normalized)) {
            return;
        }

        updateData({
            keywords: [...(node.data.keywords ?? []), normalized],
            summary: `Mensagem contém ${[
                ...(node.data.keywords ?? []),
                normalized,
            ].join(', ')}`,
        });
        setKeyword('');
    };

    return (
        <aside className="flex h-full min-h-0 flex-col border-l border-[#f6f4f0]/12 bg-[#141419]">
            <div className="border-b border-[#f6f4f0]/12 px-5 py-4">
                <p className="text-[0.62rem] font-bold tracking-[0.16em] text-[#98968d] uppercase">
                    Movimento selecionado
                </p>
                <div className="mt-4 flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center border border-[#ff4d3d]/35 bg-[#ff4d3d]/10 text-[#ff6a5c]">
                        <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="font-zouth-display text-lg leading-tight font-semibold tracking-[-0.025em] text-[#f6f4f0]">
                            {node.data.title}
                        </h2>
                        <p className="mt-1 truncate text-xs text-[#98968d]">
                            {node.kind === 'trigger'
                                ? 'Início do fluxo'
                                : node.kind === 'condition'
                                  ? 'Decisão do fluxo'
                                  : 'Próximo movimento'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {node.kind === 'trigger' && (
                    <div>
                        <label
                            htmlFor="automation-trigger"
                            className="text-sm font-semibold text-[#f6f4f0]"
                        >
                            Quando começar?
                        </label>
                        <p className="mt-2 text-xs leading-5 text-[#98968d]">
                            O fluxo entra em cena assim que este movimento
                            acontece no Chat.
                        </p>
                        <select
                            id="automation-trigger"
                            value={node.movement}
                            onChange={(event) => {
                                const movement = event.target
                                    .value as AutomationMovement;
                                const isReply = movement === 'client_replied';

                                onChange({
                                    ...node,
                                    movement,
                                    data: {
                                        ...node.data,
                                        title: isReply
                                            ? 'Cliente respondeu'
                                            : 'Mensagem recebida',
                                        summary: isReply
                                            ? 'Quando o cliente retoma a conversa'
                                            : 'Quando uma nova conversa chega',
                                    },
                                });
                            }}
                            className="mt-4 h-12 w-full border border-[#f6f4f0]/16 bg-[#18181f] px-3 text-sm text-[#f6f4f0] outline-none focus:border-[#ff4d3d]"
                        >
                            <option value="message_received">
                                Mensagem recebida
                            </option>
                            <option value="client_replied">
                                Cliente respondeu
                            </option>
                        </select>
                    </div>
                )}

                {node.movement === 'message_contains' && (
                    <div>
                        <h3 className="text-sm font-semibold text-[#f6f4f0]">
                            O que procurar?
                        </h3>
                        <p className="mt-2 text-xs leading-5 text-[#98968d]">
                            Verifica se a mensagem contém as palavras que você
                            considera um sinal de interesse.
                        </p>

                        <div className="mt-5 grid grid-cols-2 border border-[#f6f4f0]/14 p-1">
                            {(['any', 'all'] as const).map((match) => (
                                <button
                                    key={match}
                                    type="button"
                                    onClick={() => updateData({ match })}
                                    className={`min-h-10 px-2 text-xs font-bold transition-colors ${
                                        (node.data.match ?? 'any') === match
                                            ? 'bg-[#29282e] text-[#f6f4f0]'
                                            : 'text-[#98968d] hover:text-[#f6f4f0]'
                                    }`}
                                >
                                    {match === 'any'
                                        ? 'Qualquer palavra'
                                        : 'Todas as palavras'}
                                </button>
                            ))}
                        </div>

                        <div className="mt-4 flex min-h-20 flex-wrap content-start gap-2 border border-[#f6f4f0]/14 bg-[#18181f] p-3">
                            {(node.data.keywords ?? []).map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() =>
                                        updateData({
                                            keywords:
                                                node.data.keywords?.filter(
                                                    (candidate) =>
                                                        candidate !== item,
                                                ),
                                        })
                                    }
                                    className="inline-flex h-8 items-center gap-1.5 border border-[#f6f4f0]/14 px-1.5 text-[0.68rem] text-[#cac4ba] hover:border-[#ff4d3d]/60 hover:text-[#f6f4f0]"
                                >
                                    {item}
                                    <X className="size-3" />
                                </button>
                            ))}
                        </div>

                        <div className="mt-3 flex gap-2">
                            <input
                                type="text"
                                value={keyword}
                                onChange={(event) =>
                                    setKeyword(event.target.value)
                                }
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        addKeyword();
                                    }
                                }}
                                placeholder="Nova palavra"
                                className="h-11 min-w-0 flex-1 border border-[#f6f4f0]/14 bg-[#18181f] px-3 text-sm text-[#f6f4f0] outline-none placeholder:text-[#67645e] focus:border-[#ff4d3d]"
                            />
                            <button
                                type="button"
                                onClick={addKeyword}
                                className="flex size-11 shrink-0 items-center justify-center border border-[#f6f4f0]/14 text-[#cac4ba] hover:border-[#ff4d3d] hover:text-[#ff4d3d] focus-visible:outline-2 focus-visible:outline-[#ff4d3d]"
                                aria-label="Adicionar palavra"
                            >
                                <Plus className="size-4" />
                            </button>
                        </div>

                        <div className="mt-7 flex items-center justify-between gap-4 border-t border-[#f6f4f0]/12 pt-6">
                            <div>
                                <p className="text-sm text-[#f6f4f0]">
                                    Diferenciar maiúsculas
                                </p>
                                <p className="mt-1 text-xs leading-5 text-[#77746d]">
                                    Normalmente, “Preço” e “preço” significam a
                                    mesma coisa.
                                </p>
                            </div>
                            <Switch
                                checked={Boolean(node.data.case_sensitive)}
                                onCheckedChange={(case_sensitive) =>
                                    updateData({ case_sensitive })
                                }
                                aria-label="Diferenciar maiúsculas e minúsculas"
                            />
                        </div>
                    </div>
                )}

                {node.movement === 'send_funnel' && (
                    <div>
                        <label
                            htmlFor="automation-funnel"
                            className="text-sm font-semibold text-[#f6f4f0]"
                        >
                            Qual roteiro enviar?
                        </label>
                        <p className="mt-2 text-xs leading-5 text-[#98968d]">
                            Escolha um dos funis ativos para conduzir a próxima
                            conversa.
                        </p>
                        <select
                            id="automation-funnel"
                            value={node.data.funnel_id ?? ''}
                            onChange={(event) => {
                                const funnel = funnels.find(
                                    (candidate) =>
                                        candidate.id ===
                                        Number(event.target.value),
                                );
                                updateData({
                                    funnel_id: funnel?.id ?? null,
                                    summary: funnel
                                        ? `${funnel.name} · ${funnel.code}`
                                        : 'Escolha um roteiro comercial',
                                });
                            }}
                            className="mt-4 h-12 w-full border border-[#f6f4f0]/16 bg-[#18181f] px-3 text-sm text-[#f6f4f0] outline-none focus:border-[#ff4d3d]"
                        >
                            <option value="">Escolha um funil</option>
                            {funnels.map((funnel) => (
                                <option key={funnel.id} value={funnel.id}>
                                    {funnel.name} · {funnel.code}
                                </option>
                            ))}
                        </select>
                        {funnels.length === 0 && (
                            <p className="mt-3 text-xs leading-5 text-[#ff776b]">
                                Ative pelo menos um funil antes de usar este
                                movimento.
                            </p>
                        )}
                    </div>
                )}

                {node.movement === 'wait_reply' && (
                    <div>
                        <h3 className="text-sm font-semibold text-[#f6f4f0]">
                            Pausa inteligente
                        </h3>
                        <p className="mt-2 text-xs leading-5 text-[#98968d]">
                            Este caminho termina aqui e volta a observar o
                            cliente quando uma nova mensagem chegar.
                        </p>
                    </div>
                )}

                {node.kind !== 'trigger' && (
                    <button
                        type="button"
                        onClick={() => onDelete(node.id)}
                        className="mt-8 inline-flex items-center gap-2 text-xs font-bold text-[#98968d] hover:text-[#ff6a5c] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ff4d3d]"
                    >
                        <Trash2 className="size-4" />
                        Remover movimento
                    </button>
                )}
            </div>

            <div className="border-t border-[#f6f4f0]/12 p-5">
                <button
                    type="button"
                    onClick={onApply}
                    disabled={saving}
                    className="flex min-h-12 w-full items-center justify-center gap-3 bg-[#ff4d3d] px-5 text-sm font-bold text-[#18181f] transition-colors hover:bg-[#ff6a5c] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#ff4d3d] disabled:cursor-wait disabled:opacity-60"
                >
                    {saving && <LoaderCircle className="size-4 animate-spin" />}
                    Aplicar ao fluxo
                </button>
            </div>
        </aside>
    );
}
