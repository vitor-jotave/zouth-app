<?php

use App\Enums\UserType;
use App\Mail\RepresentativeInvitationMail;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\Plan;
use App\Models\RepresentativeInvitation;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

beforeEach(function () {
    $this->plan = Plan::factory()->create(['max_reps' => 3]);
    $this->manufacturer = Manufacturer::factory()->create(['current_plan_id' => $this->plan->id]);
    $this->owner = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($this->owner, ['role' => 'owner', 'status' => 'active']);
});

it('shows the commercial network without leaking another manufacturer', function () {
    $representative = User::factory()->create(['user_type' => UserType::SalesRep]);
    $ownAffiliation = ManufacturerAffiliation::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $representative->id,
        'application_note' => 'Tenho uma carteira forte no interior.',
    ]);
    $otherAffiliation = ManufacturerAffiliation::factory()->create();

    $this->actingAs($this->owner)
        ->get(route('manufacturer.representatives.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('manufacturer/representatives/index')
            ->has('affiliations', 1)
            ->where('affiliations.0.id', $ownAffiliation->id)
            ->where('summary.pending_requests', 1)
            ->missing('affiliations.1')
        );

    expect($otherAffiliation->manufacturer_id)->not->toBe($this->manufacturer->id);
});

it('creates a seven day invitation and queues the branded email', function () {
    Mail::fake();

    $this->actingAs($this->owner)
        ->post(route('manufacturer.representatives.invitations.store'), [
            'name' => 'Marina Costa',
            'email' => 'MARINA@example.com',
            'whatsapp' => '11988887777',
            'personal_message' => 'Sua carteira tem tudo a ver com nosso próximo lançamento.',
        ])
        ->assertRedirect(route('manufacturer.representatives.index', ['segment' => 'invitations']));

    $invitation = RepresentativeInvitation::query()->sole();

    expect($invitation->email_normalized)->toBe('marina@example.com')
        ->and($invitation->token_hash)->toHaveLength(64)
        ->and($invitation->created_at->diffInDays($invitation->expires_at))->toBeBetween(6.9, 7.1);

    Mail::assertQueued(RepresentativeInvitationMail::class, fn (RepresentativeInvitationMail $mail): bool => $mail->hasTo('marina@example.com')
        && str_contains($mail->acceptUrl, '/representative-invitations/'));
});

it('blocks duplicate live invitations and incompatible account types', function () {
    Mail::fake();
    $payload = [
        'name' => 'Marina Costa',
        'email' => 'marina@example.com',
        'whatsapp' => '',
        'personal_message' => '',
    ];

    $this->actingAs($this->owner)
        ->post(route('manufacturer.representatives.invitations.store'), $payload)
        ->assertSessionHasNoErrors();

    $this->actingAs($this->owner)
        ->from(route('manufacturer.representatives.index'))
        ->post(route('manufacturer.representatives.invitations.store'), $payload)
        ->assertSessionHasErrors('email');

    User::factory()->create([
        'email' => 'owner@example.com',
        'user_type' => UserType::ManufacturerUser,
    ]);

    $this->actingAs($this->owner)
        ->post(route('manufacturer.representatives.invitations.store'), [
            ...$payload,
            'email' => 'owner@example.com',
        ])
        ->assertSessionHasErrors('email');
});

it('counts a pending invitation as a reserved plan slot', function () {
    $this->plan->update(['max_reps' => 1]);
    RepresentativeInvitation::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'invited_by_user_id' => $this->owner->id,
    ]);
    $representative = User::factory()->create(['user_type' => UserType::SalesRep]);
    $application = ManufacturerAffiliation::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $representative->id,
    ]);

    $this->actingAs($this->owner)
        ->post(route('manufacturer.representatives.approve', $application))
        ->assertSessionHas('error');

    expect($application->fresh()->status)->toBe('pending');
});

it('does not present an inactive subscription as an unlimited representative plan', function () {
    $this->plan->update(['stripe_price_id' => 'price_inactive_qa']);

    $this->actingAs($this->owner)
        ->get(route('manufacturer.representatives.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('capacity.has_active_plan', false)
            ->where('capacity.available', false)
            ->where('capacity.limit', null)
        );
});

it('records decisions while preserving the relationship history', function () {
    $representative = User::factory()->create(['user_type' => UserType::SalesRep]);
    $application = ManufacturerAffiliation::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $representative->id,
    ]);

    $this->actingAs($this->owner)
        ->post(route('manufacturer.representatives.approve', $application))
        ->assertSessionHas('status');

    expect($application->fresh()->status)->toBe('active')
        ->and($application->fresh()->approved_at)->not->toBeNull()
        ->and($application->fresh()->decided_by_user_id)->toBe($this->owner->id);

    $this->actingAs($this->owner)
        ->post(route('manufacturer.representatives.revoke', $application))
        ->assertSessionHas('status');

    expect($application->fresh()->status)->toBe('revoked')
        ->and($application->fresh()->revoked_at)->not->toBeNull();
});
