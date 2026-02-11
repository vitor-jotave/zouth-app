<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ManufacturerAffiliation extends Model
{
    /** @use HasFactory<\Database\Factories\ManufacturerAffiliationFactory> */
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'manufacturer_id',
        'user_id',
        'status',
    ];

    /**
     * Get the manufacturer for this affiliation.
     */
    public function manufacturer(): BelongsTo
    {
        return $this->belongsTo(Manufacturer::class);
    }

    /**
     * Get the user for this affiliation.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
