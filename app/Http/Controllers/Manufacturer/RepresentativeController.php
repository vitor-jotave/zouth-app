<?php

namespace App\Http\Controllers\Manufacturer;

use App\Http\Controllers\Controller;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\Order;
use App\Models\RepresentativeInvitation;
use App\Services\PlanLimitService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class RepresentativeController extends Controller
{
    public function __construct(private PlanLimitService $limitService) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', ManufacturerAffiliation::class);

        $manufacturer = Manufacturer::query()
            ->with('catalogSetting')
            ->findOrFail($request->user()->current_manufacturer_id);
        $affiliations = ManufacturerAffiliation::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->with(['user:id,name,email', 'user.salesRepresentativeProfile'])
            ->latest('updated_at')
            ->get();

        $performance = Order::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->whereNotNull('sales_rep_id')
            ->selectRaw("sales_rep_id, COUNT(*) as orders_count, COALESCE(SUM(CASE WHEN order_type = 'standard' THEN total_cents ELSE 0 END), 0) as total_cents, MAX(created_at) as last_order_at")
            ->groupBy('sales_rep_id')
            ->get()
            ->keyBy('sales_rep_id');

        $affiliationData = $affiliations->map(function (ManufacturerAffiliation $affiliation) use ($manufacturer, $performance): array {
            $profile = $affiliation->user->salesRepresentativeProfile;
            $repPerformance = $performance->get($affiliation->user_id);
            $catalogUrl = $manufacturer->catalogSetting?->public_link_active
                ? route('public.catalog.show', ['token' => $manufacturer->catalogSetting->public_token, 'ref' => $affiliation->user_id])
                : null;

            return [
                'id' => $affiliation->id,
                'status' => $affiliation->status,
                'source' => $affiliation->source ?? 'request',
                'application_note' => $affiliation->application_note,
                'requested_at' => $affiliation->requested_at?->toIso8601String() ?? $affiliation->created_at->toIso8601String(),
                'approved_at' => $affiliation->approved_at?->toIso8601String(),
                'rejected_at' => $affiliation->rejected_at?->toIso8601String(),
                'revoked_at' => $affiliation->revoked_at?->toIso8601String(),
                'updated_at' => $affiliation->updated_at->toIso8601String(),
                'user' => [
                    'id' => $affiliation->user->id,
                    'name' => $affiliation->user->name,
                    'email' => $affiliation->user->email,
                ],
                'profile' => [
                    'whatsapp' => $profile?->whatsapp,
                    'city' => $profile?->city,
                    'state' => $profile?->state,
                    'territory' => $profile?->territory,
                    'presentation' => $profile?->presentation,
                ],
                'performance' => [
                    'orders_count' => (int) ($repPerformance?->orders_count ?? 0),
                    'total_cents' => (int) ($repPerformance?->total_cents ?? 0),
                    'last_order_at' => $repPerformance?->last_order_at,
                ],
                'catalog_url' => $catalogUrl,
            ];
        })->values();

        $invitations = RepresentativeInvitation::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->with('invitedBy:id,name')
            ->latest('updated_at')
            ->get()
            ->map(fn (RepresentativeInvitation $invitation): array => [
                'id' => $invitation->id,
                'name' => $invitation->name,
                'email' => $invitation->email,
                'whatsapp' => $invitation->whatsapp,
                'personal_message' => $invitation->personal_message,
                'status' => $invitation->isExpired() ? 'expired' : $invitation->status,
                'expires_at' => $invitation->expires_at->toIso8601String(),
                'last_sent_at' => $invitation->last_sent_at?->toIso8601String(),
                'accepted_at' => $invitation->accepted_at?->toIso8601String(),
                'send_count' => $invitation->send_count,
                'invited_by' => $invitation->invitedBy->name,
            ])->values();

        $activePlan = $this->limitService->activePlan($manufacturer);
        $maxReps = $activePlan?->isUnlimited('max_reps') ? null : $activePlan?->max_reps;

        return Inertia::render('manufacturer/representatives/index', [
            'affiliations' => $affiliationData,
            'invitations' => $invitations,
            'summary' => [
                'active' => $affiliations->where('status', 'active')->count(),
                'pending_requests' => $affiliations->where('status', 'pending')->count(),
                'pending_invitations' => $invitations->where('status', 'pending')->count(),
                'attributed_orders' => (int) $performance->sum('orders_count'),
            ],
            'capacity' => [
                'occupied' => $this->limitService->occupiedRepSlots($manufacturer),
                'limit' => $maxReps,
                'has_active_plan' => $activePlan !== null,
                'available' => $activePlan !== null
                    && ($maxReps === null || $this->limitService->canCreateRep($manufacturer)),
            ],
            'filters' => [
                'segment' => $request->string('segment')->value() ?: 'requests',
                'search' => $request->string('search')->value(),
            ],
        ]);
    }

    public function approve(Request $request, ManufacturerAffiliation $affiliation): RedirectResponse
    {
        $this->authorize('approve', $affiliation);

        if ($affiliation->status !== 'pending') {
            return back()->with('error', 'Apenas solicitações aguardando análise podem ser aprovadas.');
        }

        $manufacturer = Manufacturer::query()->findOrFail($affiliation->manufacturer_id);
        $approved = DB::transaction(function () use ($affiliation, $request): bool {
            $lockedAffiliation = ManufacturerAffiliation::query()->lockForUpdate()->findOrFail($affiliation->id);
            $lockedManufacturer = Manufacturer::query()->lockForUpdate()->findOrFail($lockedAffiliation->manufacturer_id);

            if ($lockedAffiliation->status !== 'pending' || ! $this->limitService->canCreateRep($lockedManufacturer)) {
                return false;
            }

            $lockedAffiliation->update([
                'status' => 'active',
                'approved_at' => now(),
                'rejected_at' => null,
                'revoked_at' => null,
                'decided_by_user_id' => $request->user()->id,
            ]);

            return true;
        }, 3);

        if (! $approved) {
            return back()
                ->with('error', 'Seu plano não possui outra vaga disponível para representante.')
                ->with('limit_exceeded', $this->limitService->limitExceededPayload($manufacturer, 'reps'));
        }

        return back()->with('status', 'Representante aprovado e pronto para movimentar a coleção.');
    }

    public function reject(Request $request, ManufacturerAffiliation $affiliation): RedirectResponse
    {
        $this->authorize('reject', $affiliation);

        if ($affiliation->status !== 'pending') {
            return back()->with('error', 'Apenas solicitações aguardando análise podem ser recusadas.');
        }

        $affiliation->update([
            'status' => 'rejected',
            'rejected_at' => now(),
            'decided_by_user_id' => $request->user()->id,
        ]);

        return back()->with('status', 'Solicitação recusada e preservada no histórico.');
    }

    public function revoke(Request $request, ManufacturerAffiliation $affiliation): RedirectResponse
    {
        $this->authorize('revoke', $affiliation);

        if ($affiliation->status !== 'active') {
            return back()->with('error', 'Apenas representantes ativos podem ser removidos da rede.');
        }

        $affiliation->update([
            'status' => 'revoked',
            'revoked_at' => now(),
            'decided_by_user_id' => $request->user()->id,
        ]);

        return back()->with('status', 'Vínculo encerrado. Pedidos e histórico foram preservados.');
    }
}
