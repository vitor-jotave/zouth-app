<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    /** @use HasFactory<\Database\Factories\OrderItemFactory> */
    use HasFactory;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'order_id',
        'product_id',
        'product_name',
        'product_sku',
        'unit_price',
        'quantity',
        'reserved_quantity',
        'size',
        'color',
        'product_variant_stock_id',
        'selected_variations',
        'combo_components',
    ];

    protected function casts(): array
    {
        return [
            'unit_price' => 'decimal:2',
            'quantity' => 'integer',
            'reserved_quantity' => 'integer',
            'selected_variations' => 'array',
            'combo_components' => 'array',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function totalPieces(): int
    {
        $components = collect($this->combo_components ?? []);

        if ($components->isEmpty()) {
            return (int) $this->quantity;
        }

        $piecesPerComposition = (int) $components->sum(
            fn (array $component): int => max(0, (int) ($component['quantity'] ?? 0)),
        );

        return $piecesPerComposition > 0
            ? $piecesPerComposition * (int) $this->quantity
            : (int) $this->quantity;
    }
}
