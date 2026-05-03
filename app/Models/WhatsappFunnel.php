<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WhatsappFunnel extends Model
{
    /** @use HasFactory<\Database\Factories\WhatsappFunnelFactory> */
    use HasFactory;

    protected $fillable = [
        'manufacturer_id',
        'name',
        'code',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function manufacturer(): BelongsTo
    {
        return $this->belongsTo(Manufacturer::class);
    }

    public function steps(): HasMany
    {
        return $this->hasMany(WhatsappFunnelStep::class)->orderBy('sort_order');
    }

    public function runs(): HasMany
    {
        return $this->hasMany(WhatsappFunnelRun::class);
    }
}
