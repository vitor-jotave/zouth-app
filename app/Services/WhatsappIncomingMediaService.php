<?php

namespace App\Services;

use App\Models\WhatsappInstance;
use App\Models\WhatsappMessage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class WhatsappIncomingMediaService
{
    public function __construct(protected EvolutionApiService $evolution) {}

    /**
     * @param  array<string, mixed>  $evolutionMessage
     */
    public function store(
        WhatsappInstance $instance,
        WhatsappMessage $message,
        array $evolutionMessage,
    ): bool {
        $mediaType = $this->mediaType($evolutionMessage);

        if ($mediaType === null) {
            return false;
        }

        try {
            $response = $this->evolution->downloadMediaMessage(
                $instance->instance_name,
                $evolutionMessage,
            );
        } catch (Throwable $exception) {
            $this->reportFailure($instance, $message, $exception->getMessage());

            return false;
        }

        if (! $response->successful()) {
            $this->reportFailure(
                $instance,
                $message,
                "Evolution respondeu com status {$response->status()}",
            );

            return false;
        }

        $encodedMedia = $response->json('base64');

        if (! is_string($encodedMedia) || $encodedMedia === '') {
            $this->reportFailure($instance, $message, 'Resposta sem mídia em base64');

            return false;
        }

        $contents = base64_decode($encodedMedia, true);

        if ($contents === false) {
            $this->reportFailure($instance, $message, 'Mídia em base64 inválida');

            return false;
        }

        $mimetype = $this->mimetype(
            $response->json('mimetype'),
            $evolutionMessage,
            $mediaType,
        );
        $fileName = $this->fileName(
            $response->json('fileName'),
            $message->message_id,
            $mimetype,
        );
        $path = $this->storagePath($instance, $message, $fileName, $mimetype);
        $disk = Storage::disk('s3');
        $stored = $disk->put($path, $contents, [
            'ContentType' => Str::before($mimetype, ';'),
        ]);

        if (! $stored) {
            $this->reportFailure($instance, $message, 'Não foi possível armazenar a mídia');

            return false;
        }

        $message->update([
            'media_type' => $mediaType,
            'media_url' => $disk->url($path),
            'media_mimetype' => $mimetype,
            'media_file_name' => $fileName,
        ]);

        return true;
    }

    public function restore(WhatsappMessage $message): bool
    {
        $message->loadMissing('conversation.instance');
        $instance = $message->conversation->instance;
        $response = $this->evolution->fetchMessages($instance->instance_name, [
            'key' => ['id' => $message->message_id],
        ]);

        if (! $response->successful()) {
            return false;
        }

        $record = $response->json('messages.records.0');

        if (! is_array($record) || ! $this->store($instance, $message, $record)) {
            return false;
        }

        $conversation = $message->conversation;

        $isLatestMessage = ! $conversation->last_message_at
            || ($message->message_timestamp
                && $conversation->last_message_at->lessThanOrEqualTo($message->message_timestamp));

        if ($isLatestMessage) {
            $conversation->update([
                'last_message_body' => $message->body ?: $this->mediaLabel($message->media_type),
                'last_message_from_me' => $message->from_me,
                'last_message_at' => $message->message_timestamp,
            ]);
        }

        return true;
    }

    /**
     * @param  array<string, mixed>  $evolutionMessage
     */
    private function mediaType(array $evolutionMessage): ?string
    {
        $messageType = $evolutionMessage['messageType'] ?? null;

        if (! is_string($messageType)) {
            $message = $evolutionMessage['message'] ?? [];
            $messageType = is_array($message)
                ? collect(array_keys($message))
                    ->first(fn (string $key): bool => str_ends_with($key, 'Message'))
                : null;
        }

        return match ($messageType) {
            'audioMessage' => 'audio',
            'imageMessage' => 'image',
            'stickerMessage' => 'sticker',
            'videoMessage' => 'video',
            'documentMessage', 'documentWithCaptionMessage' => 'document',
            default => null,
        };
    }

    /**
     * @param  array<string, mixed>  $evolutionMessage
     */
    private function mimetype(
        mixed $downloadedMimetype,
        array $evolutionMessage,
        string $mediaType,
    ): string {
        if (is_string($downloadedMimetype) && $downloadedMimetype !== '') {
            return $downloadedMimetype;
        }

        $messageType = $evolutionMessage['messageType'] ?? null;
        $messageMimetype = is_string($messageType)
            ? data_get($evolutionMessage, "message.{$messageType}.mimetype")
            : null;

        if (is_string($messageMimetype) && $messageMimetype !== '') {
            return $messageMimetype;
        }

        return match ($mediaType) {
            'audio' => 'audio/ogg',
            'image' => 'image/jpeg',
            'sticker' => 'image/webp',
            'video' => 'video/mp4',
            default => 'application/octet-stream',
        };
    }

    private function fileName(mixed $downloadedFileName, string $messageId, string $mimetype): string
    {
        if (is_string($downloadedFileName) && $downloadedFileName !== '') {
            return Str::limit(basename($downloadedFileName), 180, '');
        }

        return $messageId.'.'.$this->extension('', $mimetype);
    }

    private function storagePath(
        WhatsappInstance $instance,
        WhatsappMessage $message,
        string $fileName,
        string $mimetype,
    ): string {
        $safeMessageId = preg_replace('/[^A-Za-z0-9_-]/', '', $message->message_id)
            ?: Str::uuid()->toString();
        $extension = $this->extension($fileName, $mimetype);

        return sprintf(
            'whatsapp-messages/%d/%s/%s.%s',
            $instance->manufacturer_id,
            $message->message_timestamp?->format('Y/m') ?? now()->format('Y/m'),
            $safeMessageId,
            $extension,
        );
    }

    private function extension(string $fileName, string $mimetype): string
    {
        $extension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

        if (preg_match('/^[a-z0-9]{2,5}$/', $extension) === 1) {
            return $extension === 'oga' ? 'ogg' : $extension;
        }

        return match (Str::before($mimetype, ';')) {
            'audio/ogg' => 'ogg',
            'audio/mpeg' => 'mp3',
            'audio/mp4' => 'm4a',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            'video/mp4' => 'mp4',
            'application/pdf' => 'pdf',
            default => 'jpg',
        };
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

    private function reportFailure(
        WhatsappInstance $instance,
        WhatsappMessage $message,
        string $reason,
    ): void {
        Log::warning('Evolution webhook: não foi possível persistir a mídia recebida', [
            'instance' => $instance->instance_name,
            'message_id' => $message->message_id,
            'reason' => $reason,
        ]);
    }
}
