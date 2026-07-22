<?php

namespace App\Http\Controllers;

use App\Http\Requests\AcceptRepresentativeInvitationRequest;
use App\Models\User;
use App\Services\RepresentativeInvitationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class RepresentativeInvitationAcceptanceController extends Controller
{
    public function __construct(private RepresentativeInvitationService $invitationService) {}

    public function show(Request $request, string $token): Response
    {
        $invitation = $this->invitationService->findByToken($token);
        $existingUser = User::query()->whereRaw('LOWER(email) = ?', [$invitation->email_normalized])->first();
        $authenticatedUser = $request->user();

        if ($existingUser && ! $authenticatedUser && $invitation->isPending()) {
            $request->session()->put('url.intended', route('representative-invitations.show', ['token' => $token]));
        }

        $catalogMediaDisk = (string) config('filesystems.catalog_media_disk', 'public');
        $logoPath = $invitation->manufacturer->catalogSetting?->logo_path ?? $invitation->manufacturer->logo_path;

        return Inertia::render('representative-invitations/show', [
            'invitation' => [
                'name' => $invitation->name,
                'email' => $invitation->email,
                'personal_message' => $invitation->personal_message,
                'status' => $invitation->isExpired() ? 'expired' : $invitation->status,
                'expires_at' => $invitation->expires_at->toIso8601String(),
            ],
            'manufacturer' => [
                'name' => $invitation->manufacturer->name,
                'logo_url' => $logoPath ? Storage::disk($catalogMediaDisk)->url($logoPath) : null,
            ],
            'invited_by' => $invitation->invitedBy->name,
            'account' => [
                'exists' => $existingUser !== null,
                'authenticated' => $authenticatedUser !== null,
                'matches' => $authenticatedUser && Str::lower($authenticatedUser->email) === $invitation->email_normalized,
            ],
            'token' => $token,
        ]);
    }

    public function accept(AcceptRepresentativeInvitationRequest $request, string $token): RedirectResponse
    {
        $result = $this->invitationService->accept($token, $request->user(), $request->validated());

        if ($result['was_created']) {
            Auth::login($result['user']);
            $request->session()->regenerate();
        }

        return to_route('rep.manufacturers.index')
            ->with('status', 'Convite aceito. A coleção já faz parte da sua rede.');
    }
}
