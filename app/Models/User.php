<?php

namespace App\Models;

use App\Enums\UserType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'user_type',
        'current_manufacturer_id',
    ];

    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'two_factor_confirmed_at' => 'datetime',
        'user_type' => UserType::class,
    ];

    public function manufacturers(): BelongsToMany
    {
        return $this->belongsToMany(Manufacturer::class, 'manufacturer_user')
            ->withPivot('role', 'status')
            ->withTimestamps();
    }

    public function currentManufacturer(): BelongsTo
    {
        return $this->belongsTo(Manufacturer::class, 'current_manufacturer_id');
    }

    /**
     * Retorna o único manufacturer elegível (pivot active + manufacturer ativo).
     * Se houver 0 ou >1, retorna null.
     */
    public function activeManufacturer(): ?Manufacturer
    {
        if (! $this->isManufacturerUser()) {
            return null;
        }

        $eligible = $this->manufacturers()
            ->wherePivot('status', 'active')
            ->where('is_active', true)
            ->take(2)
            ->get();

        return $eligible->count() === 1 ? $eligible->first() : null;
    }

    public function affiliations(): HasMany
    {
        return $this->hasMany(ManufacturerAffiliation::class);
    }

    public function affiliatedManufacturers(): BelongsToMany
    {
        return $this->belongsToMany(Manufacturer::class, 'manufacturer_affiliations')
            ->withPivot('status')
            ->withTimestamps();
    }

    public function isSuperadmin(): bool
    {
        return $this->user_type === UserType::Superadmin;
    }

    public function isManufacturerUser(): bool
    {
        return $this->user_type === UserType::ManufacturerUser;
    }

    public function isSalesRep(): bool
    {
        return $this->user_type === UserType::SalesRep;
    }
}
