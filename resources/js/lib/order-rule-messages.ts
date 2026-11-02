import type { OrderRuleAction } from '@/lib/order-rules';

export function isAutomaticRuleMessage(
    message: string | null | undefined,
    mode?: 'auto' | 'custom' | null,
): boolean {
    if (mode) return mode === 'auto';
    return (
        !message?.trim() ||
        /^(Você liberou (?:[\d.,]+%|R\$ [\d.,]+) de desconto neste pedido\.|A seleção desta coleção liberou [\d.,]+% de desconto\.|O pedido mínimo é de R\$ 1\.500\. Adicione mais peças para continuar\.|Escolha ao menos 8 modelos diferentes para finalizar\.)$/.test(
            message.trim(),
        )
    );
}

export function automaticRuleMessage(action: OrderRuleAction): string {
    if (action.type === 'percentage_discount')
        return `Você liberou ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format((action.value ?? 0) / 100)}% de desconto neste pedido.`;
    if (action.type === 'fixed_discount')
        return `Você liberou R$ ${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format((action.value ?? 0) / 100)} de desconto neste pedido.`;
    return 'Este pedido ainda não atende às condições mínimas do fabricante.';
}
