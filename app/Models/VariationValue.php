<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VariationValue extends Model
{
    /** @use HasFactory<\Database\Factories\VariationValueFactory> */
    use HasFactory;

    protected $fillable = [
        'variation_type_id',
        'value',
        'hex',
        'display_order',
    ];

    protected function casts(): array
    {
        return [
            'display_order' => 'integer',
        ];
    }

    public function variationType(): BelongsTo
    {
        return $this->belongsTo(VariationType::class);
    }
}
