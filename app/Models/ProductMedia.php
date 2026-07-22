<?php

namespace App\Models;

use App\Enums\ProductMediaType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductMedia extends Model
{
    /** @use HasFactory<\Database\Factories\ProductMediaFactory> */
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'product_id',
        'type',
        'path',
        'thumbnail_path',
        'sort_order',
        'file_size_bytes',
        'thumbnail_size_bytes',
        'width',
        'height',
        'optimized_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => ProductMediaType::class,
            'sort_order' => 'integer',
            'file_size_bytes' => 'integer',
            'thumbnail_size_bytes' => 'integer',
            'width' => 'integer',
            'height' => 'integer',
            'optimized_at' => 'datetime',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
