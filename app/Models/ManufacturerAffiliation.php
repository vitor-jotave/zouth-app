<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ManufacturerAffiliation extends Model
{
    /** @use HasFactory<\Database\Factories\ManufacturerAffiliationFactory> */
    use HasFactory;

    protected $hidden = ['tracking_token'];

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'manufacturer_id',
        'user_id',
        'status',
        'source',
        'application_note',
        'requested_at',
        'approved_at',
        'rejected_at',
        'revoked_at',
        'decided_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'requested_at' => 'datetime',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $affiliation): void {
            $affiliation->tracking_token ??= (string) Str::uuid();
        });
    }

    public function catalogShareUrl(Manufacturer $manufacturer): ?string
    {
        $catalog = $manufacturer->catalogSetting;

        if ($this->status !== 'active' || ! $catalog?->public_link_active || ! $this->tracking_token) {
            return null;
        }

        return route('public.catalog.show', ['token' => $catalog->public_token, 'ref' => $this->tracking_token]);
    }

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

    public function decidedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by_user_id');
    }
}
