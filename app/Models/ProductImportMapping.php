<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductImportMapping extends Model
{
    /** @use HasFactory<\Database\Factories\ProductImportMappingFactory> */
    use HasFactory;

    protected $fillable = [
        'manufacturer_id',
        'user_id',
        'name',
        'header_signature',
        'headers',
        'mapping',
        'last_used_at',
    ];

    protected function casts(): array
    {
        return [
            'headers' => 'array',
            'mapping' => 'array',
            'last_used_at' => 'datetime',
        ];
    }

    public function manufacturer(): BelongsTo
    {
        return $this->belongsTo(Manufacturer::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
