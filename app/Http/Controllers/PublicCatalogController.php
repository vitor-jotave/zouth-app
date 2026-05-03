<?php

namespace App\Http\Controllers;

use App\Http\Resources\CatalogSettingResource;
use App\Http\Resources\ProductCatalogResource;
use App\Models\CatalogSetting;
use App\Models\CatalogVisit;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicCatalogController extends Controller
{
    public function show(Request $request, string $token): Response
    {
        $setting = CatalogSetting::query()
            ->with('manufacturer')
            ->where('public_token', $token)
            ->where('public_link_active', true)
            ->whereHas('manufacturer', fn ($query) => $query->where('is_active', true))
            ->firstOrFail();

        // Track visit without breaking the render if it fails
        try {
            CatalogVisit::create([
                'catalog_setting_id' => $setting->id,
                'manufacturer_id' => $setting->manufacturer_id,
                'public_token' => $setting->public_token,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'referer' => $request->header('referer'),
                'utm_source' => $request->query('utm_source'),
                'utm_medium' => $request->query('utm_medium'),
                'utm_campaign' => $request->query('utm_campaign'),
                'utm_term' => $request->query('utm_term'),
                'utm_content' => $request->query('utm_content'),
                'visited_at' => now(),
            ]);
        } catch (\Throwable $e) {
            report($e);
        }

        $products = Product::where('manufacturer_id', $setting->manufacturer_id)
            ->where('is_active', true)
            ->with(['category', 'media', 'productVariations.variationType.values', 'variantStocks', 'comboItems.componentProduct', 'comboItems.componentVariantStock'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(24)
            ->withQueryString();

        return Inertia::render('public/catalog', [
            'manufacturer' => [
                'id' => $setting->manufacturer->id,
                'name' => $setting->manufacturer->name,
                'slug' => $setting->manufacturer->slug,
            ],
            'catalog_settings' => (new CatalogSettingResource($setting))->resolve(request()),
            'products' => ProductCatalogResource::collection($products),
            'catalog_token' => $setting->public_token,
        ]);
    }
}
