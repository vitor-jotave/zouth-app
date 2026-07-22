<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesRepresentativeProfile extends Model
{
    /** @use HasFactory<\Database\Factories\SalesRepresentativeProfileFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'whatsapp',
        'city',
        'state',
        'territory',
        'presentation',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
