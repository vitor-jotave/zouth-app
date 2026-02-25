<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plan extends Model
{
    /** @use HasFactory<\Database\Factories\PlanFactory> */
    use HasFactory;

    /**
     * Default attribute values.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'currency' => 'BRL',
    ];

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'description',
        'is_active',
        'sort_order',
        'monthly_price_cents',
        'currency',
        'trial_days',
        'max_reps',
        'max_products',
        'max_orders_per_month',
        'max_users',
        'max_data_mb',
        'max_files_gb',
        'allow_csv_import',
        'stripe_product_id',
        'stripe_price_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'sort_order' => 'integer',
            'monthly_price_cents' => 'integer',
            'trial_days' => 'integer',
            'max_reps' => 'integer',
            'max_products' => 'integer',
            'max_orders_per_month' => 'integer',
            'max_users' => 'integer',
            'max_data_mb' => 'integer',
            'max_files_gb' => 'integer',
            'allow_csv_import' => 'boolean',
        ];
    }

    /**
     * Get the manufacturers on this plan.
     */
    public function manufacturers(): HasMany
    {
        return $this->hasMany(Manufacturer::class, 'current_plan_id');
    }

    /**
     * Get the formatted monthly price in reais.
     */
    public function getFormattedPriceAttribute(): string
    {
        return 'R$ '.number_format($this->monthly_price_cents / 100, 2, ',', '.');
    }

    /**
     * Check if a given limit is unlimited (null means unlimited).
     */
    public function isUnlimited(string $limitField): bool
    {
        return $this->getAttribute($limitField) === null;
    }
}
