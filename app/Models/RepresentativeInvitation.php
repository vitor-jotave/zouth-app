<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RepresentativeInvitation extends Model
{
    /** @use HasFactory<\Database\Factories\RepresentativeInvitationFactory> */
    use HasFactory;

    protected $fillable = [
        'manufacturer_id',
        'invited_by_user_id',
        'affiliation_id',
        'name',
        'email',
        'email_normalized',
        'whatsapp',
        'personal_message',
        'token_hash',
        'status',
        'expires_at',
        'accepted_at',
        'last_sent_at',
        'send_count',
    ];

    protected $hidden = [
        'token_hash',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'accepted_at' => 'datetime',
            'last_sent_at' => 'datetime',
            'send_count' => 'integer',
        ];
    }

    public function manufacturer(): BelongsTo
    {
        return $this->belongsTo(Manufacturer::class);
    }

    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_user_id');
    }

    public function affiliation(): BelongsTo
    {
        return $this->belongsTo(ManufacturerAffiliation::class);
    }

    public function isExpired(): bool
    {
        return $this->status === 'pending' && $this->expires_at->isPast();
    }

    public function isPending(): bool
    {
        return $this->status === 'pending' && ! $this->isExpired();
    }
}
