<?php

use App\Enums\UserType;
use App\Models\Manufacturer;
use App\Models\Plan;
use App\Models\ProductMedia;
use App\Models\ProductVariantStock;
use App\Models\RepresentativeInvitation;
use App\Models\User;
use App\Models\WhatsappAutomation;
use App\Models\WhatsappConversation;
use App\Models\WhatsappFunnel;
use App\Models\WhatsappQuickReply;
use App\Rules\Cnpj;
use App\Services\PlanLimitService;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Inertia\Testing\AssertableInertia as Assert;

use function Pest\Laravel\actingAs;
use function Pest\Laravel\withoutVite;

beforeEach(function () {
    withoutVite();
    Storage::fake('s3');
    Storage::fake('public');
    $this->superadmin = User::factory()->create(['user_type' => UserType::Superadmin]);
    $this->plan = Plan::factory()->premium()->create();
});

it('shows the showroom area only to superadmins', function () {
    actingAs($this->superadmin)
        ->get(route('admin.demo-showroom.show'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/demo-showroom')
            ->where('showroom', null)
            ->where('has_active_plan', true));

    $manufacturerUser = User::factory()->create(['user_type' => UserType::ManufacturerUser]);

    actingAs($manufacturerUser)
        ->get(route('admin.demo-showroom.show'))
        ->assertForbidden();
});

it('creates a complete commercial showroom and reveals the password once', function () {
    $response = actingAs($this->superadmin)->post(route('admin.demo-showroom.store'), [
        'email' => 'showroom@zouth.app',
    ]);

    $response
        ->assertRedirect(route('admin.demo-showroom.show'))
        ->assertSessionHas('demo_credentials.email', 'showroom@zouth.app')
        ->assertSessionHas('demo_credentials.password');

    $manufacturer = Manufacturer::query()->where('is_demo', true)->sole();
    $owner = User::query()->where('email', 'showroom@zouth.app')->sole();
    $credentials = session('demo_credentials');

    expect($manufacturer->name)->toBe('Brisa Mini')
        ->and($manufacturer->primary_owner_user_id)->toBe($owner->id)
        ->and($manufacturer->current_plan_id)->toBe($this->plan->id)
        ->and(Hash::check($credentials['password'], $owner->password))->toBeTrue()
        ->and($manufacturer->products()->where('product_type', 'normal')->count())->toBe(20)
        ->and($manufacturer->products()->where('product_type', 'combo')->count())->toBe(3)
        ->and($manufacturer->productCategories()->count())->toBe(7)
        ->and($manufacturer->variationTypes()->count())->toBe(2)
        ->and($manufacturer->orderRules()->count())->toBe(4)
        ->and($manufacturer->orders()->count())->toBe(12)
        ->and($manufacturer->customers()->count())->toBe(8)
        ->and($manufacturer->affiliations()->where('status', 'active')->count())->toBe(2)
        ->and($manufacturer->affiliations()->where('status', 'pending')->count())->toBe(1)
        ->and(RepresentativeInvitation::where('manufacturer_id', $manufacturer->id)->count())->toBe(1)
        ->and(WhatsappFunnel::where('manufacturer_id', $manufacturer->id)->count())->toBe(3)
        ->and(WhatsappAutomation::where('manufacturer_id', $manufacturer->id)->count())->toBe(3)
        ->and(WhatsappQuickReply::where('manufacturer_id', $manufacturer->id)->count())->toBe(6)
        ->and(WhatsappConversation::whereHas('instance', fn ($query) => $query->where('manufacturer_id', $manufacturer->id))->count())->toBe(4)
        ->and($manufacturer->catalogVisits()->count())->toBe(180)
        ->and(ProductMedia::whereIn('product_id', $manufacturer->products()->pluck('id'))->count())->toBe(20)
        ->and(ProductVariantStock::whereIn('product_id', $manufacturer->products()->pluck('id'))->count())
        ->toBe(ProductVariantStock::whereIn('product_id', $manufacturer->products()->pluck('id'))->distinct('sku_variant')->count('sku_variant'))
        ->and(app(PlanLimitService::class)->hasOperationalAccess($manufacturer))->toBeTrue();

    $catalog = $manufacturer->catalogSetting()->sole();
    $this->get(route('public.catalog.show', $catalog->public_token))->assertOk();
});

it('rebuilds the showroom without duplicating data or touching real manufacturers', function () {
    $realManufacturer = Manufacturer::factory()->create(['current_plan_id' => $this->plan->id]);

    actingAs($this->superadmin)->post(route('admin.demo-showroom.store'), [
        'email' => 'primeiro@zouth.app',
    ])->assertRedirect();

    actingAs($this->superadmin)->post(route('admin.demo-showroom.store'), [
        'email' => 'novo@zouth.app',
    ])->assertRedirect();

    $showroom = Manufacturer::query()->where('is_demo', true)->sole();

    expect(Manufacturer::query()->where('is_demo', true)->count())->toBe(1)
        ->and($showroom->products()->count())->toBe(23)
        ->and($showroom->orders()->count())->toBe(12)
        ->and(User::query()->where('email', 'primeiro@zouth.app')->exists())->toBeFalse()
        ->and(User::query()->where('email', 'novo@zouth.app')->exists())->toBeTrue()
        ->and(Manufacturer::query()->whereKey($realManufacturer->id)->exists())->toBeTrue();
});

it('generates an exclusive valid cnpj instead of colliding with a real manufacturer', function () {
    $realManufacturer = Manufacturer::factory()->create([
        'cnpj' => '11222333000181',
    ]);

    actingAs($this->superadmin)->post(route('admin.demo-showroom.store'), [
        'email' => 'showroom@zouth.app',
    ])->assertRedirect(route('admin.demo-showroom.show'));

    $showroom = Manufacturer::query()->where('is_demo', true)->sole();

    expect($showroom->cnpj)
        ->not->toBe($realManufacturer->cnpj)
        ->and(Validator::make(
            ['cnpj' => $showroom->cnpj],
            ['cnpj' => [new Cnpj]],
        )->passes())
        ->toBeTrue();
});

it('does not allow the showroom email to steal an existing account', function () {
    User::factory()->create(['email' => 'ocupado@zouth.app']);

    actingAs($this->superadmin)
        ->post(route('admin.demo-showroom.store'), ['email' => 'ocupado@zouth.app'])
        ->assertSessionHasErrors('email');

    expect(Manufacturer::query()->where('is_demo', true)->exists())->toBeFalse();
});
