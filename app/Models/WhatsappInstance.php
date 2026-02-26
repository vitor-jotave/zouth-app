<?php

namespace App\Models;

use App\Enums\WhatsappInstanceStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WhatsappInstance extends Model
{
    use HasFactory;

    protected $fillable = [
        'manufacturer_id',
        'instance_name',
        'instance_id',
        'status',
        'phone_number',
        'profile_name',
        'profile_picture_url',
    ];

    protected function casts(): array
    {
        return [
            'status' => WhatsappInstanceStatus::class,
        ];
    }

    public function manufacturer(): BelongsTo
    {
        return $this->belongsTo(Manufacturer::class);
    }

    public function conversations(): HasMany
    {
        return $this->hasMany(WhatsappConversation::class);
    }

    public function isConnected(): bool
    {
        return $this->status === WhatsappInstanceStatus::Connected;
    }
}
