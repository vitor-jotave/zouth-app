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

        CatalogVisit::create([
            'catalog_setting_id' => $setting->id,
            'manufacturer_id' => $setting->manufacturer_id,
            'public_token' => $setting->public_token,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'referer' => $request->header('referer'),
            'visited_at' => now(),
        ]);

        $products = Product::where('manufacturer_id', $setting->manufacturer_id)
            ->where('is_active', true)
            ->with(['category', 'media', 'colors', 'variantStocks.color'])
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
            'catalog_settings' => new CatalogSettingResource($setting),
            'products' => ProductCatalogResource::collection($products),
        ]);
    }
}
