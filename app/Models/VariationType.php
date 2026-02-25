<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class VariationType extends Model
{
    /** @use HasFactory<\Database\Factories\VariationTypeFactory> */
    use HasFactory;

    protected $fillable = [
        'manufacturer_id',
        'name',
        'is_color_type',
        'display_order',
    ];

    protected function casts(): array
    {
        return [
            'is_color_type' => 'boolean',
            'display_order' => 'integer',
        ];
    }

    public function manufacturer(): BelongsTo
    {
        return $this->belongsTo(Manufacturer::class);
    }

    public function values(): HasMany
    {
        return $this->hasMany(VariationValue::class)->orderBy('display_order');
    }

    public function productVariations(): HasMany
    {
        return $this->hasMany(ProductVariation::class);
    }
}
