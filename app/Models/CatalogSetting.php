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
        // Premium customization
        'layout_preset',
        'layout_density',
        'card_style',
        'background_mode',
        'background_image_path',
        'background_image_opacity',
        'background_overlay_color',
        'background_overlay_opacity',
        'background_blur',
        'pattern_id',
        'pattern_color',
        'pattern_opacity',
        'gradient_id',
        'sections',
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
            'sections' => 'array',
            'background_image_opacity' => 'integer',
            'background_overlay_opacity' => 'integer',
            'background_blur' => 'integer',
            'pattern_opacity' => 'integer',
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

    /**
     * Get the default catalog settings.
     *
     * @return array<string, mixed>
     */
    public static function defaults(?string $brandName = null): array
    {
        return [
            'brand_name' => $brandName ?? 'Minha Marca',
            'tagline' => null,
            'description' => null,
            'primary_color' => '#0F766E',
            'secondary_color' => '#0F172A',
            'accent_color' => '#F97316',
            'background_color' => '#F8FAFC',
            'font_family' => 'space-grotesk',
            'public_link_active' => true,
            // Premium defaults
            'layout_preset' => 'minimal',
            'layout_density' => 'comfortable',
            'card_style' => 'soft',
            'background_mode' => 'solid',
            'background_image_opacity' => 20,
            'background_overlay_color' => '#000000',
            'background_overlay_opacity' => 10,
            'background_blur' => 0,
            'pattern_opacity' => 12,
            'sections' => static::defaultSections(),
        ];
    }

    /**
     * Get default sections configuration.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function defaultSections(): array
    {
        return [
            [
                'type' => 'hero',
                'enabled' => true,
                'props' => [
                    'show_logo' => true,
                    'headline' => null,
                    'subtitle' => null,
                    'cta_text' => null,
                    'cta_url' => null,
                    'align' => 'center',
                ],
            ],
            [
                'type' => 'collections',
                'enabled' => true,
                'props' => [
                    'title' => 'Nossas Coleções',
                    'display' => 'tabs',
                    'show_counts' => true,
                    'max_items' => 6,
                ],
            ],
            [
                'type' => 'product_grid',
                'enabled' => true,
                'props' => [
                    'title' => 'Produtos',
                    'columns_mobile' => 2,
                    'columns_tablet' => 3,
                    'columns_desktop' => 4,
                    'show_badges' => true,
                    'sort' => 'newest',
                ],
            ],
        ];
    }
}
