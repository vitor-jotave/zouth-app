<?php

namespace App\Models;

use App\Enums\UserType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class AssistedSelection extends Model
{
    /** @use HasFactory<\Database\Factories\AssistedSelectionFactory> */
    use HasFactory;

    use MassPrunable;

    protected $fillable = ['manufacturer_affiliation_id', 'catalog_setting_id', 'token', 'items', 'expires_at'];

    protected function casts(): array
    {
        return ['items' => 'array', 'expires_at' => 'datetime'];
    }

    public function affiliation(): BelongsTo
    {
        return $this->belongsTo(ManufacturerAffiliation::class, 'manufacturer_affiliation_id');
    }

    public function prunable(): Builder
    {
        return static::query()->where('expires_at', '<=', now());
    }

    public static function findForCatalog(CatalogSetting $catalog, mixed $token): ?self
    {
        if (! is_string($token) || ! Str::isUuid($token) || ! $catalog->public_link_active || $catalog->hide_prices) {
            return null;
        }

        $affiliationScope = fn (Builder|BelongsTo $query): Builder|BelongsTo => $query
            ->where('manufacturer_id', $catalog->manufacturer_id)
            ->where('status', 'active')
            ->whereHas('user', fn (Builder $user): Builder => $user->where('user_type', UserType::SalesRep));

        $selection = static::query()->where('catalog_setting_id', $catalog->id)
            ->where('token', $token)->where('expires_at', '>', now())
            ->withWhereHas('affiliation', $affiliationScope)
            ->first();

        return $selection?->affiliation ? $selection : null;
    }
}
