<?php

namespace App\Http\Controllers\Rep;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRepresentativeApplicationRequest;
use App\Http\Resources\ProductCatalogResource;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ManufacturerController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $query = Manufacturer::where('is_active', true)
            ->with(['catalogSetting'])
            ->withCount(['users', 'products']);

        // Search
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        // Get manufacturers with affiliation status (eager-loaded to avoid N+1)
        $userAffiliations = ManufacturerAffiliation::where('user_id', $user->id)
            ->pluck('status', 'manufacturer_id')
            ->toArray();

        $affiliationIds = ManufacturerAffiliation::where('user_id', $user->id)
            ->pluck('id', 'manufacturer_id')
            ->toArray();

        $catalogMediaDisk = (string) config('filesystems.catalog_media_disk', 'public');
        $manufacturers = $query->get()->map(function ($manufacturer) use ($userAffiliations, $affiliationIds, $catalogMediaDisk) {
            $logoPath = $manufacturer->catalogSetting?->logo_path ?? $manufacturer->logo_path;

            return [
                'id' => $manufacturer->id,
                'name' => $manufacturer->name,
                'slug' => $manufacturer->slug,
                'users_count' => $manufacturer->users_count,
                'products_count' => $manufacturer->products_count,
                'city' => $manufacturer->city,
                'state' => $manufacturer->state,
                'tagline' => $manufacturer->catalogSetting?->tagline,
                'logo_url' => $logoPath ? Storage::disk($catalogMediaDisk)->url($logoPath) : null,
                'affiliation_status' => $userAffiliations[$manufacturer->id] ?? 'none',
                'affiliation_id' => $affiliationIds[$manufacturer->id] ?? null,
            ];
        });

        // Filter by status
        if ($status = $request->input('status')) {
            if ($status === 'available') {
                $manufacturers = $manufacturers->where('affiliation_status', 'none');
            } elseif ($status !== 'all') {
                $manufacturers = $manufacturers->where('affiliation_status', $status);
            }
        }

        // Sort
        $sort = $request->input('sort', 'name');
        if ($sort === 'name') {
            $manufacturers = $manufacturers->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)->values();
        } elseif ($sort === 'recent') {
            // Already sorted by ID descending from query
        }

        return Inertia::render('rep/manufacturers/index', [
            'manufacturers' => [
                'data' => $manufacturers->values(),
            ],
            'filters' => [
                'search' => $search,
                'status' => $status ?? 'all',
                'sort' => $sort,
            ],
            'profile' => $user->salesRepresentativeProfile ? [
                'whatsapp' => $user->salesRepresentativeProfile->whatsapp,
                'city' => $user->salesRepresentativeProfile->city,
                'state' => $user->salesRepresentativeProfile->state,
                'territory' => $user->salesRepresentativeProfile->territory,
                'presentation' => $user->salesRepresentativeProfile->presentation,
            ] : null,
        ]);
    }

    public function affiliate(StoreRepresentativeApplicationRequest $request, Manufacturer $manufacturer): RedirectResponse
    {
        $user = $request->user();
        $data = $request->validated();

        $user->salesRepresentativeProfile()->updateOrCreate([], [
            'whatsapp' => $data['whatsapp'],
            'city' => $data['city'],
            'state' => $data['state'],
            'territory' => $data['territory'],
            'presentation' => $data['presentation'],
        ]);

        // Check if already has an affiliation
        $existing = ManufacturerAffiliation::where('manufacturer_id', $manufacturer->id)
            ->where('user_id', $user->id)
            ->first();

        if ($existing) {
            if ($existing->status === 'pending') {
                return redirect()->back()->with('error', 'Você já possui uma solicitação pendente para este fabricante.');
            }

            if ($existing->status === 'active') {
                return redirect()->back()->with('error', 'Você já está afiliado a este fabricante.');
            }

            // Allow re-request for rejected/revoked
            $existing->update([
                'status' => 'pending',
                'source' => 'request',
                'application_note' => $data['application_note'],
                'requested_at' => now(),
                'approved_at' => null,
                'rejected_at' => null,
                'revoked_at' => null,
                'decided_by_user_id' => null,
            ]);

            return redirect()->back()->with('status', 'Sua apresentação foi reenviada para análise.');
        }

        // Create new affiliation request
        ManufacturerAffiliation::create([
            'manufacturer_id' => $manufacturer->id,
            'user_id' => $user->id,
            'status' => 'pending',
            'source' => 'request',
            'application_note' => $data['application_note'],
            'requested_at' => now(),
        ]);

        return redirect()->back()->with('status', 'Sua apresentação chegou ao fabricante.');
    }

    public function catalog(Manufacturer $manufacturer): Response
    {
        $user = auth()->user();

        // Verify active affiliation
        $affiliation = ManufacturerAffiliation::where('manufacturer_id', $manufacturer->id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if (! $affiliation) {
            abort(403, 'Você não tem acesso ao catálogo deste fabricante.');
        }

        $products = Product::where('manufacturer_id', $manufacturer->id)
            ->where('is_active', true)
            ->with(['category', 'media', 'productVariations.variationType.values', 'variantStocks'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->paginate(24);

        return Inertia::render('rep/manufacturers/catalog', [
            'manufacturer' => [
                'id' => $manufacturer->id,
                'name' => $manufacturer->name,
                'slug' => $manufacturer->slug,
            ],
            'products' => ProductCatalogResource::collection($products),
        ]);
    }
}
