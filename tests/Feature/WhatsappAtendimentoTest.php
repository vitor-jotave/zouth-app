<?php

use App\Models\Manufacturer;
use App\Models\User;
use App\Models\WhatsappConversation;
use App\Models\WhatsappInstance;
use App\Models\WhatsappMessage;
use App\Services\EvolutionApiService;
use App\Services\WhatsappContactProfileSyncService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    config()->set('evolution.api_key', 'test-evolution-api-key');
    config()->set('evolution.webhook_rate_limit', 1000);
    config()->set('evolution.webhook_invalid_rate_limit', 60);
});

function createWhatsappTestManufacturer(): array
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

    return [$user, $manufacturer];
}

// ─── Instance Setup ──────────────────────────────────────────────

test('setup page renders for manufacturer user', function () {
    $this->withoutVite();
    [$user] = createWhatsappTestManufacturer();

    $this->actingAs($user)
        ->get('/manufacturer/atendimento/setup')
        ->assertOk();
});

test('channels page presents the connected channel activity', function () {
    $this->withoutVite();
    [$user, $manufacturer] = createWhatsappTestManufacturer();
    $instance = WhatsappInstance::factory()->create([
        'manufacturer_id' => $manufacturer->id,
        'status' => 'connected',
        'profile_name' => 'Atendimento Zouth',
        'phone_number' => '5511999999999',
    ]);
    WhatsappConversation::factory()->count(2)->create([
        'whatsapp_instance_id' => $instance->id,
        'last_message_at' => now(),
    ]);

    $this->actingAs($user)
        ->get('/manufacturer/atendimento/canais')
        ->assertInertia(fn ($page) => $page
            ->component('manufacturer/atendimento/setup')
            ->where('instance.profile_name', 'Atendimento Zouth')
            ->where('instance.phone_number', '5511999999999')
            ->where('instance.conversation_count', 2)
            ->has('instance.last_activity_at')
        );
});

test('unauthenticated users cannot access setup', function () {
    $this->get('/manufacturer/atendimento/setup')
        ->assertRedirect(route('login'));
});

test('unauthenticated users cannot access channels', function () {
    $this->get('/manufacturer/atendimento/canais')
        ->assertRedirect(route('login'));
});

test('manufacturer user can create an instance', function () {
    [$user, $manufacturer] = createWhatsappTestManufacturer();

    $mock = $this->mock(EvolutionApiService::class);
    $mock->shouldReceive('createInstance')
        ->once()
        ->andReturn(new \Illuminate\Http\Client\Response(
            new \GuzzleHttp\Psr7\Response(200, [], json_encode([
                'instance' => [
                    'instanceName' => 'test-instance',
                    'instanceId' => 'abc-123',
                    'status' => 'created',
                ],
            ]))
        ));

    $this->actingAs($user)
        ->post('/manufacturer/atendimento/instances', [
            'instance_name' => 'test-instance',
        ])
        ->assertRedirect()
        ->assertSessionHas('status', 'Instância criada. Escaneie o QR Code com seu WhatsApp.');

    $this->assertDatabaseHas('whatsapp_instances', [
        'manufacturer_id' => $manufacturer->id,
        'instance_name' => 'test-instance',
        'status' => 'connecting',
    ]);
});

test('instance creation reports a remote name conflict', function () {
    [$user, $manufacturer] = createWhatsappTestManufacturer();

    $mock = $this->mock(EvolutionApiService::class);
    $mock->shouldReceive('createInstance')
        ->once()
        ->andReturn(new \Illuminate\Http\Client\Response(
            new \GuzzleHttp\Psr7\Response(403, [], json_encode([
                'response' => [
                    'message' => ['This name "test-instance" is already in use.'],
                ],
            ]))
        ));

    $this->actingAs($user)
        ->post('/manufacturer/atendimento/instances', [
            'instance_name' => 'test-instance',
        ])
        ->assertRedirect()
        ->assertSessionHas(
            'error',
            'Esse nome de instância já está em uso. Escolha outro nome e tente novamente.',
        );

    $this->assertDatabaseMissing('whatsapp_instances', [
        'manufacturer_id' => $manufacturer->id,
        'instance_name' => 'test-instance',
    ]);
});

test('setup page shares standard flash feedback', function () {
    $this->withoutVite();
    [$user] = createWhatsappTestManufacturer();

    $this->actingAs($user)
        ->withSession([
            'status' => 'Conexão criada.',
            'error' => 'Não foi possível criar a conexão.',
        ])
        ->get('/manufacturer/atendimento/setup')
        ->assertInertia(fn ($page) => $page
            ->where('flash.status', 'Conexão criada.')
            ->where('flash.error', 'Não foi possível criar a conexão.')
        );
});

test('cannot create duplicate instance for same manufacturer', function () {
    [$user, $manufacturer] = createWhatsappTestManufacturer();

    WhatsappInstance::factory()->create(['manufacturer_id' => $manufacturer->id]);

    $this->actingAs($user)
        ->post('/manufacturer/atendimento/instances', [
            'instance_name' => 'second-instance',
        ])
        ->assertRedirect();

    expect(WhatsappInstance::where('manufacturer_id', $manufacturer->id)->count())->toBe(1);
});

test('instance name must be unique', function () {
    [$user] = createWhatsappTestManufacturer();

    WhatsappInstance::factory()->create(['instance_name' => 'taken-name']);

    $this->actingAs($user)
        ->post('/manufacturer/atendimento/instances', [
            'instance_name' => 'taken-name',
        ])
        ->assertSessionHasErrors('instance_name');
});

test('manufacturer user can delete their instance', function () {
    [$user, $manufacturer] = createWhatsappTestManufacturer();
    $instance = WhatsappInstance::factory()->create(['manufacturer_id' => $manufacturer->id]);

    $mock = $this->mock(EvolutionApiService::class);
    $mock->shouldReceive('logoutInstance')->once()->andReturn(
        new \Illuminate\Http\Client\Response(new \GuzzleHttp\Psr7\Response(200))
    );
    $mock->shouldReceive('deleteInstance')->once()->andReturn(
        new \Illuminate\Http\Client\Response(new \GuzzleHttp\Psr7\Response(200))
    );

    $this->actingAs($user)
        ->delete("/manufacturer/atendimento/instances/{$instance->id}")
        ->assertRedirect();

    $this->assertDatabaseMissing('whatsapp_instances', ['id' => $instance->id]);
});

test('user cannot delete another manufacturer instance', function () {
    [$user] = createWhatsappTestManufacturer();

    $otherManufacturer = Manufacturer::factory()->create(['is_active' => true]);
    $instance = WhatsappInstance::factory()->create(['manufacturer_id' => $otherManufacturer->id]);

    $this->actingAs($user)
        ->delete("/manufacturer/atendimento/instances/{$instance->id}")
        ->assertForbidden();
});

test('connection status stores profile data returned by Evolution API v2', function () {
    [$user, $manufacturer] = createWhatsappTestManufacturer();
    $instance = WhatsappInstance::factory()->create([
        'manufacturer_id' => $manufacturer->id,
        'status' => 'connecting',
    ]);

    $mock = $this->mock(EvolutionApiService::class);
    $mock->shouldReceive('connectionState')
        ->once()
        ->with($instance->instance_name)
        ->andReturn(new \Illuminate\Http\Client\Response(
            new \GuzzleHttp\Psr7\Response(200, [], json_encode([
                'instance' => ['state' => 'open'],
            ]))
        ));
    $mock->shouldReceive('fetchInstance')
        ->once()
        ->with($instance->instance_name)
        ->andReturn(new \Illuminate\Http\Client\Response(
            new \GuzzleHttp\Psr7\Response(200, [], json_encode([[
                'id' => 'evolution-instance-id',
                'name' => $instance->instance_name,
                'connectionStatus' => 'open',
                'number' => null,
                'ownerJid' => '5511999999999@s.whatsapp.net',
                'profileName' => 'Atendimento Zouth',
                'profilePicUrl' => 'https://example.com/profile.jpg',
            ]]))
        ));

    $this->actingAs($user)
        ->getJson("/manufacturer/atendimento/instances/{$instance->id}/status")
        ->assertOk()
        ->assertJson([
            'status' => 'connected',
            'phone_number' => '5511999999999',
            'profile_name' => 'Atendimento Zouth',
            'profile_picture_url' => 'https://example.com/profile.jpg',
        ]);

    $this->assertDatabaseHas('whatsapp_instances', [
        'id' => $instance->id,
        'status' => 'connected',
        'phone_number' => '5511999999999',
        'profile_name' => 'Atendimento Zouth',
        'profile_picture_url' => 'https://example.com/profile.jpg',
    ]);
});

// ─── Chat Interface ──────────────────────────────────────────────

test('chat page renders with connected instance', function () {
    $this->withoutVite();
    [$user, $manufacturer] = createWhatsappTestManufacturer();
    WhatsappInstance::factory()->connected()->create(['manufacturer_id' => $manufacturer->id]);
    $this->mock(WhatsappContactProfileSyncService::class)
        ->shouldReceive('sync')
        ->once();

    $this->actingAs($user)
        ->get('/manufacturer/atendimento')
        ->assertOk();
});

test('contact profile pictures are synchronized from evolution contacts', function () {
    [, $manufacturer] = createWhatsappTestManufacturer();
    $instance = WhatsappInstance::factory()->connected()->create([
        'manufacturer_id' => $manufacturer->id,
        'instance_name' => 'profile-sync-instance',
    ]);
    $currentPayloadConversation = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $instance->id,
        'remote_jid' => '5511999999999@s.whatsapp.net',
        'contact_picture_url' => null,
    ]);
    $documentedPayloadConversation = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $instance->id,
        'remote_jid' => '5511888888888@s.whatsapp.net',
        'contact_picture_url' => null,
    ]);

    Cache::forget("whatsapp-contact-profiles:{$instance->id}");
    Http::fake([
        '*/chat/findContacts/profile-sync-instance' => Http::response([
            [
                'id' => 'contact-one',
                'remoteJid' => $currentPayloadConversation->remote_jid,
                'profilePicUrl' => 'https://example.com/current-profile.jpg',
            ],
            [
                'id' => 'contact-two',
                'remoteJid' => $documentedPayloadConversation->remote_jid,
                'profilePictureUrl' => 'https://example.com/documented-profile.jpg',
            ],
        ]),
    ]);

    $sync = app(WhatsappContactProfileSyncService::class);
    $sync->sync($instance);
    $sync->sync($instance);

    expect($currentPayloadConversation->fresh()->contact_picture_url)
        ->toBe('https://example.com/current-profile.jpg')
        ->and($documentedPayloadConversation->fresh()->contact_picture_url)
        ->toBe('https://example.com/documented-profile.jpg');

    Http::assertSentCount(1);
});

test('chat page shows not-connected state when no instance', function () {
    $this->withoutVite();
    [$user] = createWhatsappTestManufacturer();

    $this->actingAs($user)
        ->get('/manufacturer/atendimento')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('manufacturer/atendimento/index')
            ->where('instance_connected', false)
        );
});

test('conversation list endpoint returns json', function () {
    [$user, $manufacturer] = createWhatsappTestManufacturer();
    $instance = WhatsappInstance::factory()->connected()->create(['manufacturer_id' => $manufacturer->id]);
    $this->mock(WhatsappContactProfileSyncService::class)
        ->shouldReceive('sync')
        ->once();

    WhatsappConversation::factory()->count(3)->create(['whatsapp_instance_id' => $instance->id]);

    $this->actingAs($user)
        ->getJson('/manufacturer/atendimento/conversations/list')
        ->assertOk()
        ->assertJsonCount(3, 'conversations');
});

test('messages endpoint returns conversation messages', function () {
    [$user, $manufacturer] = createWhatsappTestManufacturer();
    $instance = WhatsappInstance::factory()->connected()->create(['manufacturer_id' => $manufacturer->id]);
    $conversation = WhatsappConversation::factory()->create(['whatsapp_instance_id' => $instance->id]);

    WhatsappMessage::factory()->count(5)->create(['whatsapp_conversation_id' => $conversation->id]);

    $this->actingAs($user)
        ->getJson("/manufacturer/atendimento/conversations/{$conversation->id}/messages")
        ->assertOk()
        ->assertJsonCount(5, 'messages');
});

test('chat exposes stored media through the authorized application route', function () {
    Storage::fake('s3');
    [$user, $manufacturer] = createWhatsappTestManufacturer();
    $instance = WhatsappInstance::factory()->connected()->create([
        'manufacturer_id' => $manufacturer->id,
    ]);
    $conversation = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $instance->id,
    ]);
    $path = 'whatsapp-messages/1/2026/07/voice.ogg';
    Storage::disk('s3')->put($path, 'voice-content');
    $message = WhatsappMessage::factory()->create([
        'whatsapp_conversation_id' => $conversation->id,
        'media_type' => 'audio',
        'media_url' => Storage::disk('s3')->url($path),
        'media_mimetype' => 'audio/ogg',
        'media_file_name' => 'voice.ogg',
    ]);
    $applicationMediaUrl = route('manufacturer.atendimento.messages.media', $message);

    $this->actingAs($user)
        ->getJson("/manufacturer/atendimento/conversations/{$conversation->id}/messages")
        ->assertOk()
        ->assertJsonPath('messages.0.media_url', $applicationMediaUrl);

    $mediaResponse = $this->actingAs($user)
        ->get($applicationMediaUrl);

    $mediaResponse
        ->assertOk()
        ->assertHeader('content-type', 'audio/ogg');

    expect($mediaResponse->streamedContent())->toBe('voice-content');

    [$foreignUser] = createWhatsappTestManufacturer();

    $this->actingAs($foreignUser)
        ->get($applicationMediaUrl)
        ->assertForbidden();
});

test('user cannot read messages from another manufacturer conversation', function () {
    [$user] = createWhatsappTestManufacturer();

    $otherManufacturer = Manufacturer::factory()->create(['is_active' => true]);
    $instance = WhatsappInstance::factory()->connected()->create(['manufacturer_id' => $otherManufacturer->id]);
    $conversation = WhatsappConversation::factory()->create(['whatsapp_instance_id' => $instance->id]);

    $this->actingAs($user)
        ->getJson("/manufacturer/atendimento/conversations/{$conversation->id}/messages")
        ->assertForbidden();
});

test('sending a message calls evolution api and stores locally', function () {
    [$user, $manufacturer] = createWhatsappTestManufacturer();
    $instance = WhatsappInstance::factory()->connected()->create(['manufacturer_id' => $manufacturer->id]);
    $conversation = WhatsappConversation::factory()->create(['whatsapp_instance_id' => $instance->id]);

    $mock = $this->mock(EvolutionApiService::class);
    $mock->shouldReceive('sendText')
        ->once()
        ->andReturn(new \Illuminate\Http\Client\Response(
            new \GuzzleHttp\Psr7\Response(200, [], json_encode([
                'key' => ['id' => 'msg-123'],
            ]))
        ));

    $this->actingAs($user)
        ->postJson("/manufacturer/atendimento/conversations/{$conversation->id}/messages", [
            'body' => 'Olá, tudo bem?',
        ])
        ->assertOk()
        ->assertJsonPath('message.body', 'Olá, tudo bem?')
        ->assertJsonPath('message.from_me', true);

    $this->assertDatabaseHas('whatsapp_messages', [
        'whatsapp_conversation_id' => $conversation->id,
        'message_id' => 'msg-123',
        'body' => 'Olá, tudo bem?',
        'from_me' => true,
    ]);
});

test('sending a message requires body', function () {
    [$user, $manufacturer] = createWhatsappTestManufacturer();
    $instance = WhatsappInstance::factory()->connected()->create(['manufacturer_id' => $manufacturer->id]);
    $conversation = WhatsappConversation::factory()->create(['whatsapp_instance_id' => $instance->id]);

    $this->actingAs($user)
        ->postJson("/manufacturer/atendimento/conversations/{$conversation->id}/messages", [
            'body' => '',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('body');
});

test('manufacturer user can react to a message and repeat the reaction to remove it', function () {
    [$user, $manufacturer] = createWhatsappTestManufacturer();
    $instance = WhatsappInstance::factory()->connected()->create([
        'manufacturer_id' => $manufacturer->id,
        'instance_name' => 'reaction-instance',
    ]);
    $conversation = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $instance->id,
        'remote_jid' => '5511999887766@s.whatsapp.net',
    ]);
    $message = WhatsappMessage::factory()->create([
        'whatsapp_conversation_id' => $conversation->id,
        'message_id' => 'reaction-target-001',
        'from_me' => false,
    ]);

    $mock = $this->mock(EvolutionApiService::class);
    $mock->shouldReceive('sendReaction')
        ->once()
        ->with(
            'reaction-instance',
            '5511999887766@s.whatsapp.net',
            false,
            'reaction-target-001',
            '❤️',
        )
        ->andReturn(new \Illuminate\Http\Client\Response(
            new \GuzzleHttp\Psr7\Response(200, [], '{}')
        ));
    $mock->shouldReceive('sendReaction')
        ->once()
        ->with(
            'reaction-instance',
            '5511999887766@s.whatsapp.net',
            false,
            'reaction-target-001',
            '',
        )
        ->andReturn(new \Illuminate\Http\Client\Response(
            new \GuzzleHttp\Psr7\Response(200, [], '{}')
        ));

    $endpoint = "/manufacturer/atendimento/messages/{$message->id}/reaction";

    $this->actingAs($user)
        ->postJson($endpoint, ['reaction' => '❤️'])
        ->assertOk()
        ->assertJsonPath('reaction', '❤️')
        ->assertJsonPath('reactions.0.actor', 'self')
        ->assertJsonPath('reactions.0.from_me', true)
        ->assertJsonPath('reactions.0.emoji', '❤️');

    expect($message->fresh()->reactions)->toBe([
        ['actor' => 'self', 'from_me' => true, 'emoji' => '❤️'],
    ]);

    $this->actingAs($user)
        ->postJson($endpoint, ['reaction' => '❤️'])
        ->assertOk()
        ->assertJsonPath('reaction', null)
        ->assertJsonPath('reactions', []);

    expect($message->fresh()->reactions)->toBeNull();
});

test('reaction endpoint validates the supported reactions', function () {
    [$user, $manufacturer] = createWhatsappTestManufacturer();
    $instance = WhatsappInstance::factory()->connected()->create([
        'manufacturer_id' => $manufacturer->id,
    ]);
    $conversation = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $instance->id,
    ]);
    $message = WhatsappMessage::factory()->create([
        'whatsapp_conversation_id' => $conversation->id,
    ]);

    $this->actingAs($user)
        ->postJson("/manufacturer/atendimento/messages/{$message->id}/reaction", [
            'reaction' => 'not-an-emoji',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('reaction');
});

test('manufacturer user cannot react to a message from another manufacturer', function () {
    [$user] = createWhatsappTestManufacturer();
    $otherInstance = WhatsappInstance::factory()->connected()->create();
    $otherConversation = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $otherInstance->id,
    ]);
    $message = WhatsappMessage::factory()->create([
        'whatsapp_conversation_id' => $otherConversation->id,
    ]);

    $this->actingAs($user)
        ->postJson("/manufacturer/atendimento/messages/{$message->id}/reaction", [
            'reaction' => '👍',
        ])
        ->assertForbidden();
});

// ─── Webhook ─────────────────────────────────────────────────────

test('webhook applies and removes a reaction without creating an empty message', function () {
    $instance = WhatsappInstance::factory()->connected()->create();
    $conversation = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $instance->id,
        'remote_jid' => '5511999887766@s.whatsapp.net',
    ]);
    $message = WhatsappMessage::factory()->fromMe()->create([
        'whatsapp_conversation_id' => $conversation->id,
        'message_id' => 'reaction-target-002',
    ]);
    $payload = [
        'event' => 'messages.upsert',
        'data' => [
            'key' => [
                'id' => 'reaction-event-001',
                'remoteJid' => '5511999887766@s.whatsapp.net',
                'fromMe' => false,
            ],
            'message' => [
                'reactionMessage' => [
                    'key' => [
                        'id' => 'reaction-target-002',
                        'remoteJid' => '5511999887766@s.whatsapp.net',
                        'fromMe' => true,
                    ],
                    'text' => '😂',
                ],
            ],
            'messageTimestamp' => now()->timestamp,
        ],
    ];

    $this->postJson("/webhooks/evolution/{$instance->instance_name}", $payload, [
        'apikey' => config('evolution.api_key'),
    ])->assertOk();

    expect($message->fresh()->reactions)->toBe([
        [
            'actor' => '5511999887766@s.whatsapp.net',
            'from_me' => false,
            'emoji' => '😂',
        ],
    ]);
    $this->assertDatabaseMissing('whatsapp_messages', [
        'message_id' => 'reaction-event-001',
    ]);

    $payload['data']['key']['id'] = 'reaction-event-002';
    $payload['data']['message']['reactionMessage']['text'] = '';

    $this->postJson("/webhooks/evolution/{$instance->instance_name}", $payload, [
        'apikey' => config('evolution.api_key'),
    ])->assertOk();

    expect($message->fresh()->reactions)->toBeNull();
    $this->assertDatabaseMissing('whatsapp_messages', [
        'message_id' => 'reaction-event-002',
    ]);
});

test('webhook creates conversation and message on messages.upsert', function () {
    $instance = WhatsappInstance::factory()->connected()->create();

    $payload = [
        'event' => 'messages.upsert',
        'data' => [
            'key' => [
                'id' => 'webhook-msg-001',
                'remoteJid' => '5511999887766@s.whatsapp.net',
                'fromMe' => false,
            ],
            'pushName' => 'João',
            'message' => [
                'conversation' => 'Oi, preciso de ajuda!',
            ],
            'messageTimestamp' => now()->timestamp,
        ],
    ];

    $this->postJson("/webhooks/evolution/{$instance->instance_name}", $payload, [
        'apikey' => config('evolution.api_key'),
    ])->assertOk();

    $this->assertDatabaseHas('whatsapp_conversations', [
        'whatsapp_instance_id' => $instance->id,
        'remote_jid' => '5511999887766@s.whatsapp.net',
        'contact_name' => 'João',
    ]);

    $this->assertDatabaseHas('whatsapp_messages', [
        'message_id' => 'webhook-msg-001',
        'body' => 'Oi, preciso de ajuda!',
        'from_me' => false,
    ]);
});

test('webhook downloads and stores an incoming voice message', function () {
    Storage::fake('s3');
    $instance = WhatsappInstance::factory()->connected()->create();

    Http::fake([
        '*/chat/getBase64FromMediaMessage/*' => Http::response([
            'mediaType' => 'audioMessage',
            'fileName' => 'incoming-voice.oga',
            'mimetype' => 'audio/ogg; codecs=opus',
            'base64' => base64_encode('voice-data'),
        ], 201),
    ]);

    $payload = [
        'event' => 'messages.upsert',
        'data' => [
            'key' => [
                'id' => 'incoming-audio-001',
                'remoteJid' => '5511999887766@s.whatsapp.net',
                'fromMe' => false,
            ],
            'pushName' => 'João',
            'messageType' => 'audioMessage',
            'message' => [
                'audioMessage' => [
                    'ptt' => true,
                    'mimetype' => 'audio/ogg; codecs=opus',
                    'seconds' => 7,
                ],
            ],
            'messageTimestamp' => now()->timestamp,
        ],
    ];

    $this->postJson("/webhooks/evolution/{$instance->instance_name}", $payload, [
        'apikey' => config('evolution.api_key'),
    ])->assertOk();

    $message = WhatsappMessage::query()
        ->where('message_id', 'incoming-audio-001')
        ->firstOrFail();
    $expectedPath = sprintf(
        'whatsapp-messages/%d/%s/incoming-audio-001.ogg',
        $instance->manufacturer_id,
        $message->message_timestamp->format('Y/m'),
    );

    expect($message->media_type)->toBe('audio')
        ->and($message->media_mimetype)->toBe('audio/ogg; codecs=opus')
        ->and($message->media_file_name)->toBe('incoming-voice.oga')
        ->and($message->media_url)->toBe(Storage::disk('s3')->url($expectedPath))
        ->and($message->conversation->last_message_body)->toBe('Mensagem de voz');

    Storage::disk('s3')->assertExists($expectedPath);
    expect(Storage::disk('s3')->get($expectedPath))->toBe('voice-data');

    Http::assertSent(fn ($request) => str_ends_with(
        $request->url(),
        "/chat/getBase64FromMediaMessage/{$instance->instance_name}",
    )
        && $request['message']['key']['id'] === 'incoming-audio-001'
        && $request['convertToMp4'] === false);
});

test('webhook downloads and stores an incoming image with its caption', function () {
    Storage::fake('s3');
    $instance = WhatsappInstance::factory()->connected()->create();

    Http::fake([
        '*/chat/getBase64FromMediaMessage/*' => Http::response([
            'mediaType' => 'imageMessage',
            'fileName' => 'look.jpeg',
            'mimetype' => 'image/jpeg',
            'base64' => base64_encode('image-data'),
        ], 201),
    ]);

    $this->postJson("/webhooks/evolution/{$instance->instance_name}", [
        'event' => 'messages.upsert',
        'data' => [
            'key' => [
                'id' => 'incoming-image-001',
                'remoteJid' => '5511999887766@s.whatsapp.net',
                'fromMe' => false,
            ],
            'messageType' => 'imageMessage',
            'message' => [
                'imageMessage' => [
                    'caption' => 'Inspiração para a próxima coleção',
                    'mimetype' => 'image/jpeg',
                ],
            ],
            'messageTimestamp' => now()->timestamp,
        ],
    ], [
        'apikey' => config('evolution.api_key'),
    ])->assertOk();

    $message = WhatsappMessage::query()
        ->where('message_id', 'incoming-image-001')
        ->firstOrFail();
    $expectedPath = sprintf(
        'whatsapp-messages/%d/%s/incoming-image-001.jpeg',
        $instance->manufacturer_id,
        $message->message_timestamp->format('Y/m'),
    );

    expect($message->media_type)->toBe('image')
        ->and($message->body)->toBe('Inspiração para a próxima coleção')
        ->and($message->media_url)->toBe(Storage::disk('s3')->url($expectedPath))
        ->and($message->conversation->last_message_body)
        ->toBe('Inspiração para a próxima coleção');

    Storage::disk('s3')->assertExists($expectedPath);
    expect(Storage::disk('s3')->get($expectedPath))->toBe('image-data');
});

test('webhook preserves incoming stickers as a distinct transparent media type', function () {
    Storage::fake('s3');
    $instance = WhatsappInstance::factory()->connected()->create();

    Http::fake([
        '*/chat/getBase64FromMediaMessage/*' => Http::response([
            'mediaType' => 'stickerMessage',
            'fileName' => 'reaction.webp',
            'mimetype' => 'image/webp',
            'base64' => base64_encode('sticker-data'),
        ], 201),
    ]);

    $this->postJson("/webhooks/evolution/{$instance->instance_name}", [
        'event' => 'messages.upsert',
        'data' => [
            'key' => [
                'id' => 'incoming-sticker-001',
                'remoteJid' => '5511999887766@s.whatsapp.net',
                'fromMe' => false,
            ],
            'messageType' => 'stickerMessage',
            'message' => [
                'stickerMessage' => [
                    'mimetype' => 'image/webp',
                    'isAnimated' => true,
                ],
            ],
            'messageTimestamp' => now()->timestamp,
        ],
    ], [
        'apikey' => config('evolution.api_key'),
    ])->assertOk();

    $message = WhatsappMessage::query()
        ->where('message_id', 'incoming-sticker-001')
        ->firstOrFail();
    $expectedPath = sprintf(
        'whatsapp-messages/%d/%s/incoming-sticker-001.webp',
        $instance->manufacturer_id,
        $message->message_timestamp->format('Y/m'),
    );

    expect($message->media_type)->toBe('sticker')
        ->and($message->media_mimetype)->toBe('image/webp')
        ->and($message->conversation->last_message_body)->toBe('Figurinha');

    Storage::disk('s3')->assertExists($expectedPath);
    expect(Storage::disk('s3')->get($expectedPath))->toBe('sticker-data');
});

test('webhook rejects invalid api key', function () {
    $instance = WhatsappInstance::factory()->connected()->create();

    $this->postJson("/webhooks/evolution/{$instance->instance_name}", [
        'event' => 'messages.upsert',
    ], [
        'apikey' => 'wrong-key',
    ])->assertUnauthorized();
});

test('webhook rate limits repeated invalid requests by ip address', function () {
    config()->set('evolution.webhook_invalid_rate_limit', 2);
    config()->set('evolution.webhook_rate_limit', 100);

    $instance = WhatsappInstance::factory()->connected()->create();
    $url = "/webhooks/evolution/{$instance->instance_name}";
    $payload = ['event' => 'messages.upsert'];
    $headers = ['apikey' => 'wrong-key'];

    $this->postJson($url, $payload, $headers)->assertUnauthorized();
    $this->postJson($url, $payload, $headers)->assertUnauthorized();
    $this->postJson($url, $payload, $headers)->assertTooManyRequests();
});

test('webhook rate limits traffic independently for each instance', function () {
    config()->set('evolution.webhook_invalid_rate_limit', 100);
    config()->set('evolution.webhook_rate_limit', 2);

    $firstInstance = WhatsappInstance::factory()->connected()->create();
    $secondInstance = WhatsappInstance::factory()->connected()->create();
    $payload = [
        'event' => 'connection.update',
        'data' => ['state' => 'open'],
    ];
    $headers = ['apikey' => config('evolution.api_key')];
    $firstUrl = "/webhooks/evolution/{$firstInstance->instance_name}";

    $this->postJson($firstUrl, $payload, $headers)->assertOk();
    $this->postJson($firstUrl, $payload, $headers)->assertOk();
    $this->postJson($firstUrl, $payload, $headers)->assertTooManyRequests();

    $this->postJson("/webhooks/evolution/{$secondInstance->instance_name}", $payload, $headers)->assertOk();
});

test('webhook rejects requests when the api key is not configured', function () {
    $configuredApiKey = config('evolution.api_key');

    try {
        config()->set('evolution.api_key');

        $instance = WhatsappInstance::factory()->create();

        $this->postJson("/webhooks/evolution/{$instance->instance_name}", [
            'event' => 'CONNECTION_UPDATE',
            'data' => ['state' => 'open'],
        ])->assertUnauthorized();
    } finally {
        config()->set('evolution.api_key', $configuredApiKey);
    }
});

test('webhook updates connection status', function () {
    $instance = WhatsappInstance::factory()->create(['status' => 'connecting']);

    $this->postJson("/webhooks/evolution/{$instance->instance_name}", [
        'event' => 'connection.update',
        'data' => [
            'state' => 'open',
        ],
    ], [
        'apikey' => config('evolution.api_key'),
    ])->assertOk();

    expect($instance->fresh()->status->value)->toBe('connected');
});

test('webhook updates message status', function () {
    $instance = WhatsappInstance::factory()->connected()->create();
    $conversation = WhatsappConversation::factory()->create(['whatsapp_instance_id' => $instance->id]);
    $message = WhatsappMessage::factory()->fromMe()->create([
        'whatsapp_conversation_id' => $conversation->id,
        'message_id' => 'msg-update-001',
        'status' => 'sent',
    ]);

    $this->postJson("/webhooks/evolution/{$instance->instance_name}", [
        'event' => 'messages.update',
        'data' => [
            'key' => ['id' => 'msg-update-001'],
            'status' => 'READ',
        ],
    ], [
        'apikey' => config('evolution.api_key'),
    ])->assertOk();

    expect($message->fresh()->status->value)->toBe('read');
});

test('webhook ignores status broadcast messages', function () {
    $instance = WhatsappInstance::factory()->connected()->create();

    $this->postJson("/webhooks/evolution/{$instance->instance_name}", [
        'event' => 'messages.upsert',
        'data' => [
            'key' => [
                'id' => 'broadcast-msg',
                'remoteJid' => 'status@broadcast',
                'fromMe' => false,
            ],
            'message' => ['conversation' => 'Status update'],
            'messageTimestamp' => now()->timestamp,
        ],
    ], [
        'apikey' => config('evolution.api_key'),
    ])->assertOk();

    $this->assertDatabaseMissing('whatsapp_messages', ['message_id' => 'broadcast-msg']);
});

test('webhook increments unread count for incoming messages', function () {
    $instance = WhatsappInstance::factory()->connected()->create();
    $conversation = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $instance->id,
        'remote_jid' => '5511888776655@s.whatsapp.net',
        'unread_count' => 2,
    ]);

    $this->postJson("/webhooks/evolution/{$instance->instance_name}", [
        'event' => 'messages.upsert',
        'data' => [
            'key' => [
                'id' => 'unread-msg-001',
                'remoteJid' => '5511888776655@s.whatsapp.net',
                'fromMe' => false,
            ],
            'message' => ['conversation' => 'Nova mensagem'],
            'messageTimestamp' => now()->timestamp,
        ],
    ], [
        'apikey' => config('evolution.api_key'),
    ])->assertOk();

    expect($conversation->fresh()->unread_count)->toBe(3);
});

test('webhook ignores duplicate incoming message deliveries', function () {
    $instance = WhatsappInstance::factory()->connected()->create();
    $conversation = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $instance->id,
        'remote_jid' => '5511888776655@s.whatsapp.net',
        'unread_count' => 0,
    ]);
    $payload = [
        'event' => 'messages.upsert',
        'data' => [
            'key' => [
                'id' => 'duplicate-msg-001',
                'remoteJid' => $conversation->remote_jid,
                'fromMe' => false,
            ],
            'message' => ['conversation' => 'Mensagem entregue duas vezes'],
            'messageTimestamp' => now()->timestamp,
        ],
    ];
    $headers = ['apikey' => config('evolution.api_key')];

    $this->postJson("/webhooks/evolution/{$instance->instance_name}", $payload, $headers)->assertOk();
    $this->postJson("/webhooks/evolution/{$instance->instance_name}", $payload, $headers)->assertOk();

    expect($conversation->fresh()->unread_count)->toBe(1)
        ->and($conversation->messages()->where('message_id', 'duplicate-msg-001')->count())->toBe(1);
});

test('webhook does not update message status from another instance', function () {
    $targetInstance = WhatsappInstance::factory()->connected()->create();
    $foreignInstance = WhatsappInstance::factory()->connected()->create();
    $foreignConversation = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $foreignInstance->id,
    ]);
    $foreignMessage = WhatsappMessage::factory()->fromMe()->create([
        'whatsapp_conversation_id' => $foreignConversation->id,
        'message_id' => 'foreign-status-msg-001',
        'status' => 'sent',
    ]);

    $this->postJson("/webhooks/evolution/{$targetInstance->instance_name}", [
        'event' => 'messages.update',
        'data' => [
            'key' => ['id' => $foreignMessage->message_id],
            'status' => 'READ',
        ],
    ], [
        'apikey' => config('evolution.api_key'),
    ])->assertOk();

    expect($foreignMessage->fresh()->status->value)->toBe('sent');
});

test('opening a conversation resets unread count', function () {
    $this->withoutVite();
    [$user, $manufacturer] = createWhatsappTestManufacturer();
    $instance = WhatsappInstance::factory()->connected()->create(['manufacturer_id' => $manufacturer->id]);
    $this->mock(WhatsappContactProfileSyncService::class)
        ->shouldReceive('sync')
        ->once();
    $conversation = WhatsappConversation::factory()->create([
        'whatsapp_instance_id' => $instance->id,
        'unread_count' => 5,
    ]);

    $this->actingAs($user)
        ->get("/manufacturer/atendimento?conversation={$conversation->id}")
        ->assertOk();

    expect($conversation->fresh()->unread_count)->toBe(0);
});
