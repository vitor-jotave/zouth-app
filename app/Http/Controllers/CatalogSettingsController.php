<?php

namespace App\Http\Controllers;

use App\Enums\WhatsappInstanceStatus;
use App\Http\Requests\CatalogSettingBackgroundRequest;
use App\Http\Requests\CatalogSettingCoverRequest;
use App\Http\Requests\CatalogSettingLogoRequest;
use App\Http\Requests\CatalogSettingUpdateRequest;
use App\Http\Resources\CatalogSettingResource;
use App\Models\CatalogSetting;
use App\Models\CatalogVisit;
use App\Models\Product;
use App\Services\CatalogCoverImageStorage;
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
        $whatsappChannel = $manufacturer->whatsappInstances()
            ->where('status', WhatsappInstanceStatus::Connected->value)
            ->whereNotNull('phone_number')
            ->where('phone_number', '!=', '')
            ->first();

        if (! $this->hasValidWhatsappPhoneNumber($whatsappChannel?->phone_number)) {
            $whatsappChannel = null;
        }

        $sampleProducts = Product::where('manufacturer_id', $manufacturer->id)
            ->where('is_active', true)
            ->with(['category', 'media'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->limit(6)
            ->get()
            ->map(function (Product $product): array {
                $primaryImage = $product->media
                    ->where('type', 'image')
                    ->sortBy('sort_order')
                    ->first();

                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'category' => $product->category?->name,
                    'primary_image' => $primaryImage
                        ? Storage::disk('s3')->url($primaryImage->thumbnail_path ?: $primaryImage->path)
                        : null,
                    'total_stock' => $product->variantStocks->sum('quantity'),
                    'price_cents' => $product->price_cents,
                ];
            });

        return Inertia::render('manufacturer/catalog-settings/index', [
            'catalog_settings' => (new CatalogSettingResource($setting))->resolve(request()),
            'public_link' => route('public.catalog.show', ['token' => $setting->public_token]),
            'stats' => $this->buildStats($setting),
            'sample_products' => $sampleProducts,
            'manufacturer_name' => $manufacturer->name,
            'whatsapp_channel' => [
                'available' => $whatsappChannel !== null,
                'profile_name' => $whatsappChannel?->profile_name,
                'phone_masked' => $this->maskPhoneNumber($whatsappChannel?->phone_number),
                'channels_url' => route('manufacturer.atendimento.channels'),
            ],
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
            $this->deleteCatalogMedia($setting->logo_path);
        }

        $path = $request->file('logo')->store('catalog-logos', $this->catalogMediaDisk());

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
            $this->deleteCatalogMedia($setting->logo_path);
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
            $this->deleteCatalogMedia($setting->background_image_path);
        }

        $path = $request->file('background_image')->store('catalog-backgrounds', $this->catalogMediaDisk());

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
            $this->deleteCatalogMedia($setting->background_image_path);
            $setting->update(['background_image_path' => null]);
        }

        return redirect()
            ->back()
            ->with('success', 'Imagem de fundo removida com sucesso.');
    }

    public function uploadCover(
        CatalogSettingCoverRequest $request,
        TenantManager $tenantManager,
        CatalogCoverImageStorage $coverStorage,
    ): RedirectResponse {
        $setting = $this->resolveSetting($tenantManager);

        $this->authorize('update', $setting);

        $manufacturer = $tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        $uploadedFile = $request->file('cover_image');
        $storedCover = $coverStorage->optimizeAndStore(
            $manufacturer,
            (string) $uploadedFile->get(),
        );
        $previousPath = $setting->cover_image_path;
        $previousThumbnailPath = $setting->cover_thumbnail_path;

        try {
            $setting->update([
                'cover_image_path' => $storedCover['path'],
                'cover_thumbnail_path' => $storedCover['thumbnail_path'],
                'cover_image_focal_x' => $request->integer('cover_image_focal_x', 50),
                'cover_image_focal_y' => $request->integer('cover_image_focal_y', 50),
            ]);
        } catch (\Throwable $exception) {
            $coverStorage->delete($storedCover['path'], $storedCover['thumbnail_path']);

            throw $exception;
        }

        $coverStorage->delete($previousPath, $previousThumbnailPath);

        return redirect()
            ->back()
            ->with('success', 'Capa do catalogo atualizada com sucesso.');
    }

    public function destroyCover(
        Request $request,
        TenantManager $tenantManager,
        CatalogCoverImageStorage $coverStorage,
    ): RedirectResponse {
        $setting = $this->resolveSetting($tenantManager);

        $this->authorize('update', $setting);

        $previousPath = $setting->cover_image_path;
        $previousThumbnailPath = $setting->cover_thumbnail_path;

        $setting->update([
            'cover_image_path' => null,
            'cover_thumbnail_path' => null,
            'cover_image_focal_x' => 50,
            'cover_image_focal_y' => 50,
        ]);

        $coverStorage->delete($previousPath, $previousThumbnailPath);

        return redirect()
            ->back()
            ->with('success', 'Capa do catalogo removida com sucesso.');
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

    private function catalogMediaDisk(): string
    {
        return (string) config('filesystems.catalog_media_disk', 'public');
    }

    private function deleteCatalogMedia(string $path): void
    {
        foreach (array_unique(['public', $this->catalogMediaDisk()]) as $disk) {
            Storage::disk($disk)->delete($path);
        }
    }

    private function maskPhoneNumber(?string $phoneNumber): ?string
    {
        $digits = preg_replace('/\D/', '', (string) $phoneNumber);

        if ($digits === '') {
            return null;
        }

        if (str_starts_with($digits, '55') && strlen($digits) >= 12) {
            return sprintf(
                '+55 (%s) •••••-%s',
                substr($digits, 2, 2),
                substr($digits, -4),
            );
        }

        return '••••••'.substr($digits, -4);
    }

    private function hasValidWhatsappPhoneNumber(?string $phoneNumber): bool
    {
        $digits = preg_replace('/\D/', '', (string) $phoneNumber);

        return is_string($digits) && preg_match('/^\d{8,15}$/', $digits) === 1;
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
