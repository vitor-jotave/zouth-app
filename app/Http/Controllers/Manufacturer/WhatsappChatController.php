<?php

namespace App\Http\Controllers\Manufacturer;

use App\Enums\ProductMediaType;
use App\Http\Controllers\Controller;
use App\Http\Requests\SendWhatsappMessageRequest;
use App\Http\Requests\SendWhatsappProductMessageRequest;
use App\Http\Resources\WhatsappProductResource;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Models\WhatsappConversation;
use App\Services\EvolutionApiService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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
                        'media_type' => $message->media_type,
                        'media_url' => $message->media_url,
                        'media_mimetype' => $message->media_mimetype,
                        'media_file_name' => $message->media_file_name,
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
                'media_type' => $message->media_type,
                'media_url' => $message->media_url,
                'media_mimetype' => $message->media_mimetype,
                'media_file_name' => $message->media_file_name,
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
                'media_type' => $message->media_type,
                'media_url' => $message->media_url,
                'media_mimetype' => $message->media_mimetype,
                'media_file_name' => $message->media_file_name,
                'status' => $message->status->value,
                'message_timestamp' => $message->message_timestamp->toIso8601String(),
            ],
        ]);
    }

    public function products(Request $request): JsonResponse
    {
        $manufacturer = $request->user()->currentManufacturer;

        $products = Product::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->where('is_active', true)
            ->with('media')
            ->when($request->search, function ($query, string $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%");
                });
            })
            ->orderBy('sort_order')
            ->orderBy('name')
            ->limit(25)
            ->get();

        return response()->json([
            'products' => WhatsappProductResource::collection($products)->resolve(),
        ]);
    }

    public function sendProduct(
        SendWhatsappProductMessageRequest $request,
        WhatsappConversation $conversation,
        Product $product
    ): JsonResponse {
        $this->authorize('sendMessage', $conversation);

        $manufacturerId = $request->user()->current_manufacturer_id;

        if ($product->manufacturer_id !== $manufacturerId) {
            abort(404);
        }

        $product->load('media');
        $validated = $request->validated();
        $caption = $this->buildProductCaption($product, $validated);
        $instance = $conversation->instance;
        $primaryImage = $this->primaryImage($product);
        $mediaUrl = $primaryImage ? Storage::disk('s3')->url($primaryImage->path) : null;
        $mimeType = $primaryImage ? $this->mimeTypeForPath($primaryImage->path) : null;
        $fileName = $primaryImage ? basename($primaryImage->path) : null;

        if ($validated['include_photo'] && $primaryImage && $mediaUrl && $mimeType && $fileName) {
            $response = $this->evolution->sendMedia(
                $instance->instance_name,
                $conversation->remote_jid,
                'image',
                $mimeType,
                $mediaUrl,
                $fileName,
                $caption,
            );
        } else {
            $response = $this->evolution->sendText(
                $instance->instance_name,
                $conversation->remote_jid,
                $caption,
            );
            $mediaUrl = null;
            $mimeType = null;
            $fileName = null;
        }

        if (! $response->successful()) {
            return response()->json(['error' => 'Erro ao enviar produto.'], 422);
        }

        $data = $response->json();
        $messageId = $data['key']['id'] ?? Str::uuid()->toString();

        $message = $conversation->messages()->create([
            'message_id' => $messageId,
            'from_me' => true,
            'sender_jid' => null,
            'body' => $caption,
            'media_type' => $mediaUrl ? 'image' : null,
            'media_url' => $mediaUrl,
            'media_mimetype' => $mimeType,
            'media_file_name' => $fileName,
            'status' => 'sent',
            'message_timestamp' => now(),
        ]);

        $conversation->update([
            'last_message_body' => $caption,
            'last_message_from_me' => true,
            'last_message_at' => $message->message_timestamp,
        ]);

        return response()->json([
            'message' => $this->messagePayload($message),
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

    /**
     * @param  array{include_photo: bool, include_price: bool, include_description: bool, include_sku: bool}  $options
     */
    private function buildProductCaption(Product $product, array $options): string
    {
        $lines = ["*{$product->name}*"];

        if ($options['include_price'] && $product->price_cents !== null) {
            $lines[] = 'Preço: '.$this->formatPrice($product->price_cents);
        }

        if ($options['include_description'] && filled($product->description)) {
            $lines[] = (string) $product->description;
        }

        if ($options['include_sku'] && filled($product->sku)) {
            $lines[] = 'SKU: '.$product->sku;
        }

        return implode("\n", $lines);
    }

    private function formatPrice(int $priceCents): string
    {
        return 'R$ '.number_format($priceCents / 100, 2, ',', '.');
    }

    private function primaryImage(Product $product): ?ProductMedia
    {
        return $product->media
            ->first(fn (ProductMedia $media) => $media->type === ProductMediaType::Image);
    }

    private function mimeTypeForPath(string $path): string
    {
        return match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'png' => 'image/png',
            'webp' => 'image/webp',
            default => 'image/jpeg',
        };
    }

    /**
     * @return array<string, mixed>
     */
    private function messagePayload($message): array
    {
        return [
            'id' => $message->id,
            'message_id' => $message->message_id,
            'from_me' => $message->from_me,
            'body' => $message->body,
            'media_type' => $message->media_type,
            'media_url' => $message->media_url,
            'media_mimetype' => $message->media_mimetype,
            'media_file_name' => $message->media_file_name,
            'status' => $message->status->value,
            'message_timestamp' => $message->message_timestamp->toIso8601String(),
        ];
    }
}
