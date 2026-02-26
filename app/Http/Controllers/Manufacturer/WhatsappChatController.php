<?php

namespace App\Http\Controllers\Manufacturer;

use App\Http\Controllers\Controller;
use App\Http\Requests\SendWhatsappMessageRequest;
use App\Models\WhatsappConversation;
use App\Services\EvolutionApiService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class WhatsappChatController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected EvolutionApiService $evolution
    ) {}

    /**
     * Show the chat interface with conversation list.
     */
    public function index(Request $request): Response
    {
        $manufacturer = $request->user()->currentManufacturer;
        $instance = $manufacturer->whatsappInstances()->first();

        if (! $instance || ! $instance->isConnected()) {
            return Inertia::render('manufacturer/atendimento/index', [
                'instance_connected' => false,
                'conversations' => [],
                'active_conversation' => null,
                'messages' => [],
            ]);
        }

        $conversations = $instance->conversations()
            ->orderByDesc('last_message_at')
            ->get()
            ->map(fn ($conversation) => [
                'id' => $conversation->id,
                'remote_jid' => $conversation->remote_jid,
                'is_group' => $conversation->is_group,
                'contact_name' => $conversation->contact_name,
                'contact_phone' => $conversation->contact_phone,
                'contact_picture_url' => $conversation->contact_picture_url,
                'display_name' => $conversation->displayName(),
                'last_message_body' => $conversation->last_message_body,
                'last_message_from_me' => $conversation->last_message_from_me,
                'last_message_at' => $conversation->last_message_at?->toIso8601String(),
                'unread_count' => $conversation->unread_count,
            ]);

        // If a conversation is selected, load its messages
        $activeConversationId = $request->query('conversation');
        $activeConversation = null;
        $messages = [];

        if ($activeConversationId) {
            $activeConversation = $instance->conversations()->find($activeConversationId);

            if ($activeConversation) {
                $this->authorize('view', $activeConversation);

                $messages = $activeConversation->messages()
                    ->orderBy('message_timestamp')
                    ->limit(100)
                    ->get()
                    ->map(fn ($message) => [
                        'id' => $message->id,
                        'message_id' => $message->message_id,
                        'from_me' => $message->from_me,
                        'body' => $message->body,
                        'status' => $message->status->value,
                        'message_timestamp' => $message->message_timestamp?->toIso8601String(),
                    ]);

                // Reset unread count when opening conversation
                $activeConversation->update(['unread_count' => 0]);
            }
        }

        return Inertia::render('manufacturer/atendimento/index', [
            'instance_connected' => true,
            'conversations' => $conversations,
            'active_conversation' => $activeConversation ? [
                'id' => $activeConversation->id,
                'remote_jid' => $activeConversation->remote_jid,
                'is_group' => $activeConversation->is_group,
                'contact_name' => $activeConversation->contact_name,
                'contact_phone' => $activeConversation->contact_phone,
                'contact_picture_url' => $activeConversation->contact_picture_url,
                'display_name' => $activeConversation->displayName(),
            ] : null,
            'messages' => $messages,
        ]);
    }

    /**
     * Load messages for a conversation (JSON endpoint for partial updates).
     */
    public function messages(WhatsappConversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        $messages = $conversation->messages()
            ->orderBy('message_timestamp')
            ->limit(100)
            ->get()
            ->map(fn ($message) => [
                'id' => $message->id,
                'message_id' => $message->message_id,
                'from_me' => $message->from_me,
                'body' => $message->body,
                'status' => $message->status->value,
                'message_timestamp' => $message->message_timestamp?->toIso8601String(),
            ]);

        // Reset unread
        $conversation->update(['unread_count' => 0]);

        return response()->json([
            'messages' => $messages,
        ]);
    }

    /**
     * Send a text message in a conversation.
     */
    public function sendMessage(SendWhatsappMessageRequest $request, WhatsappConversation $conversation): JsonResponse
    {
        $this->authorize('sendMessage', $conversation);

        $body = $request->validated('body');
        $instance = $conversation->instance;

        $response = $this->evolution->sendText(
            $instance->instance_name,
            $conversation->remote_jid,
            $body,
        );

        if (! $response->successful()) {
            return response()->json(['error' => 'Erro ao enviar mensagem.'], 422);
        }

        $data = $response->json();
        $messageId = $data['key']['id'] ?? Str::uuid()->toString();

        $message = $conversation->messages()->create([
            'message_id' => $messageId,
            'from_me' => true,
            'sender_jid' => null,
            'body' => $body,
            'status' => 'sent',
            'message_timestamp' => now(),
        ]);

        // Update conversation's last message
        $conversation->update([
            'last_message_body' => $body,
            'last_message_from_me' => true,
            'last_message_at' => $message->message_timestamp,
        ]);

        return response()->json([
            'message' => [
                'id' => $message->id,
                'message_id' => $message->message_id,
                'from_me' => $message->from_me,
                'body' => $message->body,
                'status' => $message->status->value,
                'message_timestamp' => $message->message_timestamp->toIso8601String(),
            ],
        ]);
    }

    /**
     * Get updated conversation list (JSON endpoint for polling).
     */
    public function conversationsList(Request $request): JsonResponse
    {
        $manufacturer = $request->user()->currentManufacturer;
        $instance = $manufacturer->whatsappInstances()->first();

        if (! $instance || ! $instance->isConnected()) {
            return response()->json(['conversations' => []]);
        }

        $conversations = $instance->conversations()
            ->orderByDesc('last_message_at')
            ->get()
            ->map(fn ($conversation) => [
                'id' => $conversation->id,
                'remote_jid' => $conversation->remote_jid,
                'is_group' => $conversation->is_group,
                'contact_name' => $conversation->contact_name,
                'contact_phone' => $conversation->contact_phone,
                'contact_picture_url' => $conversation->contact_picture_url,
                'display_name' => $conversation->displayName(),
                'last_message_body' => $conversation->last_message_body,
                'last_message_from_me' => $conversation->last_message_from_me,
                'last_message_at' => $conversation->last_message_at?->toIso8601String(),
                'unread_count' => $conversation->unread_count,
            ]);

        return response()->json(['conversations' => $conversations]);
    }
}
