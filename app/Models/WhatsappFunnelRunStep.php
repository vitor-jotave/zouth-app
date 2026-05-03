<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsappFunnelRunStep extends Model
{
    /** @use HasFactory<\Database\Factories\WhatsappFunnelRunStepFactory> */
    use HasFactory;

    protected $fillable = [
        'whatsapp_funnel_run_id',
        'whatsapp_funnel_step_id',
        'whatsapp_message_id',
        'type',
        'sort_order',
        'payload',
        'status',
        'scheduled_at',
        'sent_at',
        'error_message',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'payload' => 'array',
            'scheduled_at' => 'datetime',
            'sent_at' => 'datetime',
        ];
    }

    public function run(): BelongsTo
    {
        return $this->belongsTo(WhatsappFunnelRun::class, 'whatsapp_funnel_run_id');
    }

    public function funnelStep(): BelongsTo
    {
        return $this->belongsTo(WhatsappFunnelStep::class, 'whatsapp_funnel_step_id');
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(WhatsappMessage::class, 'whatsapp_message_id');
    }
}
