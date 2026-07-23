<?php

use App\Enums\UserType;
use App\Models\CatalogSetting;
use App\Models\Manufacturer;
use App\Models\Plan;
use App\Models\User;
use App\Notifications\TrialEndingNotification;
use App\Notifications\TrialPausedNotification;
use App\Notifications\ZouthVerifyEmailNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Inertia\Testing\AssertableInertia as Assert;

function createOnboardingAccount(array $overrides = []): \Illuminate\Testing\TestResponse
{
    Plan::factory()->basic()->create();

    return test()->post(route('onboarding.store'), [
        'brand_name' => 'Petit Monde',
        'selling_method' => 'pdf_whatsapp',
        'name' => 'Marina Costa',
        'email' => 'marina@petitmonde.com.br',
        'password' => 'UmaSenha#2026',
        'password_confirmation' => 'UmaSenha#2026',
        'terms' => true,
        'accent_color' => '#FF4D3D',
        ...$overrides,
    ]);
}

it('opens a progressive onboarding without requiring a plan or personal data', function () {
    $this->get(route('onboarding.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('onboarding/index')
            ->where('stage', 1)
            ->where('manufacturer', null)
            ->where('session.context', []));

    expect(\App\Models\OnboardingSession::first())
        ->not->toBeNull()
        ->manufacturer_id->toBeNull();
});

it('preserves the brand and commercial path before the account exists', function () {
    $this->get(route('onboarding.index'))->assertOk();
    $publicId = \App\Models\OnboardingSession::query()->firstOrFail()->public_id;

    $this->withCookie('zouth_onboarding', $publicId)->post(route('onboarding.progress'), [
        'step' => 3,
        'brand_name' => 'Kattana',
        'selling_method' => 'representatives',
    ])->assertRedirect();

    $session = \App\Models\OnboardingSession::query()->firstOrFail();

    expect($session->current_step)->toBe(3)
        ->and($session->context)->toMatchArray([
            'brand_name' => 'Kattana',
            'selling_method' => 'representatives',
        ]);

    $this->withCookie('zouth_onboarding', $publicId)->get(route('onboarding.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('stage', 3)
            ->where('session.context.brand_name', 'Kattana')
            ->where('session.context.selling_method', 'representatives'));
});

it('creates the manufacturer owner catalog and exact seven day trial in one flow', function () {
    $response = createOnboardingAccount();

    $response->assertRedirect(route('onboarding.index', ['stage' => 'preview']));

    $user = User::query()->where('email', 'marina@petitmonde.com.br')->firstOrFail();
    $manufacturer = Manufacturer::query()->where('name', 'Petit Monde')->firstOrFail();
    $catalog = $manufacturer->catalogSetting;

    $this->assertAuthenticatedAs($user);
    $this->get(route('onboarding.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('onboarding/index')
            ->where('stage', 4));

    expect($user->user_type)->toBe(UserType::ManufacturerUser)
        ->and($user->current_manufacturer_id)->toBe($manufacturer->id)
        ->and($manufacturer->primary_owner_user_id)->toBe($user->id)
        ->and($manufacturer->users()->whereKey($user->id)->first()?->pivot->role)->toBe('owner')
        ->and($manufacturer->trial_started_at)->not->toBeNull()
        ->and($manufacturer->trial_started_at?->diffInDays($manufacturer->trial_ends_at))->toBe(7.0)
        ->and($manufacturer->cnpj)->toBeNull()
        ->and($manufacturer->currentPlan?->is_self_service_default)->toBeTrue()
        ->and($catalog)->toBeInstanceOf(CatalogSetting::class)
        ->and($catalog?->public_link_active)->toBeFalse();
});

it('treats a repeated account submission as an idempotent onboarding resume', function () {
    createOnboardingAccount();

    $user = User::query()->where('email', 'marina@petitmonde.com.br')->firstOrFail();
    $manufacturer = $user->currentManufacturer;

    $this->post(route('onboarding.store'))
        ->assertRedirect(route('onboarding.index'));

    expect(User::query()->count())->toBe(1)
        ->and(Manufacturer::query()->count())->toBe(1)
        ->and(CatalogSetting::query()->count())->toBe(1)
        ->and($manufacturer?->fresh()->primary_owner_user_id)->toBe($user->id);
});

it('requires terms and a unique account email without leaving partial records', function () {
    Plan::factory()->basic()->create();
    User::factory()->create(['email' => 'usado@marca.com']);

    $this->post(route('onboarding.store'), [
        'brand_name' => 'Marca Nova',
        'selling_method' => 'mixed',
        'name' => 'Pessoa',
        'email' => 'usado@marca.com',
        'password' => 'UmaSenha#2026',
        'password_confirmation' => 'UmaSenha#2026',
        'terms' => false,
    ])->assertSessionHasErrors(['email', 'terms']);

    expect(Manufacturer::query()->where('name', 'Marca Nova')->exists())->toBeFalse();
});

it('does not make different onboarding visitors share the account creation limit', function () {
    foreach (range(1, 15) as $visitor) {
        $this->withCookie('zouth_onboarding', "visitor-{$visitor}")
            ->from(route('onboarding.index'))
            ->post(route('onboarding.store'), [
                'email' => "lojista{$visitor}@example.com",
            ])
            ->assertRedirect(route('onboarding.index'))
            ->assertSessionHasErrors(['brand_name']);
    }
});

it('still throttles repeated account creation attempts from the same visitor', function () {
    foreach (range(1, 10) as $attempt) {
        $this->withCookie('zouth_onboarding', 'same-visitor')
            ->from(route('onboarding.index'))
            ->post(route('onboarding.store'), [
                'email' => 'repetido@example.com',
            ])
            ->assertRedirect(route('onboarding.index'));
    }

    $this->withCookie('zouth_onboarding', 'same-visitor')
        ->post(route('onboarding.store'), [
            'email' => 'repetido@example.com',
        ])
        ->assertTooManyRequests();
});

it('applies the shared password policy with clear Portuguese messages', function () {
    $required = Validator::make([], ['email' => ['required']]);
    $tooShort = Validator::make(
        ['password' => 'Abc1'],
        ['password' => [Password::default()]],
    );
    $withoutUppercase = Validator::make(
        ['password' => 'abcdef1'],
        ['password' => [Password::default()]],
    );
    $withoutNumber = Validator::make(
        ['password' => 'Abcdef'],
        ['password' => [Password::default()]],
    );
    $validWithoutSymbol = Validator::make(
        ['password' => 'ABC123'],
        ['password' => [Password::default()]],
    );

    expect($required->errors()->first('email'))
        ->toBe('O campo e-mail é obrigatório.')
        ->and($tooShort->errors()->first('password'))
        ->toBe('O campo senha deve ter pelo menos 6 caracteres.')
        ->and($withoutUppercase->errors()->first('password'))
        ->toBe('A senha deve conter pelo menos uma letra maiúscula.')
        ->and($withoutNumber->errors()->first('password'))
        ->toBe('O campo senha deve conter pelo menos um número.')
        ->and($validWithoutSymbol->passes())
        ->toBeTrue();
});

it('stores the preview and sends the branded verification message only after value is shown', function () {
    Storage::fake('local');
    Notification::fake();
    createOnboardingAccount();

    $user = User::query()->where('email', 'marina@petitmonde.com.br')->firstOrFail();

    $this->actingAs($user)
        ->post(route('onboarding.preview'), [
            'accent_color' => '#5A2A4F',
            'logo' => UploadedFile::fake()->image('logo.png', 512, 240),
        ])
        ->assertRedirect(route('verification.notice'));

    expect($user->currentManufacturer?->fresh()->onboarding_preview_viewed_at)->not->toBeNull()
        ->and($user->currentManufacturer?->catalogSetting?->fresh()->accent_color)->toBe('#5A2A4F')
        ->and($user->currentManufacturer?->catalogSetting?->fresh()->logo_path)->not->toBeNull();

    Notification::assertSentTo($user, ZouthVerifyEmailNotification::class);
});

it('completes onboarding only for a verified owner and keeps the chosen next step', function () {
    createOnboardingAccount();
    $user = User::query()->where('email', 'marina@petitmonde.com.br')->firstOrFail();
    $manufacturer = $user->currentManufacturer;

    $manufacturer?->update(['onboarding_preview_viewed_at' => now()]);
    $user->markEmailAsVerified();

    $this->actingAs($user)
        ->post(route('onboarding.complete'), ['next_step' => 'import'])
        ->assertRedirect(route('manufacturer.product-imports.create'));

    expect($manufacturer?->fresh()->onboarding_completed_at)->not->toBeNull();
});

it('pauses operational routes and the public catalog after an unpaid generic trial expires', function () {
    $plan = Plan::factory()->basic()->create();
    $manufacturer = Manufacturer::factory()->create([
        'current_plan_id' => $plan->id,
        'trial_started_at' => now()->subDays(8),
        'trial_ends_at' => now()->subDay(),
        'onboarding_completed_at' => now(),
    ]);
    $user = User::factory()->create(['current_manufacturer_id' => $manufacturer->id]);
    $manufacturer->users()->attach($user->id, ['role' => 'owner', 'status' => 'active']);
    $manufacturer->update(['primary_owner_user_id' => $user->id]);
    $catalog = CatalogSetting::factory()->forManufacturer($manufacturer)->create(['public_link_active' => true]);

    $this->actingAs($user)->get(route('dashboard'))
        ->assertRedirect(route('manufacturer.account-paused'));

    $this->get(route('public.catalog.show', $catalog->public_token))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('public/catalog-unavailable')
            ->where('manufacturer.name', $manufacturer->name));
});

it('sends trial lifecycle messages only once for each milestone', function () {
    Notification::fake();
    $plan = Plan::factory()->basic()->create();
    $manufacturer = Manufacturer::factory()->create([
        'current_plan_id' => $plan->id,
        'trial_started_at' => now()->subDays(4),
        'trial_ends_at' => now()->addDays(3),
    ]);
    $owner = User::factory()->create(['current_manufacturer_id' => $manufacturer->id]);
    $manufacturer->users()->attach($owner->id, ['role' => 'owner', 'status' => 'active']);
    $manufacturer->update(['primary_owner_user_id' => $owner->id]);

    $this->artisan('app:send-trial-lifecycle-notifications')->assertSuccessful();
    $this->artisan('app:send-trial-lifecycle-notifications')->assertSuccessful();

    Notification::assertSentToTimes($owner, TrialEndingNotification::class, 1);

    $manufacturer->update(['trial_ends_at' => now()->subMinute()]);
    $this->artisan('app:send-trial-lifecycle-notifications')->assertSuccessful();
    $this->artisan('app:send-trial-lifecycle-notifications')->assertSuccessful();

    Notification::assertSentToTimes($owner, TrialPausedNotification::class, 1);
});
