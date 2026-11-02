<?php

namespace App\Support;

use App\Models\WhatsappFunnel;

class WhatsappAutomationValidation
{
    /** @param array<string, mixed> $definition
     * @return array<int, string>
     */
    public function issues(array $definition, int $manufacturerId): array
    {
        $issues = [];
        $nodes = collect($definition['nodes'] ?? []);
        $edges = collect($definition['edges'] ?? []);
        $triggers = $nodes->where('kind', 'trigger');
        if ($triggers->count() !== 1) {
            $issues[] = 'Inclua exatamente um início para o fluxo.';
        }
        if ($nodes->pluck('id')->unique()->count() !== $nodes->count()) {
            $issues[] = 'Há movimentos com identificadores repetidos.';
        }
        $funnelIds = $nodes->where('movement', 'send_funnel')->pluck('data.funnel_id')->filter()->unique();
        $available = WhatsappFunnel::query()->where('manufacturer_id', $manufacturerId)->where('is_active', true)->whereIn('id', $funnelIds)->pluck('id');
        foreach ($nodes as $node) {
            $expectedKind = match ($node['movement']) {
                'message_contains' => 'condition',
                'message_received', 'client_replied' => 'trigger',
                default => 'action',
            };
            if ($node['kind'] !== $expectedKind) {
                $issues[] = $node['data']['title'].': tipo de movimento incompatível.';
            }
            if ($node['movement'] === 'send_funnel' && ! $available->contains(data_get($node, 'data.funnel_id'))) {
                $issues[] = $node['data']['title'].': escolha um funil ativo.';
            }
            if ($node['movement'] === 'message_contains' && collect(data_get($node, 'data.keywords', []))->filter(fn (string $word): bool => trim($word) !== '')->isEmpty()) {
                $issues[] = $node['data']['title'].': inclua uma palavra para conferir a mensagem.';
            }
            $outgoing = $edges->where('from', $node['id']);
            if ($outgoing->contains(fn (array $edge): bool => $node['kind'] === 'condition' ? ! in_array($edge['branch'] ?? null, ['sim', 'não'], true) : ($edge['branch'] ?? null) !== null)) {
                $issues[] = $node['data']['title'].': confira a saída de cada ligação.';
            }
            $destinations = $node['kind'] === 'condition' ? $outgoing->pluck('branch')->unique()->count() : min(1, $outgoing->count());
            if ($destinations !== $outgoing->count()) {
                $issues[] = $node['data']['title'].': há mais de um destino para o mesmo caminho.';
            }
        }
        $indegree = $nodes->pluck('id')->mapWithKeys(fn (string $id): array => [$id => $edges->where('to', $id)->count()])->all();
        $queue = array_keys(array_filter($indegree, fn (int $count): bool => $count === 0));
        $visited = 0;
        while ($queue !== []) {
            $id = array_shift($queue);
            $visited++;
            foreach ($edges->where('from', $id) as $edge) {
                if (isset($indegree[$edge['to']]) && --$indegree[$edge['to']] === 0) {
                    $queue[] = $edge['to'];
                }
            }
        }
        if ($visited !== $nodes->count()) {
            $issues[] = 'Há uma ligação circular. Remova o retorno antes de ativar.';
        }
        if ($triggers->count() === 1) {
            $reachable = [];
            $queue = [$triggers->first()['id']];
            while ($queue !== []) {
                $id = array_shift($queue);
                if (isset($reachable[$id])) {
                    continue;
                }
                $reachable[$id] = true;
                foreach ($edges->where('from', $id) as $edge) {
                    $queue[] = $edge['to'];
                }
            }
            if (count($reachable) !== $nodes->count()) {
                $issues[] = 'Há movimentos desconectados do início.';
            }
        }

        return $issues;
    }
}
