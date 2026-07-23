<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;

class Product extends Model
{
    /** @use HasFactory<\Database\Factories\ProductFactory> */
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'manufacturer_id',
        'product_category_id',
        'product_type',
        'name',
        'sku',
        'description',
        'video_url',
        'base_quantity',
        'is_active',
        'allow_quote_when_out_of_stock',
        'sort_order',
        'price_cents',
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
            'allow_quote_when_out_of_stock' => 'boolean',
            'base_quantity' => 'integer',
            'sort_order' => 'integer',
            'price_cents' => 'integer',
        ];
    }

    public function isCombo(): bool
    {
        return $this->product_type === 'combo';
    }

    public function manufacturer(): BelongsTo
    {
        return $this->belongsTo(Manufacturer::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'product_category_id');
    }

    public function media(): HasMany
    {
        return $this->hasMany(ProductMedia::class)->orderBy('sort_order');
    }

    public function productVariations(): HasMany
    {
        return $this->hasMany(ProductVariation::class);
    }

    public function variantStocks(): HasMany
    {
        return $this->hasMany(ProductVariantStock::class);
    }

    public function comboItems(): HasMany
    {
        return $this->hasMany(ProductComboItem::class, 'combo_product_id');
    }

    public function comboComponentItems(): HasMany
    {
        return $this->hasMany(ProductComboItem::class, 'component_product_id');
    }

    /**
     * @return Collection<int, ProductMedia>
     */
    public function displayMedia(): Collection
    {
        if (! $this->isCombo()) {
            return $this->relationLoaded('media') ? $this->media : collect();
        }

        if (! $this->relationLoaded('comboItems')) {
            return collect();
        }

        return $this->comboItems
            ->flatMap(function (ProductComboItem $item): Collection {
                if (! $item->relationLoaded('componentProduct')) {
                    return collect();
                }

                $componentProduct = $item->componentProduct;

                if (! $componentProduct || ! $componentProduct->relationLoaded('media')) {
                    return collect();
                }

                return $componentProduct->media;
            })
            ->unique('id')
            ->values();
    }

    public function hasVariations(): bool
    {
        return $this->productVariations()->exists();
    }

    public function getTotalStock(): int
    {
        if ($this->isCombo()) {
            $this->loadMissing(['comboItems.componentProduct.variantStocks', 'comboItems.componentVariantStock']);

            if ($this->comboItems->isEmpty()) {
                return 0;
            }

            return (int) $this->comboItems
                ->map(function (ProductComboItem $item) {
                    $available = $item->componentVariantStock
                        ? $item->componentVariantStock->quantity
                        : $item->componentProduct->getTotalStock();

                    return intdiv((int) $available, max(1, $item->quantity));
                })
                ->min();
        }

        if ($this->hasVariations()) {
            return (int) $this->variantStocks()->sum('quantity');
        }

        return (int) $this->base_quantity;
    }
}
