<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class OnboardingSession extends Model
{
    /** @use HasFactory<\Database\Factories\OnboardingSessionFactory> */
    use HasFactory;

    protected $fillable = [
        'public_id',
        'manufacturer_id',
        'source',
        'referrer',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'current_step',
        'context',
        'started_at',
        'account_created_at',
        'preview_viewed_at',
        'email_confirmed_at',
        'completed_at',
        'subscribed_at',
        'last_activity_at',
    ];

    protected static function booted(): void
    {
        static::creating(function (OnboardingSession $session): void {
            $session->public_id ??= (string) Str::uuid();
            $session->started_at ??= now();
            $session->last_activity_at ??= now();
        });
    }

    protected function casts(): array
    {
        return [
            'current_step' => 'integer',
            'context' => 'array',
            'started_at' => 'datetime',
            'account_created_at' => 'datetime',
            'preview_viewed_at' => 'datetime',
            'email_confirmed_at' => 'datetime',
            'completed_at' => 'datetime',
            'subscribed_at' => 'datetime',
            'last_activity_at' => 'datetime',
        ];
    }

    public function manufacturer(): BelongsTo
    {
        return $this->belongsTo(Manufacturer::class);
    }
}
