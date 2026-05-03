<?php

use App\Jobs\ProcessWhatsappFunnelStep;
use App\Models\Manufacturer;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Models\User;
use App\Models\WhatsappConversation;
use App\Models\WhatsappFunnel;
use App\Models\WhatsappFunnelRun;
use App\Models\WhatsappFunnelStep;
use App\Models\WhatsappInstance;
use App\Services\EvolutionApiService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

function createWhatsappFunnelTestContext(): array
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
        'instance_name' => 'funnel-test-instance',
    ]);
    $conversation = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $instance->id,
        'remote_jid' => '5511999997777@s.whatsapp.net',
    ]);

    return [$user, $manufacturer, $instance, $conversation];
}

it('creates a whatsapp funnel with wait text audio and product steps', function () {
    Storage::fake('s3');
    [$user, $manufacturer] = createWhatsappFunnelTestContext();
    $product = Product::factory()->forManufacturer($manufacturer)->create();

    $this->actingAs($user)
        ->post('/manufacturer/atendimento/funis', [
            'name' => 'Saudações',
            'code' => 'SAUDACOES-01',
            'is_active' => true,
            'steps' => [
                ['type' => 'wait', 'seconds' => 2],
                ['type' => 'text', 'body' => 'Oi, tudo bem?'],
                ['type' => 'audio', 'audio_file' => UploadedFile::fake()->create('audio.mp3', 128, 'audio/mpeg')],
                [
                    'type' => 'product',
                    'product_id' => $product->id,
                    'include_photo' => true,
                    'include_price' => true,
                    'include_description' => true,
                    'include_sku' => false,
                ],
            ],
        ])
        ->assertRedirect();

    $funnel = WhatsappFunnel::first();

    expect($funnel->manufacturer_id)->toBe($manufacturer->id);
    expect($funnel->code)->toBe('SAUDACOES-01');
    expect($funnel->steps()->count())->toBe(4);
    expect($funnel->steps()->where('type', 'audio')->first()->payload['media_path'])->not->toBeEmpty();
});

it('validates required fields for each funnel step type', function () {
    [$user] = createWhatsappFunnelTestContext();

    $this->actingAs($user)
        ->post('/manufacturer/atendimento/funis', [
            'name' => 'Inválido',
            'code' => 'INVALIDO',
            'steps' => [
                ['type' => 'wait'],
                ['type' => 'text'],
                ['type' => 'audio'],
                ['type' => 'product'],
            ],
        ])
        ->assertSessionHasErrors([
            'steps.0.seconds',
            'steps.1.body',
            'steps.2.audio_file',
            'steps.3.product_id',
        ]);
});

it('lists only funnels from the current manufacturer and exposes active funnels in chat order', function () {
    [$user, $manufacturer] = createWhatsappFunnelTestContext();

    WhatsappFunnel::factory()->forManufacturer($manufacturer)->create([
        'name' => 'Combos',
        'code' => 'COMBOS-02',
        'is_active' => true,
        'sort_order' => 2,
    ]);
    WhatsappFunnel::factory()->forManufacturer($manufacturer)->create([
        'name' => 'Saudações',
        'code' => 'SAUDACOES-01',
        'is_active' => true,
        'sort_order' => 1,
    ]);
    WhatsappFunnel::factory()->forManufacturer($manufacturer)->create([
        'name' => 'Rascunho',
        'code' => 'RASCUNHO',
        'is_active' => false,
        'sort_order' => 3,
    ]);
    WhatsappFunnel::factory()->create(['code' => 'OUTRO']);

    $this->actingAs($user)
        ->get('/manufacturer/atendimento/funis')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('manufacturer/atendimento/funis/index')
            ->has('funnels.data', 3)
        );

    $response = $this->actingAs($user)
        ->get('/manufacturer/atendimento')
        ->assertOk();

    $funnels = $response->viewData('page')['props']['funnels'];

    expect(collect($funnels)->pluck('code')->all())->toBe(['SAUDACOES-01', 'COMBOS-02']);
});

it('updates manual order and toggles funnel visibility', function () {
    [$user, $manufacturer] = createWhatsappFunnelTestContext();

    $first = WhatsappFunnel::factory()->forManufacturer($manufacturer)->create(['sort_order' => 1, 'is_active' => true]);
    $second = WhatsappFunnel::factory()->forManufacturer($manufacturer)->create(['sort_order' => 2, 'is_active' => true]);

    $this->actingAs($user)
        ->put('/manufacturer/atendimento/funis/order', [
            'funnels' => [
                ['id' => $first->id, 'sort_order' => 2],
                ['id' => $second->id, 'sort_order' => 1],
            ],
        ])
        ->assertRedirect();

    expect($first->refresh()->sort_order)->toBe(2);
    expect($second->refresh()->sort_order)->toBe(1);

    $this->actingAs($user)
        ->post("/manufacturer/atendimento/funis/{$first->id}/toggle")
        ->assertRedirect();

    expect($first->refresh()->is_active)->toBeFalse();
});

it('starts a funnel run for a conversation and queues the first step', function () {
    Queue::fake();
    [$user, $manufacturer, , $conversation] = createWhatsappFunnelTestContext();

    $funnel = WhatsappFunnel::factory()->forManufacturer($manufacturer)->create();
    WhatsappFunnelStep::factory()->forFunnel($funnel)->create([
        'type' => 'text',
        'sort_order' => 1,
        'payload' => ['body' => 'Oi, tudo bem?'],
    ]);

    $this->actingAs($user)
        ->postJson("/manufacturer/atendimento/conversations/{$conversation->id}/funnels/{$funnel->id}/runs")
        ->assertOk()
        ->assertJsonPath('run.status', 'pending')
        ->assertJsonCount(1, 'run.steps');

    $run = WhatsappFunnelRun::first();

    expect($run->conversation_id)->toBe($conversation->id);
    Queue::assertPushed(ProcessWhatsappFunnelStep::class);
});

it('forbids running a funnel or conversation from another manufacturer', function () {
    [$user, $manufacturer, , $conversation] = createWhatsappFunnelTestContext();
    $foreignFunnel = WhatsappFunnel::factory()->create();

    $this->actingAs($user)
        ->postJson("/manufacturer/atendimento/conversations/{$conversation->id}/funnels/{$foreignFunnel->id}/runs")
        ->assertNotFound();

    $funnel = WhatsappFunnel::factory()->forManufacturer($manufacturer)->create();
    $foreignConversation = WhatsappConversation::factory()->create();

    $this->actingAs($user)
        ->postJson("/manufacturer/atendimento/conversations/{$foreignConversation->id}/funnels/{$funnel->id}/runs")
        ->assertForbidden();
});

it('processes funnel steps in order and sends text audio and product media', function () {
    [$user, $manufacturer, $instance, $conversation] = createWhatsappFunnelTestContext();
    $product = Product::factory()->forManufacturer($manufacturer)->create([
        'name' => 'Blusa Verde',
        'price_cents' => 8990,
    ]);
    ProductMedia::factory()->create([
        'product_id' => $product->id,
        'path' => 'products/blusa-verde.jpg',
    ]);
    $funnel = WhatsappFunnel::factory()->forManufacturer($manufacturer)->create();

    WhatsappFunnelStep::factory()->forFunnel($funnel)->create([
        'type' => 'text',
        'sort_order' => 1,
        'payload' => ['body' => 'Oi, tudo bem?'],
    ]);
    WhatsappFunnelStep::factory()->forFunnel($funnel)->create([
        'type' => 'audio',
        'sort_order' => 2,
        'payload' => [
            'media_path' => 'funnels/audio.mp3',
            'file_name' => 'audio.mp3',
            'mimetype' => 'audio/mpeg',
        ],
    ]);
    WhatsappFunnelStep::factory()->forFunnel($funnel)->create([
        'type' => 'product',
        'sort_order' => 3,
        'payload' => [
            'product_id' => $product->id,
            'include_photo' => true,
            'include_price' => true,
            'include_description' => false,
            'include_sku' => false,
        ],
    ]);

    $run = WhatsappFunnelRun::create([
        'whatsapp_funnel_id' => $funnel->id,
        'whatsapp_conversation_id' => $conversation->id,
        'status' => 'pending',
    ]);
    foreach ($funnel->steps()->orderBy('sort_order')->get() as $step) {
        $run->steps()->create([
            'whatsapp_funnel_step_id' => $step->id,
            'type' => $step->type,
            'sort_order' => $step->sort_order,
            'payload' => $step->payload,
            'status' => 'pending',
        ]);
    }

    $mock = $this->mock(EvolutionApiService::class);
    $mock->shouldReceive('sendText')
        ->once()
        ->with($instance->instance_name, $conversation->remote_jid, 'Oi, tudo bem?')
        ->andReturn(new \Illuminate\Http\Client\Response(new \GuzzleHttp\Psr7\Response(200, [], json_encode(['key' => ['id' => 'text-1']]))));
    $mock->shouldReceive('sendWhatsAppAudio')
        ->once()
        ->with($instance->instance_name, $conversation->remote_jid, Mockery::type('string'))
        ->andReturn(new \Illuminate\Http\Client\Response(new \GuzzleHttp\Psr7\Response(200, [], json_encode(['key' => ['id' => 'audio-1']]))));
    $mock->shouldReceive('sendMedia')
        ->once()
        ->andReturn(new \Illuminate\Http\Client\Response(new \GuzzleHttp\Psr7\Response(200, [], json_encode(['key' => ['id' => fake()->uuid()]]))));

    while ($stepRun = $run->steps()->where('status', 'pending')->orderBy('sort_order')->first()) {
        app(ProcessWhatsappFunnelStep::class, ['stepRun' => $stepRun])->handle($mock);
    }

    expect($run->refresh()->status)->toBe('completed');
    expect($run->steps()->where('status', 'sent')->count())->toBe(3);
    expect($conversation->messages()->count())->toBe(3);
});

it('sends whatsapp presence while waiting based on the next funnel step', function () {
    Queue::fake();
    [$user, $manufacturer, $instance, $conversation] = createWhatsappFunnelTestContext();
    $funnel = WhatsappFunnel::factory()->forManufacturer($manufacturer)->create();

    $waitStep = WhatsappFunnelStep::factory()->forFunnel($funnel)->create([
        'type' => 'wait',
        'sort_order' => 1,
        'payload' => ['seconds' => 2],
    ]);
    WhatsappFunnelStep::factory()->forFunnel($funnel)->create([
        'type' => 'audio',
        'sort_order' => 2,
        'payload' => [
            'media_path' => 'funnels/audio.ogg',
            'file_name' => 'audio.ogg',
            'mimetype' => 'audio/ogg',
        ],
    ]);

    $run = WhatsappFunnelRun::create([
        'whatsapp_funnel_id' => $funnel->id,
        'whatsapp_conversation_id' => $conversation->id,
        'status' => 'pending',
    ]);
    $stepRun = $run->steps()->create([
        'whatsapp_funnel_step_id' => $waitStep->id,
        'type' => $waitStep->type,
        'sort_order' => $waitStep->sort_order,
        'payload' => $waitStep->payload,
        'status' => 'pending',
    ]);
    $run->steps()->create([
        'type' => 'audio',
        'sort_order' => 2,
        'payload' => ['media_path' => 'funnels/audio.ogg'],
        'status' => 'pending',
    ]);

    $mock = $this->mock(EvolutionApiService::class);
    $mock->shouldReceive('sendPresence')
        ->once()
        ->with($instance->instance_name, $conversation->remote_jid, 'recording', 2000)
        ->andReturn(new \Illuminate\Http\Client\Response(new \GuzzleHttp\Psr7\Response(201)));

    app(ProcessWhatsappFunnelStep::class, ['stepRun' => $stepRun])->handle($mock);

    expect($stepRun->refresh()->status)->toBe('waiting');
    Queue::assertPushed(ProcessWhatsappFunnelStep::class);
});

it('sends presence to evolution using a plain phone number payload', function () {
    config([
        'evolution.url' => 'http://evolution.test',
        'evolution.api_key' => 'test-key',
    ]);

    Http::fake([
        'http://evolution.test/chat/sendPresence/funnel-test-instance' => Http::response([], 201),
    ]);

    app(EvolutionApiService::class)->sendPresence(
        'funnel-test-instance',
        '5511999997777@s.whatsapp.net',
        'recording',
        2000,
    );

    Http::assertSent(function ($request) {
        return $request->url() === 'http://evolution.test/chat/sendPresence/funnel-test-instance'
            && $request->hasHeader('apikey', 'test-key')
            && $request['number'] === '5511999997777'
            && $request['options']['number'] === '5511999997777'
            && $request['options']['presence'] === 'recording'
            && $request['options']['delay'] === 2000;
    });
});
