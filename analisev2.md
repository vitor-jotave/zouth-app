# Análise do Fluxo de Cadastro de Produtos

## O que está BEM feito

1. **Wizard em 3 steps** — Dados básicos → Mídia → Variações/Estoque. Separa bem a complexidade.
2. **Validação robusta** — O `withValidator()` nos Form Requests cobre todas as combinações de variantes (cor x tamanho), duplicação, combinações faltantes e conflitos.
3. **Normalização de preço** — Aceita vírgula e ponto como separador decimal (bom para BR).
4. **Geração automática da matriz de estoque** — `buildVariantStocks()` mantém os valores existentes ao mudar seleções.
5. **Limites do plano** — Verificação de limite de produtos e storage antes de salvar.
6. **Mídia gerenciável** — Reordenação, upload separado por tipo, limite de 1 vídeo.
7. **SKU único por fabricante** — Validação com `Rule::unique` com escopo correto.

---

## Problemas e Melhorias

### 1. ~~CRÍTICO: Upload de imagens sem graça~~ ✅
- [x] Substituir `<input type="file">` por drag & drop visual
- [x] Editor de crop 4:5 com `react-image-crop`
- [x] Compressão client-side para ≤2MB via Canvas API
- [x] Upload para Cloudflare R2 (disk s3)

### 2. ~~UX: Botão "Voltar" confuso no step 0~~ ✅
- [x] O botão "Voltar" agora só aparece a partir do step 1. No step 0, é substituído por um espaçador.

### 3. ~~UX: Validação por step antes de avançar~~ ✅
- [x] Validação client-side no step 0 (nome e SKU obrigatórios) antes de permitir "Continuar"
- [x] Ao receber erros do backend, navega automaticamente para o primeiro step que contém o erro

### 4. ~~UX: Indicador visual de step incompleto/com erro~~ ✅
- [x] Botões de step agora mostram ícone `CircleAlert` vermelho quando há erros de validação naquele step.

### 5. UX: Tamanhos fixos (RN, P, M, G) — Muito limitado
- [ ] O enum `ProductSize` só tem 4 valores. Números (36-48) e outros tamanhos (PP, GG, XG, EG, EGG, Único) são comuns.
- [ ] Permitir tamanhos customizáveis por fabricante ou pelo menos expandir o enum.

### 6. ~~UX: Debounce na busca da lista~~ ✅
- [x] Busca agora tem debounce de 300ms via `setTimeout` + `useRef`.

### 7. ~~UX: Confirmação de exclusão com `window.confirm`~~ ✅
- [x] `handleDelete` agora usa `AlertDialog` do shadcn/ui com botões "Cancelar" e "Excluir".

### 8. UX: Falta feedback de progresso no upload de mídia
- [ ] Não há barra de progresso ou indicador de upload ativo. Para vídeos de até 50MB isso é importante.

### 9. ~~Backend: `Storage::delete` sem especificar disk~~ ✅
- [x] `ProductMediaController`, `ProductController::destroy` e `ProductUpsertService` agora usam `Storage::disk('s3')` explicitamente.

### 10. ~~UX: Reordenação de mídia com setas ↑↓~~ ✅
- [x] Substituídas as setas por drag-and-drop com `@dnd-kit/sortable`.
- [x] Ordem é salva automaticamente ao soltar (sem botão "Salvar ordem").
- [x] Handle de drag com ícone `GripVertical` visual.

### 11. ~~UX: Falta indicador de limite no upload~~ ✅
- [x] `ImageDropzone` já exibe "Máx. N fotos · X restantes" baseado em `maxFiles` e `currentCount`.

### 12. ~~UX: Falta preview de mídia no create~~ ✅
- [x] Preview com `URL.createObjectURL` já implementado, incluindo contagem de fotos prontas para envio.

### 13. ~~UX: Botão de submit sem estado de loading~~ ✅
- [x] Botão "Criar produto" exibe spinner + texto "Criando..." durante o submit.
- [x] Botão "Salvar alterações" exibe spinner + texto "Salvando..." durante o submit.
- [x] Após criar com sucesso, redireciona para a lista de produtos.
