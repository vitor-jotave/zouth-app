<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    /** @use HasFactory<\Database\Factories\CustomerFactory> */
    use HasFactory;

    /**
     * @var array<int, string>
     */
    protected $fillable = [
        'manufacturer_id',
        'name',
        'phone',
        'email',
        'customer_document_type',
        'customer_document',
        'zip_code',
        'state',
        'city',
        'neighborhood',
        'street',
        'address_number',
        'address_complement',
        'address_reference',
    ];

    protected function casts(): array
    {
        return [
            'last_order_at' => 'datetime',
        ];
    }

    public function manufacturer(): BelongsTo
    {
        return $this->belongsTo(Manufacturer::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }
}
