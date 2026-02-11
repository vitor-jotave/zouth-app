<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class CatalogSetting extends Model
{
    /** @use HasFactory<\Database\Factories\CatalogSettingFactory> */
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'manufacturer_id',
        'brand_name',
        'tagline',
        'description',
        'logo_path',
        'primary_color',
        'secondary_color',
        'accent_color',
        'background_color',
        'font_family',
        'public_token',
        'public_token_rotated_at',
        'public_link_active',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'public_link_active' => 'boolean',
            'public_token_rotated_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (CatalogSetting $setting) {
            if (! $setting->public_token) {
                $setting->public_token = static::generateToken();
            }
        });
    }

    public function manufacturer(): BelongsTo
    {
        return $this->belongsTo(Manufacturer::class);
    }

    public function visits(): HasMany
    {
        return $this->hasMany(CatalogVisit::class);
    }

    public static function generateToken(): string
    {
        do {
            $token = Str::random(48);
        } while (static::query()->where('public_token', $token)->exists());

        return $token;
    }
}
