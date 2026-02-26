<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WhatsappConversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'whatsapp_instance_id',
        'remote_jid',
        'is_group',
        'contact_name',
        'contact_phone',
        'contact_picture_url',
        'last_message_body',
        'last_message_from_me',
        'last_message_at',
        'unread_count',
    ];

    protected function casts(): array
    {
        return [
            'is_group' => 'boolean',
            'last_message_from_me' => 'boolean',
            'last_message_at' => 'datetime',
            'unread_count' => 'integer',
        ];
    }

    public function instance(): BelongsTo
    {
        return $this->belongsTo(WhatsappInstance::class, 'whatsapp_instance_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(WhatsappMessage::class);
    }

    /**
     * Get a display name for this conversation.
     */
    public function displayName(): string
    {
        return $this->contact_name ?? $this->contact_phone ?? $this->remote_jid;
    }
}
