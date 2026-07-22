export type AutomationNodeKind = 'trigger' | 'condition' | 'action';

export type AutomationMovement =
    | 'message_received'
    | 'client_replied'
    | 'message_contains'
    | 'send_funnel'
    | 'wait_reply';

export interface AutomationNodeData {
    title: string;
    summary?: string | null;
    keywords?: string[];
    match?: 'any' | 'all';
    case_sensitive?: boolean;
    funnel_id?: number | null;
}

export interface AutomationNode {
    id: string;
    kind: AutomationNodeKind;
    movement: AutomationMovement;
    position: {
        x: number;
        y: number;
    };
    data: AutomationNodeData;
}

export interface AutomationEdge {
    id: string;
    from: string;
    to: string;
    branch: 'sim' | 'não' | null;
}

export interface AutomationDefinition {
    nodes: AutomationNode[];
    edges: AutomationEdge[];
}

export interface AutomationSummary {
    id: number;
    name: string;
    is_active: boolean;
    updated_at: string | null;
}

export interface Automation extends AutomationSummary {
    definition: AutomationDefinition;
    last_activated_at: string | null;
}

export interface FunnelOption {
    id: number;
    name: string;
    code: string;
}

export interface MovementOption {
    movement: AutomationMovement;
    kind: AutomationNodeKind;
    title: string;
    summary: string;
}

export const movementGroups: Array<{
    label: string;
    tone: 'coral' | 'plum' | 'sand';
    options: MovementOption[];
}> = [
    {
        label: 'Quando acontece',
        tone: 'coral',
        options: [
            {
                movement: 'message_received',
                kind: 'trigger',
                title: 'Mensagem recebida',
                summary: 'Quando uma nova conversa chega',
            },
            {
                movement: 'client_replied',
                kind: 'trigger',
                title: 'Cliente respondeu',
                summary: 'Quando o cliente retoma a conversa',
            },
        ],
    },
    {
        label: 'Se',
        tone: 'plum',
        options: [
            {
                movement: 'message_contains',
                kind: 'condition',
                title: 'Conteúdo da mensagem',
                summary: 'Procura palavras que indicam intenção',
            },
        ],
    },
    {
        label: 'Faça',
        tone: 'sand',
        options: [
            {
                movement: 'send_funnel',
                kind: 'action',
                title: 'Enviar funil',
                summary: 'Inicia um roteiro comercial',
            },
            {
                movement: 'wait_reply',
                kind: 'action',
                title: 'Aguardar resposta',
                summary: 'Pausa este caminho até a próxima mensagem',
            },
        ],
    },
];
