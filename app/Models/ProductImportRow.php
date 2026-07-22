<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductImportRow extends Model
{
    /** @use HasFactory<\Database\Factories\ProductImportRowFactory> */
    use HasFactory;

    protected $fillable = [
        'product_import_id',
        'product_id',
        'row_number',
        'product_sku',
        'variant_identity',
        'action',
        'source',
        'normalized',
        'errors',
        'warnings',
        'processed_at',
    ];

    protected function casts(): array
    {
        return [
            'source' => 'array',
            'normalized' => 'array',
            'errors' => 'array',
            'warnings' => 'array',
            'processed_at' => 'datetime',
        ];
    }

    public function productImport(): BelongsTo
    {
        return $this->belongsTo(ProductImport::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
