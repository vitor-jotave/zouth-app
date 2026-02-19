<?php

namespace App\Http\Controllers;

use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Services\PlanLimitService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AffiliationController extends Controller
{
    public function __construct(
        private PlanLimitService $limitService
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();
        $manufacturer = Manufacturer::find($user->current_manufacturer_id);

        if (! $manufacturer) {
            abort(403, 'Você não está afiliado a nenhum fabricante.');
        }

        $query = ManufacturerAffiliation::where('manufacturer_id', $manufacturer->id)
            ->with('user:id,name,email');

        // Filter by status
        $status = $request->input('status', 'pending');
        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $affiliations = $query->latest()->get()->map(function ($affiliation) {
            return [
                'id' => $affiliation->id,
                'status' => $affiliation->status,
                'created_at' => $affiliation->created_at,
                'updated_at' => $affiliation->updated_at,
                'user' => [
                    'id' => $affiliation->user->id,
                    'name' => $affiliation->user->name,
                    'email' => $affiliation->user->email,
                ],
            ];
        });

        return Inertia::render('affiliations/index', [
            'affiliations' => [
                'data' => $affiliations,
            ],
            'filters' => [
                'status' => $status,
            ],
        ]);
    }

    public function approve(ManufacturerAffiliation $affiliation): RedirectResponse
    {
        $user = auth()->user();
        $manufacturer = Manufacturer::find($user->current_manufacturer_id);

        if (! $manufacturer || $affiliation->manufacturer_id !== $manufacturer->id) {
            abort(403, 'Você não tem permissão para aprovar esta afiliação.');
        }

        if ($affiliation->status !== 'pending') {
            return redirect()->back()->with('error', 'Apenas afiliações pendentes podem ser aprovadas.');
        }

        if (! $this->limitService->canCreateRep($manufacturer)) {
            return redirect()->back()
                ->with('error', 'Você atingiu o limite de representantes do seu plano.')
                ->with('limit_exceeded', $this->limitService->limitExceededPayload($manufacturer, 'reps'));
        }

        $affiliation->update(['status' => 'active']);

        return redirect()->back()->with('success', 'Afiliação aprovada com sucesso!');
    }

    public function reject(ManufacturerAffiliation $affiliation): RedirectResponse
    {
        $user = auth()->user();
        $manufacturer = Manufacturer::find($user->current_manufacturer_id);

        if (! $manufacturer || $affiliation->manufacturer_id !== $manufacturer->id) {
            abort(403, 'Você não tem permissão para rejeitar esta afiliação.');
        }

        if ($affiliation->status !== 'pending') {
            return redirect()->back()->with('error', 'Apenas afiliações pendentes podem ser rejeitadas.');
        }

        $affiliation->update(['status' => 'rejected']);

        return redirect()->back()->with('success', 'Afiliação rejeitada.');
    }

    public function revoke(ManufacturerAffiliation $affiliation): RedirectResponse
    {
        $user = auth()->user();
        $manufacturer = Manufacturer::find($user->current_manufacturer_id);

        if (! $manufacturer || $affiliation->manufacturer_id !== $manufacturer->id) {
            abort(403, 'Você não tem permissão para revogar esta afiliação.');
        }

        if ($affiliation->status !== 'active') {
            return redirect()->back()->with('error', 'Apenas afiliações ativas podem ser revogadas.');
        }

        $affiliation->update(['status' => 'revoked']);

        return redirect()->back()->with('success', 'Afiliação revogada.');
    }
}
