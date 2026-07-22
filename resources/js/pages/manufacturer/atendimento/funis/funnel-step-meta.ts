import {
    Clock3,
    MessageSquareText,
    Mic2,
    PackageOpen,
    type LucideIcon,
} from 'lucide-react';

export type FunnelStepType = 'wait' | 'text' | 'audio' | 'product';

export interface FunnelStepPayload {
    audio_url?: string;
    seconds?: number;
    body?: string;
    media_path?: string;
    file_name?: string;
    mimetype?: string;
    product_id?: number;
    include_photo?: boolean;
    include_price?: boolean;
    include_description?: boolean;
    include_sku?: boolean;
}

export interface FunnelStepMeta {
    value: FunnelStepType;
    label: string;
    configurationTitle: string;
    icon: LucideIcon;
}

export const funnelStepTypes: FunnelStepMeta[] = [
    {
        value: 'text',
        label: 'Mensagem',
        configurationTitle: 'Configurar mensagem',
        icon: MessageSquareText,
    },
    {
        value: 'wait',
        label: 'Espera',
        configurationTitle: 'Configurar intervalo',
        icon: Clock3,
    },
    {
        value: 'audio',
        label: 'Áudio',
        configurationTitle: 'Configurar áudio',
        icon: Mic2,
    },
    {
        value: 'product',
        label: 'Produto',
        configurationTitle: 'Configurar produto',
        icon: PackageOpen,
    },
];

export function funnelStepMeta(type: FunnelStepType): FunnelStepMeta {
    return (
        funnelStepTypes.find((candidate) => candidate.value === type) ??
        funnelStepTypes[0]
    );
}

export function funnelStepSummary(
    type: FunnelStepType,
    payload: FunnelStepPayload,
    productName?: string,
): string {
    switch (type) {
        case 'wait':
            return `Aguardar ${payload.seconds ?? 1}s`;
        case 'text':
            return payload.body?.trim() || 'Mensagem ainda não escrita';
        case 'audio':
            return payload.file_name?.trim() || 'Áudio ainda não escolhido';
        case 'product':
            return (
                productName ||
                (payload.product_id
                    ? 'Produto selecionado'
                    : 'Produto ainda não escolhido')
            );
    }
}
