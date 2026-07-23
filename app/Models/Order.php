<?php

namespace App\Models;

use App\Enums\OrderStatus;
use App\Enums\OrderType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    /** @use HasFactory<\Database\Factories\OrderFactory> */
    use HasFactory;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'manufacturer_id',
        'customer_id',
        'sales_rep_id',
        'public_token',
        'status',
        'order_type',
        'subtotal_cents',
        'discount_cents',
        'total_cents',
        'applied_order_rules',
        'customer_name',
        'customer_phone',
        'customer_email',
        'customer_document_type',
        'customer_document',
        'customer_notes',
        'customer_zip_code',
        'customer_state',
        'customer_city',
        'customer_neighborhood',
        'customer_street',
        'customer_address_number',
        'customer_address_complement',
        'customer_address_reference',
        'internal_notes',
        'tracking_ref',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'inventory_reserved_at',
        'inventory_released_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'order_type' => OrderType::class,
            'subtotal_cents' => 'integer',
            'discount_cents' => 'integer',
            'total_cents' => 'integer',
            'applied_order_rules' => 'array',
            'inventory_reserved_at' => 'datetime',
            'inventory_released_at' => 'datetime',
        ];
    }

    public function manufacturer(): BelongsTo
    {
        return $this->belongsTo(Manufacturer::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function salesRep(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sales_rep_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function statusHistory(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class)->orderBy('created_at');
    }

    public function totalItems(): int
    {
        return $this->relationLoaded('items')
            ? (int) $this->items->sum('quantity')
            : (int) $this->items()->sum('quantity');
    }

    public function isQuote(): bool
    {
        return $this->order_type === OrderType::Quote;
    }

    public function statusLabel(?OrderStatus $status = null): string
    {
        $resolvedStatus = $status ?? $this->status;

        if (! $this->isQuote()) {
            return $resolvedStatus->label();
        }

        return match ($resolvedStatus) {
            OrderStatus::New => 'Recebido',
            OrderStatus::Confirmed => 'Em negociação',
            OrderStatus::Preparing => 'Aprovado',
            OrderStatus::Shipped => 'Formalizado',
            OrderStatus::Delivered => 'Concluído',
            OrderStatus::Cancelled => 'Encerrado',
        };
    }

    public function totalAmount(): float
    {
        return round($this->totalCents() / 100, 2);
    }

    public function subtotalCents(): int
    {
        if ($this->subtotal_cents !== null) {
            return (int) $this->subtotal_cents;
        }

        $items = $this->relationLoaded('items')
            ? $this->items
            : $this->items()->get(['unit_price', 'quantity']);

        return (int) round((float) $items->sum(
            fn (OrderItem $item): float => (float) $item->unit_price * $item->quantity * 100,
        ));
    }

    public function discountCents(): int
    {
        return (int) ($this->discount_cents ?? 0);
    }

    public function totalCents(): int
    {
        if ($this->total_cents !== null) {
            return (int) $this->total_cents;
        }

        return max(0, $this->subtotalCents() - $this->discountCents());
    }

    public function subtotalAmount(): float
    {
        return round($this->subtotalCents() / 100, 2);
    }

    public function discountAmount(): float
    {
        return round($this->discountCents() / 100, 2);
    }
}
