<?php

namespace App\Models;

use App\Enums\WhatsappMessageStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsappMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'whatsapp_conversation_id',
        'message_id',
        'from_me',
        'sender_jid',
        'body',
        'media_type',
        'media_url',
        'media_mimetype',
        'media_file_name',
        'reactions',
        'status',
        'message_timestamp',
    ];

    protected function casts(): array
    {
        return [
            'from_me' => 'boolean',
            'reactions' => 'array',
            'status' => WhatsappMessageStatus::class,
            'message_timestamp' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(WhatsappConversation::class, 'whatsapp_conversation_id');
    }
}
