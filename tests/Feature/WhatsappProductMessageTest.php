<?php

use App\Enums\ProductMediaType;
use App\Models\Manufacturer;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Models\User;
use App\Models\WhatsappConversation;
use App\Models\WhatsappInstance;
use App\Models\WhatsappMessage;
use App\Services\EvolutionApiService;

function createWhatsappProductTestContext(): array
{
    $manufacturer = Manufacturer::factory()->create(['is_active' => true]);
    $user = User::factory()->create([
        'user_type' => 'manufacturer_user',
        'current_manufacturer_id' => $manufacturer->id,
    ]);
    $manufacturer->users()->attach($user->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);
    $instance = WhatsappInstance::factory()->connected()->create([
        'manufacturer_id' => $manufacturer->id,
        'instance_name' => 'zouth-test',
    ]);
    $conversation = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $instance->id,
        'remote_jid' => '5511999998888@s.whatsapp.net',
    ]);

    return [$user, $manufacturer, $instance, $conversation];
}

it('lists only active products from the current manufacturer for whatsapp atendimento', function () {
    [$user, $manufacturer] = createWhatsappProductTestContext();

    $visibleProduct = Product::factory()->forManufacturer($manufacturer)->create([
        'name' => 'Camisa Azul',
        'sku' => 'CAM-AZUL',
        'price_cents' => 12990,
    ]);
    ProductMedia::factory()->create([
        'product_id' => $visibleProduct->id,
        'path' => 'products/camisa-azul.jpg',
        'sort_order' => 0,
    ]);
    Product::factory()->forManufacturer($manufacturer)->create([
        'name' => 'Produto Inativo',
        'is_active' => false,
    ]);
    Product::factory()->create(['name' => 'Produto de Outra Loja']);

    $response = $this->actingAs($user)
        ->getJson('/manufacturer/atendimento/products?search=CAM-AZUL')
        ->assertOk()
        ->assertJsonCount(1, 'products');

    $response->assertJsonPath('products.0.name', 'Camisa Azul')
        ->assertJsonPath('products.0.sku', 'CAM-AZUL')
        ->assertJsonPath('products.0.price_cents', 12990);
});

it('sends a product image with selected details as a whatsapp media message', function () {
    [$user, $manufacturer, $instance, $conversation] = createWhatsappProductTestContext();

    $product = Product::factory()->forManufacturer($manufacturer)->create([
        'name' => 'Vestido Floral',
        'sku' => 'VEST-FLORAL',
        'description' => 'Vestido leve com estampa floral.',
        'price_cents' => 15990,
    ]);
    ProductMedia::factory()->create([
        'product_id' => $product->id,
        'type' => ProductMediaType::Image->value,
        'path' => 'products/vestido-floral.jpg',
        'sort_order' => 0,
    ]);

    $mock = $this->mock(EvolutionApiService::class);
    $mock->shouldReceive('sendMedia')
        ->once()
        ->withArgs(function (
            string $instanceName,
            string $remoteJid,
            string $mediaType,
            string $mimeType,
            string $media,
            string $fileName,
            string $caption
        ) use ($instance, $conversation) {
            return $instanceName === $instance->instance_name
                && $remoteJid === $conversation->remote_jid
                && $mediaType === 'image'
                && $mimeType === 'image/jpeg'
                && str_contains($media, 'products/vestido-floral.jpg')
                && $fileName === 'vestido-floral.jpg'
                && str_contains($caption, 'Vestido Floral')
                && str_contains($caption, 'R$ 159,90')
                && str_contains($caption, 'Vestido leve com estampa floral.')
                && str_contains($caption, 'VEST-FLORAL');
        })
        ->andReturn(new \Illuminate\Http\Client\Response(
            new \GuzzleHttp\Psr7\Response(201, [], json_encode([
                'key' => ['id' => 'media-msg-123'],
            ]))
        ));

    $this->actingAs($user)
        ->postJson("/manufacturer/atendimento/conversations/{$conversation->id}/products/{$product->id}", [
            'include_photo' => true,
            'include_price' => true,
            'include_description' => true,
            'include_sku' => true,
        ])
        ->assertOk()
        ->assertJsonPath('message.message_id', 'media-msg-123')
        ->assertJsonPath('message.media_type', 'image');

    $this->assertDatabaseHas('whatsapp_messages', [
        'whatsapp_conversation_id' => $conversation->id,
        'message_id' => 'media-msg-123',
        'from_me' => true,
        'media_type' => 'image',
        'media_mimetype' => 'image/jpeg',
        'media_file_name' => 'vestido-floral.jpg',
    ]);
});

it('falls back to a text message when photo is not selected or unavailable', function () {
    [$user, $manufacturer, $instance, $conversation] = createWhatsappProductTestContext();

    $product = Product::factory()->forManufacturer($manufacturer)->create([
        'name' => 'Calça Jeans',
        'sku' => 'JEANS-01',
        'description' => null,
        'price_cents' => null,
    ]);

    $mock = $this->mock(EvolutionApiService::class);
    $mock->shouldReceive('sendMedia')->never();
    $mock->shouldReceive('sendText')
        ->once()
        ->withArgs(fn (string $instanceName, string $remoteJid, string $text) => $instanceName === $instance->instance_name
            && $remoteJid === $conversation->remote_jid
            && str_contains($text, 'Calça Jeans')
            && ! str_contains($text, 'Preço')
            && ! str_contains($text, 'Descrição'))
        ->andReturn(new \Illuminate\Http\Client\Response(
            new \GuzzleHttp\Psr7\Response(200, [], json_encode([
                'key' => ['id' => 'text-product-123'],
            ]))
        ));

    $this->actingAs($user)
        ->postJson("/manufacturer/atendimento/conversations/{$conversation->id}/products/{$product->id}", [
            'include_photo' => true,
            'include_price' => true,
            'include_description' => true,
            'include_sku' => false,
        ])
        ->assertOk()
        ->assertJsonPath('message.message_id', 'text-product-123')
        ->assertJsonPath('message.media_type', null);

    expect(WhatsappMessage::first()->body)->not->toContain('Preço', 'Descrição', 'JEANS-01');
});

it('forbids sending a product from another manufacturer or to another manufacturer conversation', function () {
    [$user, $manufacturer, , $conversation] = createWhatsappProductTestContext();

    $foreignProduct = Product::factory()->create();

    $this->actingAs($user)
        ->postJson("/manufacturer/atendimento/conversations/{$conversation->id}/products/{$foreignProduct->id}", [
            'include_photo' => false,
            'include_price' => true,
            'include_description' => true,
            'include_sku' => false,
        ])
        ->assertNotFound();

    $product = Product::factory()->forManufacturer($manufacturer)->create();
    $foreignInstance = WhatsappInstance::factory()->connected()->create();
    $foreignConversation = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $foreignInstance->id,
    ]);

    $this->actingAs($user)
        ->postJson("/manufacturer/atendimento/conversations/{$foreignConversation->id}/products/{$product->id}", [
            'include_photo' => false,
            'include_price' => true,
            'include_description' => true,
            'include_sku' => false,
        ])
        ->assertForbidden();
});
