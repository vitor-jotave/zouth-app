<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Manufacturer extends Model
{
    /** @use HasFactory<\Database\Factories\ManufacturerFactory> */
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

    public function catalogSetting(): HasOne
    {
        return $this->hasOne(CatalogSetting::class);
    }

    public function catalogVisits(): HasMany
    {
        return $this->hasMany(CatalogVisit::class);
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
