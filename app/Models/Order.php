<?php

namespace App\Models;

use App\Enums\OrderStatus;
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
    ];

    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
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
        return (int) $this->items()->sum('quantity');
    }
}
