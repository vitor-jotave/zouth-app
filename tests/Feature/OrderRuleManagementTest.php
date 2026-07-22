<?php

use App\Enums\UserType;
use App\Models\Manufacturer;
use App\Models\OrderRule;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

function validOrderRulePayload(array $overrides = []): array
{
    return array_replace([
        'name' => 'Desconto por valor',
        'description' => 'Incentivo comercial da coleção.',
        'is_active' => true,
        'match_mode' => 'all',
        'conditions' => [[
            'metric' => 'subtotal_cents',
            'operator' => 'gte',
            'value' => 200000,
            'max_value' => null,
            'scope_type' => null,
            'scope_ids' => [],
        ]],
        'action' => [
            'type' => 'percentage_discount',
            'value' => 500,
        ],
        'public_message' => 'Você liberou 5% de desconto.',
    ], $overrides);
}

beforeEach(function () {
    $this->withoutVite();

    $plan = Plan::factory()->premium()->create();
    $this->manufacturer = Manufacturer::factory()->create([
        'current_plan_id' => $plan->id,
    ]);
    $this->owner = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($this->owner->id, [
        'role' => 'owner',
        'status' => 'active',
        'capabilities' => [],
    ]);

    $this->actingAs($this->owner);
});

it('lists only the current manufacturer rules and editor options', function () {
    OrderRule::factory()->for($this->manufacturer)->create(['name' => 'Pedido mínimo']);
    OrderRule::factory()->create(['name' => 'Regra de outro fabricante']);
    $category = ProductCategory::factory()->forManufacturer($this->manufacturer)->create();
    Product::factory()->forManufacturer($this->manufacturer)->create([
        'product_category_id' => $category->id,
    ]);

    $this->get(route('manufacturer.order-rules.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('manufacturer/order-rules/index')
            ->has('order_rules', 1)
            ->where('order_rules.0.name', 'Pedido mínimo')
            ->has('products', 1)
            ->has('categories', 1)
            ->where('rule_summary.total', 1)
            ->where('rule_summary.active', 1));
});

it('creates edits toggles duplicates and soft deletes a rule', function () {
    $this->post(route('manufacturer.order-rules.store'), validOrderRulePayload())
        ->assertRedirect()
        ->assertSessionHas('success');

    $rule = OrderRule::query()->firstOrFail();

    expect($rule->manufacturer_id)->toBe($this->manufacturer->id)
        ->and($rule->action['value'])->toBe(500);

    $this->put(
        route('manufacturer.order-rules.update', $rule),
        validOrderRulePayload(['name' => 'Desconto progressivo']),
    )->assertRedirect();

    expect($rule->refresh()->name)->toBe('Desconto progressivo');

    $this->post(route('manufacturer.order-rules.toggle', $rule), [
        'is_active' => false,
    ])->assertRedirect();

    expect($rule->refresh()->is_active)->toBeFalse();

    $this->post(route('manufacturer.order-rules.duplicate', $rule))
        ->assertRedirect();

    $copy = OrderRule::query()->where('id', '!=', $rule->id)->firstOrFail();
    expect($copy->name)->toContain('cópia')
        ->and($copy->is_active)->toBeFalse();

    $this->delete(route('manufacturer.order-rules.destroy', $rule))
        ->assertRedirect();

    $this->assertSoftDeleted('order_rules', ['id' => $rule->id]);
});

it('rejects foreign scopes empty groups and incompatible values', function () {
    $otherManufacturer = Manufacturer::factory()->create();
    $foreignProduct = Product::factory()->forManufacturer($otherManufacturer)->create();

    $this->post(route('manufacturer.order-rules.store'), validOrderRulePayload([
        'conditions' => [[
            'metric' => 'subtotal_cents',
            'operator' => 'between',
            'value' => 200000,
            'max_value' => 100000,
            'scope_type' => 'products',
            'scope_ids' => [$foreignProduct->id],
        ]],
        'action' => [
            'type' => 'percentage_discount',
            'value' => 12000,
        ],
    ]))->assertSessionHasErrors([
        'conditions.0.max_value',
        'conditions.0.scope_ids',
        'action.value',
    ]);

    $this->post(route('manufacturer.order-rules.store'), validOrderRulePayload([
        'conditions' => [],
    ]))->assertSessionHasErrors('conditions');
});

it('requires orders manage permission and protects tenant model bindings', function () {
    $staff = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($staff->id, [
        'role' => 'staff',
        'status' => 'active',
        'capabilities' => ['customers.manage'],
    ]);

    $this->actingAs($staff)
        ->get(route('manufacturer.order-rules.index'))
        ->assertForbidden();

    $otherRule = OrderRule::factory()->create();

    $this->actingAs($this->owner)
        ->put(
            route('manufacturer.order-rules.update', $otherRule),
            validOrderRulePayload(),
        )
        ->assertForbidden();
});
