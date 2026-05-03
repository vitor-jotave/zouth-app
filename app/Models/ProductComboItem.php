<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductComboItem extends Model
{
    /** @use HasFactory<\Database\Factories\ProductComboItemFactory> */
    use HasFactory;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'combo_product_id',
        'component_product_id',
        'component_variant_stock_id',
        'variation_key',
        'quantity',
    ];

    protected function casts(): array
    {
        return [
            'variation_key' => 'array',
            'quantity' => 'integer',
        ];
    }

    public function comboProduct(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'combo_product_id');
    }

    public function componentProduct(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'component_product_id');
    }

    public function componentVariantStock(): BelongsTo
    {
        return $this->belongsTo(ProductVariantStock::class, 'component_variant_stock_id');
    }
}
