<?php

namespace App\Http\Controllers;

use App\Http\Requests\CatalogSettingLogoRequest;
use App\Http\Requests\CatalogSettingUpdateRequest;
use App\Http\Resources\CatalogSettingResource;
use App\Models\CatalogSetting;
use App\Models\CatalogVisit;
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

        return Inertia::render('manufacturer/catalog-settings/index', [
            'catalog_settings' => new CatalogSettingResource($setting),
            'public_link' => route('public.catalog.show', ['token' => $setting->public_token]),
            'stats' => $this->buildStats($setting),
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

    private function resolveSetting(TenantManager $tenantManager): CatalogSetting
    {
        $manufacturer = $tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        return CatalogSetting::firstOrCreate(
            ['manufacturer_id' => $manufacturer->id],
            [
                'brand_name' => $manufacturer->name,
                'tagline' => null,
                'description' => null,
                'primary_color' => '#0F766E',
                'secondary_color' => '#0F172A',
                'accent_color' => '#F97316',
                'background_color' => '#F8FAFC',
                'font_family' => 'space-grotesk',
                'public_link_active' => true,
            ]
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
