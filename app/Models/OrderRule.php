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
            'public_message' => $this->public_message,
        ];
    }
}
