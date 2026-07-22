<?php

namespace App\Http\Controllers;

use App\Models\WhatsappConversation;
use App\Models\WhatsappInstance;
use App\Models\WhatsappMessage;
use App\Services\WhatsappAutomationRunner;
use App\Services\WhatsappIncomingMediaService;
use App\Services\WhatsappMessageReactionService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EvolutionWebhookController extends Controller
{
    public function __construct(
        protected WhatsappIncomingMediaService $incomingMedia,
        protected WhatsappMessageReactionService $messageReactions,
        protected WhatsappAutomationRunner $automationRunner,
    ) {}

    /**
     * Handle incoming webhook events from Evolution API.
     */
    public function handle(Request $request, string $instanceName): JsonResponse
    {
        $apiKey = $request->header('apikey');
        $configuredApiKey = config('evolution.api_key');

        if (! is_string($configuredApiKey)
            || $configuredApiKey === ''
            || ! is_string($apiKey)
            || ! hash_equals($configuredApiKey, $apiKey)) {
            Log::warning('Evolution webhook: invalid API key', ['instance' => $instanceName]);

            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $instance = WhatsappInstance::where('instance_name', $instanceName)->first();

        if (! $instance) {
            Log::warning('Evolution webhook: unknown instance', ['instance' => $instanceName]);

            return response()->json(['error' => 'Instance not found'], 404);
        }

        $event = $request->input('event');

        // Evolution API v2 sends uppercase events (e.g. MESSAGES_UPSERT)
        // Normalize to lowercase dot notation for matching
        $normalizedEvent = strtolower(str_replace('_', '.', $event ?? ''));

        match ($normalizedEvent) {
            'messages.upsert' => $this->handleMessageUpsert($instance, $request->all()),
            'messages.update' => $this->handleMessageUpdate($instance, $request->all()),
            'connection.update' => $this->handleConnectionUpdate($instance, $request->all()),
            default => Log::debug('Evolution webhook: unhandled event', ['event' => $event, 'instance' => $instanceName]),
        };

        return response()->json(['status' => 'ok']);
    }

    /**
     * Handle new/updated messages.
     */
    protected function handleMessageUpsert(WhatsappInstance $instance, array $payload): void
    {
        $data = $payload['data'] ?? [];

        // Evolution API v2 may send data as an array of messages
        // or as a single message object. Normalize to a list.
        $messages = [];
        if (! empty($data) && isset($data['key'])) {
            // Single message object
            $messages = [$data];
        } elseif (is_array($data) && ! empty($data) && ! isset($data['key'])) {
            // Array of messages (check first element has 'key')
            $messages = array_values($data);
        }

        if (empty($messages)) {
            return;
        }

        foreach ($messages as $msgData) {
            $this->processIncomingMessage($instance, $msgData);
        }
    }

    /**
     * Process a single incoming message from the webhook payload.
     */
    protected function processIncomingMessage(WhatsappInstance $instance, array $data): void
    {
        $messageId = $data['key']['id'] ?? null;
        // Evolution API v2 with LID: prefer remoteJidAlt (standard format) over remoteJid
        $remoteJid = $data['key']['remoteJidAlt'] ?? $data['key']['remoteJid'] ?? null;
        $fromMe = $data['key']['fromMe'] ?? false;

        if (! $messageId || ! $remoteJid) {
            return;
        }

        // Ignore status broadcasts
        if ($remoteJid === 'status@broadcast') {
            return;
        }

        if ($this->processReactionMessage($instance, $data, $remoteJid, $fromMe)) {
            return;
        }

        $isGroup = str_ends_with($remoteJid, '@g.us');
        $body = $this->messageBody($data);

        // Find or create conversation
        $conversation = WhatsappConversation::firstOrCreate(
            [
                'whatsapp_instance_id' => $instance->id,
                'remote_jid' => $remoteJid,
            ],
            [
                'is_group' => $isGroup,
                'contact_name' => $data['pushName'] ?? null,
                'contact_phone' => $isGroup ? null : preg_replace('/@.*/', '', $remoteJid),
            ]
        );

        // Update contact name if available
        if (! empty($data['pushName']) && ! $fromMe) {
            $conversation->update(['contact_name' => $data['pushName']]);
        }

        // Create the message (ignore duplicates)
        $message = WhatsappMessage::firstOrCreate(
            ['message_id' => $messageId],
            [
                'whatsapp_conversation_id' => $conversation->id,
                'from_me' => $fromMe,
                'sender_jid' => $data['key']['participant'] ?? ($fromMe ? null : $remoteJid),
                'body' => $body,
                'status' => $fromMe ? 'sent' : 'delivered',
                'message_timestamp' => isset($data['messageTimestamp'])
                    ? Carbon::createFromTimestamp($data['messageTimestamp'])
                    : now(),
            ]
        );

        if (! $message->wasRecentlyCreated) {
            if ($message->whatsapp_conversation_id !== $conversation->id) {
                Log::warning('Evolution webhook: message ID already belongs to another conversation', [
                    'instance' => $instance->instance_name,
                    'message_id' => $messageId,
                ]);
            } elseif (! $message->media_url) {
                $this->incomingMedia->store($instance, $message, $data);
            }

            return;
        }

        $this->incomingMedia->store($instance, $message, $data);

        // Update conversation's last message
        $conversation->update([
            'last_message_body' => $body ?: $this->mediaLabel($message->media_type),
            'last_message_from_me' => $fromMe,
            'last_message_at' => $message->message_timestamp,
            'unread_count' => $fromMe
                ? $conversation->unread_count
                : $conversation->unread_count + 1,
        ]);

        $this->automationRunner->runForIncomingMessage($message);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function messageBody(array $data): ?string
    {
        $body = $data['message']['conversation']
            ?? $data['message']['extendedTextMessage']['text']
            ?? $data['message']['imageMessage']['caption']
            ?? $data['message']['videoMessage']['caption']
            ?? $data['message']['documentMessage']['caption']
            ?? null;

        return is_string($body) && $body !== '' ? $body : null;
    }

    private function mediaLabel(?string $mediaType): ?string
    {
        return match ($mediaType) {
            'audio' => 'Mensagem de voz',
            'image' => 'Imagem',
            'sticker' => 'Figurinha',
            'video' => 'Vídeo',
            'document' => 'Documento',
            default => null,
        };
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function processReactionMessage(
        WhatsappInstance $instance,
        array $data,
        string $remoteJid,
        bool $fromMe,
    ): bool {
        $reactionMessage = data_get($data, 'message.reactionMessage');

        if (! is_array($reactionMessage)) {
            return false;
        }

        $targetMessageId = data_get($reactionMessage, 'key.id');
        $emoji = data_get($reactionMessage, 'text');

        if (! is_string($targetMessageId)
            || ! array_key_exists('text', $reactionMessage)
            || (! is_string($emoji) && $emoji !== null)) {
            return true;
        }

        $message = WhatsappMessage::query()
            ->where('message_id', $targetMessageId)
            ->whereHas('conversation', fn ($query) => $query
                ->where('whatsapp_instance_id', $instance->id))
            ->first();

        if (! $message) {
            return true;
        }

        $senderJid = data_get($data, 'key.participant');
        $this->messageReactions->apply(
            $message,
            $fromMe,
            is_string($senderJid) ? $senderJid : ($fromMe ? null : $remoteJid),
            $emoji ?? '',
        );

        return true;
    }

    /**
     * Handle message status updates (sent → delivered → read).
     */
    protected function handleMessageUpdate(WhatsappInstance $instance, array $payload): void
    {
        $data = $payload['data'] ?? [];

        $messageId = $data['key']['id'] ?? ($data['keyId'] ?? null);
        $status = $data['status'] ?? null;

        if (! $messageId || ! $status) {
            return;
        }

        $statusMap = [
            'DELIVERY_ACK' => 'delivered',
            'READ' => 'read',
            'PLAYED' => 'read',
            'SERVER_ACK' => 'sent',
        ];

        $newStatus = $statusMap[$status] ?? null;

        if (! $newStatus) {
            return;
        }

        WhatsappMessage::query()
            ->where('message_id', $messageId)
            ->whereHas('conversation', fn ($query) => $query->where('whatsapp_instance_id', $instance->id))
            ->update(['status' => $newStatus]);
    }

    /**
     * Handle connection state changes.
     */
    protected function handleConnectionUpdate(WhatsappInstance $instance, array $payload): void
    {
        $data = $payload['data'] ?? [];
        $state = $data['state'] ?? null;

        $statusMap = [
            'open' => 'connected',
            'connecting' => 'connecting',
            'close' => 'disconnected',
            'refused' => 'disconnected',
        ];

        $newStatus = $statusMap[$state] ?? null;

        if ($newStatus) {
            $instance->update(['status' => $newStatus]);
        }
    }
}
