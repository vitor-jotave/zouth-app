<?php

use App\Enums\OrderStatus;
use App\Enums\OrderType;
use App\Enums\UserType;
use App\Mail\RepresentativeInvitationMail;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\Order;
use App\Models\OrderItem;
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

it('scopes the dashboard to this manufacturer and keeps sales history after revocation', function () {
    $this->withoutVite();
    $this->travelTo(now()->setDate(2026, 11, 16)->setTime(12, 0));
    $rep = User::factory()->create(['user_type' => UserType::SalesRep]);
    $affiliation = ManufacturerAffiliation::factory()->create([
        'manufacturer_id' => $this->manufacturer->id, 'user_id' => $rep->id,
        'status' => 'revoked', 'revoked_at' => now(),
    ]);
    $other = ManufacturerAffiliation::factory()->create(['user_id' => $rep->id]);
    $own = Order::factory()->forManufacturer($this->manufacturer)->state(['sales_rep_id' => $rep->id]);
    $sale = $own->status(OrderStatus::Confirmed)->create(['total_cents' => 20000]);
    $legacy = $own->create(['discount_cents' => 500, 'created_at' => now()->subDays(2)]);
    OrderItem::factory()->create(['order_id' => $legacy->id, 'quantity' => 2, 'unit_price' => '20.00']);
    $own->status(OrderStatus::Cancelled)->create(['total_cents' => 80000]);
    $quote = $own->create(['order_type' => OrderType::Quote, 'total_cents' => 50000]);
    $own->create(['created_at' => now()->subDays(45), 'total_cents' => 1000]);
    $own->create(['created_at' => now()->subMonths(7), 'total_cents' => 3000]);
    Order::factory()->create(['manufacturer_id' => $other->manufacturer_id, 'sales_rep_id' => $rep->id, 'total_cents' => 90000]);
    Order::factory()->forManufacturer($this->manufacturer)->create(['total_cents' => 70000]);
    $url = fn (array $filters = []): string => route('manufacturer.representatives.show', ['affiliation' => $affiliation, ...$filters]);

    $this->actingAs($this->owner)->get($url())->assertOk()->assertInertia(fn ($page) => $page
        ->component('manufacturer/representatives/show')
        ->where('representative.status', 'revoked')->where('representative.profile', null)
        ->where('representative.catalog_url', null)->where('stats.orders', 3)
        ->where('stats.in_progress', 1)->where('stats.net_cents', 23500)->where('stats.quotes', 1)
        ->has('series', 30)->where('series.29.revenue_cents', 20000)->has('history.data', 3));
    $this->get($url(['period' => '90_days', 'status' => 'confirmed']))->assertInertia(fn ($page) => $page
        ->has('series', 90)->where('stats.orders', 4)->where('stats.net_cents', 24500)
        ->has('history.data', 1)->where('history.data.0.id', $sale->id));
    $this->get($url(['period' => '12_months', 'type' => 'quote']))->assertInertia(fn ($page) => $page
        ->has('series', 12)->where('stats.net_cents', 27500)
        ->has('history.data', 1)->where('history.data.0.id', $quote->id)->where('history.data.0.total_cents', 50000));
    $this->get(route('manufacturer.representatives.show', $other))->assertNotFound();
    $this->get(route('manufacturer.orders.show', ['order' => $sale, 'representative' => $affiliation->id, 'period' => '90_days', 'status' => 'confirmed', 'page' => 2]))
        ->assertInertia(fn ($page) => $page->where('representative_return.id', $affiliation->id)->where('representative_return.query.period', '90_days')->where('representative_return.query.page', 2));
    $this->get(route('manufacturer.orders.show', ['order' => $sale, 'representative' => $other->id]))
        ->assertInertia(fn ($page) => $page->where('representative_return', null));
});

it('paginates representative orders and respects access to order details', function () {
    $this->withoutVite();
    $affiliation = ManufacturerAffiliation::factory()->create(['manufacturer_id' => $this->manufacturer->id]);
    $staff = User::factory()->create(['user_type' => UserType::ManufacturerUser, 'current_manufacturer_id' => $this->manufacturer->id]);
    $this->manufacturer->users()->attach($staff, ['role' => 'staff', 'status' => 'active', 'capabilities' => ['affiliations.manage']]);
    $url = route('manufacturer.representatives.show', $affiliation);
    $this->actingAs($staff)->get($url)->assertInertia(fn ($page) => $page
        ->where('can_open_orders', false)->has('history.data', 0)->where('stats.net_cents', 0));
    $orders = Order::factory()->forManufacturer($this->manufacturer)->count(16)->create(['sales_rep_id' => $affiliation->user_id, 'total_cents' => 100]);
    $this->get(route('manufacturer.representatives.show', ['affiliation' => $affiliation, 'page' => 2]))
        ->assertInertia(fn ($page) => $page->has('history.data', 1)->where('history.total', 16)->where('stats.net_cents', 1600));
    $this->get(route('manufacturer.orders.show', $orders->first()))->assertForbidden();
    $this->manufacturer->users()->updateExistingPivot($staff, ['capabilities' => ['orders.manage']]);
    $this->get($url)->assertForbidden();
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
