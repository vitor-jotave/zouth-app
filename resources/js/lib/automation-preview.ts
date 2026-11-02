import type {
    AutomationDefinition,
    FunnelOption,
} from '@/pages/manufacturer/atendimento/automacoes/automation-types';

export function inspectAutomation(
    definition: AutomationDefinition,
    funnels: FunnelOption[],
): string[] {
    const issues: string[] = [];
    const triggers = definition.nodes.filter((node) => node.kind === 'trigger');
    if (triggers.length !== 1)
        issues.push('Inclua exatamente um início para o fluxo.');
    const ids = new Set(definition.nodes.map((node) => node.id));
    if (ids.size !== definition.nodes.length)
        issues.push('Há movimentos com identificadores repetidos.');
    definition.nodes.forEach((node) => {
        const expectedKind =
            node.movement === 'message_contains'
                ? 'condition'
                : ['message_received', 'client_replied'].includes(node.movement)
                  ? 'trigger'
                  : 'action';
        if (node.kind !== expectedKind)
            issues.push(`${node.data.title}: tipo de movimento incompatível.`);
        if (
            node.movement === 'send_funnel' &&
            !funnels.some((funnel) => funnel.id === node.data.funnel_id)
        )
            issues.push(`${node.data.title}: escolha um funil ativo.`);
        if (
            node.movement === 'message_contains' &&
            !node.data.keywords?.some((keyword) => keyword.trim())
        )
            issues.push(
                `${node.data.title}: inclua uma palavra para conferir a mensagem.`,
            );
        const outgoing = definition.edges.filter(
            (edge) => edge.from === node.id,
        );
        if (
            outgoing.some((edge) =>
                node.kind === 'condition'
                    ? !['sim', 'não'].includes(edge.branch ?? '')
                    : edge.branch !== null,
            )
        )
            issues.push(`${node.data.title}: confira a saída de cada ligação.`);
        if (
            new Set(
                outgoing.map((edge) =>
                    node.kind === 'condition' ? edge.branch : null,
                ),
            ).size !== outgoing.length
        )
            issues.push(
                `${node.data.title}: há mais de um destino para o mesmo caminho.`,
            );
    });
    if (
        definition.edges.some(
            (edge) => !ids.has(edge.from) || !ids.has(edge.to),
        )
    )
        issues.push('Uma ligação aponta para um movimento que não existe.');
    const visited = new Set<string>();
    const active = new Set<string>();
    const walk = (id: string): boolean => {
        if (active.has(id)) return true;
        if (visited.has(id)) return false;
        visited.add(id);
        active.add(id);
        const cycle = definition.edges
            .filter((edge) => edge.from === id)
            .some((edge) => walk(edge.to));
        active.delete(id);
        return cycle;
    };
    if (definition.nodes.some((node) => walk(node.id)))
        issues.push(
            'Há uma ligação circular. Remova o retorno antes de ativar.',
        );
    const reachable = new Set<string>();
    const visit = (id: string) => {
        if (reachable.has(id)) return;
        reachable.add(id);
        definition.edges
            .filter((edge) => edge.from === id)
            .forEach((edge) => visit(edge.to));
    };
    if (triggers.length === 1) {
        visit(triggers[0].id);
        if (definition.nodes.some((node) => !reachable.has(node.id)))
            issues.push('Há movimentos desconectados do início.');
    }
    return issues;
}

export function previewAutomation(
    definition: AutomationDefinition,
    message: string,
): Array<{ id: string; title: string; result: string }> {
    const steps: Array<{ id: string; title: string; result: string }> = [];
    const seen = new Set<string>();
    let node = definition.nodes.find((entry) => entry.kind === 'trigger');
    while (node && !seen.has(node.id) && steps.length < 80) {
        seen.add(node.id);
        let branch: 'sim' | 'não' | null = null;
        if (node.movement === 'message_contains') {
            const sensitive = node.data.case_sensitive;
            const normalize = (value: string) => {
                const ascii = value
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '');
                return sensitive ? ascii : ascii.toLowerCase();
            };
            const keywords = (node.data.keywords ?? []).filter(
                (keyword) => keyword !== '',
            );
            const matches = keywords.map((keyword) =>
                normalize(message).includes(normalize(keyword)),
            );
            const matched =
                message.trim() !== '' &&
                matches.length > 0 &&
                (node.data.match === 'all'
                    ? matches.every(Boolean)
                    : matches.some(Boolean));
            branch = matched ? 'sim' : 'não';
        }
        steps.push({
            id: node.id,
            title: node.data.title,
            result: branch
                ? `Condição: ${branch}`
                : node.movement === 'send_funnel'
                  ? 'Enviaria o funil escolhido'
                  : node.movement === 'wait_reply'
                    ? 'Aguardaria uma nova resposta'
                    : 'Início da conversa',
        });
        if (node.movement === 'wait_reply') break;
        const edge = definition.edges.find(
            (entry) =>
                entry.from === node!.id &&
                (branch === null || entry.branch === branch),
        );
        node = edge
            ? definition.nodes.find((entry) => entry.id === edge.to)
            : undefined;
    }
    return steps;
}
