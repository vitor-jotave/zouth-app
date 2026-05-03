<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsappFunnelStep extends Model
{
    /** @use HasFactory<\Database\Factories\WhatsappFunnelStepFactory> */
    use HasFactory;

    protected $fillable = [
        'whatsapp_funnel_id',
        'type',
        'sort_order',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'payload' => 'array',
        ];
    }

    public function funnel(): BelongsTo
    {
        return $this->belongsTo(WhatsappFunnel::class, 'whatsapp_funnel_id');
    }
}
