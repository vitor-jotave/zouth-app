<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Laravel\Cashier\Billable;

class Manufacturer extends Model
{
    /** @use HasFactory<\Database\Factories\ManufacturerFactory> */
    use Billable;

    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'slug',
        'is_active',
        'current_plan_id',
        'cnpj',
        'phone',
        'logo_path',
        'zip_code',
        'state',
        'city',
        'neighborhood',
        'street',
        'address_number',
        'complement',
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
        ];
    }

    /**
     * Get the Stripe customer name for this manufacturer.
     */
    public function stripeName(): string
    {
        return $this->name;
    }

    /**
     * Get the current plan for this manufacturer.
     */
    public function currentPlan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'current_plan_id');
    }

    /**
     * Get all users belonging to this manufacturer.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'manufacturer_user')
            ->withPivot('role', 'status')
            ->withTimestamps();
    }

    public function productCategories(): HasMany
    {
        return $this->hasMany(ProductCategory::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function variationTypes(): HasMany
    {
        return $this->hasMany(VariationType::class)->orderBy('display_order');
    }

    public function catalogSetting(): HasOne
    {
        return $this->hasOne(CatalogSetting::class);
    }

    public function catalogVisits(): HasMany
    {
        return $this->hasMany(CatalogVisit::class);
    }

    /**
     * Get all orders for this manufacturer.
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function whatsappInstances(): HasMany
    {
        return $this->hasMany(WhatsappInstance::class);
    }

    /**
     * Get the active owner of this manufacturer.
     */
    public function owner(): ?User
    {
        return $this->users()
            ->wherePivot('role', 'owner')
            ->wherePivot('status', 'active')
            ->first();
    }
}
