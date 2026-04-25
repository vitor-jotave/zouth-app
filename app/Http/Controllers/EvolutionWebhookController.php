<?php

namespace App\Http\Controllers;

use App\Models\WhatsappConversation;
use App\Models\WhatsappInstance;
use App\Models\WhatsappMessage;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EvolutionWebhookController extends Controller
{
    /**
     * Handle incoming webhook events from Evolution API.
     */
    public function handle(Request $request, string $instanceName): JsonResponse
    {
        $apiKey = $request->header('apikey');

        if ($apiKey !== config('evolution.api_key')) {
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

        $isGroup = str_ends_with($remoteJid, '@g.us');
        $body = $data['message']['conversation']
            ?? $data['message']['extendedTextMessage']['text']
            ?? null;

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

        // Update conversation's last message
        $conversation->update([
            'last_message_body' => $body,
            'last_message_from_me' => $fromMe,
            'last_message_at' => $message->message_timestamp,
            'unread_count' => $fromMe
                ? $conversation->unread_count
                : $conversation->unread_count + 1,
        ]);
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

        WhatsappMessage::where('message_id', $messageId)->update(['status' => $newStatus]);
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
