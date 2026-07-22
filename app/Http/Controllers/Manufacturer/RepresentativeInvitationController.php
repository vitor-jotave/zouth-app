<?php

namespace App\Http\Controllers\Manufacturer;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreRepresentativeInvitationRequest;
use App\Mail\RepresentativeInvitationMail;
use App\Models\Manufacturer;
use App\Models\RepresentativeInvitation;
use App\Services\RepresentativeInvitationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

class RepresentativeInvitationController extends Controller
{
    public function __construct(private RepresentativeInvitationService $invitationService) {}

    public function store(StoreRepresentativeInvitationRequest $request): RedirectResponse
    {
        $manufacturer = Manufacturer::query()->findOrFail($request->user()->current_manufacturer_id);
        ['invitation' => $invitation, 'token' => $token] = $this->invitationService->create(
            $manufacturer,
            $request->user(),
            $request->validated(),
        );

        $this->queueInvitation($invitation, $token);

        return to_route('manufacturer.representatives.index', ['segment' => 'invitations'])
            ->with('status', 'Convite enviado. A vaga fica reservada por 7 dias.');
    }

    public function resend(Request $request, RepresentativeInvitation $invitation): RedirectResponse
    {
        $this->ensureOwnership($request, $invitation);
        ['invitation' => $updatedInvitation, 'token' => $token] = $this->invitationService->resend($invitation);
        $this->queueInvitation($updatedInvitation, $token);

        return back()->with('status', 'Convite reenviado com um novo prazo de 7 dias.');
    }

    public function cancel(Request $request, RepresentativeInvitation $invitation): RedirectResponse
    {
        $this->ensureOwnership($request, $invitation);
        $this->invitationService->cancel($invitation);

        return back()->with('status', 'Convite cancelado e vaga liberada.');
    }

    private function ensureOwnership(Request $request, RepresentativeInvitation $invitation): void
    {
        abort_unless($request->user()->current_manufacturer_id === $invitation->manufacturer_id, 403);
    }

    private function queueInvitation(RepresentativeInvitation $invitation, string $token): void
    {
        $invitation->loadMissing(['manufacturer', 'invitedBy']);
        $acceptUrl = route('representative-invitations.show', ['token' => $token]);

        Mail::to($invitation->email)->queue(new RepresentativeInvitationMail($invitation, $acceptUrl));
    }
}
