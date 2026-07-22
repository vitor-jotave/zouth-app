# Zouth Design System — Design QA

## Fonte visual de verdade

- PDF: `/Users/joao/Pictures/Zouth/Zouth - Brand ID - Final.pdf`
- Assets oficiais: `/Users/joao/Pictures/Zouth/`
- Páginas renderizadas para inspeção: `/Users/joao/www/zouth-app/tmp/pdfs/zouth-final/`

## Implementação avaliada

- HTML: `/Users/joao/www/zouth-app/public/brand/zouth/design-system.html`
- Markdown: `/Users/joao/www/zouth-app/resources/brand/zouth/design-system.md`
- URL local: `http://zouth-app.test/brand/zouth/design-system.html`

## Viewports e estados

- Desktop: `1440 × 1000`, navegação, seções, downloads, busca, cópia de tokens e controle de motion.
- Mobile estreito: `documentElement.clientWidth` de `376 px`, usado no hero, fotografia, motion e encerramento.
- Mobile amplo: `documentElement.clientWidth` de `414 px`, usado na hierarquia de ações e campo.
- Nos dois estados mobile, não houve overflow horizontal de conteúdo.
- Movimento: estados ativo, pausado e retomado.
- Redução de movimento: regra `prefers-reduced-motion` presente.
- Fallback: conteúdo permanece visível sem a classe de inicialização JavaScript.

## Evidência de visão geral

- Desktop inicial: `tmp/design-qa/desktop-hero-final.png`
- Desktop final: `tmp/design-qa/desktop-closing-final.png`
- Mobile inicial: `tmp/design-qa/mobile-hero-final.png`
- Mobile final: `tmp/design-qa/mobile-closing-final.png`

## Evidência focal e comparação conjunta

Cada imagem abaixo reúne a fonte e a implementação no mesmo quadro de comparação.

- Conceito: `tmp/design-qa/comparison-hero.png`
- Logotipo e símbolo: `tmp/design-qa/comparison-brand.png`
- Paleta: `tmp/design-qa/comparison-color.png`
- Tipografia: `tmp/design-qa/comparison-type.png`
- Elementos gráficos: `tmp/design-qa/comparison-graphics.png`
- Fotografia: `tmp/design-qa/comparison-photo.png`
- Movimento: `tmp/design-qa/comparison-motion.png`
- Aplicações e componentes: `tmp/design-qa/comparison-applications.png`
- Encerramento: `tmp/design-qa/comparison-closing.png`
- Amostras tipográficas focais: `tmp/design-qa/desktop-type-samples-final.png`
- Hierarquia de ações: `tmp/design-qa/desktop-support-final.png`
- Motion mobile: `tmp/design-qa/mobile-motion-final.png`
- Hierarquia de ações mobile: `tmp/design-qa/mobile-support-final.png`

## Histórico de comparação

### Iteração 1

- P1: o espécime de Sora herdava Manrope.
- P1: as animações operacionais podiam ser confundidas com masters aprovados.
- P1: microtextos em coral não atendiam contraste AA em fundos claros.
- P2: a conciliação entre `70/20/10` e coral dominante estava marcada como regra aprovada.
- P2: o coral oficial usado na seção de fotografia não explicitava a divergência visual da página 9.
- P2: alguns alvos interativos eram menores que `44 × 44 px`.
- P2: o encerramento usava símbolo isolado em contexto institucional.
- P2: textos alternativos presumiam papéis profissionais.
- P2: CTAs e mensagens demonstrativas não tinham aviso global.
- P2: regras derivadas estavam misturadas com regras explicitamente aprovadas.

### Correções da iteração 1

- Sora e Manrope receberam famílias e pesos aprovados de forma explícita.
- Motion foi identificado como interpretação operacional, preservando os princípios aprovados.
- Microtextos funcionais passaram a usar carvão; o coral ficou em sinais não textuais ou sobre carvão.
- Regras derivadas, hipóteses e pendências receberam status próprio no Markdown e no HTML.
- O campo fotográfico passou a informar o uso provisório do coral oficial.
- Alvos interativos passaram a medir pelo menos `45 px` em cada eixo aplicável.
- O encerramento passou a usar o logotipo oficial completo.
- Alt texts passaram a descrever apenas o conteúdo visível.
- Os exemplos de copy e métricas receberam avisos explícitos.

### Iteração 2

- P2: especificações e avisos pequenos ainda estavam abaixo de `4.5:1`.
- P2: a ação verde mineral concorria visualmente com a ação coral.
- P2: a navegação mobile iniciava pelo fim da lista.
- P2: o botão de motion sobrepunha a nota operacional no mobile.

### Correções da iteração 2

- Textos de especificação e avisos passaram a carvão com `72%` de opacidade sobre fundos claros.
- A variante verde foi separada em um bloco contextual sem ação coral concorrente.
- A navegação mobile passou a iniciar à esquerda e manter rolagem horizontal acessível.
- O controle de motion ganhou fluxo próprio no mobile, sem sobreposição.

### Comparação final

- Nenhum achado acionável P0, P1 ou P2 permaneceu na implementação.
- Diferenças de coral da página 9, variantes para fundo coral, versões monocromáticas, vetores, grafismos master e fotografias em alta permanecem documentadas como pendências de assets, sem serem simuladas.

## Verificações programáticas e funcionais

- Validador estático: `PASS` para 15 referências locais, 12 IDs únicos, quatro masters oficiais e 30 declarações de peso tipográfico.
- JavaScript: dois blocos analisados sem erro de sintaxe.
- Browser: zero imagens quebradas e zero erros ou avisos no console.
- Browser: zero alvos interativos menores que `44 × 44 px` no desktop e no mobile.
- Browser: campo de busca recebeu texto e manteve foco.
- Browser: cópia de token atualizou clipboard, botão e região `aria-live`.
- Browser: motion alternou `aria-pressed`, pausou as animações e retomou o estado inicial.
- Laravel Pint: `pass`.

design-system result: passed

# Zouth Landing Page — Design QA

## Fonte visual de verdade

- Manual final: `/Users/joao/Pictures/Zouth/Zouth - Brand ID - Final.pdf`
- Sistema de marca validado: `/Users/joao/www/zouth-app/resources/brand/zouth/design-system.md`
- Copy de origem: `/Users/joao/Downloads/zouth-landing-page-copy.md`
- Masters oficiais usados sem alteração: logotipos Zouth claro e escuro em `public/brand/zouth/assets/`.

## Implementação avaliada

- Página: `/Users/joao/www/zouth-app/resources/js/pages/landing/index.tsx`
- Componentes exclusivos: `/Users/joao/www/zouth-app/resources/js/pages/landing/components/`
- Estilos exclusivos: `/Users/joao/www/zouth-app/resources/js/pages/landing/landing.css`
- URL local: `http://zouth-app.test/`
- A rota `/` carrega `landing/index`; nenhum componente visual do sistema interno foi sobrescrito.

## Viewports, estados e navegação

- Desktop: `1440 × 900`, incluindo hero, dor, benefícios, público e FAQ.
- Mobile: `390 × 844`, incluindo hero, benefícios, FAQ e menu aberto.
- Zero overflow horizontal nos dois viewports.
- Cabeçalho adapta logotipo, fundo e contraste ao atravessar superfícies claras e carvão.
- Links de âncora respeitam a altura do cabeçalho e chegam ao começo correto da seção.
- Menu mobile ocupa a área útil completa, mantém rolagem própria em telas baixas e bloqueia o conteúdo encoberto.
- O foco entra no primeiro item, circula dentro do menu, fecha com `Escape` e retorna ao acionador.
- FAQ alterna `aria-expanded` e exibe a resposta correspondente.
- O CTA de demonstração aparece no hero e no fechamento quando existe uma URL segura configurada; sem ela, a página mantém o caminho comercial principal.

## Evidências finais

- Hero desktop: `tmp/landing-qa/desktop-top-final.jpg`
- Dor desktop: `tmp/landing-qa/desktop-problem-final.jpg`
- Benefícios desktop: `tmp/landing-qa/desktop-benefits-grid-final.jpg`
- Público desktop: `tmp/landing-qa/desktop-audience-final.jpg`
- FAQ desktop: `tmp/landing-qa/desktop-faq-final.jpg`
- Hero mobile: `tmp/landing-qa/mobile-top-final.jpg`
- Benefícios mobile: `tmp/landing-qa/mobile-benefits-final.jpg`
- FAQ mobile: `tmp/landing-qa/mobile-faq-final.jpg`
- Menu mobile: `tmp/landing-qa/mobile-menu-final.jpg`

## Comparação conjunta com a identidade

Cada quadro reúne a fonte e a implementação na mesma imagem de comparação.

- Conceito e hierarquia: `tmp/landing-qa/comparison-concept.png`
- Proporção e uso da paleta: `tmp/landing-qa/comparison-palette.png`
- Direção fotográfica comercial: `tmp/landing-qa/comparison-photography.png`
- Aplicação responsiva e menu: `tmp/landing-qa/comparison-mobile.png`

## Histórico do loop de qualidade

### Iteração visual inicial

- A seção de benefícios usava coral, ameixa e verde mineral na mesma composição.
- Pesos tipográficos intermediários não correspondiam aos pesos oficiais da identidade.
- Índices de 12 px tinham contraste insuficiente em marfim e areia.
- O marquee era infinito e os reveals escondiam semanticamente conteúdo ainda não animado.
- A copy atribuía ao produto identificação de peças, lojistas e links exclusivos por representante sem sustentação na implementação atual.
- O menu mobile não restaurava nem continha o foco.

### Correções visuais e de conteúdo

- Benefícios passaram a usar coral, carvão e neutros, com alturas e pesos assimétricos no mobile.
- Tipografia foi normalizada para `300/400/500/600/700/800` conforme os papéis aprovados.
- Índices claros receberam neutro mais escuro; contextos carvão usam Pedra para manter contraste.
- A faixa de palavras passou de loop infinito para movimento sutil conduzido pelo scroll.
- Reveals mantêm o conteúdo semanticamente presente e animam apenas deslocamento.
- As promessas foram ajustadas para catálogo atualizado, visitas e origem das divulgações — exatamente o que a Zouth registra hoje.
- A especialização deixou de ser uma defesa verbal e passou a ser demonstrada pela cena comercial e pela narrativa fabricante → representante → lojista.

### Iteração funcional final

- O cabeçalho adaptativo inicialmente criava um novo contexto de posicionamento que reduzia o menu a altura zero.
- A superfície carvão foi mantida, mas sem o filtro responsável pelo conflito; o menu voltou a ocupar `768 px` úteis no viewport mobile de teste.
- O foco inicial foi sincronizado com a transição de abertura e validado no primeiro link.
- Conteúdo de fundo recebe `inert`, `aria-hidden` e remoção temporária da ordem de tabulação, com restauração integral ao fechar.
- Pequenos links receberam área interativa mínima de `44 px`; os botões de ação têm no mínimo `48 px`.

## Acessibilidade e movimento

- Um único `h1`, IDs sem duplicação, skip link focalizável e `main` preparado como destino.
- Imagens têm descrição literal; nenhuma imagem quebrada foi encontrada.
- Foco visível em coral, navegação por teclado e estados ARIA testados no navegador.
- `prefers-reduced-motion` remove animações e transições; o conteúdo permanece totalmente visível.
- A faixa em movimento é decorativa e não duplica informação essencial para tecnologia assistiva.

## Verificações programáticas

- TypeScript: `npm run types` — pass.
- ESLint: `npm run lint` — pass, zero warnings.
- Pest: `10` testes, `129` assertions — pass.
- Laravel Pint: pass.
- Vite: build de produção concluído com sucesso.
- Browser: nenhuma imagem quebrada, zero overflow horizontal, um `h1`, IDs únicos, canonical e Open Graph absolutos.
- Console: nenhum erro novo após os builds finais; o histórico acumulado conserva apenas um erro de preload anterior à correção de `ASSET_URL`.

## Resultado da comparação final

- A landing reproduz o território aprovado: base editorial clara, carvão estrutural, coral como interesse, tipografia Sora/Manrope, assimetria, respiro e fotografia em contexto comercial.
- Não há achado acionável P0, P1 ou P2 restante na implementação da landing.
- Capturas reais de clientes não foram incorporadas sem autorização; uma demonstração aprovada pode ser ligada por configuração e passa a aparecer automaticamente nos CTAs.

final result: passed

# Zouth — Onboarding comercial e teste grátis

## Fonte visual de verdade

- Direção desktop escolhida e refinada: `/Users/joao/.codex/generated_images/019f6cce-f0a4-78f1-b2ab-144bee426de5/exec-4510ecde-c649-4ea0-8dde-713bd2e42199.png`.
- Adaptação mobile aprovada: `/Users/joao/.codex/generated_images/019f6cce-f0a4-78f1-b2ab-144bee426de5/exec-8ff7375d-1320-4856-bede-a90a6754dac0.png`.
- Implementação desktop final: `tmp/onboarding-design/implementation-1440-step1-final.png`.
- Comparação conjunta desktop: `tmp/onboarding-design/comparison-1440-step1.jpg`.
- Implementação mobile final: `tmp/onboarding-design/implementation-390-step1-final.png`.
- Comparação conjunta mobile: `tmp/onboarding-design/comparison-390-step1.jpg`.

## Viewports e jornada auditada

- Desktop: `1440 × 1024`, primeira capa e etapa sobre circulação comercial.
- Mobile: `390 × 844`, etapas de marca, responsável, identidade, confirmação e conquista final.
- Jornada real percorrida no navegador: nome da marca, modelo comercial, criação de conta, identidade, confirmação de e-mail, escolha do primeiro próximo passo e saída para importação.
- Evidências adicionais: `implementation-1440-step2-final.png`, `implementation-390-step3-final.png`, `implementation-390-step4-final.png`, `implementation-390-verify-final.png` e `implementation-390-step5-final.png`.

## Histórico do loop de qualidade

### Iteração visual

- A primeira implementação deixava a fotografia ocupar todo o campo esquerdo sobre carvão e se afastava da capa editorial marfim escolhida.
- O campo visual foi reconstruído com composição de catálogo, imagem em coluna, título atravessando a fotografia, coral como ponto de interesse, linhas de corte e respiro equivalente ao mock.
- A entrada preserva o potencial da direção escolhida: linha desenhada, fotografia por máscara, plano coral, título em subida e formulário por último.
- No mobile, a capa vira abertura curta e o formulário mantém ritmo próprio sem competir com a imagem.

### Iteração funcional

- A confirmação da senha não estava sendo enviada junto à senha criada; o envio passou a manter a confirmação de forma transparente.
- Nome da marca e caminho comercial passaram a ser preservados também no servidor antes da conta existir, permitindo recarregar e retomar a etapa correta.
- A criação real confirmou teste de sete dias, proprietário principal, catálogo inicial, identidade e entrada na importação.
- A área mínima do logotipo e da ação “Voltar” foi elevada para `44 px`.

## Verificações finais

- Um `h1`, IDs únicos, nenhuma imagem quebrada e nenhum overflow horizontal — pass.
- `prefers-reduced-motion`, foco visível, labels reais e mensagens não dependentes apenas de cor — pass.
- CTAs da landing apontam para `/comece`; demonstração permanece secundária e o e-mail comercial apenas no rodapé — pass.
- Etapas, retomada, confirmação, conta pausada e catálogo temporariamente indisponível cobertos por testes e navegação real — pass.
- Comparação visual desktop e mobile sem achado acionável P0, P1 ou P2 — pass.

final result: passed

# Zouth App — Central de Relatórios

## Fonte visual de verdade

- Direção escolhida: `tmp/reports-design/01-reference-selected.png`.
- Implementação desktop: `tmp/reports-design/implementation-1440.jpg`.
- Comparação conjunta inspecionada no mesmo input: `tmp/reports-design/comparison-1440-final.jpg`.
- Tela: `resources/js/pages/manufacturer/reports/index.tsx`.
- URL local: `http://zouth-app.test/manufacturer/reports`.

## Viewport e estado

- Comparação principal normalizada em `1440 × 1024`, com dados reais da Acme Corporation no período de 30 dias.
- Responsividade validada em largura útil de `375px`: cinco segmentos em duas colunas, régua de indicadores empilhada e `scrollWidth` menor que o viewport.
- O período comercial usa `America/Sao_Paulo`, evitando que o relatório abra o dia seguinte durante a noite no Brasil.

## Histórico do loop

### Iteração 1

- A primeira implementação preservava a direção, mas alongava cabeçalho, indicadores e gráfico, empurrando a leitura de produtos para muito abaixo da primeira dobra.
- O recorte diário também encerrava em UTC e podia exibir uma data futura na operação brasileira.

### Iteração 2

- Título, régua, navegação e gráfico foram compactados para recuperar a densidade editorial do esboço escolhido.
- O ranking de peças voltou a aparecer na primeira dobra e o painel de leituras permanece visível ao lado do ritmo da coleção.
- As fronteiras dos períodos e os agrupamentos diários passaram a considerar o fuso comercial brasileiro, preservando consultas em UTC no banco.

## Auditoria das superfícies obrigatórias

- Tipografia: Sora semibold nos displays e Manrope no corpo, com ponto final coral e pesos consistentes com o restante do sistema.
- Espaçamento e layout: composição contínua, divisores finos e nenhuma grade de cartões genéricos; a hierarquia segue panorama, ritmo, leitura e profundidade.
- Cores: marfim, carvão, coral, verde mineral e cinzas quentes da identidade, sem gradientes ou sombras SaaS.
- Dados: faturamento líquido, pedidos, ticket, peças, descontos, estoque, recompra, praças, representantes, origem do catálogo e operação usam registros existentes; conversão é nomeada como estimativa e explica seu cálculo.
- Integridade: pedidos cancelados não entram em receita; dados de outro fabricante são isolados; margem e interesse por produto não são inventados porque ainda não existem custo nem eventos de produto.
- Responsividade: sem overflow horizontal; navegação, métricas e rankings reorganizam sem reduzir áreas de toque.
- Acessibilidade: gráfico com tabela textual equivalente, filtros rotulados, foco visível, estados descritos por texto e botões semânticos.

## Verificações finais

- Navegação Panorama → Coleção e retorno — pass.
- Alternância Faturamento → Pedidos no gráfico — pass.
- Filtro 30 → 7 dias com URL e conteúdo atualizados — pass.
- Console do navegador após interações — sem erros ou avisos.
- Pest: `29` testes e `147` assertions — pass.
- TypeScript: pass.
- ESLint dos arquivos alterados: pass.
- Prettier: pass.
- Laravel Pint: pass.
- Build de produção: pass.

final result: passed

# Zouth App — Rede de representantes

## Fonte visual de verdade

- Direção 1 selecionada pelo usuário: `tmp/representatives-design/01-direction-approved.png`.
- Implementação real em desktop: `tmp/representatives-design/02-final-desktop.jpg`.
- Comparação conjunta inspecionada: `tmp/representatives-design/03-comparison.jpg`.
- Identidade aplicada a partir das superfícies aprovadas de Clientes, Categorias e Catálogo: marfim, carvão, coral de foco, Sora e Manrope, bordas retas e ponto final coral.

## Implementação avaliada

- Área do fabricante: `resources/js/pages/manufacturer/representatives/index.tsx`.
- Vitrine do representante: `resources/js/pages/rep/manufacturers/index.tsx`.
- Aceite co-branded: `resources/js/pages/representative-invitations/show.tsx`.
- E-mail: `resources/views/emails/representatives/invitation.blade.php`.
- URL local: `http://zouth-app.test/manufacturer/representatives`.

## Viewports e estados

- Desktop comparado com a direção aprovada, cobrindo cabeçalho, métricas, solicitações, foco lateral, busca e navegação por segmentos.
- Mobile validado em `390 × 844`, incluindo lista, navegação horizontal, painel de detalhes em tela cheia e convite largo convertido em tela cheia.
- Estados auditados: solicitação selecionada, convites pendentes, perfil mobile, conta autenticada com e-mail diferente e ausência de assinatura ativa.
- Página pública do convite conferida com dados reais de QA, vínculo válido e identidade do fabricante como protagonista.

## Histórico do loop

### Iteração 1 — fidelidade da direção escolhida

- A implementação preservou a lista editorial contínua, a faixa-resumo, os quatro segmentos e o painel lateral de foco da opção 1.
- A sidebar e a topbar existentes foram mantidas, sem criar uma navegação paralela para a feature.
- A direção ganhou estados reais de solicitação, vínculo, convite, histórico, busca e ações comerciais.

### Iteração 2 — refinamento mobile e verdade do plano

- P2: o detalhe mobile mostrava dois controles de fechamento sobrepostos, um do painel e outro da `Sheet` compartilhada.
- P1: uma assinatura inativa podia ser apresentada como plano ilimitado porque `null` misturava ausência de plano ativo e limite ilimitado.
- O painel mobile passou a usar apenas o fechamento semântico da `Sheet`.
- O contrato de capacidade agora diferencia assinatura ativa de limite ilimitado; o convite fica indisponível e explica o próximo passo quando não há assinatura ativa.

## E-mail e jornada de aceite

- O fluxo real do Laravel enfileirou o mailable com assunto, destinatário, token descartável e validade de sete dias.
- Um envio de QA chegou a `joaocool92@gmail.com` com assunto exclusivo, hierarquia editorial, marfim, carvão, coral, mensagem pessoal, benefícios, CTA e alternativa textual do link.
- O Gmail preservou layout, estilos inline, CTA e conteúdo. O transporte auxiliar usado apenas para o envio de QA removeu a imagem `data:` do logotipo; o mailable da aplicação mantém o asset oficial incorporado por CID no envio real.
- A página de aceite abriu pelo link recebido e apresentou corretamente o estado de segurança para uma conta autenticada com e-mail diferente.

## Verificações finais

- Nenhum achado acionável P0, P1 ou P2 permaneceu na aplicação.
- Cabeçalho, métricas, segmentos, busca, seleção, convite e painel mobile — pass.
- Isolamento multi-tenant, vagas reservadas, decisões, reenvio, cancelamento, aceite e tokens — pass.
- E-mail recebido, conteúdo, URL, fallback em texto e renderização estrutural — pass.
- TypeScript: pass.
- ESLint dos arquivos alterados: pass.
- Prettier: pass.
- Build de produção: pass.
- Laravel Pint: pass.

final result: passed

# Zouth App — Carrinho do catálogo público

## Fontes de referência

- Navegação e carrinho lateral em experiências premiadas: https://www.awwwards.com/inspiration/sidebar-menus-navigation-cart-the-mystery-shack
- Cart drawer para moda com leitura comercial e edição direta: https://dribbble.com/shots/25906215-Good-Store-Cart-Drawer-Redesign
- Contexto de compra B2B no atacado: https://www.sparklayer.io/features/b2b-shopping-lists-quick-ordering/

## Fonte visual de verdade

- Estado anterior: `tmp/cart-sidebar-redesign/01-before.png`.
- Esboço gerado e auditado: `tmp/cart-sidebar-redesign/02-reference.png`.
- Implementação desktop final: `tmp/cart-sidebar-redesign/07-desktop-final.png`.
- Implementação mobile com conteúdo rolado: `tmp/cart-sidebar-redesign/06-mobile-scrolled.png`.
- Comparação completa no mesmo quadro: `tmp/cart-sidebar-redesign/09-comparison.png`.
- Comparação focal dos drawers: `tmp/cart-sidebar-redesign/10-drawer-comparison.png`.

## Viewports e estado

- Desktop útil: `1309 × 931`, com drawer de `544px`, uma composição de seis peças e duas regras comerciais ainda não atingidas.
- Mobile útil: `354 × 767`, drawer em tela inteira, cabeçalho e resumo financeiro fixos e região comercial com rolagem própria.
- Estado avaliado: combo Aconchego Essencial, pedido abaixo dos limites, próximo benefício em 11% e subtotal de R$ 229,90.

## Histórico do loop

### Iteração do esboço

- P1: o esboço usava ícones de confirmação em condições ainda pendentes.
- P1: um botão principal visualmente bloqueado encerraria a jornada sem orientar a próxima ação.

### Correções incorporadas

- Condições pendentes usam círculo aberto, texto explícito e valores restantes; nenhuma leitura depende apenas de cor.
- O botão principal permanece acionável, fecha o drawer e leva o lojista de volta à coleção com a seleção preservada.
- O item deixou de ser uma linha apertada e passou a apresentar fotografia, SKU, preço, quantidade de peças, modelos e composição expansível.
- Limites e vantagem seguinte viraram uma leitura comercial contínua, com progresso, subtotal, desconto quando aplicável e total estimado.
- O resumo financeiro foi separado do conteúdo rolável e permanece disponível sem esconder a edição da seleção.
- Quantidade, remoção, composição, fechamento e retorno à coleção usam controles nomeados e foco visível.

## Auditoria das superfícies obrigatórias

- Tipografia: hierarquia editorial preservada com Sora/Manrope, display semibold e ponto final coral.
- Cores: marfim, carvão, areia e coral; a sobreposição escura mantém o catálogo visível sem competir com o pedido.
- Espaçamento: drawer amplo no desktop e tela inteira no mobile, divisores finos, cantos mínimos e nenhuma grade de cards CRUD.
- Conteúdo: linguagem de atacado orientada ao lojista — composição, peças, modelos, limites e vantagem seguinte.
- Responsividade: zero overflow horizontal; metadados secundários recolhem no mobile e o conteúdo comercial permanece alcançável.
- Acessibilidade: zero botões sem nome, nenhuma imagem quebrada, estados com texto além da cor e controles de quantidade com limites corretos.

## Verificações finais

- Comparação visual conjunta — hierarquia, densidade, cor, fotografia, estrutura fixa e comportamento responsivo: pass.
- Abrir e fechar o carrinho preservando a seleção: pass.
- Aumentar e reduzir quantidade, abrir e fechar composição: pass.
- Browser: zero imagens quebradas, zero overflow horizontal e zero erros ou avisos no console.
- Pest: `25` testes e `127` assertions — pass.
- TypeScript: pass.
- ESLint dos arquivos alterados: pass.
- Prettier: pass.
- Vite: build de produção concluído; somente os dois avisos preexistentes de resolução das fontes oficiais permaneceram.
- Nenhum achado acionável P0, P1 ou P2 permaneceu.

final result: passed

# Zouth App — Regras de pedido

## Fonte visual de verdade

- Direção escolhida: opção 1, em `/Users/joao/.codex/generated_images/019f6cce-f0a4-78f1-b2ab-144bee426de5/exec-1e16e12d-658b-4451-b2f0-92a87fe07375.png`.
- Referência interna do produto: `tmp/variations-redesign/qa-desktop-first.png`.
- Implementação desktop final: `tmp/order-rules-redesign/implementation-desktop-final.png`.
- Implementação mobile final: `tmp/order-rules-redesign/implementation-mobile-final.png`.
- Editor mobile aberto: `tmp/order-rules-redesign/editor-mobile-final.png`.
- Regras no carrinho público: `tmp/order-rules-redesign/public-cart-rules.png`.
- Comparação conjunta inspecionada: `tmp/order-rules-redesign/comparison-final.png`.

## Viewports e estado

- Desktop: `1440 × 1024`, largura útil de `1426px`, sidebar expandida, quatro regras e desconto por valor selecionado.
- Mobile: `390 × 844`, largura útil de `375px`, zero overflow horizontal e editor lateral ocupando exatamente todo o viewport.
- Dados de validação: pedido mínimo, variedade mínima, desconto por valor e desconto por volume, criados pelo fluxo real da interface no fabricante local.

## Histórico do loop

### Iteração 1

- P1: a simulação multiplicava o subtotal informado pela quantidade da primeira peça.
- P1: limites já atendidos ainda repetiam a mensagem de bloqueio; vantagens pendentes repetiam a mensagem de desconto liberado.
- P2: a barra nativa de progresso aparecia verde no navegador e não refletia o coral da Zouth.
- P2: no mobile, switch e menu consumiam a largura da frase e provocavam quebras excessivas.

### Correções

- O cenário sintético passou a preservar simultaneamente subtotal, peças e modelos sem multiplicar preço.
- Limites distinguem “violado” de “atendido”; benefícios distinguem “pendente” de “liberado”, sempre com mensagem coerente.
- A régua semântica de progresso recebeu aparência compartilhada e cor controlada por token — coral no sistema e cor do fabricante no catálogo.
- No mobile, as ações descem para a faixa inferior da regra, deixando a frase comercial com largura útil e mantendo alvos de toque.
- A linguagem foi refinada para frases naturais: “Se o valor do pedido não atingir…” e “Se a seleção não reunir…”.

## Fluxos validados no navegador

- Criação pelas quatro entradas rápidas — pass.
- Seleção de regra e simulação viva — pass.
- Editor avançado com segunda condição e alternância E/OU — pass; alterações de teste foram canceladas sem persistir.
- Simulação de R$ 2.000 liberando 5%, com desconto de R$ 100 e total de R$ 1.900 — pass.
- Carrinho público abaixo dos limites, com duas mensagens de bloqueio, progresso para o próximo benefício e fechamento desabilitado — pass.
- Editor mobile em tela inteira, com `x = 0`, largura `390px` e borda direita em `390px` — pass.

## Verificações finais

- Comparação lado a lado: hierarquia editorial, carvão, marfim, coral, Sora/Manrope, cantos mínimos e sidebar existente preservados — pass.
- Nenhum achado acionável P0, P1 ou P2 permaneceu.
- Console em uma aba limpa, após abrir e fechar o editor — zero erros e zero avisos.
- Pest completo: `545` testes e `2803` assertions — pass.
- TypeScript — pass.
- ESLint dos arquivos alterados — pass.
- Prettier — pass.
- Laravel Pint — pass.
- Vite — build de produção concluído; apenas os avisos preexistentes de resolução das fontes oficiais permaneceram.

final result: passed

# Zouth App — Listagem de Automações

## Fonte visual de verdade

- Referência da listagem de Funis: `tmp/automations-listing/01-funnels-reference.png`.
- Primeira passagem da listagem: `tmp/automations-listing/02-listing-first-pass.png`.
- Estado final: `tmp/automations-listing/03-listing-final.png`.
- Comparação conjunta inspecionada: `tmp/automations-listing/04-comparison.png`.

## Viewport e estado

- Validação em `1680 × 969`, na conta autenticada do fabricante e com duas automações existentes em rascunho.
- A referência e a implementação foram capturadas no mesmo navegador e viewport.

## Histórico do loop

### Iteração 1

- P1: o item Automações abria diretamente o canvas, sem oferecer visão geral, contexto de estado ou escolha do fluxo.
- A arquitetura foi separada em listagem e editor: `/automacoes` apresenta os fluxos e `/automacoes/{automation}/edit` abre o canvas.

### Iteração 2

- A listagem recebeu a mesma hierarquia editorial de Funis, preservando a identidade dark da frente de atendimento.
- Cada automação ganhou uma jornada visual compacta de nós, status, gatilho, quantidade de etapas e acesso direto ao fluxo.
- A criação acontece em um modal curto; depois de salvar o rascunho, o usuário é levado ao canvas da automação criada.
- O editor ganhou retorno explícito para a listagem.

## Auditoria das superfícies obrigatórias

- Tipografia: Sora semibold no grande display e Manrope nos textos operacionais, com ponto final coral.
- Espaçamento e layout: hero, resumo e ritmo vertical alinhados à listagem de Funis; cartões largos evitam tabela e mantêm leitura rápida.
- Cores e tokens: carvão, preto, branco quente e coral do sistema; estados usam texto e ícone além da cor.
- Conteúdo e ícones: textos em português; ícones Lucide consistentes; nenhum asset raster adicional foi necessário.
- Interações: criação, cancelamento do modal, abertura do fluxo e retorno à listagem foram percorridos no navegador.
- Responsividade: a composição troca para uma coluna, preserva a jornada dos nós e mantém as ações acessíveis em telas menores.

## Verificações finais

- Nenhum achado acionável P0, P1 ou P2 permaneceu na comparação visual.
- Pest: `61` testes e `302` assertions — pass.
- TypeScript: pass.
- ESLint dos arquivos alterados: pass.
- Laravel Pint: pass.
- `git diff --check`: pass.

final result: passed

# Zouth App — Automações do Atendimento

## Fonte visual de verdade

- Referências de construção visual: `tmp/automations-redesign/01-reference-dribbble.png`, `02-reference-workflow-dark.png` e `03-reference-customerio-branches.png`.
- Esboço gerado e aprovado antes da implementação: `tmp/automations-redesign/04-automation-concept.png`.
- Implementação final no produto: `tmp/automations-redesign/09-final.png`.
- Comparação conjunta inspecionada: `tmp/automations-redesign/10-final-comparison.png`.

## Decisão de produto

- O editor node-based foi mantido porque o fluxo comercial fica mais fácil de compreender como uma sequência visual do que como uma lista de regras.
- Para não transformar a tela em uma ferramenta técnica, toda a construção usa três verbos: “Quando acontece”, “Se” e “Faça”.
- A primeira versão trabalha apenas com movimentos reais: mensagem recebida, cliente respondeu, conteúdo da mensagem, enviar funil e aguardar resposta.

## Histórico do loop

### Iteração 1

- P1: o ponto coral do título ficou separado do nome por causa da largura fixa do campo.
- P1: a altura mínima do quadro forçava uma rolagem externa e cortava o movimento inferior em viewports mais baixos.
- P2: barras nativas de rolagem disputavam atenção com o canvas.
- P2: resumos longos escapavam visualmente dos nós.

### Iteração 2

- O título passou a acompanhar a largura real do nome e manteve o ponto coral junto à palavra.
- Quadro, biblioteca e inspetor passaram a ocupar exatamente a altura disponível, com rolagem interna silenciosa.
- Os movimentos foram reposicionados e os resumos receberam limite visual de duas linhas.
- O inspetor ficou mais compacto e manteve a ação “Aplicar ao fluxo” sempre disponível.

## Verificações finais

- A tela segue o dark mode de Atendimento, Sora semibold nos displays, Manrope no uso contínuo, coral nas ações e cantos de `2px`.
- A navegação lateral recebeu “Automações” e preserva o estado ativo coral da Zouth.
- Testar fluxo, editar palavras, criar rascunho e persistir a composição — pass.
- O motor real reconhece mensagens por palavras, respeita fabricante e inicia apenas funis ativos pertencentes à mesma conta.
- Segurança entre fabricantes, repetição segura de webhook e fluxo sem correspondência — pass.
- Pest: `60` testes e `284` assertions — pass.
- TypeScript, ESLint, Prettier, Laravel Pint e `git diff --check` — pass.

final result: passed

# Zouth App — Canais de atendimento

## Fonte visual de verdade

- Tela anterior: `tmp/channels-redesign/01-current.png`.
- Linguagem aprovada de Atendimento: `tmp/channels-redesign/05-zouth-funnels.png`.
- Esboço gerado e aprovado na autoauditoria: `tmp/channels-redesign/06-channels-concept.png`.
- Implementação final: `tmp/channels-redesign/07-channels-implementation.png`.
- Comparação conjunta inspecionada: `tmp/channels-redesign/08-concept-vs-implementation.png`.

## Direção aplicada

- “Canais” funciona como a central de presença comercial da marca, sem linguagem de API, integração ou instância.
- Um único canal ocupa a hierarquia principal; estado, identidade, número e ações formam uma linha editorial, não um cartão genérico.
- O dark mode de Chat e Funis foi preservado com carvão, marfim, coral, verde mineral, Sora e Manrope.
- O verde aparece somente como sinal de disponibilidade; o coral concentra seleção e ação principal.

## Estados e interação

- Canal ativo: foto real do WhatsApp, nome, número, status, acesso ao Chat, verificação de conexão e desconexão.
- Aguardando conexão: QR Code protagonista, instruções em três passos e renovação do código.
- Sem canal: convite direto para conectar o número, sem expor identificadores técnicos ao fabricante.
- A antiga engrenagem foi removida da caixa de entrada; “Canais” passou a ser um destino próprio no menu lateral de Atendimento.
- O pulso do canal usa somente dados reais: quantidade de conversas e última movimentação registrada.

## Auditoria visual

- Hierarquia e fidelidade: o título, a linha do canal, as ações e o pulso mantêm o mesmo ritmo do esboço, com adaptação à densidade real da aplicação.
- Tipografia: display em semibold, ponto final coral e textos operacionais em pesos regulares ou bold apenas nos rótulos compactos.
- Layout: divisores finos, cantos de `2px`, avatar circular e ausência de grade de integrações, tabela ou formulário técnico.
- Responsividade: as áreas passam de linha editorial para fluxo empilhado; ações quebram sem perder ordem ou largura de toque.
- Acessibilidade: títulos semânticos, botões nomeados, estados descritos por texto além da cor e foco coral visível.
- Nenhum achado acionável P0, P1 ou P2 permaneceu após a comparação conjunta.

## Verificações finais

- Navegação pelo item “Canais” — pass.
- Chat carregado sem o botão “Configurar atendimento” — pass.
- Tela conectada com as ações “Abrir Chat” e “Verificar conexão” — pass.
- Console atual de Canais — sem erros novos; os erros de HMR registrados anteriormente não se repetiram após a recarga final.
- Pest: `40` testes e `166` assertions — pass.
- TypeScript: pass.
- ESLint dos arquivos alterados: pass.
- Prettier: pass.
- Laravel Pint: pass.

final result: passed

# Zouth App — Reações no Chat

## Fonte visual de verdade

- Referência enviada pelo usuário: `/var/folders/2j/nmb22s415dlf24fp4d5s3fn00000gn/T/TemporaryItems/NSIRD_screencaptureui_nF9Wlz/Screenshot 2026-07-21 at 01.16.09.png`.
- Direção: cápsula branca compacta, seis reações imediatas e acesso discreto às opções adicionais.
- Comparação conjunta inspecionada: `tmp/chat-reactions/06-comparison.png`.

## Implementação avaliada

- Context menu reutilizável: `resources/js/components/ui/context-menu.tsx`.
- Reações e feedback visual: `resources/js/pages/manufacturer/atendimento/components/message-reaction-menu.tsx`.
- Integração na conversa: `resources/js/pages/manufacturer/atendimento/components/atendimento-workspace.tsx`.
- Captura do menu: `tmp/chat-reactions/02-menu-scaled.png`.
- Captura da reação aplicada: `tmp/chat-reactions/05-final.png`.
- URL local: `http://zouth-app.test/manufacturer/atendimento?conversation=3`.

## Viewport e estado

- Desktop em `1280 × 720`, conversa real aberta, menu acionado sobre uma mensagem com mídia.
- Reação aplicada e sincronizada no fluxo real; o coração permaneceu visível sobre a própria mensagem após o fechamento do menu.

## Histórico do loop

### Iteração 1

- P2: a primeira versão estava aproximadamente 30% maior do que a escala desejada.
- P1: a reação precisava aparecer na mensagem e oferecer remoção direta, não apenas existir no menu.

### Iteração 2

- A cápsula, os emojis, o espaçamento e o botão adicional foram reduzidos em aproximadamente 30%.
- A atualização passou a ser otimista: a reação aparece imediatamente na mensagem enquanto a sincronização acontece.
- Clicar na própria reação remove; escolher outro emoji substitui a reação atual.
- O botão adicional abre uma segunda cápsula compacta, sem transformar a seleção simples em painel ou drawer.

## Verificações finais

- Aplicar reação rápida — pass.
- Remover clicando na reação da mensagem — pass.
- Trocar de `👍` para `❤️` — pass.
- Abrir opções adicionais pelo botão `+` — pass.
- Receber e remover reações pelo webhook sem criar mensagens vazias — coberto por teste.
- Isolamento entre fabricantes e validação das reações permitidas — cobertos por teste.
- Pest: `38` testes e `148` assertions — pass.
- TypeScript: pass.
- ESLint dos arquivos da entrega: pass.
- Prettier: pass.
- Laravel Pint: pass.

final result: passed

# Zouth App — Áudio, imagem e figurinha no Chat

## Verdade visual e implementação avaliada

- Falha recebida pelo usuário: `/var/folders/2j/nmb22s415dlf24fp4d5s3fn00000gn/T/TemporaryItems/NSIRD_screencaptureui_ihYQzT/Screenshot 2026-07-21 at 00.42.22.png`.
- Referência aprovada para mensagem de voz: `/Users/joao/Desktop/Screenshot 2026-07-21 at 00.21.33.png`.
- Entrada de mídia: `app/Services/WhatsappIncomingMediaService.php` e `app/Http/Controllers/EvolutionWebhookController.php`.
- Entrega autenticada: `app/Http/Controllers/Manufacturer/WhatsappChatController.php` e `routes/web.php`.
- Experiência: `resources/js/pages/manufacturer/atendimento/components/voice-message-preview.tsx`, `resources/js/pages/manufacturer/atendimento/components/atendimento-workspace.tsx` e `resources/js/pages/manufacturer/atendimento/index.tsx`.
- Antes: `tmp/chat-media/01-before.png`.
- Áudios finais: `tmp/chat-media/08-proxy-audio.png`.
- Imagem final: `tmp/chat-media/02-after.png`.
- Figurinhas finais: `tmp/chat-media/11-stickers-final.png`.
- Comparação conjunta de áudio, falha e resultado: `tmp/chat-media/10-comparison.png`.

## Viewport e estado real

- Validação principal em `1280 × 720`; validação responsiva das figurinhas em aproximadamente `616 × 856`.
- Conversa real `3`, com dois áudios recebidos de 7 e 6 segundos, uma imagem JPEG de `1200 × 1600` e duas figurinhas WebP reais de `512 × 512`, uma delas animada.
- As mídias antigas foram recuperadas da Evolution e persistidas novamente com seu tipo correto.

## Histórico do loop

### Iteração 1

- P1: o webhook guardava somente texto; áudio, imagem e figurinha chegavam ao banco sem conteúdo visual reproduzível.
- P1: a primeira versão do player usava a URL pública do R2; o áudio tocava, mas a onda não podia ser analisada pelo canvas por causa da origem cruzada.
- P2: a figurinha era classificada como imagem, herdando o balão e a dimensão editorial de uma fotografia.

### Iteração 2

- A mídia recebida passou a ser baixada no webhook, armazenada no disco configurado e servida por rota autenticada do próprio fabricante.
- O áudio ganhou player modular com onda real, play/pause, progresso e avatar do contato.
- A imagem preserva a proporção completa, sem crop, e pode ser aberta no tamanho original.
- `stickerMessage` passou a ser um tipo distinto: imagem WebP de no máximo `176px`, sem fundo, borda ou padding de balão. Medição final no mobile: `160 × 160px`, fundo `transparent` e borda `0px`.
- Mensagens ainda não recuperadas mostram um estado explícito, nunca um quadrado vazio.

### Iteração 3 — estabilidade do histórico

- P1: o polling substituía a lista inteira a cada cinco segundos e o efeito de mensagens executava `scrollIntoView` mesmo sem novidade, puxando o usuário ao final.
- O Chat agora ignora respostas idênticas, mantém a posição de quem está lendo o histórico e só acompanha o fim ao entrar na conversa, enviar conteúdo ou receber novidade quando já está próximo da última mensagem.
- Verificação programática: histórico posicionado no topo, aguardado um ciclo completo de polling (`6,2s`) e diferença final de rolagem `0px`.

## Verificações finais

- Figurinhas reais: duas renderizadas, proporção preservada, uma estática e uma animada, ambas sem frame de mensagem.
- Inbox: resumo final atualizado para `Figurinha`.
- Pest: `47` testes e `208` assertions — pass.
- TypeScript: pass.
- ESLint dos arquivos de atendimento alterados: pass.
- Prettier: pass.
- Laravel Pint: pass.
- `git diff --check`: pass.

final result: passed

# Zouth App — Prévia de mensagem de voz nos funis

## Fonte visual de verdade

- Referência enviada pelo usuário: `/Users/joao/Desktop/Screenshot 2026-07-21 at 00.21.33.png`.
- Direção: reproduzir a leitura visual de uma mensagem de voz recebida no WhatsApp — play, forma de onda real, progresso, duração, horário, foto do número conectado e selo de microfone — dentro do dark mode da Zouth.
- Comparação conjunta inspecionada no mesmo input: `tmp/funis-audio-preview/06-reference-vs-implementation.png`.

## Implementação avaliada

- Tela: `resources/js/pages/manufacturer/atendimento/funis/edit.tsx`.
- Componente reutilizável: `resources/js/pages/manufacturer/atendimento/components/voice-message-preview.tsx`.
- URL local: `http://zouth-app.test/manufacturer/atendimento/funis/1/edit`.
- Captura anterior: `tmp/funis-audio-preview/01-before.png`.
- Captura final: `tmp/funis-audio-preview/05-after-neutral.png`.
- A forma de onda é calculada a partir do próprio arquivo de áudio e desenhada em canvas; não é uma sequência decorativa fixa.

## Viewport e estado

- Implementação: viewport de `616 × 856`, terceiro passo do funil selecionado, áudio existente de 10 segundos e perfil real do número conectado.
- Estado validado: repouso, reprodução ativa, pausa, avanço do tempo e troca imediata da fonte ao selecionar um novo arquivo.
- A mensagem permanece clara sobre a superfície escura do editor, preservando a aparência luminosa do balão que o lojista recebe no WhatsApp.

## Histórico do loop

### Iteração 1

- P1: a prévia anterior era um cartão genérico de anexo, sem relação visual com a mensagem de voz entregue ao lojista.
- P1: não havia forma de onda, duração, progresso, horário, foto ou estado de reprodução.

### Correções e evidência posterior

- O áudio salvo passou a ser servido por uma rota autenticada e limitada ao funil da fabricante; novos arquivos utilizam uma URL local temporária para prévia imediata.
- A forma de onda usa a amplitude do áudio real, com modulação, trecho já reproduzido em verde e playhead circular.
- Play, pause e busca pela forma de onda controlam o mesmo elemento de áudio e atualizam o tempo em tempo real.
- A foto e o nome são herdados do número conectado; o fallback usa as iniciais apenas quando a API não disponibiliza imagem.
- A comparação lado a lado confirmou equivalência de hierarquia, proporção, iconografia e leitura entre a referência e a implementação.

## Auditoria das superfícies obrigatórias

- Tipografia: Manrope com pesos regulares e médios, adequada à interface compacta de uma mensagem de voz.
- Espaçamento e layout: balão horizontal compacto, controles em uma linha, duração e horário alinhados abaixo da forma de onda e avatar ancorado à direita.
- Cores e tokens: branco quente no balão, carvão no play, cinza claro na onda e verde restrito a progresso e microfone.
- Imagem: foto circular do número conectado com `object-cover`; fallback sem inventar pessoa ou asset genérico.
- Conteúdo e ícones: nenhum nome de arquivo aparece para o cliente; a prévia comunica exatamente o formato de mensagem de voz.
- Acessibilidade: play/pause e busca na onda possuem nomes acessíveis, teclado e estado semântico; duração permanece legível sem depender de cor.

## Verificações finais

- Nenhum achado acionável P0, P1 ou P2 permaneceu.
- Áudio salvo de `0:10` — carregamento, play, pause, avanço do tempo e forma de onda real: pass.
- Foto do número conectado e selo de microfone: pass.
- Console após recarga final: sem erros novos.
- Pest direcionado: `13` testes e `82` assertions — pass.
- TypeScript: pass.
- ESLint dos arquivos alterados: pass.
- Prettier: pass.
- Laravel Pint: pass.

final result: passed

# Zouth App — Funis de atendimento

## Fonte visual de verdade

- Tela anterior: `tmp/funis-redesign/01-current-funnels.png`, `tmp/funis-redesign/02-current-create-dialog.png` e `tmp/funis-redesign/03-current-editor.png`.
- Esboço gerado e aprovado na autoauditoria: `tmp/funis-redesign/04-concept-roteiro-vivo.png`.
- Linguagem de produto: dark mode da experiência de Chat já aprovada, com tokens atuais da Zouth em carvão, marfim, coral e verde mineral.
- Referências de interação: construtores visuais de jornada do Customer.io e explorações de workflow dark no Dribbble.

## Implementação avaliada

- Biblioteca: `resources/js/pages/manufacturer/atendimento/funis/index.tsx`.
- Editor visual: `resources/js/pages/manufacturer/atendimento/funis/edit.tsx`.
- Metadados compartilhados dos movimentos: `resources/js/pages/manufacturer/atendimento/funis/funnel-step-meta.ts`.
- URL local: `http://zouth-app.test/manufacturer/atendimento/funis/1/edit`.
- Biblioteca final: `tmp/funis-redesign/09-implementation-index-final.png`.
- Criação final: `tmp/funis-redesign/10-create-dialog-final.png`.
- Editor final: `tmp/funis-redesign/08-implementation-editor-final.png`.
- Comparação conjunta inspecionada no mesmo input: `tmp/funis-redesign/11-concept-vs-implementation.png`.

## Histórico do loop

### Iteração 1

- P1: a biblioteca anterior era uma tabela CRUD e escondia a sequência real de cada funil.
- P1: o editor anterior empilhava formulários sem construir um modelo mental de jornada.
- P2: a ordem era controlada por número e uma ação separada, sem manipulação direta.
- P2: a criação pedia dados genéricos antes de mostrar ao usuário o primeiro movimento comercial.
- P2: a top bar clara quebrava a continuidade visual da área de Atendimento.

### Correções e evidência posterior

- A biblioteca virou um repertório de roteiros vivos: nome, código, disponibilidade e sequência aparecem no mesmo eixo, sem tabela.
- O editor passou a organizar a tarefa em três planos: movimentos disponíveis, jornada ordenável e configuração contextual do passo selecionado.
- Mensagem, espera, áudio e produto receberam linguagem, ícone e prévia próprios; nenhum tipo de passo inexistente foi inventado.
- Os passos e os próprios funis podem ser reordenados por arraste ou teclado com DnD Kit.
- A criação começa pela abertura da conversa e leva o usuário diretamente ao editor visual.
- Toda rota de Atendimento agora mantém a top bar em dark mode, preservando a sala comercial aprovada no Chat.
- O título editorial tem ponto final coral, um único `h1` e foco navegável para abrir os dados do funil.

## Auditoria das superfícies obrigatórias

- Tipografia: Sora conduz nomes, títulos e tipos de movimento; Manrope sustenta instruções e configuração.
- Espaçamento e layout: três regiões com rolagem independente, divisores finos, cantos de `2px` e densidade controlada em `1280 × 720`.
- Cores e tokens: carvão estrutura a área; coral indica ação e passo ativo; verde mineral fica restrito ao estado disponível no Chat.
- Conteúdo e ícones: textos integralmente em português e ícones Lucide coerentes com as quatro ações existentes.
- Responsividade: sem overflow horizontal no viewport validado; em telas menores, as regiões se tornam sequenciais sem perder a ordem da tarefa.
- Acessibilidade: um `h1`, nenhum botão sem nome acessível, foco visível e ordenação também operável por teclado.

## Verificações finais

- Biblioteca, abertura do diálogo de criação, navegação ao editor, seleção de dados e passos, configuração de produto e reordenação por teclado — pass.
- Console após a recarga final — sem novos erros.
- Pest: `12` testes e `63` assertions — pass.
- TypeScript: pass.
- ESLint dos arquivos alterados: pass.
- Prettier: pass.
- Laravel Pint: pass.
- Nenhum achado acionável P0, P1 ou P2 permaneceu.

final result: passed


# Zouth App — Assinatura

## Fonte visual de verdade

- Tela anterior: `/private/tmp/zouth-billing-before.png`.
- Esboço gerado e aprovado na autoauditoria: `tmp/design-references/billing-redesign.png`.
- Comparação no mesmo input: `tmp/design-qa/billing/comparison.png`.

## Implementação avaliada

- Tela: `resources/js/pages/manufacturer/billing/index.tsx`.
- URL local: `http://zouth-app.test/manufacturer/billing`.
- Desktop: `tmp/design-qa/billing/desktop.png`.
- Mobile: `tmp/design-qa/billing/mobile.png`.
- Confirmação de troca: `tmp/design-qa/billing/change-plan-dialog.png`.

## Viewport e estado

- Desktop: viewport solicitado de `1440 × 1024`; captura útil de `1425 × 1013` após o chrome interno do navegador.
- Mobile: `390 × 844`, sem corte ou overflow horizontal visível.
- Estado local: assinatura em teste, com três dias restantes, mas sem plano sincronizado entre a assinatura legada e os planos ativos. A tela mostra intencionalmente `Plano em definição` e explica quando o fôlego ficará disponível.
- O esboço usa Intermediário com consumo preenchido para validar o estado completo; essa diferença é de dados, não de composição.

## Histórico do loop

### Iteração 1

- P2: o primeiro passe repetia o estado da assinatura no cabeçalho e no bloco principal.
- P2: o bloco principal estava alto demais e empurrava toda a comparação de planos para fora do primeiro enquadramento.
- P2: o mock sugeria dois atalhos distintos para notas e cartão, embora o produto tenha um único portal de cobrança.

### Correções e evidência posterior

- O estado ficou concentrado junto ao plano, onde ajuda a decisão sem duplicação.
- Escala do título do plano, respiros, altura mínima e abertura da comparação foram ajustados; a régua de planos agora começa no primeiro enquadramento desktop.
- Forma de pagamento, faturas e notas foram reunidas em uma única ação coerente com o portal real.
- Troca e encerramento ganharam diálogos próprios; cancelar deixou de competir com o valor do plano e exige confirmação explícita.
- A tela passou a reconhecer o plano pela assinatura ativa enquanto o webhook ainda sincroniza `current_plan_id`, evitando um estado intermediário incoerente quando o preço Stripe é válido.

## Auditoria das superfícies obrigatórias

- Tipografia: Sora em títulos, planos, preços e dados; Manrope em apoio e explicações. Escala e pesos seguem o sistema autenticado.
- Espaçamento e layout: composição aberta, assimétrica, com divisores finos, sem sombras, gradientes ou conjunto de cartões arredondados.
- Cores e tokens: marfim e carvão estruturam; coral marca decisão; verde mineral aparece somente na leitura de capacidade.
- Imagens e assets: a tela não precisa de fotografia ou ilustração. Logo do shell e ícones existentes foram preservados; nenhum placeholder ou desenho artesanal foi adicionado.
- Conteúdo: a linguagem fala de coleção, ritmo, fôlego e espaço para crescer, sem expor termos técnicos da cobrança.
- Responsividade: leitura empilhada no mobile, ações ocupam a largura útil e a comparação vira uma sequência editorial.
- Acessibilidade: progresso tem semântica e valores ARIA, diálogos recebem foco, ações têm nomes claros e status nunca depende apenas de cor.

## Verificações finais

- Nenhum achado acionável P0, P1 ou P2 permaneceu.
- Abertura e fechamento da confirmação de troca — pass.
- Abertura e saída segura do encerramento — pass; nenhuma ação destrutiva ou externa foi enviada durante a validação.
- Pest: `64` testes e `158` assertions — pass.
- TypeScript: pass.
- ESLint do arquivo reformulado: pass.
- Prettier: pass.
- Laravel Pint: pass.

final result: passed


# Zouth App — Carteira comercial de clientes

## Fonte visual de verdade

- Captura da tela anterior: `tmp/customers-design-audit/01-current-customers.png`.
- Esboço aprovado pela auditoria interna: `tmp/customers-design-audit/02-customers-portfolio-reference.png`.
- O esboço foi gerado a partir da tela real e da tela de Pedidos já aprovada, usando a identidade oficial da Zouth como limite visual.

## Implementação avaliada

- Tela: `resources/js/pages/manufacturer/customers/index.tsx`.
- URL local: `http://zouth-app.test/manufacturer/customers`.
- Captura superior final: `tmp/customers-design-audit/08-customers-implementation-top-final.png`.
- Captura da carteira final: `tmp/customers-design-audit/09-customers-implementation-ledger-final.png`.
- Comparação no mesmo input: `tmp/customers-design-audit/10-reference-vs-final.png`.

## Viewport e estado

- Navegador: `1280 × 720`, breakpoint desktop, carteira completa e três lojistas reais.
- Estado principal: segmento Todos, busca vazia, métricas calculadas e painel Atenção agora visível.
- Estado adicional: segmento Atenção com um resultado, menu de ações aberto e diálogo de edição carregado com os dados do lojista.

## Evidência conjunta e focal

- A comparação reúne o esboço de referência à esquerda e duas capturas complementares da implementação à direita: topo e carteira.
- A composição preserva o mesmo eixo: apresentação editorial, métrica aberta, busca e segmentos, ledger de relações e foco comercial lateral.
- A captura inferior funciona como recorte focal porque torna legíveis nomes, localizações, estados da relação, recência, frequência incorporada ao valor, ações e o painel de atenção.

## Histórico do loop

### Iteração 1

- P2: no primeiro passe, o painel Atenção agora aparecia somente acima de `1536 px`, removendo uma região importante da referência no viewport de validação.
- P2: frequência e valor ocupavam colunas separadas; com o painel lateral ativo, a carteira perderia largura e legibilidade.

### Correções e evidência posterior

- O painel de atenção passou a aparecer no breakpoint `xl`, no mesmo campo visual da carteira.
- Frequência foi incorporada como contexto abaixo do valor movimentado; a informação permanece disponível e o ledger ganha mais respiro.
- A captura `09-customers-implementation-ledger-final.png` confirma três linhas legíveis, coluna lateral completa, divisores alinhados e ausência de overflow horizontal.
- A comparação `10-reference-vs-final.png` mostra o painel, a hierarquia e o ritmo final depois dessas correções.

## Auditoria das superfícies obrigatórias

- Tipografia: Sora sustenta display, métricas, nomes e valores; Manrope mantém descrições e apoio. Pesos, tracking e escala repetem os componentes aprovados em Pedidos.
- Espaçamento e layout: superfície marfim aberta, divisores finos, sem sombras e sem agrupamento em cards genéricos. A carteira continua como elemento dominante.
- Cores e tokens: carvão, marfim, areia, pedra, coral e verde mineral seguem a paleta Zouth; coral sinaliza ação e retomada, mineral sinaliza recorrência.
- Imagens e assets: a tela não pede fotografia ou ilustração; logotipo e ícones existentes foram preservados, sem SVG artesanal, placeholder ou CSS art.
- Conteúdo: a linguagem fala de lojista, recompra, relação e movimento comercial; não expõe termos técnicos nem promete automação inexistente.
- Ícones e affordances: a família Lucide já usada no sistema foi mantida; busca, segmentos, CTA, perfil, menu de ações e edição têm alvos semânticos e nomes acessíveis.
- Responsividade: não há overflow em `1280 px`; abaixo de `xl`, o painel lateral sai do eixo principal e as linhas viram blocos empilhados. A captura mobile ficou como refinamento P3 não bloqueante.

## Verificações finais

- Nenhum achado acionável P0, P1 ou P2 permaneceu.
- Segmento Atenção: pass.
- Menu de ações e abertura da edição: pass.
- Busca com atualização adiada e limpeza: coberta pela implementação e sem erro de tipos.
- Console do navegador: nenhum erro; somente mensagens de conexão do Vite e sugestão do React DevTools.
- Layout: `clientWidth` e `scrollWidth` iguais, zero imagens quebradas e um único `h1`.
- Pest: `11` testes e `55` assertions — pass.
- TypeScript: pass.
- ESLint: pass.
- Prettier: pass.

final result: passed

# Zouth App — Pedido interno

## Fonte visual de verdade

- Identidade validada: `resources/brand/zouth/design-system.md`.
- Tela anterior capturada: `tmp/order-detail-design-audit/01-current-order-detail.jpg`.
- Esboço gerado e aprovado internamente: `/Users/joao/.codex/generated_images/019f6cce-f0a4-78f1-b2ab-144bee426de5/exec-f76003a7-de81-4b4b-9f56-823bfc5fa709.png`.
- Pedido real usado na validação: `#0005`, com duas linhas, combo, histórico e dados completos de entrega.

## Implementação avaliada

- Tela: `resources/js/pages/manufacturer/orders/show.tsx`.
- Dados visuais dos itens: `app/Http/Resources/OrderItemResource.php`.
- Carregamento do pedido: `app/Http/Controllers/Manufacturer/OrderController.php`.
- URL local: `http://zouth-app.test/manufacturer/orders/5`.

## Evidência conjunta e focal

- Comparação entre esboço e implementação: `tmp/order-detail-design-audit/09-reference-vs-implementation.jpg`.
- Implementação com shell recolhido: `tmp/order-detail-design-audit/04-order-detail-implementation-collapsed.jpg`.
- Cabeçalho e próximo movimento no viewport estreito: `tmp/order-detail-design-audit/05-order-detail-natural.jpg`.
- Seleção comprada e imagens reais: `tmp/order-detail-design-audit/06-selection-mobile.jpg`.
- Caderno interno em estado editado: `tmp/order-detail-design-audit/07-notebook-mobile.jpg`.

## Histórico do loop

### Auditoria da experiência anterior

- P1: a ação de status aparecia como uma barra genérica separada do contexto do pedido.
- P1: produtos eram comprimidos em tabela, reduzindo nome, variações e composição do combo a células.
- P1: cliente, endereço, representante, notas e acompanhamento formavam uma sequência de cards de mesmo peso.
- P2: o histórico registrava eventos, mas não comunicava visualmente a progressão do trabalho.
- P2: cancelamento ficava ao lado dos avanços sem confirmação proporcional ao impacto no estoque.

### Correções de arquitetura e design

- O pedido passou a ser uma ficha editorial de operação, com lojista como título, situação atual e próximo movimento no primeiro quadro.
- Valor, peças, linhas e etapa formam um trilho aberto e comparável; nenhuma métrica depende de uma tabela.
- A seleção comprada usa faixas editoriais com miniaturas reais otimizadas, escolhas, quantidade, valor unitário e subtotal.
- Combos preservam sua composição como lista hierárquica dentro da própria linha, sem abrir uma tela secundária.
- Lojista, contato, documento, endereço, observação e acompanhamento compartilham um único dossiê contextual.
- Notas internas viraram um caderno operacional com contagem, descarte e salvamento condicionado a alterações reais.
- O histórico ganhou linha de continuidade e distingue passos concluídos do estado atual.
- Cancelamento exige confirmação explícita e explica a devolução do estoque antes de executar a transição.

## Auditoria final

- Nenhum achado acionável P0, P1 ou P2 permaneceu.
- A implementação preserva a sidebar aprovada e reutiliza cabeçalho, trilho de métricas, rótulos de status, botões, diálogo e textarea compartilhados.
- Marfim, carvão, areia, coral, verde mineral, Sora/Manrope, divisores finos, cantos mínimos e ausência de sombras decorativas seguem o sistema Zouth.
- Ações têm leitura operacional clara; links de telefone, e-mail, cliente e acompanhamento mantêm semântica e foco visível.
- Cabeçalho, seleção e caderno foram inspecionados no navegador; imagens carregaram com miniaturas reais e sem reserva de espaço fictícia quando um produto não tem mídia.
- Edição e descarte da nota foram exercitados sem persistir dados; o diálogo de cancelamento abriu e fechou sem alterar o pedido.

## Verificações programáticas

- Pest: `36` testes e `239` assertions — pass.
- TypeScript: pass.
- ESLint do arquivo alterado: pass, zero warnings.
- Prettier do arquivo alterado: pass.
- Laravel Pint: pass.
- `git diff --check`: pass.

final result: passed

# Zouth App — Fluxo de pedidos do fabricante

## Fonte visual de verdade

- Tela anterior capturada antes da reformulação: `tmp/orders-design-audit/01-current-orders.jpg`.
- Esboço visual selecionado após pesquisa e geração: `tmp/orders-design-audit/02-orders-kanban-reference.png`.
- Direção aprovada internamente: fluxo Kanban como leitura principal, visão em lista como alternativa operacional e linguagem visual Zouth sem aparência de planilha.

## Implementação avaliada

- Tela: `resources/js/pages/manufacturer/orders/index.tsx`.
- URL local: `http://zouth-app.test/manufacturer/orders?view=board`.
- Captura desktop final: `tmp/orders-design-audit/12-orders-final-desktop.jpg`.
- Captura mobile: `tmp/orders-design-audit/11-orders-final-reset.jpg`.
- Comparação conjunta final: `tmp/orders-design-audit/13-reference-vs-final.jpg`.

## Viewports e estado

- Desktop: `1425 × 1024`, fluxo completo com cinco etapas, dados locais reais e três etapas ocupadas.
- Mobile: `375 × 844`, cabeçalho, indicadores e controles do fluxo; o Kanban permanece em uma região de rolagem horizontal própria.
- Estado: sem busca e sem filtro de status, visão Fluxo selecionada, nenhuma transição foi executada sobre os dados locais durante a auditoria visual.

## Evidência conjunta e focal

- A comparação final coloca o esboço e a implementação no mesmo input, normalizados para a mesma proporção e largura.
- A implementação preserva a composição do esboço: cabeçalho editorial, quatro leituras comerciais, busca, alternância Fluxo/Lista, filtro e cinco etapas simultâneas.
- Os cartões implementados ganharam uma hierarquia mais completa para uso real — contato, valor, volume, data e ação operacional — sem transformar o quadro em tabela.
- O coral sinaliza entrada e atenção, o mineral encerra o fluxo, e carvão, ameixa e cinzas organizam as etapas intermediárias.

## Histórico do loop

### Iteração 1

- P1: a primeira implementação usava largura mínima de `1260 px` no quadro e cortava parte da etapa Entregues em um desktop de `1440 px`.
- P1: o conjunto de indicadores ocupava altura demais e empurrava a operação para baixo em relação ao esboço.
- P1: o valor comercial extrapolava sua célula no breakpoint mobile.
- P2: rótulos de avanço reproduziam o estado de destino, como “Confirmado”, em vez de instruções claras.
- P2: as etapas apareciam no singular e “Em preparação” ainda não preservava a acentuação correta.

### Correções e evidência posterior

- O quadro passou a usar `1080 px` como largura mínima no desktop, mantendo as cinco etapas visíveis e preservando rolagem horizontal apenas em telas estreitas.
- Os indicadores foram compactados para duas linhas e o valor comercial recebeu escala responsiva própria.
- Medição mobile: página `375/375 px` sem overflow; região do Kanban `375 px` de viewport e `1120 px` de conteúdo rolável.
- Medição do valor comercial no mobile: `114 px` dentro de uma célula de `167,5 px`, sem sobreposição com o indicador vizinho.
- Ações passaram a usar verbos explícitos: “Confirmar pedido”, “Iniciar preparo”, “Marcar como enviado” e “Marcar como entregue”.
- Colunas passaram a usar títulos plurais e acentuação correta.

## Auditoria das superfícies obrigatórias

- Tipografia: Sora e Manrope, hierarquia editorial e números tabulares preservados; títulos e dados mantêm a assinatura visual da Zouth.
- Espaçamento e layout: superfícies abertas, divisores finos, cartões sem sombras decorativas e densidade suficiente para operar o fluxo sem aparência de dashboard genérico.
- Cores e tokens: marfim, carvão, coral, mineral, ameixa, areia e cinzas usados de acordo com o design system.
- Conteúdo e ícones: família Lucide existente, textos em linguagem comercial e estados vazios úteis; nenhum ícone ou ilustração improvisada foi criado.
- Interação: busca com debounce, filtro em drawer, visão em lista sem tabela, links de detalhe, ações de avanço e drag and drop restritos às transições permitidas pelo pedido.
- Responsividade e acessibilidade: página sem overflow horizontal, Kanban com rolagem própria, alvos mínimos de `44 px`, nomes acessíveis e alternativa por botão para quem não usa arrastar.

## Verificações finais

- Nenhum achado acionável P0, P1 ou P2 permaneceu.
- Busca por cliente e restauração da busca — pass.
- Alternância Fluxo/Lista — pass; a lista usa registros editoriais, sem `<table>`.
- Abertura do filtro e disponibilidade de pedidos cancelados — pass.
- Console atual: somente mensagens de debug do Vite/HMR; nenhum erro novo da tela.
- Pest: `36` testes e `237` assertions — pass.
- TypeScript — pass.
- ESLint dos arquivos alterados — pass.
- Prettier — pass.
- Laravel Pint — pass.
- `git diff --check` do escopo — pass.

final result: passed

# Zouth App — Prova editorial do catálogo público

## Fonte visual de verdade

- Direção aprovada: `tmp/catalog-premium-audit/05-premium-reference-mock.png`.
- Fotografia de campanha: `tmp/catalog-premium-audit/kattana-verao-2026-cover.png`.
- Pesquisa de referência: lookbooks de atacado e moda infantil da Bobo Choses, RaspberryPlum e Marisol Play, além de exemplos editoriais da Catalog Machine e Behance.
- Critério de produto: a abertura precisa criar desejo como um PDF diagramado; informações de atacado entram depois, sem transformar a vitrine em uma tabela.

## Implementação avaliada

- Editor: `resources/js/pages/manufacturer/catalog-settings/index.tsx`.
- Prévia: `resources/js/components/catalog-preview.tsx`.
- Catálogo público: `resources/js/pages/public/catalog.tsx`.
- Upload e derivados: `app/Http/Requests/CatalogSettingCoverRequest.php` e `app/Services/CatalogCoverImageStorage.php`.
- URL pública: `http://zouth-app.test/catalog/pvFEsBVch57Cw6c6FtqaiJ6DCTOTtK4Bul7Tn64aio8oE3JA`.

## Viewports, estado e evidências

- Desktop padrão, `1265 × 712`: `tmp/catalog-premium-audit/32-public-final-desktop.png`.
- Comparação de capa, fonte e implementação no mesmo quadro em viewport configurado para `841 × 700`: `tmp/catalog-premium-audit/31-qa-final-cover-comparison.png`.
- Comparação focal da coleção e dos combos no mesmo quadro: `tmp/catalog-premium-audit/30-qa-final-collection-comparison.png`.
- Coleção em três colunas: `tmp/catalog-premium-audit/26-public-final-collection-3col-841x700.png`.
- Mobile, viewport `390 × 844`: `tmp/catalog-premium-audit/28-public-final-mobile-corrected.png` e `tmp/catalog-premium-audit/29-public-final-mobile-collection.png`.
- Estado real salvo: Kattana, Verão 2026, capa com fotografia, Fraunces em títulos, Manrope em texto, apresentação editorial, estoque e etiquetas ocultos, preço e SKU preservados.

## Histórico do loop de comparação

### Iteração 1

- P2: o contador de produtos aparecia como badge mesmo desligado no editor.
- P2: o convite da capa ainda parecia um botão de software, enquanto a referência usava uma ação editorial sublinhada.
- P2: em `841 px`, texto e imagem empilhavam; a referência mantinha uma abertura dividida.
- P2: a fotografia cortava uma das crianças nos enquadramentos estreitos.

### Correções da iteração 1

- O estado ausente do contador passou a seguir o padrão desligado do editor.
- O CTA recebeu linha coral, seta discreta e peso tipográfico editorial.
- A abertura dividida passou a iniciar em `md`, com altura de página e marca integrada ao painel de texto.
- A capa ficou full-bleed dentro da base editorial e o ponto focal horizontal foi ajustado pelo próprio editor para `80%`.

### Iteração 2

- P2: o título quebrava em três linhas no viewport de comparação, diferente das duas linhas da referência.
- P2: combos apareciam em duas colunas em `841 px`, reduzindo a sensação de spread diagramado.
- P2: no mobile, marca e linha de abertura disputavam a mesma faixa vertical.

### Correções da iteração 2

- Escala, corpo, cor do eyebrow e CTA foram refinados; o texto da coleção foi encurtado pelo editor.
- Combos e produtos editoriais passaram a três colunas em tablet e desktop; no mobile, a vitrine editorial usa uma coluna para preservar fotografia e leitura.
- A capa mobile ganhou altura e respiro próprios, mantendo marca, linha de abertura, título, apresentação, ação e fotografia sem sobreposição.
- Imagens de produto agora tentam a versão original quando um thumbnail não carrega, evitando uma lacuna visual no catálogo enviado ao lojista.

## Auditoria final por superfície

- Tipografia: Fraunces cria o gesto editorial; Manrope mantém filtros, preços, SKUs e variações legíveis. Pesos, quebras e hierarquia seguem a referência.
- Ritmo e layout: capa em página dividida, respiro amplo, divisores finos e grids de três colunas no tablet/desktop; uma coluna no mobile.
- Cores: marfim domina, carvão estrutura e o coral aparece apenas em linha de abertura e convite.
- Imagem: fotografia de campanha otimizada, foco responsivo em `80/50`, mosaicos de combos nítidos e fallback para imagem original.
- Copy: a coleção abre com uma ideia e só depois apresenta capítulos, looks e peças; nenhum termo técnico aparece para o lojista.
- Interação: CTA navega para as peças; filtros abrem e fecham no mobile; preço, SKU, variações, consulta e adição continuam funcionais.
- Responsividade e acessibilidade: um `h1`, zero overflow horizontal no desktop e mobile, controles nomeados e nenhuma imagem carregada quebrada na captura final.

## Verificações finais

- Browser: upload real da capa, salvamento, ponto focal, CTA, abertura/fechamento de filtros e renderização pública verificados.
- Armazenamento: a foto original de aproximadamente `2,1 MB` virou master `2000 × 1333` de `260.060 bytes` e thumbnail `640 × 427` de `35.116 bytes`.
- Browser: recarga final sem novo erro de execução; os erros anteriores eram transitórios do HMR durante a regeneração do Wayfinder.
- Pest: `43` testes e `328` assertions — pass.
- TypeScript: `npm run types` — pass.
- ESLint dos arquivos do catálogo — pass, zero warnings.
- Prettier — pass.
- Laravel Pint — pass.
- `git diff --check` — pass.

## Resultado

- Nenhum achado acionável P0, P1 ou P2 permaneceu.
- A vitrine final sustenta o nível de um lookbook premium e acrescenta, sem quebrar o clima editorial, as ações que um lojista precisa para consultar e comprar.

final result: passed

# Zouth App — Categorias de produtos

## Fonte visual de verdade

- Identidade validada: `/Users/joao/www/zouth-app/resources/brand/zouth/design-system.md`.
- Tela anterior auditada: `tmp/categories-redesign/01-current-desktop.png`.
- Esboço gerado e aprovado internamente: `tmp/categories-redesign/02-concept-approved.png`.
- Produtos e shell já aprovados: `tmp/products-redesign/qa/desktop-final.png`.

## Pesquisa e direção

- Referências pesquisadas: Dribbble “Style at Scale: Category Management Dashboard”, Behance “FUSE Fashion E-commerce & Admin Dashboard” e Dribbble “Luxury Fashion Editorial UI”.
- Direção escolhida: “mapa da coleção” — categorias deixam de ser registros de uma tabela e passam a funcionar como capítulos que orientam a descoberta das peças.
- Quantidade e participação aparecem no próprio ritmo da lista; a categoria selecionada recebe contexto e ações sem abrir outra página.

## Implementação avaliada

- Tela: `resources/js/pages/manufacturer/categories/index.tsx`.
- Componentes compartilhados reutilizados: `AppPageHeader`, `ResourceToolbar`, `EmptyState`, `Pagination`, `Button`, `Sheet`, `DropdownMenu` e `AlertDialog`.
- Resumo multi-tenant: `app/Http/Controllers/ProductCategoryController.php`.
- Paginação compartilhada aprimorada: `resources/js/components/pagination.tsx` não aparece quando existe somente uma página.
- Cobertura funcional: `tests/Feature/ProductCategoryManagementTest.php`.
- URL local: `http://zouth-app.test/manufacturer/categories`.

## Viewports e estados

- Desktop: `1440 × 1024`, com mapa editorial, seleção e inspetor persistente.
- Mobile: `390 × 844`, com cabeçalho, criação, busca e lista em uma coluna; zero overflow horizontal.
- Estados verificados: seleção de categoria, busca com resultado único, limpeza da busca, criação lateral, edição lateral preenchida, menu contextual e exclusão bloqueada para categorias em uso.
- Categorias vazias mantêm exclusão com confirmação; categorias com produtos exibem a proteção antes da ação.
- O link “Ver peças” preserva a navegação Inertia e abre Produtos com o filtro da categoria selecionada.

## Evidências e comparação conjunta

- Esboço aprovado: `tmp/categories-redesign/02-concept-approved.png`.
- Comparação no mesmo quadro: `tmp/categories-redesign/qa/07-concept-vs-implementation.png`.
- Desktop final: `tmp/categories-redesign/qa/desktop-final.png`.
- Mobile final: `tmp/categories-redesign/qa/mobile-final.png`.
- Editor lateral: `tmp/categories-redesign/qa/05-category-editor.png`.

## Histórico do loop

### Iteração do esboço

- P1: a primeira geração usava contagens diferentes dos dados reais e numerava a segunda categoria como `03`.
- P2: a barra de busca explicava o comportamento do painel lateral, ocupando espaço sem ajudar a tarefa.
- Correção: contagens, proporções e ordinal foram alinhados aos dados reais; a explicação foi removida e o respiro preservado.

### Iteração da implementação

- P2: a paginação compartilhada ainda mostrava `Anterior`, `1` e `Próxima` quando havia somente uma página.
- Correção: `Pagination` agora conta os links numerados e desaparece quando não existe navegação real.
- A captura final moveu o foco da categoria selecionada para a busca, permitindo comparar o estado visual persistente sem confundi-lo com o indicador de foco por teclado.

## Auditoria final

- A implementação preserva a composição do esboço: título editorial, ação coral única, busca aberta entre linhas, lista proporcional e categoria em foco.
- Sora, Manrope, marfim, carvão, coral, bordas finas, cantos mínimos e ausência de sombras decorativas seguem o design system.
- A tela não usa tabela, grade de cards, ilustração ou fotografia sem necessidade; o dado é o elemento visual dominante.
- Busca, seleção, menus, painéis e confirmação usam controles semânticos, nomes contextuais, foco visível e alvos de pelo menos `44 px` nas ações da tela.
- Carga limpa em uma nova aba: título presente e zero erros no console.
- Nenhum achado acionável P0, P1 ou P2 permaneceu após a comparação conjunta.

## Verificações programáticas

- Pest: `4` testes e `53` assertions — pass.
- TypeScript: `npm run types` — pass.
- ESLint dos arquivos alterados — pass, zero warnings.
- Prettier dos arquivos alterados — pass.
- Laravel Pint: pass.
- `git diff --check` — pass.

final result: passed

# Zouth App — Editor de combos

## Fonte visual de verdade

- Identidade validada: `/Users/joao/www/zouth-app/resources/brand/zouth/design-system.md`.
- Tela anterior auditada: `tmp/combo-redesign/01-current-create.png`.
- Esboço gerado e aprovado internamente: `tmp/combo-redesign/02-concept-approved.png`.
- Editores e galeria já aprovados: `tmp/product-form-redesign/qa/desktop-final.png` e `tmp/products-redesign/qa/desktop-final.png`.
- Masters oficiais: `public/brand/zouth/assets/`.

## Pesquisa e direção

- Referências: Build-A-Fit, Fashivly Look Builder, GridShot, Z Lounge Set Builder, Dribbble Product Config e Behance QuickShop.
- Direção escolhida: “curadoria de conjunto” — a composição deixa de ser uma sequência de selects e passa a mostrar as peças, suas imagens, a escolha de variação, a quantidade por combo e a capacidade de estoque no mesmo contexto.
- O seletor usa o acervo real como superfície de decisão; a prévia editorial transforma a composição em algo visível antes de salvar.

## Implementação avaliada

- Editor: `resources/js/components/product-combo-form.tsx`.
- Componentes compartilhados: `ComboProductPicker`, `ComboLivePreview`, `EditorSection` e `EditorField`.
- Tipos: `resources/js/components/product-editor/combo-types.ts`.
- Páginas: `resources/js/pages/manufacturer/products/combos/create.tsx` e `edit.tsx`.
- URL local: `http://zouth-app.test/manufacturer/products/combos/create`.

## Regra de mídia corrigida

- Uploads próprios foram removidos do editor de combos.
- Requisições de criação ou edição com `images` ou `video` agora são rejeitadas pela validação.
- O endpoint de mídia não autoriza upload direto em produtos do tipo combo.
- Fotos e vídeos exibidos pelo combo são resolvidos dinamicamente a partir das peças selecionadas, sem duplicar registros ou arquivos.
- A edição interna, a listagem de produtos e o catálogo público recebem as mídias herdadas com carregamento antecipado para evitar consultas repetidas.
- Alterações futuras na mídia de uma peça passam a refletir automaticamente no combo.

## Evidência visual e responsiva

- Desktop vazio: `tmp/combo-redesign/qa/desktop-empty.png`.
- Seletor de peças: `tmp/combo-redesign/qa/product-picker.png`.
- Desktop preenchido: `tmp/combo-redesign/qa/desktop-final.png`.
- Mobile da composição: `tmp/combo-redesign/qa/mobile-final.png`.
- Comparação conjunta entre esboço e implementação: `tmp/combo-redesign/qa/comparison-final.png`.

## Histórico do loop

### Iteração 1

- P1: a tela antiga era um formulário genérico com linhas de selects e upload independente de mídias, contrariando a relação real entre combo e produtos.
- P1: a composição não mostrava fotografia, procedência da peça ou impacto da escolha na vitrine.
- P2: disponibilidade e quantidade ficavam separadas da decisão de variação.
- P2: o combo não oferecia uma prévia útil antes de salvar.

### Correções

- A escolha de produto passou para uma galeria pesquisável com fotos reais, SKU, categoria, preço e estoque.
- Cada peça selecionada virou uma linha editorial com imagem, troca, remoção, variação, quantidade e capacidade estimada de combos.
- A “Vitrine herdada” explica a regra de negócio e mostra todas as fotos e vídeos recebidos das peças, sem qualquer ação de upload.
- A prévia combina até três imagens herdadas, acompanha nome, história, preço, categoria, estado e composição em tempo real.
- Navegação sticky usa superfície marfim opaca e mantém seção ativa sem a faixa transparente encontrada no editor anterior.

## Auditoria final

- Nenhum achado acionável P0, P1 ou P2 permaneceu.
- A tela preserva Sora/Manrope, marfim, carvão, coral, verde mineral, linhas finas, cantos mínimos e ausência de sombras decorativas.
- Fotografias reais continuam sendo a principal fonte de cor; estados sem mídia são explícitos e orientam a próxima ação.
- Fluxo principal verificado: abrir seletor, pesquisar visualmente, adicionar peça, atualizar prévia, alterar quantidade, trocar e remover.
- Desktop e mobile não apresentam overflow horizontal; o seletor possui busca com foco inicial, nomes acessíveis e fechamento por teclado.
- A composição permanece utilizável sem depender de uma tabela e mantém todas as decisões comerciais relevantes visíveis.
- Logs atuais não registraram erros do editor; mensagens antigas do Vite eram anteriores ao recarregamento validado.

## Verificações programáticas

- Pest direcionado: `18` testes e `166` assertions — pass.
- TypeScript: `npm run types` — pass.
- ESLint: `npm run lint` — pass, zero warnings.
- Prettier dos arquivos alterados — pass.
- Laravel Pint e `git diff --check` — pass.

final result: passed

# Zouth App — Editor de produto

## Fonte visual de verdade

- Identidade validada: `/Users/joao/www/zouth-app/resources/brand/zouth/design-system.md`.
- Esboço aprovado internamente: `tmp/product-form-redesign/10-concept-approved.png`.
- Fluxo anterior auditado: `tmp/product-form-redesign/01-current-create-basic.png`, `tmp/product-form-redesign/07-current-edit-rich-variants-full.png`, `tmp/product-form-redesign/08-current-edit-rich-media.png` e `tmp/product-form-redesign/09-current-create-mobile.png`.
- Shell autenticado aprovado: `tmp/products-redesign/qa/desktop-final.png`.

## Implementação avaliada

- Orquestração compartilhada: `resources/js/components/product-form.tsx`.
- Seções reutilizáveis: `resources/js/components/product-editor/editor-section.tsx`, `product-live-preview.tsx`, `product-variation-studio.tsx` e `product-media-studio.tsx`.
- Contrato compartilhado: `resources/js/components/product-editor/types.ts`.
- Páginas: `resources/js/pages/manufacturer/products/create.tsx` e `resources/js/pages/manufacturer/products/edit.tsx`.
- Integridade de estoque e mídia: `ProductStockService`, `ProductUpsertService` e `ProductMediaStoreRequest`.
- URL local: `http://zouth-app.test/manufacturer/products/5/edit`.

## Viewports e estados

- Desktop: `1440 × 1024`, edição de produto com nove combinações e sete fotos.
- Mobile: `390 × 844`, cabeçalho, navegação horizontal, prévia recolhível, estoque e galeria em duas colunas.
- Sem overflow horizontal e sem imagens quebradas nos dois viewports.
- Estados verificados: campos obrigatórios vazios, atualização da prévia em tempo real, estado não salvo, descarte, seleção de variações, matriz agrupada, navegação por âncoras com seção ativa, confirmação de exclusão cancelada e prévia mobile aberta/fechada.
- Upload e corte existentes foram preservados; mídia já salva continua reordenável por mouse, teclado e toque.

## Evidência conjunta e focal

- Esboço + implementação no mesmo quadro: `tmp/product-form-redesign/qa/comparison-final.png`.
- Desktop final: `tmp/product-form-redesign/qa/desktop-final.png`.
- Variações: `tmp/product-form-redesign/qa/desktop-variants-v1.png`.
- Disponibilidade: `tmp/product-form-redesign/qa/desktop-availability-v1.png`.
- Imagens: `tmp/product-form-redesign/qa/desktop-images-v2.png`.
- Mobile final: `tmp/product-form-redesign/qa/mobile-final.png`.
- Variações mobile: `tmp/product-form-redesign/qa/mobile-variants-v1.png`.
- Disponibilidade mobile: `tmp/product-form-redesign/qa/mobile-availability-v1.png`.
- Imagens mobile: `tmp/product-form-redesign/qa/mobile-images-v1.png`.

## Histórico do loop

### Iteração 1

- P1: o fluxo anterior escondia o salvamento na última etapa e falhava silenciosamente quando nome ou SKU estavam vazios.
- P1: a edição podia selecionar valores de variação nunca usados e a sincronização apagava/recriava todos os estoques.
- P1: o endpoint de edição não impunha o limite cumulativo de dez imagens.
- P2: variações eram uma sequência de cartões repetidos; mídia era uma lista vertical e remoção não tinha confirmação.
- P2: previews de arquivos criavam Blob URLs durante render sem revogação.
- P2: a prévia mobile indicava “Abrir” mesmo depois de expandida e não tinha foco visual alinhado à marca.

### Correções

- O wizard foi substituído por uma ficha editorial contínua, com âncoras, indicação de erros e salvamento persistente no topo e rodapé.
- A peça ganhou prévia real do catálogo, atualizada por nome, categoria, preço, status, foto e número de combinações.
- Cores e tamanhos são escolhidos visualmente; a disponibilidade é agrupada pela escolha principal, sem retornar a uma tabela genérica.
- A galeria usa a primeira foto como capa, organiza mídias em grade, mantém corte e reordenação e protege a exclusão com confirmação.
- Variações reabrem somente valores usados; estoques existentes preservam IDs; imagens respeitam o teto cumulativo de dez.
- Blob URLs são revogadas, alterações não salvas são sinalizadas e a saída do navegador é protegida.
- A prévia mobile passou a alternar `Abrir`/`Fechar`, recebeu foco coral e a navegação acompanha a seção visível.

## Auditoria final

- Nenhum achado acionável P0, P1 ou P2 permaneceu.
- O confronto visual preserva o conceito do esboço e o traduz para dados reais, estados extensos e responsividade sem sacrificar usabilidade.
- O editor segue marfim, carvão, coral, Sora/Manrope, linhas finas, cantos mínimos, superfícies abertas e ausência de sombras decorativas.
- Fotografia real é a principal fonte de cor; nenhum estado ou métrica comercial foi inventado.
- Labels persistentes, fieldsets, estados `aria-pressed`, confirmação acessível, alvos de toque e foco visível cobrem teclado, mouse e toque.
- Console atual sem novos erros; registros de preload retornados pelo Laravel Boost pertencem a builds anteriores com `ASSET_URL` de produção.

## Verificações programáticas

- Pest: `31` testes e `178` assertions — pass.
- TypeScript: `npm run types` — pass.
- ESLint: `npm run lint` — pass, zero warnings.
- Prettier dos arquivos alterados — pass.
- Laravel Pint: pass.
- Vite: build de produção concluído com `ASSET_URL` local.
- `git diff --check` — pass.

final result: passed

# Zouth App — Editor de produto, ajuste das combinações

## Fonte visual de verdade

- Anotação do usuário: `/var/folders/2j/nmb22s415dlf24fp4d5s3fn00000gn/T/TemporaryItems/NSIRD_screencaptureui_4C4d6T/Screenshot 2026-07-18 at 12.12.42.png`.
- Identidade validada: `resources/brand/zouth/design-system.md`.
- Implementação: `resources/js/components/product-editor/product-variation-studio.tsx`.

## Evidência conjunta e responsiva

- Comparação entre a anotação e a implementação: `tmp/product-form-redesign/qa/comparison-availability-followup.png`.
- Desktop em `1440 × 1024`: `tmp/product-form-redesign/qa/desktop-availability-followup.png`.
- Mobile em `390 × 844`: `tmp/product-form-redesign/qa/mobile-availability-followup.png`.

## Ajuste auditado

- A cor e o tamanho agora formam uma única identificação por linha: `Verde/P`, `Verde/M`, `Verde/G` e equivalentes.
- O antigo cabeçalho visual da cor e os rótulos isolados `P`, `M` e `G` foram eliminados sem perder o agrupamento semântico do `fieldset`.
- O aviso “Vazio usa o preço geral.” foi removido; o campo vazio continua preservando o comportamento existente de herdar o preço geral.
- A amostra cromática acompanha cada combinação e mantém a linha reconhecível durante a rolagem.
- Desktop e mobile não apresentam overflow horizontal; quantidade, preço e SKU preservam seus nomes acessíveis.
- Nenhum achado acionável P0, P1 ou P2 permaneceu.

## Verificações programáticas

- Pest: `9` testes e `114` assertions — pass.
- TypeScript, ESLint, Prettier e Laravel Pint — pass.
- Build Vite de produção com `ASSET_URL` local — pass.

final result: passed

# Zouth App — Editor de produto, continuidade do sticky

## Fonte visual e estado

- Anotação do usuário: `/var/folders/2j/nmb22s415dlf24fp4d5s3fn00000gn/T/TemporaryItems/NSIRD_screencaptureui_hqZWyf/Screenshot 2026-07-18 at 12.27.34.png`.
- Estado validado: navegação de seções fixa durante a rolagem, com `Variações` ativa.
- Implementação desktop: `tmp/product-form-redesign/qa/desktop-sticky-gap-fixed.png`.
- Implementação mobile: `tmp/product-form-redesign/qa/mobile-sticky-gap-fixed.png`.
- Comparação completa: `tmp/product-form-redesign/qa/comparison-sticky-gap-fixed.png`.
- Comparação focal do topo: `tmp/product-form-redesign/qa/comparison-sticky-gap-focused.png`.

## Histórico do loop

### Iteração 1

- P2: a navegação usava `top-[61px]`, embora o cabeçalho global não fosse fixo; depois que o cabeçalho saía da tela, o formulário permanecia visível em uma faixa transparente de 61 px.
- Correção: a navegação passou a usar o topo real da viewport, preservando a superfície marfim translúcida e a leitura ativa em coral.

### Iteração 2

- P2: o deslocamento de âncora antigo ainda fazia o título escolhido pousar 71 px abaixo da barra.
- Correção: a margem de rolagem e o ponto de observação foram alinhados ao novo sticky, deixando 23 px de respiro entre a barra e a seção.

## Auditoria final

- A barra encosta no topo em desktop e mobile, sem faixa transparente e sem overflow horizontal.
- Cliques nas seções mantêm o título visível; o estado ativo acompanha a rolagem e o console não registra erros.
- Tipografia, cores, fotografia, conteúdo e demais espaçamentos permanecem inalterados; a correção preserva integralmente a identidade aprovada.
- Nenhum achado acionável P0, P1 ou P2 permaneceu.

## Verificações programáticas

- Pest: `9` testes e `114` assertions — pass.
- TypeScript, ESLint, Prettier e Laravel Pint — pass.
- Build Vite de produção com `ASSET_URL` local — pass.

final result: passed

# Zouth App — Produtos do fabricante

## Fonte visual de verdade

- Identidade validada: `/Users/joao/www/zouth-app/resources/brand/zouth/design-system.md`.
- Tela anterior auditada: `tmp/products-redesign/01-current-desktop.png` e `tmp/products-redesign/02-current-mobile-viewport.png`.
- Esboço gerado e aprovado internamente: `tmp/products-redesign/03-concept-approved-1440.png`.
- Dashboard e shell já aprovados: `tmp/dashboard-redesign/qa/desktop-final.jpg`.
- Masters oficiais: `public/brand/zouth/assets/`.

## Pesquisa e direção

- Referências de gestão visual e curadoria: Dribbble MRITECH, Dribbble Style at Scale e Behance FUSE Fashion Admin.
- Direção escolhida: “mesa de coleção” — galeria visual disciplinada com inspetor persistente da peça selecionada.
- A composição preserva busca, tipo, categoria, status, edição, exclusão, estoque e paginação sem retornar ao padrão de planilha.

## Implementação avaliada

- Tela: `resources/js/pages/manufacturer/products/index.tsx`.
- Componentes compartilhados novos: `ResourceToolbar`, `ResourceInspector` e `EmptyState`.
- Componentes compartilhados aprimorados: `Pagination` e `Sheet`.
- Filtro corrigido no servidor: `app/Http/Controllers/ProductController.php`.
- Cobertura de filtro e isolamento de fabricante: `tests/Feature/ProductManagementTest.php`.
- URL local: `http://zouth-app.test/manufacturer/products`.

## Viewports e estados

- Desktop: `1440 × 1024`, acervo completo, primeira peça selecionada e inspetor persistente.
- Mobile: `390 × 844`, cabeçalho, controles, galeria em duas colunas e painel inferior de detalhes.
- Zero overflow horizontal e zero imagens quebradas nos dois viewports.
- Estados verificados: busca com resultado único, filtro por combo, filtro sem resultados, limpar filtros, seleção de peça, menu contextual e confirmação de exclusão cancelada.
- O painel mobile bloqueia o fundo, possui fechamento em português e mantém edição e exclusão acessíveis por rolagem própria.
- A paginação compartilhada agora usa `Anterior`/`Próxima` e alvos de `44 px`.

## Evidência conjunta e focal

Cada quadro abaixo reúne o esboço e a implementação real no mesmo input de comparação.

- Comparação completa: `tmp/products-redesign/qa/comparison-final.png`.
- Cabeçalho e ferramentas: `tmp/products-redesign/qa/comparison-header-toolbar.png`.
- Galeria e inspetor: `tmp/products-redesign/qa/comparison-gallery-inspector.png`.
- Desktop final: `tmp/products-redesign/qa/desktop-final.png`.
- Inspetor em estado sticky: `tmp/products-redesign/qa/desktop-sticky-inspector.png`.
- Mobile inicial: `tmp/products-redesign/qa/mobile-top-final.png`.
- Galeria mobile: `tmp/products-redesign/qa/mobile-gallery-final.png`.
- Inspetor mobile: `tmp/products-redesign/qa/mobile-sheet-final.png`.

## Histórico do loop

### Iteração 1

- P1: a tela anterior dependia de uma tabela larga, ocultava a força fotográfica da coleção e cortava informações no mobile.
- P1: o filtro vazio de status era interpretado como “inativo” no servidor.
- P2: filtros de categoria e status ocupavam duas linhas no desktop e empurravam a coleção para baixo.
- P2: paginação e fechamento do painel móvel tinham alvos pequenos; o fechamento ainda usava texto assistivo em inglês.

### Correções

- Produtos passaram a formar uma galeria editorial com seleção coral e leitura rápida de preço, estoque, categoria e estado.
- A peça selecionada ganhou um inspetor persistente no desktop e um painel inferior no mobile, sem navegação desnecessária entre páginas.
- O filtro de status passou a considerar apenas valores preenchidos, com cenários `true`, `false`, vazio e isolamento multi-tenant cobertos por testes.
- A barra desktop foi compactada em uma linha sem abreviar seus rótulos; no mobile, os filtros continuam empilhados e legíveis.
- Paginação recebeu linguagem brasileira e alvos de `44 px`; o painel móvel recebeu fechamento de `44 px` com nome acessível “Fechar”.
- A escala maior do título foi mantida deliberadamente por corresponder ao `AppPageHeader` e ao dashboard já aprovados, em vez de reproduzir a escala menor do esboço isolado.

## Auditoria final

- Nenhum achado acionável P0, P1 ou P2 permaneceu.
- O conteúdo preserva o shell aprovado, Sora/Manrope, base marfim, carvão estrutural, coral de seleção, linhas finas, cantos mínimos e ausência de sombras decorativas.
- Fotografias reais são a principal fonte de cor; itens sem imagem recebem o símbolo oficial e um estado editorial explícito.
- A galeria permanece utilizável com mouse, teclado e toque; seleção expõe `aria-pressed`, menus têm nomes contextuais e o estado vazio oferece recuperação clara.
- O link textual de breadcrumb do shell aprovado permanece abaixo de `44 px` de altura visual; todas as ações específicas de Produtos atendem ao alvo mínimo.
- Console atual sem erros; registros de preload encontrados pelo Laravel Boost pertencem a builds anteriores com `ASSET_URL` de produção.

## Verificações programáticas

- Pest: `25` testes e `248` assertions — pass.
- TypeScript: `npm run types` — pass.
- ESLint: `npm run lint` — pass, zero warnings.
- Prettier dos arquivos alterados — pass.
- Laravel Pint: pass.
- Vite: build de produção concluído com `ASSET_URL` local.
- `git diff --check` — pass.

final result: passed

# Zouth App — Dashboard do fabricante

## Fonte visual de verdade

- Identidade validada: `/Users/joao/www/zouth-app/resources/brand/zouth/design-system.md`.
- Esboço aprovado para implementação: `tmp/dashboard-redesign/03-concept-approved.png`.
- Tela anterior auditada: `tmp/dashboard-redesign/01-current-desktop.png` e `tmp/dashboard-redesign/02-current-mobile.png`.
- Masters oficiais: `public/brand/zouth/assets/`.

## Implementação avaliada

- Tela: `resources/js/pages/dashboard.tsx`.
- Fundação autenticada: `resources/css/app.css` e componentes compartilhados de shell.
- Componentes reutilizáveis: `AppPageHeader`, `AttentionPanel`, `MetricRail`, `RecordList`, `RecordRow`, `StatusLabel` e `ActionRow`.
- URL local: `http://zouth-app.test/dashboard`.

## Evidência conjunta e focal

- Comparação completa entre esboço e implementação: `tmp/dashboard-redesign/qa/comparison-final.jpg`.
- Hierarquia superior: `tmp/dashboard-redesign/qa/comparison-header-final.jpg`.
- Catálogo em circulação: `tmp/dashboard-redesign/qa/comparison-catalog-final.jpg`.
- Pedidos e próximos passos: `tmp/dashboard-redesign/qa/comparison-orders-final.jpg`.
- Desktop final em `1440 × 1024`: `tmp/dashboard-redesign/qa/desktop-final.jpg`.
- Mobile inicial em `390 × 844`: `tmp/dashboard-redesign/qa/mobile-top-final.jpg`.
- Catálogo mobile: `tmp/dashboard-redesign/qa/mobile-catalog-final.jpg`.
- Pedidos mobile: `tmp/dashboard-redesign/qa/mobile-orders-final.jpg`.
- Navegação mobile: `tmp/dashboard-redesign/qa/mobile-menu-final-validated.jpg`.

## Histórico do loop

### Iteração 1

- P1: a hierarquia inicial criava um título de três linhas e empurrava a leitura comercial para baixo.
- P1: a página criava um segundo elemento `main` dentro do shell.
- P2: métricas e conteúdo do catálogo tinham altura maior que a referência.
- P2: o conteúdo de catálogo usava uma fotografia de conceito em vez da mídia real do fabricante.

### Correções da iteração 1

- Escala, ritmo, espaçamento e alinhamento do cabeçalho foram calibrados contra o esboço no mesmo viewport.
- O shell permaneceu como único marco `main`.
- A faixa de métricas ganhou hierarquia compacta e responsiva.
- O catálogo passou a utilizar a primeira mídia real de produtos ativos, com estado editorial quando não existe imagem.

### Iteração 2

- P1: o menu mobile renderizado em portal recebia a superfície clara do starter, deixando o logotipo e a navegação sem contraste.
- P2: as três métricas formavam uma coluna longa no mobile.
- P2: catálogo e pedidos ainda ultrapassavam a altura de referência no desktop.

### Correções da iteração 2

- O tema autenticado foi estendido aos elementos em portal; a navegação mobile agora usa carvão, marfim e foco coral.
- No mobile, a receita assume prioridade e pedidos/lojistas formam uma dupla de apoio.
- Tipografia, linhas, alturas e paddings foram recalibrados até o dashboard desktop ocupar praticamente um viewport.
- Pedidos usam uma lista editorial; ações mantêm alvos amplos sem voltar ao padrão de cards genéricos.

## Verificações finais

- Um único `main`, um único `h1`, sem overflow horizontal e sem imagens quebradas em desktop e mobile.
- CTA de novos pedidos navega para `/manufacturer/orders?status=new`.
- Sidebar abre e fecha no mobile; seletor de módulo expõe estados `menuitemradio` e fecha com `Escape`.
- Alvos interativos atendem a dimensão mínima no viewport desktop.
- Console sem novos erros após o build local; o erro histórico de preload pertence a uma build anterior com `ASSET_URL` de produção.
- Dados de catálogo, métricas e pedidos permanecem restritos ao fabricante atual.
- TypeScript, ESLint, Pest, Pint e build Vite concluídos com sucesso.

final result: passed

# Zouth App — Variações de produtos

## Fonte visual de verdade

- Identidade validada: `/Users/joao/www/zouth-app/resources/brand/zouth/design-system.md`.
- Tela anterior auditada: `tmp/variations-redesign/01-current-desktop.png` e `tmp/variations-redesign/02-current-create-dialog.png`.
- Esboço aprovado para implementação: `tmp/variations-redesign/03-concept-approved.png`.
- Telas já aprovadas usadas para continuidade: Produtos e Categorias.

## Implementação avaliada

- Tela: `resources/js/pages/manufacturer/variation-types/index.tsx`.
- Dados de uso: `app/Http/Controllers/VariationTypeController.php`.
- Cobertura: `tests/Feature/VariationTypeCrudTest.php`.
- URL local: `http://zouth-app.test/manufacturer/variation-types`.

## Evidência conjunta e focal

- Comparação entre esboço e implementação no mesmo input: `tmp/variations-redesign/qa/source-vs-implementation.png`.
- Desktop final em `1440 × 1024`: `tmp/variations-redesign/qa/desktop-final.png`.
- Editor lateral desktop: `tmp/variations-redesign/qa-editor.png`.
- Mobile em `390 × 844`: `tmp/variations-redesign/qa-mobile.png`.
- Editor lateral mobile: `tmp/variations-redesign/qa-mobile-editor.png`.

## Histórico do loop

### Iteração 1

- P1: a tela anterior era uma tabela administrativa com badges pequenos e pouca diferenciação entre cor, estampa e texto.
- P1: a exclusão parecia sempre disponível, embora o servidor bloqueasse variações usadas por produtos.
- P2: criação e edição repetiam um formulário genérico em modal e escondiam a diferença entre uma escolha textual e uma escolha visual.

### Correções

- A tela passou a funcionar como uma biblioteca editorial de escolhas, com seleção persistente e inspetor contextual.
- Cores e estampas ganharam amostras grandes com nome; tamanhos permanecem legíveis como blocos de texto.
- A contagem real de produtos em uso orienta o estado de exclusão antes do clique e mantém a proteção existente no servidor.
- Criação e edição compartilham um editor lateral em duas etapas, com escolha explícita entre Texto e Cor ou estampa.
- Busca por nome ou valor acontece sem recarregar a página e mantém um resultado selecionado.
- Upload, troca e remoção de estampas preservam a lógica de imagem versus cor e liberam URLs temporárias do navegador.

## Auditoria final

- Nenhum achado acionável P0, P1 ou P2 permaneceu.
- A implementação preserva o shell aprovado, Sora/Manrope, marfim, carvão, coral, linhas finas, cantos mínimos e ausência de sombras decorativas.
- A hierarquia visual coincide com o esboço; diferenças de conteúdo refletem os dados reais da coleção.
- Busca, seleção, menus, editor, alternância de tipo, adição de valores e bloqueio de exclusão foram validados no navegador.
- Desktop e mobile não apresentam overflow horizontal.
- Após recarga completa, não surgiram novos erros de execução; os registros anteriores eram do intervalo de HMR em que o arquivo estava sendo substituído.

## Verificações programáticas

- Pest: `16` testes e `69` assertions — pass.
- TypeScript: `npm run types` — pass.
- ESLint do arquivo alterado — pass, zero warnings.
- Prettier do arquivo alterado — pass.
- Laravel Pint: pass.
- `git diff --check` — pass.

final result: passed

# Zouth App — Estúdio do catálogo

## Fonte visual de verdade

- Identidade validada: `/Users/joao/www/zouth-app/resources/brand/zouth/design-system.md`.
- Tela anterior auditada: `tmp/catalog-audit/01-current-catalog.png`, `02-current-settings.png`, `03-current-structure.png` e `04-current-links.png`.
- Esboço gerado e aprovado internamente: `tmp/catalog-design/catalog-studio-reference.png`.
- Decisão de produto: uma única base livre e personalizável, sem catálogo de templates.

## Implementação avaliada

- Estúdio: `resources/js/pages/manufacturer/catalog-settings/index.tsx`.
- Prévia compartilhada: `resources/js/components/catalog-preview.tsx`.
- Vitrine pública: `resources/js/pages/public/catalog.tsx`.
- Validação: `app/Http/Requests/CatalogSettingUpdateRequest.php`.
- Cobertura: `tests/Feature/CatalogPersonalizationTest.php` e `tests/Feature/CatalogPremiumCustomizationTest.php`.
- URL local: `http://zouth-app.test/manufacturer/catalog-settings`.

## Evidência conjunta e focal

- Comparação completa entre esboço e implementação, ambas em `1440 × 1024`: `tmp/catalog-design/catalog-studio-comparison.png`.
- Esboço aprovado: `tmp/catalog-design/catalog-studio-reference.png`.
- Implementação final: `tmp/catalog-design/catalog-studio-implementation.png`.
- A comparação completa cobre cabeçalho, estrutura, canvas, seleção de seção, imagens, controles de viewport e inspetor; não foi necessário um segundo recorte focal porque os três painéis permanecem legíveis no mesmo quadro.

## Histórico do loop

### Auditoria da experiência anterior

- P1: personalização, estrutura, link e métricas estavam distribuídos como um formulário longo de configurações técnicas.
- P1: a prévia era pequena demais para orientar uma decisão visual e não permitia selecionar diretamente a parte exibida.
- P1: presets conflitavam com a liberdade de composição definida para o produto.
- P2: seções podiam ser ligadas ou desligadas, mas não formavam uma narrativa reordenável da coleção.
- P2: link e métricas disputavam atenção com a tarefa principal de construir a vitrine.

### Correções da arquitetura e do design

- A tela passou a funcionar como um estúdio: estrutura à esquerda, prévia dominante no centro e inspetor contextual à direita.
- Capa, Coleções e Produtos podem ser selecionados tanto pela estrutura quanto diretamente na prévia; ordem e visibilidade permanecem editáveis.
- Desktop, mobile e zoom compartilham o mesmo canvas, sem abrir uma etapa separada.
- Aparência concentra cor, tipografia, fundo e densidade; Publicar reúne link, disponibilidade e interesse pela coleção sem competir com a criação.
- O fluxo de templates foi removido da interface e da validação; a vitrine pública utiliza uma única base editorial que recebe as escolhas do fabricante.
- Ordem, títulos, alinhamento, modo de coleções, colunas, densidade, cartões e atmosfera do fundo chegam à vitrine publicada.

### Comparação visual final

- Nenhum achado acionável P0, P1 ou P2 permaneceu.
- A implementação preserva a hierarquia do esboço, mas usa o estado real salvo no catálogo: a capa centralizada e o padrão de estrelas substituem a fotografia lateral mostrada na referência.
- Sora/Manrope, marfim, carvão, coral, divisores finos, cantos mínimos e ausência de sombras decorativas seguem o sistema de marca.
- Imagens reais dos produtos mantêm proporção e recorte; ícones pertencem à mesma família Lucide e os estados ativos usam coral ou carvão com contraste.
- Em `1024 px`, estrutura, canvas e inspetor viram uma sequência vertical; em `390 px`, o shell mobile, ações, estrutura e prévia permanecem utilizáveis sem corte horizontal visível.

## Estados e verificações finais

- Seleção direta de Coleções abriu o inspetor correspondente.
- Alternância Desktop/Mobile, zoom, Aparência e Publicar foram exercitados no navegador.
- O catálogo público renderizou capa, coleções, combos, produtos, filtros e variações com a base única.
- Fontes Sora e Manrope são aceitas; presets antigos `playful` e `boutique` são rejeitados.
- Pest: `32` testes e `272` assertions — pass.
- TypeScript: `npm run types` — pass.
- ESLint dos arquivos alterados — pass, zero warnings.
- Laravel Pint: pass.
- `git diff --check` — pass.

final result: passed

# Zouth App — Navegação persistente no estúdio do catálogo

## Fonte visual de verdade

- Anotação do usuário: `/Users/joao/Desktop/Screenshot 2026-07-19 at 12.58.53.png`.
- Intenção registrada na imagem: manter Estrutura, barra de Prévia ao vivo e inspetor da seção acessíveis durante a rolagem.

## Implementação avaliada

- Tela: `resources/js/pages/manufacturer/catalog-settings/index.tsx`.
- URL local: `http://zouth-app.test/manufacturer/catalog-settings`.
- Captura da implementação: `tmp/catalog-premium-audit/catalog-studio-sticky-products.png`.
- Comparação no mesmo input: `tmp/catalog-premium-audit/catalog-studio-sticky-comparison.png`.

## Viewport e estado

- Viewport do navegador: `1280 × 720`.
- Estado: breakpoint desktop, página em `scrollY 831`, seção Produtos selecionada e inspetor no início.
- A fonte é uma anotação comportamental em um viewport mais largo; a comparação respeita as mesmas três regiões e o estado implementado demonstra o resultado após a rolagem.

## Evidência conjunta e focal

- A comparação conjunta mostra a anotação original à esquerda e o estúdio rolado à direita.
- Estrutura, barra da prévia e inspetor permanecem com `top: 0`; barra e painéis usam superfície marfim opaca, sem faixa transparente.
- O inspetor ocupa no máximo um viewport, mantém rolagem própria e não desloca a página ao navegar pelo conteúdo.
- Não foi necessário um recorte focal adicional: os três alvos marcados e seus limites estão legíveis no quadro completo.

## Histórico do loop

### Iteração 1

- P1: a estrutura e a barra da prévia saíam do viewport durante a leitura das partes inferiores do catálogo.
- P1: o inspetor tinha altura limitada, mas não acompanhava a rolagem da página; mudar de seção exigia voltar ao topo.

### Correções e evidência posterior

- Os dois painéis laterais passaram a usar posicionamento sticky somente no desktop, com alinhamento inicial e rolagem interna independente.
- A barra da prévia recebeu posicionamento sticky, camada superior e fundo sólido no mesmo token marfim do estúdio.
- Em telas menores, o fluxo continua natural, evitando três regiões persistentes disputando o mesmo espaço.
- A seleção de Produtos foi acionada com a página já rolada; o inspetor mudou para Produtos sem retorno ao topo.
- Medição após a correção: Estrutura `top: 0`, barra `top: 0`, inspetor `top: 0`; rolagem interna do inspetor chegou a `260 px` enquanto a página permaneceu em `scrollY 831`.

## Auditoria das superfícies obrigatórias

- Tipografia: Sora/Manrope, pesos, hierarquia e truncamentos existentes foram preservados; a mudança não introduziu novo texto visível.
- Espaçamento e layout: as três colunas mantêm suas larguras e divisores; `align-start` evita o estiramento que impedia o sticky da estrutura.
- Cores e tokens: marfim, carvão, coral e bordas da identidade permanecem inalterados; a barra opaca elimina transparência sobre o catálogo.
- Imagens: fotografias, recortes e qualidade do catálogo não foram alterados.
- Conteúdo e ícones: rótulos, ações, estados selecionados e família de ícones foram preservados.
- Responsividade: o comportamento persistente começa no breakpoint `xl`; abaixo dele, estrutura, prévia e inspetor voltam ao documento normal.

## Verificações finais

- Nenhum achado acionável P0, P1 ou P2 permaneceu.
- Troca de seção durante a rolagem e rolagem independente do inspetor validadas no navegador.
- Console atual sem novos erros; os erros anteriores nos registros pertencem a interrupções antigas do Vite/HMR.
- Pest: `19` testes e `77` assertions — pass.
- TypeScript: `npm run types` — pass.
- ESLint do arquivo alterado — pass.
- Prettier do arquivo alterado — pass.

final result: passed

# Zouth App — Navegação do catálogo público

## Fonte visual de verdade

- Anotação do usuário: `/Users/joao/Desktop/Screenshot 2026-07-20 at 15.22.43.png`.
- Intenção registrada: remover os títulos editoriais riscados, levar o botão Filtros para a extremidade direita da navegação de coleções e eliminar o cabeçalho marcado com o X verde.

## Implementação avaliada

- Tela: `resources/js/pages/public/catalog.tsx`.
- URL local: `http://zouth-app.test/catalog/pvFEsBVch57Cw6c6FtqaiJ6DCTOTtK4Bul7Tn64aio8oE3JA`.
- Captura desktop: `tmp/catalog-premium-audit/public-catalog-filter-navigation-final.jpg`.
- Captura mobile: `tmp/catalog-premium-audit/public-catalog-filter-navigation-mobile.jpg`.
- Comparação conjunta: `tmp/catalog-premium-audit/public-catalog-filter-navigation-comparison.png`.

## Viewports e estado

- Desktop: `1280 × 720`, catálogo público carregado e enquadrado na transição entre a capa, a navegação de coleções e as composições.
- Mobile: `390 × 844`, mesmo conteúdo e mesma ordem editorial.
- A anotação original tem proporção mais larga; fonte e implementação foram normalizadas para `720 px` de altura na comparação conjunta, preservando toda a região marcada.

## Evidência conjunta e focal

- A comparação conjunta coloca a anotação à esquerda e a implementação à direita no mesmo input.
- O bloco “Descubra / Capítulos da coleção” e o bloco “Seleção da marca / A coleção completa” não aparecem na implementação.
- O botão Filtros ocupa a extremidade direita da mesma faixa das categorias, exatamente no espaço indicado em azul, e o divisor inferior permanece contínuo.
- Não foi necessário um segundo recorte focal: todos os elementos alterados — títulos, categorias, divisor e botão — estão legíveis no quadro normalizado e na captura desktop individual.

## Histórico do loop

### Iteração 1

- P1: no bundle anterior, o filtro ainda aparecia em uma barra própria abaixo das categorias e repetia a palavra “Filtros”.
- P2: os dois cabeçalhos removidos ainda consumiam altura e quebravam a continuidade editorial solicitada.

### Correções e evidência posterior

- A ação foi incorporada ao componente de navegação como conteúdo final flexível, sem criar um segundo componente de filtro.
- Os dois cabeçalhos foram removidos somente do layout público minimal, preservando o restante do catálogo e as opções configuráveis.
- O drawer abriu com título, busca, categoria, variações e ações; depois foi fechado sem alterar os filtros.
- Medição desktop: navegação de `1217 × 53 px`; botão de `98 × 36 px`, alinhado à direita em `x: 1143`, sem overflow horizontal.
- Medição mobile: navegação de `327 × 159 px`; botão alinhado à direita em `x: 253`, sem overflow horizontal.

## Auditoria das superfícies obrigatórias

- Tipografia: as fontes editoriais e pesos existentes foram preservados; apenas os textos explicitamente riscados saíram.
- Espaçamento e layout: categorias e ação compartilham a mesma faixa no desktop; no mobile, as categorias quebram em linhas e o botão ocupa uma linha própria alinhada à direita, sem compressão.
- Cores e tokens: marfim, carvão, azul da ação e divisor fino permanecem inalterados.
- Imagens: fotografias, proporções, recortes e carregamento do catálogo não foram modificados.
- Conteúdo e ícones: o ícone Lucide e o rótulo Filtros foram preservados; não há repetição do rótulo fora do botão.
- Responsividade e acessibilidade: nenhum overflow horizontal em `1280 px` ou `390 px`; o botão mantém elemento semântico, nome acessível e abertura funcional do drawer.

## Verificações finais

- Nenhum achado acionável P0, P1 ou P2 permaneceu.
- Interação primária: abertura e fechamento do drawer de filtros — pass.
- Console do navegador: zero erros e zero avisos.
- Pest: `20` testes e `83` assertions — pass.
- TypeScript: pass.
- ESLint: pass.
- Prettier: pass.
- Laravel Pint: pass.
- `git diff --check`: pass.

final result: passed

# Zouth App — Relação comercial do cliente

## Fonte visual de verdade

- Tela anterior capturada: `tmp/customer-detail-design-audit/01-current-customer-detail.png`.
- Continuidade aprovada da carteira: `tmp/customers-design-audit/09-customers-implementation-ledger-final.png`.
- Esboço gerado e aprovado na autoauditoria: `tmp/customer-detail-design-audit/02-customer-detail-reference.png`.
- Direção: transformar o cadastro do cliente em um caderno comercial do lojista, sem tabela CRUD e sem inventar funções de CRM que o produto ainda não possui.

## Implementação avaliada

- Tela: `resources/js/pages/manufacturer/customers/show.tsx`.
- URL local: `http://zouth-app.test/manufacturer/customers/1`.
- Captura superior final: `tmp/customer-detail-design-audit/04-customer-detail-implementation-final.png`.
- Captura inferior final: `tmp/customer-detail-design-audit/05-customer-detail-lower-final.png`.
- Comparação conjunta: `tmp/customer-detail-design-audit/06-reference-vs-final.png`.
- Estado de edição: `tmp/customer-detail-design-audit/07-customer-edit-dialog-final.png`.

## Viewport e estado

- Implementação: `1280 × 720`, cliente recorrente João Vitor Santos de Sena, com dois pedidos reais.
- Esboço: `1487 × 1058`, normalizado para a mesma janela visível da implementação na comparação conjunta.
- O quadro superior valida identidade, hierarquia e régua comercial; o quadro inferior valida a jornada completa e a ficha cadastral.

## Histórico do loop

### Iteração 1

- P1: a tela anterior separava cadastro e pedidos em cartões genéricos e tabela, sem evidenciar valor, recência ou recorrência.
- P2: a primeira implementação reproduziu a direção, mas a data longa “22 DE JUN DE 2026” quebrava em duas linhas na régua e prejudicava o ritmo horizontal.

### Correções e evidência posterior

- A relação passou a abrir com nome, localização, estado comercial e recência antes dos detalhes cadastrais.
- Valor movimentado, compras, ticket médio e último pedido foram organizados em uma régua aberta usando o componente compartilhado `MetricRail`.
- O histórico virou uma jornada cronológica editorial, com datas, status, peças, valor e acesso direto ao pedido, sem tabela.
- A ficha do lojista foi reduzida a contato, documento, destino e estado da relação, sem cartões, sombras ou dados inventados.
- A data da régua foi encurtada para “22 JUN 2026”, eliminando a quebra visual encontrada na primeira captura.
- Totais, recorrência e último pedido agora ignoram pedidos cancelados; o histórico continua exibindo todos os status.

## Auditoria das superfícies obrigatórias

- Tipografia: Sora/Manrope, display grande, micro-rótulos editoriais e pesos existentes foram preservados.
- Espaçamento e layout: fluxo aberto, divisores finos, assimetria `jornada + ficha` e ritmo da carteira aprovada foram mantidos.
- Cores e tokens: carvão, marfim, coral, verde mineral e cinzas quentes da Zouth; nenhum azul SaaS, gradiente ou sombra foi introduzido.
- Conteúdo e ícones: somente dados existentes; ícones Lucide consistentes; contato por telefone/e-mail e acesso aos pedidos funcionais.
- Responsividade: a régua reduz para duas colunas e o corpo empilha antes do breakpoint `xl`; links e ações mantêm alvos de interação claros.
- Estados: relação recorrente, novo cliente, relação sem pedido e retomada de contato têm textos e tons definidos a partir de dados reais.

## Verificações finais

- Nenhum achado acionável P0, P1 ou P2 permaneceu.
- Abertura e fechamento da edição do cliente — pass.
- Navegação para o pedido `#0004` e retorno ao cliente — pass.
- Pest: `11` testes e `59` assertions — pass.
- TypeScript: pass.
- ESLint: pass.
- Prettier: pass.
- Laravel Pint: pass.

final result: passed

# Zouth App — Equipe e acessos

## Fonte visual de verdade

- Tela anterior: `tmp/users-design-audit/01-current-users.png`.
- Continuidade aprovada: `tmp/customers-design-audit/09-customers-implementation-ledger-final.png` e `tmp/customer-detail-design-audit/04-customer-detail-implementation-final.png`.
- Esboço gerado e aprovado na autoauditoria: `tmp/users-design-audit/02-users-reference.png`.
- Referências de interação: diretórios de equipe com edição contextual e permissões por área; proprietário com acesso total e colaborador com acessos delegados.

## Implementação avaliada

- Tela: `resources/js/pages/manufacturer/users/index.tsx`.
- URL local: `http://zouth-app.test/users`.
- Captura principal: `tmp/users-design-audit/10-users-final.png`.
- Diretório completo: `tmp/users-design-audit/09-users-ledger.png`.
- Editor lateral: `tmp/users-design-audit/07-users-drawer-viewport.png`.
- Comparação conjunta inspecionada no mesmo input: referência, tela principal e editor lateral.

## Viewport e estado

- Implementação: `1265 × 720`, fabricante Acme Corporation, um proprietário e um colaborador ativos.
- Editor: Jane Smith selecionada, função Colaborador e todas as áreas legadas visíveis.
- Convite: colaborador novo inicia com Coleção e produtos, Catálogo, Pedidos e Clientes; Representantes e Atendimento ficam desligados até decisão do proprietário.

## Histórico do loop

### Iteração 1

- P1: a tela anterior era uma tabela CRUD e não explicava o alcance de Staff e Owner.
- P1: Staff atravessava as áreas do sistema sem uma regra de acesso por capacidade.
- P2: papéis ainda apareciam em inglês e a função não tinha explicação comercial.
- P2: o esboço gerado inventou itens na sidebar; somente a composição central e o editor foram aprovados como referência.

### Correções e evidência posterior

- A tela virou um diretório editorial de equipe, com métricas abertas, busca, segmentos e linhas de leitura rápida.
- Owner e Staff passaram a ser Proprietário e Colaborador em toda a interface reformulada.
- Proprietários têm acesso completo e exclusivo à equipe e assinatura; colaboradores recebem acesso explícito a Coleção e produtos, Catálogo, Pedidos, Clientes, Representantes e Atendimento.
- A mesma regra filtra a sidebar e protege as rotas no servidor; esconder o menu não é o mecanismo de segurança.
- O próprio proprietário não pode bloquear nem remover a própria função; o servidor impede que a fabricante fique sem proprietário ativo.
- O painel lateral reúne função, explicação e áreas em linguagem operacional; o rodapé permanece visível enquanto as permissões rolam internamente.
- O contêiner principal recebeu `min-w-0`, eliminando a chance de um filho flexível forçar overflow horizontal.

## Auditoria das superfícies obrigatórias

- Tipografia: Sora/Manrope, display amplo, micro-rótulos editoriais e pesos da identidade preservados.
- Espaçamento e layout: régua aberta, diretório sem cartões genéricos, divisores finos e drawer de `36rem` com rolagem independente.
- Cores e tokens: marfim, carvão, coral, verde mineral e ameixa; sem gradiente, sombra ou azul SaaS.
- Conteúdo e ícones: textos integralmente em português; ícones Lucide coerentes com as áreas reais da operação.
- Responsividade: cabeçalho e diretório empilham em telas menores; filtros mantêm rolagem horizontal própria; drawer ocupa a largura disponível no mobile.
- Acessibilidade: filtros e funções são botões semânticos, switches têm nomes por ação, estados usam texto além de cor e todos os menus possuem nomes acessíveis.

## Verificações finais

- Nenhum achado acionável P0, P1 ou P2 permaneceu.
- Busca, filtro Colaboradores, convite, menu de ações, abertura e fechamento do editor — pass.
- Console atual sem erros; registros antigos de HMR precedem a recarga final e não se repetem no estado validado.
- Pest completo: `496` testes e `2443` assertions — pass.
- TypeScript: pass.
- ESLint dos arquivos alterados: pass.
- Prettier: pass.
- Laravel Pint: pass.

final result: passed

# Zouth App — Atendimento comercial

## Fonte visual de verdade

- Tela anterior: `tmp/atendimento-redesign/02-current-conversation.png` e `tmp/atendimento-redesign/03-current-product-dialog.png`.
- Esboço gerado e aprovado na autoauditoria: `tmp/atendimento-redesign/04-concept-sala-comercial.png`.
- Direção: uma sala comercial escura em três planos — conversas, relação ativa e pulso comercial — em que WhatsApp é o canal, não a identidade da interface.
- Identidade aplicada a partir dos tokens existentes em `resources/css/app.css`: carvão, marfim, areia, coral, ameixa e verde mineral, com Sora e Manrope.

## Implementação avaliada

- Tela: `resources/js/pages/manufacturer/atendimento/index.tsx`.
- Componente de experiência: `resources/js/pages/manufacturer/atendimento/components/atendimento-workspace.tsx`.
- URL local: `http://zouth-app.test/manufacturer/atendimento?conversation=6`.
- Captura final: `tmp/atendimento-redesign/06-final-desktop.png`.
- Vitrine na conversa: `tmp/atendimento-redesign/07-product-dialog.png`.
- Comparação conjunta inspecionada no mesmo input: `tmp/atendimento-redesign/08-concept-vs-implementation.png`.

## Viewport e estado

- Implementação: `1280 × 720`, conversa real de Ana Luíza Dutra com sete mensagens, áudio, peça apresentada e cadência disponível.
- Esboço: `1488 × 1024`, normalizado junto à captura real para a auditoria de hierarquia, linguagem e densidade.
- O verde foi limitado ao sinal de conexão; avatares, mensagens e ações deixaram de herdar a linguagem visual do WhatsApp.

## Histórico do loop

### Iteração 1

- P1: a tela anterior reproduzia o padrão lista branca + bolhas verdes e escondia o contexto comercial da conversa.
- P1: produto, PDF e cadências pareciam ferramentas avulsas, não movimentos da relação com o lojista.
- P2: não havia segmentação rápida de não lidas, contexto lateral nem diferenciação clara entre ação principal e estado do canal.

### Iteração 2

- P1: na primeira captura da implementação, o foco automático deslocou a página até o compositor e ocultou o topo da experiência.
- P1: a coluna central não tinha `min-h-0`, fazendo o histórico empurrar o compositor para fora do viewport.

### Correções e evidência posterior

- A caixa de entrada ganhou título editorial, conexão discreta, busca e filtros Todas/Não lidas, com estado ativo coral.
- A conversa passou a usar superfícies carvão/ameixa, preservando texto, imagem, áudio, documento e estados de entrega.
- A apresentação de produtos virou “Vitrine na conversa”, com busca, seleção múltipla, opções de conteúdo e prévia no mesmo dark mode.
- O painel “Pulso comercial” utiliza apenas dados reais derivados do histórico: quantidade de mensagens, materiais enviados e última atividade.
- Produto e cadências aparecem como próximos movimentos no cabeçalho, compositor e contexto lateral.
- O foco do compositor usa `preventScroll`; a página bloqueia rolagem externa durante o atendimento e mantém as três regiões com rolagem interna independente.
- A coluna central recebeu `min-h-0` e `overflow-hidden`, mantendo histórico e compositor dentro do viewport.

## Auditoria das superfícies obrigatórias

- Tipografia: Sora nos títulos e Manrope em toda a operação, com ponto final coral nos títulos editoriais.
- Espaçamento e layout: três planos sem cartões genéricos, divisores finos, cantos de `2px` e densidade adequada para atendimento contínuo.
- Cores e tokens: dark mode prioritário em carvão e preto, coral nas ações, ameixa nas mensagens enviadas e verde mineral somente no estado conectado.
- Conteúdo e ícones: textos em português; nenhum dado de pedido, receita, etapa de pipeline ou cadastro de cliente foi inventado.
- Responsividade: com conversa ativa, o inbox recolhe no mobile e oferece retorno explícito; o pulso comercial aparece a partir de `xl`; ações mantêm rolagem horizontal própria.
- Acessibilidade: busca rotulada, botões com nomes acessíveis, foco coral visível, estados descritos por texto além de cor e textarea com instrução de teclado.

## Verificações finais

- Nenhum achado acionável P0, P1 ou P2 permaneceu.
- Vitrine na conversa — abre, carrega os produtos reais e fecha corretamente.
- Filtro Não lidas — alterna e apresenta o estado vazio correto; Todas restaura a lista.
- Console após recarga final — sem erros ou avisos novos.
- Pest: `29` testes e `91` assertions — pass.
- TypeScript: pass.
- ESLint dos arquivos alterados: pass.
- Prettier: pass.
- Laravel Pint: pass.

final result: passed

# Zouth App — Alinhamento das mensagens do Chat

## Fonte visual de verdade

- Falha reportada: `/var/folders/2j/nmb22s415dlf24fp4d5s3fn00000gn/T/TemporaryItems/NSIRD_screencaptureui_1UVTi6/Screenshot 2026-07-21 at 01.39.38.png`.
- Estado anterior capturado: `tmp/chat-alignment/01-before.png`.
- Estado corrigido: `tmp/chat-alignment/05-outgoing-axis.png`.
- Comparação conjunta inspecionada: `tmp/chat-alignment/06-comparison.png`.

## Viewport e estado

- Validação responsiva no Chat real, conversa `3`, com textos curtos, produtos, áudio, imagem e figurinhas.
- A captura recebida usa densidade e viewport diferentes da captura local; a comparação foi feita pelos eixos visuais das mensagens, não por igualdade absoluta de pixels.

## Histórico do loop

### Iteração 1

- P1: o contêiner adicionado para o menu de reações ocupava a largura intrínseca, enquanto o balão interno aplicava novamente `72%` de largura.
- P1: o espaço invisível resultante fazia produto, texto e áudio terminarem em posições horizontais diferentes.

### Iteração 2

- O limite responsivo de `86%/72%` foi movido para o contêiner-base compartilhado por todos os tipos de mensagem.
- O balão interno passou a usar apenas `max-w-full`, sem um segundo percentual concorrente.
- Mensagens enviadas usam `items-end`; recebidas usam `items-start`.
- Texto, produto e áudio voltaram a terminar no mesmo eixo direito; mídias recebidas permanecem no eixo esquerdo.

## Verificações finais

- Tipografia, cores, bordas, mídia e densidade permaneceram inalteradas.
- Menu de contexto e feedback de reações preservados.
- Responsividade mobile e alinhamento dos diferentes tipos de conteúdo — pass.
- Console após a recarga final — sem erros ou avisos.
- Pest: `38` testes e `148` assertions — pass.
- TypeScript: pass.
- ESLint do componente alterado: pass.
- Prettier: pass.
- Laravel Pint: pass.

final result: passed

# Zouth App — Mensagens rápidas

## Fontes de referência

- Padrão funcional: Intercom Macros, com descoberta por atalho no composer, inserção no cursor e liberdade para editar antes do envio: https://www.intercom.com/help/en/articles/6584504-using-macros-in-the-inbox
- Rotina de atendimento: estudo de console para agentes no Dribbble, com busca, categorias e respostas frequentes como núcleo do trabalho: https://dribbble.com/shots/22619294-Chat-agent-UI-console
- Referências visuais complementares: https://dribbble.com/search/saved-replies e https://www.behance.net/gallery/213722695/Customer-Support-Portal-Dashboard-UI

## Fonte visual de verdade

- Tela do Atendimento usada como referência: `tmp/quick-replies-design/01-zouth-attendance-reference.png`.
- Esboço aprovado após auditoria: `tmp/quick-replies-design/02-quick-replies-concept.png`.
- Implementação real em desktop: `tmp/quick-replies-design/07-final.png`.
- Integração real no Chat: `tmp/quick-replies-design/04-chat-shortcut.png`.
- Estado mobile: `tmp/quick-replies-design/06-mobile.png`.
- Comparação conjunta inspecionada: `tmp/quick-replies-design/05-comparison.png`.

## Viewport e estado

- Comparação principal feita em `1440 × 1024`, com cinco mensagens reais de exemplo e `{catálogo}` selecionada.
- Validação compacta feita em `390 × 844`, com largura útil de `375px` e sem overflow horizontal.
- Chat validado com a conversa `3`, digitando `{cat`, exibindo a sugestão e inserindo a mensagem no composer sem enviá-la.

## Histórico do loop

### Iteração 1 — conceito

- A biblioteca editorial substituiu tabela e cards CRUD repetitivos.
- A tela foi dividida entre repertório, edição e prévia do que o lead recebe.
- O atalho foi tratado como linguagem de trabalho da equipe, com destaque tipográfico e busca imediata.

### Iteração 2 — implementação

- Mantidos a base carvão, o coral de ação, o ameixa de seleção, tipografia semibold e cantos mínimos da identidade Zouth.
- O atalho longo `{pedido_mínimo}` foi preservado em uma linha para não repetir a quebra indesejada do primeiro esboço.
- Formulário, prévia, estado ativo, criação, edição e exclusão usam componentes e padrões compartilhados do sistema.
- No Chat, `{` abre o repertório; setas navegam, `Enter` ou `Tab` inserem e `Esc` fecha. A resposta permanece editável antes do envio.

## Verificações finais

- Hierarquia, pesos, cores, espaçamento, bordas e densidade comparados lado a lado com o esboço — pass.
- Criação de cinco mensagens pelo fluxo real — pass.
- Busca e estados vazio, selecionado, criação, pausa e exclusão cobertos pela interface e testes — pass.
- Sugestão no Chat e inserção sem envio automático — pass.
- Responsividade sem overflow horizontal — pass.
- Console após recarga final — sem erros ou avisos.
- Pest: `47` testes e `211` assertions — pass.
- TypeScript: pass.
- ESLint dos arquivos alterados: pass.
- Prettier: pass.
- Laravel Pint: pass.

final result: passed
