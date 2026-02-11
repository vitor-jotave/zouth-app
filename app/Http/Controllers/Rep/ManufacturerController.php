<?php

namespace App\Http\Controllers\Rep;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductCatalogResource;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\Product;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ManufacturerController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $query = Manufacturer::where('is_active', true)
            ->withCount('users');

        // Search
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('slug', 'like', "%{$search}%");
            });
        }

        // Get manufacturers with affiliation status
        $manufacturers = $query->get()->map(function ($manufacturer) use ($user) {
            $affiliation = ManufacturerAffiliation::where('manufacturer_id', $manufacturer->id)
                ->where('user_id', $user->id)
                ->first();

            return [
                'id' => $manufacturer->id,
                'name' => $manufacturer->name,
                'slug' => $manufacturer->slug,
                'users_count' => $manufacturer->users_count,
                'affiliation_status' => $affiliation?->status ?? 'none',
                'affiliation_id' => $affiliation?->id,
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
        ]);
    }

    public function affiliate(Manufacturer $manufacturer): RedirectResponse
    {
        $user = auth()->user();

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
            $existing->update(['status' => 'pending']);

            return redirect()->back()->with('success', 'Solicitação de afiliação reenviada com sucesso!');
        }

        // Create new affiliation request
        ManufacturerAffiliation::create([
            'manufacturer_id' => $manufacturer->id,
            'user_id' => $user->id,
            'status' => 'pending',
        ]);

        return redirect()->back()->with('success', 'Solicitação de afiliação enviada com sucesso!');
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
            ->with(['category', 'media', 'colors', 'variantStocks.color'])
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
