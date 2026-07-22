# Zouth Design System

Versão 1.0 - 17 de julho de 2026

Este documento transforma a identidade visual aprovada da Zouth em um sistema utilizável em comunicação, marketing e experiências digitais. A fonte visual principal é o arquivo `Zouth - Brand ID - Final.pdf`.

## Como ler este documento

Cada regra recebe um dos seguintes status:

- **Identidade aprovada:** aparece de forma explícita no PDF final ou nos assets oficiais exportados.
- **Extensão operacional:** decisão criada para tornar a identidade aplicável em meios digitais sem alterar sua lógica.
- **Pendente de validação:** aplicação presente no PDF, mas sem master oficial exportado ou especificação suficiente para uso produtivo.

Em caso de conflito, siga esta ordem:

1. Assets oficiais exportados.
2. `Zouth - Brand ID - Final.pdf`.
3. Regras de identidade aprovada deste documento.
4. Extensões operacionais.

---

## 1. Essência da marca

**Status: identidade aprovada**

### Conceito central

> Da coleção ao interesse.

A Zouth preserva a força da coleção em cada apresentação e mostra ao comercial onde o interesse está surgindo — da marca para o representante, do representante para o lojista.

### Assinatura verbal

> Zouth. Sua coleção em movimento.

### Sequência narrativa

1. **A coleção nasce.** Criada com identidade, intenção e desejo de ser vista.
2. **A coleção circula.** A mesma força acompanha cada apresentação e cada representante.
3. **O interesse aparece.** Sinais ajudam o comercial a perceber onde existe oportunidade de ação.

### Princípios de expressão

- **Neutra para receber.** A identidade abre espaço para a coleção do cliente.
- **Expressiva para sinalizar.** A cor destaca foco, interesse e ação.
- **Editorial no desejo.** Tipografia, fotografia e composição constroem presença.
- **Precisa na informação.** Dados, descrições e chamadas permanecem claros.
- **Em movimento com intenção.** Cada transição guia o olhar e preserva o contexto.

---

## 2. Logotipo

**Status: identidade aprovada, com exports pendentes**

O logotipo completo é a assinatura preferencial da marca. O ponto final é parte inseparável do desenho e encerra o nome com intenção.

### Versões disponíveis

| Contexto      | Arquivo                                            | Status   |
| ------------- | -------------------------------------------------- | -------- |
| Fundo claro   | `public/brand/zouth/assets/logo-duotone-dark.png`  | Oficial  |
| Fundo escuro  | `public/brand/zouth/assets/logo-duotone-light.png` | Oficial  |
| Fundo coral   | Não exportado                                      | Pendente |
| Monocromático | Não exportado                                      | Pendente |
| Vetorial      | Não exportado                                      | Pendente |

### Combinação para fundo coral

O PDF mostra a marca em areia `#E7E3DC` com ponto carvão `#18181F` sobre campo coral. Essa combinação é aprovada visualmente, mas não existe como arquivo separado na pasta entregue.

Não recolorir os PNGs disponíveis para simular essa versão. Antes do uso produtivo, exportar um master oficial para fundo coral.

### Área de proteção

**Status: identidade aprovada**

Mantenha ao redor do logotipo um respiro equivalente à altura da letra `Z`. Nenhum texto, fotografia, borda ou outro elemento deve invadir esse campo.

### Tamanhos de teste

**Status: extensão operacional provisória**

- Começar os testes digitais com o logotipo a partir de `120 px` de largura.
- Começar os testes do símbolo a partir de `24 px`.
- Validar sempre a nitidez do ponto e a leitura do `Z` no dispositivo real.
- Esses valores não são mínimos oficiais e devem ser revistos quando houver masters vetoriais.

### Usos incorretos

**Status: identidade aprovada**

- Não distorcer ou alterar proporções.
- Não alterar as cores das versões oficiais.
- Não adicionar brilhos, contornos, filtros ou sombras artificiais ao arquivo.
- Não remontar o nome com uma fonte.
- Não remover ou deslocar o ponto.
- Não trocar o logotipo pelo símbolo quando a assinatura completa couber com clareza.
- Não usar o símbolo isolado em peças institucionais ou na comunicação principal da marca.
- Não aplicar sobre imagens sem contraste suficiente.

**Status: extensão operacional**

Relevo, materialidade e sombra física são permitidos em sinalização e aplicações ambientais, desde que preservem geometria, proporção e combinação cromática.

---

## 3. Símbolo

**Status: identidade aprovada, com exports pendentes**

O símbolo condensa a lógica da Zouth em três sinais:

| Parte   | Significado                            |
| ------- | -------------------------------------- |
| `Z`     | Direção, impulso e movimento.          |
| Moldura | Presença, enquadramento e contexto.    |
| Ponto   | Atração, foco, interesse e relevância. |

O conjunto representa uma coleção em movimento: uma passagem que gera interesse.

### Usos apropriados

- Favicon e avatar.
- Ícone de aplicativo e perfil social.
- Marcador de interesse.
- Espaços compactos em que a assinatura completa não seja viável.

O símbolo não substitui o logotipo em peças institucionais ou comunicação principal.

### Versões disponíveis

| Contexto      | Arquivo                                              | Status   |
| ------------- | ---------------------------------------------------- | -------- |
| Fundo claro   | `public/brand/zouth/assets/symbol-duotone-dark.png`  | Oficial  |
| Fundo escuro  | `public/brand/zouth/assets/symbol-duotone-light.png` | Oficial  |
| Fundo coral   | Não exportado                                        | Pendente |
| Monocromático | Não exportado                                        | Pendente |
| Vetorial      | Não exportado                                        | Pendente |

---

## 4. Paleta

**Status: identidade aprovada**

### Base neutra

| Token               | Nome         | Hex       | Papel                                         |
| ------------------- | ------------ | --------- | --------------------------------------------- |
| `--zouth-charcoal`  | Carvão       | `#18181F` | Tipografia, estrutura, molduras e hierarquia. |
| `--zouth-ivory`     | Marfim       | `#F6F4F0` | Fundo principal e área de respiro.            |
| `--zouth-sand`      | Areia        | `#E7E3DC` | Planos leves e fundos secundários.            |
| `--zouth-stone`     | Pedra        | `#CAC4BA` | Divisores, planos intermediários e bordas.    |
| `--zouth-warm-gray` | Cinza quente | `#98968D` | Informação de apoio e planos profundos.       |

### Cor de interesse

| Token           | Nome               | Hex       | Papel                                                                |
| --------------- | ------------------ | --------- | -------------------------------------------------------------------- |
| `--zouth-coral` | Coral de interesse | `#FF4D3D` | Molduras, destaques, pontos de foco, ações e sinais de oportunidade. |

### Cores de apoio

| Token             | Nome          | Hex       | Papel                                |
| ----------------- | ------------- | --------- | ------------------------------------ |
| `--zouth-plum`    | Ameixa        | `#5A2A4F` | Profundidade e variação editorial.   |
| `--zouth-mineral` | Verde mineral | `#2E705A` | Profundidade e chamadas secundárias. |

**Status: extensão operacional**

Como regra de controle visual, use somente uma cor de apoio por composição. As cores de apoio não disputam protagonismo com o coral.

### Proporção-base

**Status: extensão operacional de conciliação**

- `70%` base clara: fundos, áreas amplas e respiro.
- `20%` estrutura/carvão: tipografia, ícones, molduras e hierarquia.
- `10%` interesse e apoio: destaques, ações e variações pontuais.

O manual afirma que a cor de interesse não deve dominar a composição e, ao mesmo tempo, mostra capas, fotografia e aplicações com coral dominante. Até haver uma regra adicional, usar `70/20/10` em peças informativas e permitir coral dominante somente quando a composição seguir uma aplicação de impacto já demonstrada no PDF.

### Coral na fotografia

**Status: pendente de validação**

A página de fotografia do PDF apresenta um coral visualmente mais escuro do que `#FF4D3D`. Até confirmar se isso é sobreposição, tratamento fotográfico ou efeito da exportação, não criar um novo token. Para superfícies digitais planas, usar o coral oficial.

### Contraste digital

**Status: extensão operacional**

- Carvão sobre marfim: `16.07:1`.
- Carvão sobre coral: `5.37:1`.
- Marfim sobre coral: `3.00:1`; reservar para texto grande ou forte.
- Marfim sobre ameixa: `10.18:1`.
- Marfim sobre verde mineral: `5.34:1`.

---

## 5. Tipografia

**Status: identidade aprovada**

### Sora

Sora é a voz principal da marca. Use em títulos, chamadas, destaques, números e dados.

Pesos aprovados: Light, Regular, Medium, SemiBold, Bold e ExtraBold.

Arquivo local do espécime: `public/brand/zouth/assets/sora-variable.ttf`.

### Manrope

Manrope sustenta textos longos, descrições, legendas e informações de apoio.

Pesos aprovados: Light, Regular, Medium, SemiBold e Bold.

Arquivo local do espécime: `public/brand/zouth/assets/manrope-variable.ttf`.

### Hierarquia aprovada

| Papel            | Família e peso  |
| ---------------- | --------------- |
| Display/destaque | Sora ExtraBold  |
| Títulos          | Sora Bold       |
| Subtítulos       | Sora Medium     |
| Texto corrido    | Manrope Regular |
| Legenda/apoio    | Manrope Regular |
| Números e dados  | Sora Bold       |

### Escala digital

**Status: extensão operacional**

| Papel        | Tamanho                    | Entrelinha | Tracking   |
| ------------ | -------------------------- | ---------- | ---------- |
| Display XL   | `clamp(64px, 10vw, 144px)` | `0.90`     | `-0.065em` |
| Display      | `clamp(48px, 7vw, 104px)`  | `0.92`     | `-0.055em` |
| Título 1     | `clamp(40px, 5vw, 72px)`   | `0.98`     | `-0.045em` |
| Título 2     | `clamp(30px, 3.5vw, 48px)` | `1.04`     | `-0.035em` |
| Título 3     | `24px`                     | `1.12`     | `-0.02em`  |
| Corpo grande | `20px`                     | `1.55`     | `-0.012em` |
| Corpo        | `16px`                     | `1.60`     | `-0.006em` |
| Legenda      | `13px`                     | `1.45`     | `0`        |
| Rótulo       | `12px`                     | `1.2`      | `0.12em`   |

### Ponto de interesse tipográfico

O ponto coral pode encerrar displays, títulos e chamadas curtas. Não acrescentar a todos os textos automaticamente. Em versões oficiais para fundo coral, o ponto usa a cor aprovada para esse contexto.

---

## 6. Composição

### Ritmo visual

**Status: extensão operacional derivada das aplicações aprovadas**

- Grandes áreas de respiro.
- Assimetria organizada por um grid firme.
- Um elemento dominante por composição.
- Linhas finas para organizar conteúdo.
- Sobreposição de planos para criar profundidade.
- Imagem, palavra ou dado como protagonista.
- Evitar coleções de cards com o mesmo peso visual.

### Grid e espaçamento

**Status: extensão operacional**

- Unidade base: `4 px`.
- Escala: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 160`.
- Conteúdo editorial: até `1440 px`.
- Margens laterais: `24 px` no mobile, `48 px` no tablet e `64-80 px` no desktop.
- Espaço entre seções: `72-96 px` no mobile e `96-160 px` no desktop.

### Superfícies

**Status: extensão operacional derivada**

- Painel principal em marfim ou areia, sem sombra artificial.
- Separação por borda de `1 px` em pedra.
- Profundidade por sobreposição, recorte ou contraste.
- Cantos estruturais e botões retos ou com raio mínimo.
- Fotografia e stories podem usar raio de `16-20 px`.

---

## 7. Elementos gráficos

**Status: identidade aprovada; masters pendentes**

### Moldura de interesse

Enquadra e destaca o que importa.

### Ponto de interesse

Cria foco e sinaliza o essencial.

### Linha de continuidade

Conecta momentos e orienta o olhar.

### Planos e níveis

Sobreposição que cria hierarquia e profundidade.

### Padrão modular

Repetição controlada que cria ritmo e estrutura.

### Recorte progressivo

Cortes que crescem ou se deslocam para gerar progressão.

### Combinações aprovadas

- Moldura + ponto.
- Planos + recorte progressivo.
- Linha + padrão modular.

Não usar todos os elementos simultaneamente.

### Disponibilidade

Os arquivos `graphic-*.png` no espécime HTML são recortes de baixa resolução retirados do PDF. Eles servem apenas como referência visual e não são masters.

Antes do uso produtivo, exportar moldura, ponto, linha, planos, padrão e recorte em vetor ou PNG transparente. Esses grafismos podem ser reproduzidos responsivamente quando sua geometria oficial estiver documentada; logo e símbolo nunca devem ser reconstruídos.

---

## 8. Fotografia

**Status: direção aprovada; arquivos em alta pendentes**

A fotografia mostra moda infantil em contexto comercial e conecta coleção e lojista.

### Quatro qualidades

- **Real:** pessoas e ambientes verdadeiros.
- **Comercial:** loja, contexto de lojista e experiência de compra.
- **Natural:** movimento espontâneo e interações autênticas.
- **Calorosa:** luz natural, tons quentes e atmosfera acolhedora.

### Direção operacional derivada

- Mostrar a relação entre pessoa, produto e ambiente.
- Dar escala a tecidos, araras, detalhes e gestos.
- Preferir profundidade real e luz suave.
- Manter tons próximos aos neutros quentes da marca.
- Usar a moldura de interesse para destacar, não decorar.

Essas diretrizes orientam a comunicação da Zouth. Elas não limitam a direção fotográfica própria das coleções dos clientes.

### Disponibilidade

Os arquivos `photo-*.png` no espécime HTML são recortes de referência retirados da página 9. Eles têm baixa resolução, borda e tratamento incorporados. Não usar como fotografia master em peças finais.

---

## 9. Movimento

**Status: princípios aprovados; tempos e curvas operacionais**

O movimento da Zouth é sutil, intencional e significativo. Cada transição guia o olhar, preserva contexto e reforça progressão.

### Princípios aprovados

1. **Entrada:** o elemento parece vir de um quadro anterior.
2. **Continuidade:** imagem, palavra ou moldura atravessa a transição.
3. **Expansão:** o produto ganha escala e presença.
4. **Foco:** a moldura encontra e acompanha o que importa.
5. **Recorrência:** o sinal reaparece e sugere interesse acumulado.
6. **Retorno:** a informação volta ao comercial e fecha o ciclo.

### Comportamento aprovado

- Sutil, não chamativo.
- Contínuo, não brusco.
- Direcional, não decorativo.
- Significativo, não gratuito.
- Guiado pelo grid.

### Duração e curva

**Status: extensão operacional**

- Microinteração: `160-220 ms`.
- Entrada de componente: `320-480 ms`.
- Transição editorial: `600-900 ms`.
- Curva principal: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Recorrência: `cubic-bezier(0.65, 0, 0.35, 1)`.

Respeitar `prefers-reduced-motion`. Não usar glow, bounce exagerado, partículas, 3D gratuito ou transições genéricas de startup.

As animações do espécime HTML são interpretações operacionais dos princípios acima. Elas não substituem um master de motion com sequências e tempos oficialmente aprovados.

---

## 10. Gramática de aplicações

**Status: extensão operacional derivada das aplicações aprovadas**

### Capas e encerramentos

1. Campo coral com marca areia e ponto carvão — master pendente.
2. Campo carvão com marca areia e ponto coral — asset disponível.
3. Fotografia cercada por moldura coral espessa.

### Feed editorial

- Logo discreto.
- Headline grande e assimétrica.
- Imagem com recorte ou moldura de interesse.
- Microcopy na base.

### Feed de dados

- Número em Sora Bold.
- Coral como dado principal.
- Contexto curto em Manrope.
- Produtos ou imagens secundárias em neutros.
- Todo número de demonstração deve ser marcado como fictício.

### Card coral

- Uma única frase forte.
- Alto contraste.
- Logo com a combinação cromática aprovada para o fundo.
- Sem elementos decorativos extras.

### Stories

- Logo na região superior.
- Headline em dois ou três blocos.
- Imagem ou plano ocupando a metade inferior.
- Ação na base.
- Cantos arredondados pertencem ao formato, não ao sistema inteiro.

### Reels

- Divisão clara entre texto e imagem.
- Moldura de interesse atravessando a fotografia.
- CTA direto.
- Movimento contínuo entre os planos.

### Hero e anúncio

- Dor ou verdade simples abre a peça.
- Desejo e valor sustentam a mensagem.
- Benefícios aparecem em sequência curta.
- CTA direto acompanhado de microcopy quando necessário.
- Imagem principal recebe moldura, recorte ou sobreposição.

### Banner CTA

- Sinal gráfico à esquerda.
- Mensagem curta no centro.
- Ação e assinatura à direita.

### Aplicações comerciais

- Coral pode atuar como moldura externa de fotografia.
- Materiais impressos usam grandes áreas neutras e assinatura com respiro.
- A marca pode aparecer em sinalização física com materialidade real.
- A assinatura “Powered by Zouth” deve ser discreta e não competir com a marca do fabricante.

As páginas 11-15 são referência de composição. Métricas, nomes de coleções, ofertas, “Curadoria Zouth”, “diagnóstico gratuito” e outros textos demonstrativos não constituem promessas comerciais aprovadas.

---

## 11. Componentes digitais

**Status: extensão operacional**

Os componentes devem parecer extensões editoriais da marca, não uma biblioteca genérica de software.

### Botão coral

- Fundo coral e texto carvão para contraste AA.
- Altura mínima de `48 px`.
- Padding horizontal de `24 px`.
- Cantos retos ou raio de até `2 px`.
- Hover por deslocamento de até `1 px`, sem criar uma nova cor.
- Foco visível em carvão ou coral, conforme o fundo.

O PDF usa texto claro sobre coral em alguns exemplos. Essa combinação é aceita apenas em texto grande ou forte; para labels pequenos, a adaptação acessível usa carvão.

### Botão carvão

- Fundo carvão e texto marfim.
- Mesma geometria do botão coral.

### Botão verde mineral

- Fundo verde mineral e texto marfim.
- Uso contextual e secundário.
- Nunca competir com uma ação coral na mesma hierarquia.

### Ação editorial

- Texto carvão sem preenchimento.
- Linha inferior ou ponto de interesse.
- Indicada para explorar coleção, ver detalhes e navegação de apoio.

### Campos

- Fundo marfim.
- Borda de `1 px` em pedra.
- Altura mínima de `52 px`.
- Labels em Sora SemiBold, caixa alta e tracking amplo.
- Foco em carvão com sinal coral.

### Cards

- Estrutura aberta, sem sombra artificial.
- Imagem ou dado como protagonista.
- Borda somente quando organiza a leitura.
- Títulos em Sora e informação em Manrope.
- Coral reservado ao foco, à ação ou ao dado principal.

### Dados

- Números em Sora Bold.
- Contexto em Manrope.
- Neutros, coral e no máximo uma cor de apoio.
- Métricas demonstrativas precisam ser identificadas como fictícias.

---

## 12. Acessibilidade

**Status: extensão operacional obrigatória**

- Manter contraste WCAG AA para texto funcional.
- Não usar somente cor para comunicar estado ou interesse.
- Preservar foco visível.
- Garantir alvos de toque de pelo menos `44 x 44 px`.
- Permitir zoom sem corte ou sobreposição.
- Incluir texto alternativo que descreva a função da imagem.
- Reduzir ou remover animações quando solicitado pelo usuário.

---

## 13. Manifesto de arquivos

### Masters oficiais disponíveis

| Arquivo                    |  Dimensão | Transparência | Uso permitido               |
| -------------------------- | --------: | ------------- | --------------------------- |
| `logo-duotone-dark.png`    | 713 x 124 | Sim           | Logo sobre fundo claro.     |
| `logo-duotone-light.png`   | 713 x 124 | Sim           | Logo sobre fundo escuro.    |
| `symbol-duotone-dark.png`  | 230 x 211 | Sim           | Símbolo sobre fundo claro.  |
| `symbol-duotone-light.png` | 230 x 211 | Sim           | Símbolo sobre fundo escuro. |

### Fontes do espécime

Os arquivos abaixo foram incorporados apenas para que o HTML local reproduza a tipografia indicada no manual. Eles não faziam parte da pasta final da identidade; confirmar licença e forma de distribuição antes de incluí-los em outros pacotes.

| Arquivo                | Tipo           | Uso                             |
| ---------------------- | -------------- | ------------------------------- |
| `sora-variable.ttf`    | Fonte variável | Usar apenas os pesos aprovados. |
| `manrope-variable.ttf` | Fonte variável | Usar apenas os pesos aprovados. |

### Recortes de referência

| Grupo           | Origem          | Uso permitido                                                  |
| --------------- | --------------- | -------------------------------------------------------------- |
| `graphic-*.png` | Página 8 do PDF | Demonstração no design system; não usar como master.           |
| `photo-*.png`   | Página 9 do PDF | Demonstração no design system; não usar como fotografia final. |

### Exports pendentes

- Logo para fundo coral.
- Símbolo para fundo coral.
- Logo monocromático.
- Símbolo monocromático.
- Logo e símbolo vetoriais.
- Grafismos vetoriais ou com transparência.
- Fotografias em alta resolução sem tratamento incorporado.

---

## 14. Checklist de aprovação

- O asset oficial correto foi escolhido para o fundo?
- A aplicação exige uma versão ainda não exportada?
- A área de proteção foi preservada?
- O ponto usa a cor aprovada para esse contexto?
- A proporção 70/20/10 está sendo aplicada a uma peça informativa, ou a exceção de campanha está justificada?
- Existe um único elemento dominante?
- Sora e Manrope ocupam os papéis corretos?
- A fotografia é real, comercial, natural e calorosa?
- Os grafismos guiam a leitura em vez de decorar?
- O movimento possui direção e significado?
- O resultado parece editorial e comercial, não infantil ou SaaS genérico?
- Métricas e conteúdos de demonstração estão identificados como fictícios?
- Contraste, foco e movimento reduzido foram verificados?
- Recortes de referência não estão sendo usados como masters?
