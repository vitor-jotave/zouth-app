<?php

namespace App\Http\Controllers;

use App\Http\Requests\CatalogSettingBackgroundRequest;
use App\Http\Requests\CatalogSettingLogoRequest;
use App\Http\Requests\CatalogSettingUpdateRequest;
use App\Http\Resources\CatalogSettingResource;
use App\Models\CatalogSetting;
use App\Models\CatalogVisit;
use App\Models\Product;
use App\Services\TenantManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class CatalogSettingsController extends Controller
{
    public function index(Request $request, TenantManager $tenantManager): Response
    {
        $setting = $this->resolveSetting($tenantManager);

        $this->authorize('view', $setting);

        $manufacturer = $tenantManager->get();

        // Get sample products for preview
        $sampleProducts = Product::where('manufacturer_id', $manufacturer->id)
            ->where('is_active', true)
            ->with(['category', 'media'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->limit(3)
            ->get()
            ->map(fn ($product) => [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'category' => $product->category?->name,
                'primary_image' => ($primaryImage = $product->media->where('type', 'image')->sortBy('sort_order')->first()) ? Storage::url($primaryImage->path) : null,
                'total_stock' => $product->variantStocks->sum('quantity'),
            ]);

        return Inertia::render('manufacturer/catalog-settings/index', [
            'catalog_settings' => (new CatalogSettingResource($setting))->resolve(request()),
            'public_link' => route('public.catalog.show', ['token' => $setting->public_token]),
            'stats' => $this->buildStats($setting),
            'sample_products' => $sampleProducts,
            'manufacturer_name' => $manufacturer->name,
        ]);
    }

    public function update(CatalogSettingUpdateRequest $request, TenantManager $tenantManager): RedirectResponse
    {
        $setting = $this->resolveSetting($tenantManager);

        $this->authorize('update', $setting);

        $setting->update($request->validated());

        return redirect()
            ->back()
            ->with('success', 'Personalizacao do catalogo atualizada com sucesso.');
    }

    public function uploadLogo(CatalogSettingLogoRequest $request, TenantManager $tenantManager): RedirectResponse
    {
        $setting = $this->resolveSetting($tenantManager);

        $this->authorize('update', $setting);

        if ($setting->logo_path) {
            Storage::disk('public')->delete($setting->logo_path);
        }

        $path = $request->file('logo')->store('catalog-logos', 'public');

        $setting->update(['logo_path' => $path]);

        return redirect()
            ->back()
            ->with('success', 'Logo atualizado com sucesso.');
    }

    public function destroyLogo(Request $request, TenantManager $tenantManager): RedirectResponse
    {
        $setting = $this->resolveSetting($tenantManager);

        $this->authorize('update', $setting);

        if ($setting->logo_path) {
            Storage::disk('public')->delete($setting->logo_path);
            $setting->update(['logo_path' => null]);
        }

        return redirect()
            ->back()
            ->with('success', 'Logo removido com sucesso.');
    }

    public function uploadBackground(CatalogSettingBackgroundRequest $request, TenantManager $tenantManager): RedirectResponse
    {
        $setting = $this->resolveSetting($tenantManager);

        $this->authorize('update', $setting);

        if ($setting->background_image_path) {
            Storage::disk('public')->delete($setting->background_image_path);
        }

        $path = $request->file('background_image')->store('catalog-backgrounds', 'public');

        $setting->update(['background_image_path' => $path]);

        return redirect()
            ->back()
            ->with('success', 'Imagem de fundo atualizada com sucesso.');
    }

    public function destroyBackground(Request $request, TenantManager $tenantManager): RedirectResponse
    {
        $setting = $this->resolveSetting($tenantManager);

        $this->authorize('update', $setting);

        if ($setting->background_image_path) {
            Storage::disk('public')->delete($setting->background_image_path);
            $setting->update(['background_image_path' => null]);
        }

        return redirect()
            ->back()
            ->with('success', 'Imagem de fundo removida com sucesso.');
    }

    public function rotateLink(Request $request, TenantManager $tenantManager): RedirectResponse
    {
        $setting = $this->resolveSetting($tenantManager);

        $this->authorize('update', $setting);

        $setting->update([
            'public_token' => CatalogSetting::generateToken(),
            'public_token_rotated_at' => now(),
        ]);

        return redirect()
            ->back()
            ->with('success', 'Link publico rotacionado com sucesso.');
    }

    public function resetDefaults(Request $request, TenantManager $tenantManager): RedirectResponse
    {
        $setting = $this->resolveSetting($tenantManager);

        $this->authorize('update', $setting);

        $manufacturer = $tenantManager->get();

        $setting->update(CatalogSetting::defaults($manufacturer?->name));

        return redirect()
            ->back()
            ->with('success', 'Configuracoes restauradas para os valores padrao.');
    }

    private function resolveSetting(TenantManager $tenantManager): CatalogSetting
    {
        $manufacturer = $tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        return CatalogSetting::firstOrCreate(
            ['manufacturer_id' => $manufacturer->id],
            CatalogSetting::defaults($manufacturer->name)
        );
    }

    /**
     * @return array<string, int>
     */
    private function buildStats(CatalogSetting $setting): array
    {
        return [
            'total' => CatalogVisit::where('catalog_setting_id', $setting->id)->count(),
            'last_7_days' => CatalogVisit::where('catalog_setting_id', $setting->id)
                ->where('visited_at', '>=', now()->subDays(7))
                ->count(),
            'last_30_days' => CatalogVisit::where('catalog_setting_id', $setting->id)
                ->where('visited_at', '>=', now()->subDays(30))
                ->count(),
        ];
    }
}
