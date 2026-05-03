<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WhatsappFunnelRun extends Model
{
    /** @use HasFactory<\Database\Factories\WhatsappFunnelRunFactory> */
    use HasFactory;

    protected $fillable = [
        'whatsapp_funnel_id',
        'whatsapp_conversation_id',
        'status',
        'started_at',
        'completed_at',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function getConversationIdAttribute(): ?int
    {
        return $this->whatsapp_conversation_id;
    }

    public function funnel(): BelongsTo
    {
        return $this->belongsTo(WhatsappFunnel::class, 'whatsapp_funnel_id');
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(WhatsappConversation::class, 'whatsapp_conversation_id');
    }

    public function steps(): HasMany
    {
        return $this->hasMany(WhatsappFunnelRunStep::class)->orderBy('sort_order');
    }
}
