<?php

namespace App\Services;

use App\Enums\UserType;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\RepresentativeInvitation;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RepresentativeInvitationService
{
    public function __construct(private PlanLimitService $limitService) {}

    /**
     * @param  array{name: string, email: string, whatsapp?: string|null, personal_message?: string|null}  $data
     * @return array{invitation: RepresentativeInvitation, token: string}
     */
    public function create(Manufacturer $manufacturer, User $invitedBy, array $data): array
    {
        $email = trim(Str::lower($data['email']));

        return DB::transaction(function () use ($manufacturer, $invitedBy, $data, $email): array {
            $lockedManufacturer = Manufacturer::query()->lockForUpdate()->findOrFail($manufacturer->id);
            $existingUser = User::query()->whereRaw('LOWER(email) = ?', [$email])->first();

            if ($existingUser && ! $existingUser->isSalesRep()) {
                throw ValidationException::withMessages([
                    'email' => 'Este e-mail pertence a outro tipo de conta e não pode ser convidado como representante.',
                ]);
            }

            if ($existingUser && ManufacturerAffiliation::query()
                ->where('manufacturer_id', $lockedManufacturer->id)
                ->where('user_id', $existingUser->id)
                ->where('status', 'active')
                ->exists()) {
                throw ValidationException::withMessages([
                    'email' => 'Este representante já faz parte da sua rede ativa.',
                ]);
            }

            if (RepresentativeInvitation::query()
                ->where('manufacturer_id', $lockedManufacturer->id)
                ->where('email_normalized', $email)
                ->where('status', 'pending')
                ->where('expires_at', '>', now())
                ->exists()) {
                throw ValidationException::withMessages([
                    'email' => 'Já existe um convite aguardando aceite para este e-mail.',
                ]);
            }

            if (! $this->limitService->canCreateRep($lockedManufacturer)) {
                throw ValidationException::withMessages([
                    'email' => 'Seu plano não possui outra vaga disponível para representante.',
                ]);
            }

            $token = Str::random(64);
            $invitation = RepresentativeInvitation::query()->create([
                'manufacturer_id' => $lockedManufacturer->id,
                'invited_by_user_id' => $invitedBy->id,
                'name' => $data['name'],
                'email' => $email,
                'email_normalized' => $email,
                'whatsapp' => $data['whatsapp'] ?? null,
                'personal_message' => $data['personal_message'] ?? null,
                'token_hash' => hash('sha256', $token),
                'status' => 'pending',
                'expires_at' => now()->addDays(7),
                'last_sent_at' => now(),
                'send_count' => 1,
            ]);

            return ['invitation' => $invitation, 'token' => $token];
        }, 3);
    }

    /**
     * @return array{invitation: RepresentativeInvitation, token: string}
     */
    public function resend(RepresentativeInvitation $invitation): array
    {
        return DB::transaction(function () use ($invitation): array {
            $lockedInvitation = RepresentativeInvitation::query()->lockForUpdate()->findOrFail($invitation->id);

            if ($lockedInvitation->status !== 'pending') {
                throw ValidationException::withMessages([
                    'invitation' => 'Apenas convites aguardando aceite podem ser reenviados.',
                ]);
            }

            if (! $this->limitService->canCreateRep($lockedInvitation->manufacturer, $lockedInvitation->id)) {
                throw ValidationException::withMessages([
                    'invitation' => 'Seu plano não possui outra vaga disponível para este convite.',
                ]);
            }

            $token = Str::random(64);
            $lockedInvitation->update([
                'token_hash' => hash('sha256', $token),
                'expires_at' => now()->addDays(7),
                'last_sent_at' => now(),
                'send_count' => $lockedInvitation->send_count + 1,
            ]);

            return ['invitation' => $lockedInvitation, 'token' => $token];
        }, 3);
    }

    public function cancel(RepresentativeInvitation $invitation): void
    {
        DB::transaction(function () use ($invitation): void {
            $lockedInvitation = RepresentativeInvitation::query()->lockForUpdate()->findOrFail($invitation->id);

            if ($lockedInvitation->status !== 'pending') {
                throw ValidationException::withMessages([
                    'invitation' => 'Este convite não pode mais ser cancelado.',
                ]);
            }

            $lockedInvitation->update(['status' => 'cancelled']);
        }, 3);
    }

    public function findByToken(string $token): RepresentativeInvitation
    {
        return RepresentativeInvitation::query()
            ->with(['manufacturer.catalogSetting', 'invitedBy'])
            ->where('token_hash', hash('sha256', $token))
            ->firstOrFail();
    }

    /**
     * @param  array{name?: string, password?: string}  $data
     * @return array{invitation: RepresentativeInvitation, user: User, was_created: bool}
     */
    public function accept(string $token, ?User $authenticatedUser, array $data): array
    {
        $invitationId = $this->findByToken($token)->id;

        return DB::transaction(function () use ($invitationId, $authenticatedUser, $data): array {
            $invitation = RepresentativeInvitation::query()
                ->with('manufacturer')
                ->lockForUpdate()
                ->findOrFail($invitationId);

            if ($invitation->status === 'accepted') {
                $user = User::query()->whereRaw('LOWER(email) = ?', [$invitation->email_normalized])->firstOrFail();

                return ['invitation' => $invitation, 'user' => $user, 'was_created' => false];
            }

            if ($invitation->status !== 'pending' || $invitation->expires_at->isPast()) {
                throw ValidationException::withMessages([
                    'invitation' => 'Este convite expirou ou foi cancelado. Peça um novo envio ao fabricante.',
                ]);
            }

            Manufacturer::query()->lockForUpdate()->findOrFail($invitation->manufacturer_id);

            if (! $this->limitService->canCreateRep($invitation->manufacturer, $invitation->id)) {
                throw ValidationException::withMessages([
                    'invitation' => 'A vaga deste convite não está mais disponível. Fale com o fabricante.',
                ]);
            }

            $existingUser = User::query()->whereRaw('LOWER(email) = ?', [$invitation->email_normalized])->first();

            if ($authenticatedUser && Str::lower($authenticatedUser->email) !== $invitation->email_normalized) {
                throw ValidationException::withMessages([
                    'invitation' => 'Entre com a conta que recebeu este convite para continuar.',
                ]);
            }

            if ($existingUser && ! $existingUser->isSalesRep()) {
                throw ValidationException::withMessages([
                    'invitation' => 'Este e-mail não pode ser usado como uma conta de representante.',
                ]);
            }

            if ($existingUser && ! $authenticatedUser) {
                throw ValidationException::withMessages([
                    'invitation' => 'Entre na sua conta para aceitar este convite.',
                ]);
            }

            $wasCreated = false;
            $user = $existingUser ?? $authenticatedUser;

            if (! $user) {
                $user = new User([
                    'name' => $data['name'] ?? $invitation->name,
                    'email' => $invitation->email_normalized,
                    'password' => Hash::make((string) $data['password']),
                    'user_type' => UserType::SalesRep,
                ]);
                $user->email_verified_at = now();
                $user->save();
                $wasCreated = true;
            }

            $affiliation = ManufacturerAffiliation::query()->firstOrNew([
                'manufacturer_id' => $invitation->manufacturer_id,
                'user_id' => $user->id,
            ]);
            $affiliation->fill([
                'status' => 'active',
                'source' => 'invitation',
                'approved_at' => now(),
                'rejected_at' => null,
                'revoked_at' => null,
                'decided_by_user_id' => $invitation->invited_by_user_id,
            ])->save();

            if ($invitation->whatsapp) {
                $user->salesRepresentativeProfile()->updateOrCreate([], [
                    'whatsapp' => $invitation->whatsapp,
                ]);
            }

            $invitation->update([
                'affiliation_id' => $affiliation->id,
                'status' => 'accepted',
                'accepted_at' => now(),
            ]);

            return ['invitation' => $invitation, 'user' => $user, 'was_created' => $wasCreated];
        }, 3);
    }
}
