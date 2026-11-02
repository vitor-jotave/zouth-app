<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class OrderRule extends Model
{
    /** @use HasFactory<\Database\Factories\OrderRuleFactory> */
    use HasFactory;

    use SoftDeletes;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'manufacturer_id',
        'name',
        'description',
        'is_active',
        'match_mode',
        'conditions',
        'action',
        'public_message',
        'message_mode',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'conditions' => 'array',
            'action' => 'array',
            'sort_order' => 'integer',
        ];
    }

    public function manufacturer(): BelongsTo
    {
        return $this->belongsTo(Manufacturer::class);
    }

    /**
     * @return array{id: int, name: string, match_mode: string, conditions: array<int, array<string, mixed>>, action: array<string, mixed>, public_message: string|null}
     */
    public function publicRepresentation(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'match_mode' => $this->match_mode,
            'conditions' => $this->conditions,
            'action' => $this->action,
            'public_message' => self::messageFor($this->action, $this->public_message, $this->message_mode),
        ];
    }

    /** @param array<string, mixed> $action */
    public static function messageFor(array $action, ?string $message, ?string $mode = null): string
    {
        $message = trim($message ?? '');
        $automatic = $message === '' || preg_match('/^(Você liberou (?:[\d.,]+%|R\$ [\d.,]+) de desconto neste pedido\.|A seleção desta coleção liberou [\d.,]+% de desconto\.|O pedido mínimo é de R\$ 1\.500\. Adicione mais peças para continuar\.|Escolha ao menos 8 modelos diferentes para finalizar\.)$/u', $message) === 1;
        if ($mode === 'custom' || ($mode !== 'auto' && ! $automatic)) {
            return $message;
        }
        $value = ($action['value'] ?? 0) / 100;

        return match ($action['type'] ?? '') {
            'percentage_discount' => 'Você liberou '.rtrim(rtrim(number_format($value, 2, ',', '.'), '0'), ',').'% de desconto neste pedido.',
            'fixed_discount' => 'Você liberou R$ '.number_format($value, 2, ',', '.').' de desconto neste pedido.',
            default => 'Este pedido ainda não atende às condições mínimas do fabricante.',
        };
    }
}
