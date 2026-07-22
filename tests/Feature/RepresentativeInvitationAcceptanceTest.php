<?php

use App\Enums\UserType;
use App\Mail\RepresentativeInvitationMail;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\Plan;
use App\Models\RepresentativeInvitation;
use App\Models\User;

beforeEach(function () {
    $plan = Plan::factory()->create(['max_reps' => 4]);
    $this->manufacturer = Manufacturer::factory()->create([
        'name' => 'Kattana',
        'current_plan_id' => $plan->id,
    ]);
    $this->owner = User::factory()->create(['user_type' => UserType::ManufacturerUser]);
    $this->token = str_repeat('a', 64);
    $this->invitation = RepresentativeInvitation::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'invited_by_user_id' => $this->owner->id,
        'name' => 'Marina Costa',
        'email' => 'marina@example.com',
        'email_normalized' => 'marina@example.com',
        'token_hash' => hash('sha256', $this->token),
    ]);
});

it('shows a co-branded acceptance page without exposing the token hash', function () {
    $this->get(route('representative-invitations.show', $this->token))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('representative-invitations/show')
            ->where('manufacturer.name', 'Kattana')
            ->where('invitation.email', 'marina@example.com')
            ->where('invitation.status', 'pending')
            ->where('account.exists', false)
            ->missing('invitation.token_hash')
        );
});

it('creates a verified representative and activates the invitation atomically', function () {
    $this->post(route('representative-invitations.accept', $this->token), [
        'name' => 'Marina Costa',
        'password' => 'A-safe-password-2026!',
        'password_confirmation' => 'A-safe-password-2026!',
        'terms' => '1',
    ])->assertRedirect(route('rep.manufacturers.index'));

    $representative = User::query()->where('email', 'marina@example.com')->sole();

    expect($representative->user_type)->toBe(UserType::SalesRep)
        ->and($representative->email_verified_at)->not->toBeNull()
        ->and($this->invitation->fresh()->status)->toBe('accepted');

    $this->assertAuthenticatedAs($representative);
    $this->assertDatabaseHas('manufacturer_affiliations', [
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $representative->id,
        'status' => 'active',
        'source' => 'invitation',
    ]);
});

it('requires the existing representative to sign in with the invited email', function () {
    $representative = User::factory()->create([
        'email' => 'marina@example.com',
        'user_type' => UserType::SalesRep,
    ]);

    $this->get(route('representative-invitations.show', $this->token))
        ->assertInertia(fn ($page) => $page
            ->where('account.exists', true)
            ->where('account.authenticated', false)
        );

    $this->actingAs($representative)
        ->post(route('representative-invitations.accept', $this->token))
        ->assertRedirect(route('rep.manufacturers.index'));

    expect(ManufacturerAffiliation::query()->where('user_id', $representative->id)->sole()->status)->toBe('active');
});

it('rejects a mismatched account and an expired invitation', function () {
    $otherRepresentative = User::factory()->create(['user_type' => UserType::SalesRep]);

    $this->actingAs($otherRepresentative)
        ->from(route('representative-invitations.show', $this->token))
        ->post(route('representative-invitations.accept', $this->token))
        ->assertSessionHasErrors('invitation');

    $this->invitation->update(['expires_at' => now()->subMinute()]);

    $this->post(route('representative-invitations.accept', $this->token), [
        'name' => 'Marina Costa',
        'password' => 'A-safe-password-2026!',
        'password_confirmation' => 'A-safe-password-2026!',
        'terms' => '1',
    ])->assertSessionHasErrors('invitation');

    expect($this->invitation->fresh()->status)->toBe('pending');
});

it('keeps acceptance idempotent after the first use', function () {
    $payload = [
        'name' => 'Marina Costa',
        'password' => 'A-safe-password-2026!',
        'password_confirmation' => 'A-safe-password-2026!',
        'terms' => '1',
    ];
    $this->post(route('representative-invitations.accept', $this->token), $payload);
    $representative = User::query()->where('email', 'marina@example.com')->sole();

    $this->actingAs($representative)
        ->post(route('representative-invitations.accept', $this->token))
        ->assertRedirect(route('rep.manufacturers.index'));

    expect(ManufacturerAffiliation::query()
        ->where('manufacturer_id', $this->manufacturer->id)
        ->where('user_id', $representative->id)
        ->count())->toBe(1);
});

it('renders the branded email with its text fallback', function () {
    $this->invitation->load(['manufacturer', 'invitedBy']);
    $mail = new RepresentativeInvitationMail(
        $this->invitation,
        route('representative-invitations.show', $this->token),
    );

    expect($mail->render())
        ->toContain('Kattana quer você como representante')
        ->toContain('Aceitar convite')
        ->toContain('/representative-invitations/');

});
