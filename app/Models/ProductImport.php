<?php

namespace App\Models;

use App\Enums\ProductImportStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProductImport extends Model
{
    /** @use HasFactory<\Database\Factories\ProductImportFactory> */
    use HasFactory;

    use SoftDeletes;

    protected $fillable = [
        'manufacturer_id',
        'user_id',
        'status',
        'source_name',
        'source_path',
        'source_extension',
        'image_archive_path',
        'header_signature',
        'headers',
        'mapping',
        'options',
        'summary',
        'taxonomy_preview',
        'errors',
        'preview_signature',
        'progress',
        'error_message',
        'validated_at',
        'confirmed_at',
        'processing_started_at',
        'completed_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => ProductImportStatus::class,
            'headers' => 'array',
            'mapping' => 'array',
            'options' => 'array',
            'summary' => 'array',
            'taxonomy_preview' => 'array',
            'errors' => 'array',
            'progress' => 'integer',
            'validated_at' => 'datetime',
            'confirmed_at' => 'datetime',
            'processing_started_at' => 'datetime',
            'completed_at' => 'datetime',
            'expires_at' => 'datetime',
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

    public function rows(): HasMany
    {
        return $this->hasMany(ProductImportRow::class)->orderBy('row_number');
    }
}
