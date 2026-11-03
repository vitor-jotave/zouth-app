// Curadoria manual: adicionar ou alterar entradas somente quando solicitado pelo usuário.
export const changelogKindLabels = {
    novidade: 'Novidade',
    melhoria: 'Melhoria',
    correção: 'Correção',
} as const;

type ChangelogRelease = {
    id: string;
    date: string;
    title: string;
    summary: string;
    updates: ReadonlyArray<{
        kind: keyof typeof changelogKindLabels;
        title: string;
        description: string;
    }>;
};

export const changelog = [
    {
        id: '2026-11-03-leitura-whatsapp',
        date: '2026-11-03',
        title: 'Leituras em dia no atendimento.',
        summary:
            'O contador de não lidas acompanha as leituras feitas no WhatsApp.',
        updates: [
            {
                kind: 'correção',
                title: 'Leituras do WhatsApp no chat',
                description:
                    'Quando o WhatsApp sincroniza uma leitura feita no celular, a mensagem recebida deixa de contar como não lida na Zouth. Mensagens novas continuam sinalizadas.',
            },
        ],
    },
    {
        id: '2026-11-02-editor-catalogo',
        date: '2026-11-02',
        title: 'Mais espaço para criar sua vitrine.',
        summary:
            'Personalização reorganizada, prévia fiel ao catálogo e mais segurança para ajustar e publicar a coleção.',
        updates: [
            {
                kind: 'melhoria',
                title: 'Cada ajuste no seu lugar',
                description:
                    'Estrutura reúne Capa, Coleções e Produtos. Configurações reúne Marca, Aparência e Publicar. Nome, logo, tamanho e alinhamento ficam em Marca, sem alterar o que você já configurou.',
            },
            {
                kind: 'melhoria',
                title: 'Mais espaço para editar',
                description:
                    'As ações de salvar, desfazer, refazer e ver o catálogo publicado ficam no rodapé. A barra lateral retrai ao entrar no editor e recupera seu estado anterior ao sair.',
            },
            {
                kind: 'correção',
                title: 'Prévia e catálogo com a mesma apresentação',
                description:
                    'A prévia usa a mesma apresentação do catálogo público, com enquadramento, fontes, imagens e textos coerentes no computador e no celular. O zoom e a área de edição receberam ajustes de estabilidade.',
            },
            {
                kind: 'novidade',
                title: 'Experimente como lojista',
                description:
                    'Teste a seleção de peças, as variações, o carrinho e o fechamento dentro da prévia, sem criar pedidos reais nem reservar estoque.',
            },
            {
                kind: 'melhoria',
                title: 'Publique suas mudanças com segurança',
                description:
                    'Logo, foto de campanha, fundo e demais ajustes são publicados juntos ao salvar. Substituições e remoções podem ser desfeitas antes da publicação; se algo falhar, a versão anterior é preservada.',
            },
            {
                kind: 'melhoria',
                title: 'Mais controle, menos retrabalho',
                description:
                    'Desfaça e refaça alterações. Restaurar a aparência preserva as decisões comerciais. Textos apagados não reaparecem, e a transparência da logo pode ser conferida sem impor um fundo ao catálogo.',
            },
            {
                kind: 'melhoria',
                title: 'Controles mais claros e acessíveis',
                description:
                    'Navegação simplificada, itens alinhados, controles de tamanho e recorte mais acessíveis e orientações de contraste sem limitar a liberdade de personalização.',
            },
        ],
    },
    {
        id: '2026-11-02-experiencia',
        date: '2026-11-02',
        title: 'Mais fluidez em cada etapa.',
        summary:
            'Uma rodada de melhorias para preparar a coleção, atender e acompanhar as vendas com mais tranquilidade.',
        updates: [
            {
                kind: 'melhoria',
                title: 'Seu preenchimento mais protegido',
                description:
                    'Os editores avisam antes de descartar alterações. Ao voltar e avançar pelo navegador, rascunhos de catálogo, produtos, combos, clientes, funis, mensagens rápidas, regras e notas podem ser recuperados na mesma aba.',
            },
            {
                kind: 'correção',
                title: 'Estoque preservado ao ajustar variações',
                description:
                    'Alternar cores, tamanhos e combinações durante a edição não apaga as quantidades, os preços ou os códigos já preenchidos.',
            },
            {
                kind: 'melhoria',
                title: 'A seleção do lojista continua no catálogo',
                description:
                    'O carrinho é recuperado ao retornar ao catálogo, com preços e disponibilidade conferidos. O resumo diferencia seleções e quantidade de peças, e o progresso dos benefícios ficou mais claro.',
            },
            {
                kind: 'melhoria',
                title: 'Automações com uma simulação mais clara',
                description:
                    'Confira os caminhos da conversa sem enviar mensagens reais. Configurações incompletas são apontadas antes da ativação, e o editor ganhou navegação mais confortável no celular e pelo teclado.',
            },
            {
                kind: 'melhoria',
                title: 'Personalização do catálogo mais prática no celular',
                description:
                    'Estrutura, ajustes e prévia têm acessos próprios, sem exigir longas rolagens para mudar de seção.',
            },
            {
                kind: 'correção',
                title: 'Foto de campanha e ajustes salvos juntos',
                description:
                    'A foto escolhida acompanha as demais configurações ao salvar o catálogo. Se houver um erro de preenchimento, a imagem anterior é preservada. A prévia da foto pendente também volta ao recuperar o rascunho na mesma aba.',
            },
            {
                kind: 'correção',
                title: 'Regras de pedido sem mensagens desencontradas',
                description:
                    'Mensagens automáticas acompanham o desconto configurado, sem substituir textos personalizados. A simulação considera produtos, categorias e composições reais da coleção.',
            },
            {
                kind: 'correção',
                title: 'Histórico de pedidos completo, mesmo ao voltar uma etapa',
                description:
                    'Cada mudança de status permanece registrada na ordem em que aconteceu. Repetições não apagam movimentos anteriores, e o status atual fica identificado.',
            },
            {
                kind: 'melhoria',
                title: 'Relatórios que ajudam a agir',
                description:
                    'Os períodos e as datas personalizadas permanecem coerentes. Atalhos levam à peça, ao combo, ao cliente e ao último pedido do período, preservando a aba e o período ao voltar.',
            },
            {
                kind: 'melhoria',
                title: 'Primeiros passos mais leves no celular',
                description:
                    'A prévia da marca pode ser recolhida durante o cadastro, dando mais espaço aos campos e às próximas ações, sem perder o preenchimento ao voltar uma etapa.',
            },
        ],
    },
] as const satisfies readonly ChangelogRelease[];

export function formatChangelogDate(date: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Sao_Paulo',
    }).format(new Date(`${date}T12:00:00-03:00`));
}
