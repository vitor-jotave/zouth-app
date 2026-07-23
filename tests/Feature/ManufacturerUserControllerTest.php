<?php

use App\Enums\UserType;
use App\Models\Manufacturer;
use App\Models\Plan;
use App\Models\User;
use App\Notifications\TeamInvitationNotification;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    $this->withoutVite();

    $plan = Plan::factory()->premium()->create();
    $this->manufacturer = Manufacturer::factory()->create([
        'is_active' => true,
        'current_plan_id' => $plan->id,
    ]);
    $this->owner = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($this->owner->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);
    $this->manufacturer->update([
        'primary_owner_user_id' => $this->owner->id,
    ]);
});

// ──────────────────────────────────────────────
// Index
// ──────────────────────────────────────────────

it('shows the users index page', function () {
    $this->actingAs($this->owner)
        ->get(route('users.index'))
        ->assertOk();
});

it('denies guests from users index', function () {
    $this->get(route('users.index'))
        ->assertRedirect(route('login'));
});

it('denies sales reps from users index', function () {
    $rep = User::factory()->create(['user_type' => UserType::SalesRep]);

    $this->actingAs($rep)
        ->get(route('users.index'))
        ->assertForbidden();
});

// ──────────────────────────────────────────────
// Store
// ──────────────────────────────────────────────

it('allows owner to create a new user', function () {
    Notification::fake();

    $this->actingAs($this->owner)
        ->post(route('users.store'), [
            'name' => 'Novo Usuario',
            'email' => 'novo@example.com',
            'role' => 'staff',
            'capabilities' => ['collection.manage', 'orders.manage'],
        ])
        ->assertRedirect();

    $this->assertDatabaseHas('users', [
        'email' => 'novo@example.com',
        'user_type' => UserType::ManufacturerUser->value,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);

    $newUser = User::where('email', 'novo@example.com')->first();

    $this->assertDatabaseHas('manufacturer_user', [
        'user_id' => $newUser->id,
        'manufacturer_id' => $this->manufacturer->id,
        'role' => 'staff',
        'status' => 'active',
        'capabilities' => json_encode(['collection.manage', 'orders.manage']),
    ]);

    Notification::assertSentTo(
        $newUser,
        TeamInvitationNotification::class,
        function (TeamInvitationNotification $notification) use ($newUser): bool {
            $message = $notification->toMail($newUser);
            parse_str((string) parse_url($message->viewData['actionUrl'], PHP_URL_QUERY), $query);

            return $notification->manufacturer->is($this->manufacturer)
                && $notification->invitedBy->is($this->owner)
                && $notification->role === 'staff'
                && $message->subject === $this->owner->name.' convidou você para a equipe da '.$this->manufacturer->name
                && ($query['intent'] ?? null) === 'team_invitation'
                && ($query['manufacturer'] ?? null) === $this->manufacturer->name;
        },
    );
});

it('renders a team invitation instead of a generic password reset email', function () {
    $invitedUser = User::factory()->unverified()->make([
        'email' => 'convidada@example.com',
    ]);
    $notification = new TeamInvitationNotification(
        'invitation-token',
        $this->manufacturer,
        $this->owner,
        'staff',
    );
    $message = $notification->toMail($invitedUser);

    $html = view($message->view['html'], $message->viewData)->render();
    $text = view($message->view['text'], $message->viewData)->render();

    expect($html)
        ->toContain('CONVITE PARA A EQUIPE')
        ->toContain('Criar meu acesso')
        ->toContain($this->manufacturer->name)
        ->not->toContain('Reset Password Notification')
        ->and($text)
        ->toContain('Você foi convidado para a equipe')
        ->toContain('Criar meu acesso');
});

it('denies staff from creating users', function () {
    $staff = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($staff->id, [
        'role' => 'staff',
        'status' => 'active',
    ]);

    Notification::fake();

    $this->actingAs($staff)
        ->post(route('users.store'), [
            'name' => 'Blocked',
            'email' => 'blocked@example.com',
            'role' => 'staff',
            'capabilities' => ['orders.manage'],
        ])
        ->assertForbidden();
});

it('validates required fields when creating user', function () {
    $this->actingAs($this->owner)
        ->post(route('users.store'), [])
        ->assertSessionHasErrors(['name', 'email', 'role']);
});

it('rejects duplicate email', function () {
    Notification::fake();

    $this->actingAs($this->owner)
        ->post(route('users.store'), [
            'name' => 'Duplicate',
            'email' => $this->owner->email,
            'role' => 'staff',
            'capabilities' => ['orders.manage'],
        ])
        ->assertSessionHasErrors('email');
});

it('enforces plan user limit', function () {
    Notification::fake();

    $plan = Plan::factory()->create(['max_users' => 1]);
    $this->manufacturer->update(['current_plan_id' => $plan->id]);

    $this->actingAs($this->owner)
        ->post(route('users.store'), [
            'name' => 'Over Limit',
            'email' => 'overlimit@example.com',
            'role' => 'staff',
            'capabilities' => ['orders.manage'],
        ])
        ->assertRedirect()
        ->assertSessionHasErrors('limit');
});

// ──────────────────────────────────────────────
// Update Status
// ──────────────────────────────────────────────

it('allows owner to block a user', function () {
    $staff = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($staff->id, [
        'role' => 'staff',
        'status' => 'active',
    ]);

    $this->actingAs($this->owner)
        ->post(route('users.update-status', $staff), ['status' => 'blocked'])
        ->assertRedirect();

    $pivot = $this->manufacturer->users()->wherePivot('user_id', $staff->id)->first();
    expect($pivot->pivot->status)->toBe('blocked');
});

it('rejects invalid status value', function () {
    $staff = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($staff->id, [
        'role' => 'staff',
        'status' => 'active',
    ]);

    $this->actingAs($this->owner)
        ->post(route('users.update-status', $staff), ['status' => 'invalid'])
        ->assertSessionHasErrors('status');
});

it('prevents another owner from blocking the primary owner', function () {
    $otherOwner = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($otherOwner->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);

    $this->actingAs($otherOwner)
        ->post(route('users.update-status', $this->owner), ['status' => 'blocked'])
        ->assertSessionHasErrors('status');

    $membership = $this->manufacturer->users()->findOrFail($this->owner->id);

    expect($membership->pivot->status)->toBe('active');
});

// ──────────────────────────────────────────────
// Update Role
// ──────────────────────────────────────────────

it('allows owner to change user role', function () {
    $staff = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($staff->id, [
        'role' => 'staff',
        'status' => 'active',
    ]);

    $this->actingAs($this->owner)
        ->post(route('users.update-role', $staff), ['role' => 'owner'])
        ->assertRedirect();

    $pivot = $this->manufacturer->users()->wherePivot('user_id', $staff->id)->first();
    expect($pivot->pivot->role)->toBe('owner');
});

it('allows owner to choose the areas a collaborator can access', function () {
    $staff = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($staff->id, [
        'role' => 'staff',
        'status' => 'active',
        'capabilities' => ['collection.manage'],
    ]);

    $this->actingAs($this->owner)
        ->post(route('users.update-role', $staff), [
            'role' => 'staff',
            'capabilities' => ['orders.manage', 'customers.manage'],
        ])
        ->assertRedirect();

    $membership = $this->manufacturer->users()->findOrFail($staff->id);

    expect($membership->pivot->capabilities)->toBe([
        'orders.manage',
        'customers.manage',
    ]);
});

it('requires at least one area for collaborators', function () {
    $staff = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($staff->id, [
        'role' => 'staff',
        'status' => 'active',
        'capabilities' => ['orders.manage'],
    ]);

    $this->actingAs($this->owner)
        ->post(route('users.update-role', $staff), [
            'role' => 'staff',
            'capabilities' => [],
        ])
        ->assertSessionHasErrors('capabilities');
});

it('prevents an owner from removing their own owner access', function () {
    $this->actingAs($this->owner)
        ->post(route('users.update-role', $this->owner), [
            'role' => 'staff',
            'capabilities' => ['orders.manage'],
        ])
        ->assertSessionHasErrors('role');
});

it('prevents another owner from demoting the primary owner', function () {
    $otherOwner = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($otherOwner->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);

    $this->actingAs($otherOwner)
        ->post(route('users.update-role', $this->owner), [
            'role' => 'staff',
            'capabilities' => ['orders.manage'],
        ])
        ->assertSessionHasErrors('role');

    $membership = $this->manufacturer->users()->findOrFail($this->owner->id);

    expect($membership->pivot->role)->toBe('owner');
});

it('returns 404 for user not in manufacturer', function () {
    $outsider = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
    ]);

    $this->actingAs($this->owner)
        ->post(route('users.update-role', $outsider), [
            'role' => 'staff',
            'capabilities' => ['orders.manage'],
        ])
        ->assertNotFound();
});

// ──────────────────────────────────────────────
// Transfer Ownership
// ──────────────────────────────────────────────

it('allows the primary owner to transfer ownership to another active owner', function () {
    $otherOwner = User::factory()->create([
        'name' => 'Nova Responsável',
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($otherOwner->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);

    $this->actingAs($this->owner)
        ->post(route('users.transfer-ownership', $otherOwner), [
            'current_password' => 'password',
        ])
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success');

    expect($this->manufacturer->fresh()->primary_owner_user_id)->toBe($otherOwner->id);

    $formerPrimaryMembership = $this->manufacturer->users()->findOrFail($this->owner->id);
    expect($formerPrimaryMembership->pivot->role)->toBe('owner')
        ->and($formerPrimaryMembership->pivot->status)->toBe('active');
});

it('requires the current password to transfer ownership', function () {
    $otherOwner = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($otherOwner->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);

    $this->actingAs($this->owner)
        ->post(route('users.transfer-ownership', $otherOwner), [
            'current_password' => 'senha-incorreta',
        ])
        ->assertSessionHasErrors('current_password');

    expect($this->manufacturer->fresh()->primary_owner_user_id)->toBe($this->owner->id);
});

it('prevents a non-primary owner from transferring ownership', function () {
    $otherOwner = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $thirdOwner = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($otherOwner->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);
    $this->manufacturer->users()->attach($thirdOwner->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);

    $this->actingAs($otherOwner)
        ->post(route('users.transfer-ownership', $thirdOwner), [
            'current_password' => 'password',
        ])
        ->assertForbidden();

    expect($this->manufacturer->fresh()->primary_owner_user_id)->toBe($this->owner->id);
});

it('only transfers ownership to another active owner', function () {
    $staff = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($staff->id, [
        'role' => 'staff',
        'status' => 'active',
        'capabilities' => ['orders.manage'],
    ]);

    $this->actingAs($this->owner)
        ->post(route('users.transfer-ownership', $staff), [
            'current_password' => 'password',
        ])
        ->assertSessionHasErrors('ownership');

    expect($this->manufacturer->fresh()->primary_owner_user_id)->toBe($this->owner->id);
});
