<?php

use App\Mail\PlanSelectionInvite;
use App\Models\Manufacturer;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\withoutVite;

beforeEach(function () {
    withoutVite();
    Mail::fake();
});

it('shows the plan selection page with a valid signed URL', function () {
    $manufacturer = Manufacturer::factory()->create();
    Plan::factory()->count(2)->create(['is_active' => true]);

    $signedUrl = URL::temporarySignedRoute(
        'plan-selection.show',
        now()->addDays(3),
        ['manufacturer' => $manufacturer->id],
    );

    $response = $this->get($signedUrl);

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->component('plan-selection/index')
        ->has('manufacturer')
        ->has('plans')
        ->has('checkoutUrls')
    );
});

it('returns 403 for plan selection page without a valid signature', function () {
    $manufacturer = Manufacturer::factory()->create();

    $response = $this->get(route('plan-selection.show', $manufacturer->id));

    $response->assertForbidden();
});

it('returns 403 for plan selection page with an expired signature', function () {
    $manufacturer = Manufacturer::factory()->create();

    $expiredUrl = URL::temporarySignedRoute(
        'plan-selection.show',
        now()->subDay(),
        ['manufacturer' => $manufacturer->id],
    );

    $response = $this->get($expiredUrl);

    $response->assertForbidden();
});

it('passes checkout urls as signed routes for each active plan', function () {
    $manufacturer = Manufacturer::factory()->create();
    $plans = Plan::factory()->count(3)->create(['is_active' => true]);

    $signedUrl = URL::temporarySignedRoute(
        'plan-selection.show',
        now()->addDays(3),
        ['manufacturer' => $manufacturer->id],
    );

    $response = $this->get($signedUrl);

    $response->assertInertia(fn ($page) => $page
        ->has('checkoutUrls', $plans->count())
    );
});

it('returns 403 for checkout route without a valid signature', function () {
    $manufacturer = Manufacturer::factory()->create();
    $plan = Plan::factory()->create(['is_active' => true]);

    $response = $this->get(route('plan-selection.checkout', [
        'manufacturer' => $manufacturer->id,
        'plan' => $plan->id,
    ]));

    $response->assertForbidden();
});

it('sets current plan on manufacturer after successful checkout', function () {
    $manufacturer = Manufacturer::factory()->create(['current_plan_id' => null]);
    $plan = Plan::factory()->create();

    $response = $this->get(route('plan-selection.checkout.success', [
        'manufacturer' => $manufacturer->id,
        'plan' => $plan->id,
    ]));

    $response->assertRedirect(route('login'));

    expect($manufacturer->fresh()->current_plan_id)->toBe($plan->id);
});

it('sends a plan selection invite email after manufacturer creation', function () {
    $superadmin = User::factory()->create(['user_type' => 'superadmin']);
    actingAs($superadmin);

    $this->post('/admin/manufacturers', [
        'manufacturer_name' => 'Test Manufacturer',
        'owner_name' => 'Test Owner',
        'owner_email' => 'owner@example.com',
        'cnpj' => '11222333000181',
        'phone' => '(11) 99999-9999',
    ]);

    Mail::assertSent(PlanSelectionInvite::class, function (PlanSelectionInvite $mail) {
        return $mail->hasTo('owner@example.com')
            && $mail->manufacturer->name === 'Test Manufacturer'
            && $mail->ownerName === 'Test Owner';
    });
});

it('flashes plan_selection_url to session after manufacturer creation', function () {
    $superadmin = User::factory()->create(['user_type' => 'superadmin']);
    actingAs($superadmin);

    $response = $this->post('/admin/manufacturers', [
        'manufacturer_name' => 'Flash Test Manufacturer',
        'owner_name' => 'Flash Owner',
        'owner_email' => 'flash.owner@example.com',
        'cnpj' => '11222333000181',
        'phone' => '(11) 99999-9999',
    ]);

    $response->assertSessionHas('plan_selection_url');

    $url = session('plan_selection_url');
    expect($url)->toContain('/plan-selection/');
});
