<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsappAutomation extends Model
{
    /** @use HasFactory<\Database\Factories\WhatsappAutomationFactory> */
    use HasFactory;

    protected $fillable = [
        'manufacturer_id',
        'name',
        'is_active',
        'definition',
        'last_activated_at',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'definition' => 'array',
            'last_activated_at' => 'datetime',
        ];
    }

    public function manufacturer(): BelongsTo
    {
        return $this->belongsTo(Manufacturer::class);
    }

    /**
     * @return array{nodes: array<int, array<string, mixed>>, edges: array<int, array<string, mixed>>}
     */
    public static function starterDefinition(?int $funnelId = null): array
    {
        return [
            'nodes' => [
                [
                    'id' => 'trigger-message',
                    'kind' => 'trigger',
                    'movement' => 'message_received',
                    'position' => ['x' => 36, 'y' => 218],
                    'data' => [
                        'title' => 'Mensagem recebida',
                        'summary' => 'Quando uma nova conversa chega',
                    ],
                ],
                [
                    'id' => 'condition-interest',
                    'kind' => 'condition',
                    'movement' => 'message_contains',
                    'position' => ['x' => 260, 'y' => 218],
                    'data' => [
                        'title' => 'Demonstra interesse',
                        'summary' => 'Mensagem contém produto, preço ou coleção',
                        'keywords' => ['produto', 'preço', 'coleção'],
                        'match' => 'any',
                        'case_sensitive' => false,
                    ],
                ],
                [
                    'id' => 'action-funnel',
                    'kind' => 'action',
                    'movement' => 'send_funnel',
                    'position' => ['x' => 490, 'y' => 72],
                    'data' => [
                        'title' => 'Enviar funil',
                        'summary' => 'Escolha um roteiro comercial',
                        'funnel_id' => $funnelId,
                    ],
                ],
                [
                    'id' => 'action-wait',
                    'kind' => 'action',
                    'movement' => 'wait_reply',
                    'position' => ['x' => 490, 'y' => 320],
                    'data' => [
                        'title' => 'Aguardar nova mensagem',
                        'summary' => 'Retoma quando o cliente responder',
                    ],
                ],
            ],
            'edges' => [
                [
                    'id' => 'edge-trigger-condition',
                    'from' => 'trigger-message',
                    'to' => 'condition-interest',
                    'branch' => null,
                ],
                [
                    'id' => 'edge-condition-yes',
                    'from' => 'condition-interest',
                    'to' => 'action-funnel',
                    'branch' => 'sim',
                ],
                [
                    'id' => 'edge-condition-no',
                    'from' => 'condition-interest',
                    'to' => 'action-wait',
                    'branch' => 'não',
                ],
            ],
        ];
    }
}
