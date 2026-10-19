<?php

namespace App\Jobs;

use App\Enums\ProductMediaType;
use App\Models\Product;
use App\Models\ProductMedia;
use App\Models\WhatsappFunnelRunStep;
use App\Models\WhatsappMessage;
use App\Services\EvolutionApiService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class ProcessWhatsappFunnelStep implements ShouldQueue
{
    use Queueable;

    public int $tries = 25;

    public int $maxExceptions = 3;

    public int $timeout = 55;

    public bool $failOnTimeout = true;

    /** @return list<int> */
    public function backoff(): array
    {
        return [5, 15, 30];
    }

    public function __construct(public WhatsappFunnelRunStep $stepRun) {}

    public function handle(EvolutionApiService $evolution): void
    {
        $lock = Cache::lock('whatsapp-funnel-step:'.$this->stepRun->id, 120);

        if (! $lock->get()) {
            $this->release(5);

            return;
        }

        try {
            $this->process($evolution);
        } finally {
            $lock->release();
        }
    }

    private function process(EvolutionApiService $evolution): void
    {
        $this->stepRun->refresh()->load('run.conversation.instance');

        try {
            if ($this->stepRun->status === 'sent' || in_array($this->stepRun->run->status, ['completed', 'failed'], true)) {
                return;
            }

            $run = $this->stepRun->run;
            $conversation = $run->conversation;
            $instance = $conversation->instance;

            if ($run->status === 'pending') {
                $run->update([
                    'status' => 'running',
                    'started_at' => now(),
                ]);
            }

            if ($this->stepRun->type === 'wait') {
                $this->processWaitStep($evolution, $instance->instance_name, $conversation->remote_jid);

                return;
            }

            if (! $instance->isConnected()) {
                throw new \RuntimeException('O WhatsApp foi desconectado. Reconecte o canal antes de enviar novamente.');
            }

            $this->stepRun->update(['status' => 'sending', 'error_message' => null]);

            $message = match ($this->stepRun->type) {
                'text' => $this->sendTextStep($evolution, $instance->instance_name, $conversation->remote_jid),
                'audio' => $this->sendAudioStep($evolution, $instance->instance_name, $conversation->remote_jid),
                'product' => $this->sendProductStep($evolution, $instance->instance_name, $conversation->remote_jid),
                default => throw new \RuntimeException('Tipo de passo inválido.'),
            };

            $conversation->update([
                'last_message_body' => $message->body,
                'last_message_from_me' => true,
                'last_message_at' => $message->message_timestamp,
            ]);

            $this->stepRun->update([
                'status' => 'sent',
                'whatsapp_message_id' => $message->id,
                'sent_at' => now(),
            ]);

            $this->dispatchNextStep();
        } catch (Throwable $exception) {
            if ($exception instanceof RequestException && ($exception->response->status() === 429 || $exception->response->serverError())) {
                $this->stepRun->update(['status' => 'pending', 'error_message' => 'O serviço de WhatsApp está temporariamente indisponível. Tentando novamente.']);

                throw $exception;
            }

            $this->failed($exception);
        }
    }

    public function failed(?Throwable $exception): void
    {
        $step = $this->stepRun->fresh();

        if (! $step || $step->status === 'sent') {
            return;
        }

        $message = $exception instanceof ConnectionException
            ? 'Não foi possível confirmar o envio. Confira as mensagens na conversa antes de tentar novamente.'
            : 'Não foi possível concluir o envio. Confira o canal e tente novamente.';
        $step->update(['status' => 'failed', 'error_message' => $message]);
        $step->run()->update(['status' => 'failed', 'completed_at' => now(), 'error_message' => $message]);

        Log::critical('WhatsApp funnel step failed.', [
            'funnel_run_id' => $step->whatsapp_funnel_run_id,
            'funnel_run_step_id' => $step->id,
            'step_type' => $step->type,
            'exception' => $exception,
        ]);
    }

    private function processWaitStep(EvolutionApiService $evolution, string $instanceName, string $remoteJid): void
    {
        $seconds = max((int) ($this->stepRun->payload['seconds'] ?? 1), 1);

        if ($this->stepRun->status === 'waiting' && $this->stepRun->scheduled_at?->isFuture()) {
            $this->release(max(1, (int) now()->diffInSeconds($this->stepRun->scheduled_at)));

            return;
        }

        if ($this->stepRun->status === 'pending') {
            $presence = $this->presenceForNextStep();

            if ($presence) {
                $evolution->sendPresence($instanceName, $remoteJid, $presence, $seconds * 1000);
            }

            $this->stepRun->update([
                'status' => 'waiting',
                'scheduled_at' => now()->addSeconds($seconds),
            ]);

            self::dispatch($this->stepRun)->delay(now()->addSeconds($seconds));

            return;
        }

        $this->stepRun->update([
            'status' => 'sent',
            'sent_at' => now(),
        ]);

        $this->dispatchNextStep();
    }

    private function presenceForNextStep(): ?string
    {
        $nextStep = $this->stepRun->run->steps()
            ->where('sort_order', '>', $this->stepRun->sort_order)
            ->orderBy('sort_order')
            ->first();

        return match ($nextStep?->type) {
            'text', 'product' => 'composing',
            'audio' => 'recording',
            default => null,
        };
    }

    private function dispatchNextStep(): void
    {
        $run = $this->stepRun->run()->firstOrFail();
        $nextStep = $run->steps()
            ->where('status', 'pending')
            ->orderBy('sort_order')
            ->first();

        if ($nextStep) {
            self::dispatch($nextStep);

            return;
        }

        $run->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);
    }

    private function sendTextStep(EvolutionApiService $evolution, string $instanceName, string $remoteJid): WhatsappMessage
    {
        $body = (string) ($this->stepRun->payload['body'] ?? '');
        $response = $evolution->sendText($instanceName, $remoteJid, $body);
        $this->ensureSuccessful($response);

        return $this->stepRun->run->conversation->messages()->create([
            'message_id' => $this->uniqueMessageId($response),
            'from_me' => true,
            'sender_jid' => null,
            'body' => $body,
            'status' => 'sent',
            'message_timestamp' => now(),
        ]);
    }

    private function sendAudioStep(EvolutionApiService $evolution, string $instanceName, string $remoteJid): WhatsappMessage
    {
        $payload = $this->stepRun->payload;
        $mediaPath = (string) $payload['media_path'];
        $fileName = (string) ($payload['file_name'] ?? basename($mediaPath));
        $mimeType = (string) ($payload['mimetype'] ?? 'audio/mpeg');
        $mediaUrl = Storage::disk('s3')->url($mediaPath);

        $response = $evolution->sendWhatsAppAudio($instanceName, $remoteJid, $mediaUrl);
        $this->ensureSuccessful($response);

        return $this->stepRun->run->conversation->messages()->create([
            'message_id' => $this->uniqueMessageId($response),
            'from_me' => true,
            'sender_jid' => null,
            'body' => '',
            'media_type' => 'audio',
            'media_url' => $mediaUrl,
            'media_mimetype' => $mimeType,
            'media_file_name' => $fileName,
            'status' => 'sent',
            'message_timestamp' => now(),
        ]);
    }

    private function sendProductStep(EvolutionApiService $evolution, string $instanceName, string $remoteJid): WhatsappMessage
    {
        $payload = $this->stepRun->payload;
        $manufacturerId = $this->stepRun->run->conversation->instance->manufacturer_id;
        $product = Product::query()
            ->where('manufacturer_id', $manufacturerId)
            ->with('media')
            ->findOrFail($payload['product_id']);

        $caption = $this->productCaption($product, $payload);
        $primaryImage = $this->primaryImage($product);
        $mediaUrl = $primaryImage ? Storage::disk('s3')->url($primaryImage->path) : null;
        $mimeType = $primaryImage ? $this->imageMimeType($primaryImage->path) : null;
        $fileName = $primaryImage ? basename($primaryImage->path) : null;

        if (($payload['include_photo'] ?? false) && $primaryImage && $mediaUrl && $mimeType && $fileName) {
            $response = $evolution->sendMedia(
                $instanceName,
                $remoteJid,
                'image',
                $mimeType,
                $mediaUrl,
                $fileName,
                $caption,
            );
        } else {
            $response = $evolution->sendText($instanceName, $remoteJid, $caption);
            $mediaUrl = null;
            $mimeType = null;
            $fileName = null;
        }

        $this->ensureSuccessful($response);

        return $this->stepRun->run->conversation->messages()->create([
            'message_id' => $this->uniqueMessageId($response),
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
    }

    /**
     * @param  array<string, mixed>  $options
     */
    private function productCaption(Product $product, array $options): string
    {
        $lines = ["*{$product->name}*"];

        if (($options['include_price'] ?? false) && $product->price_cents !== null) {
            $lines[] = 'Preço: R$ '.number_format($product->price_cents / 100, 2, ',', '.');
        }

        if (($options['include_description'] ?? false) && filled($product->description)) {
            $lines[] = (string) $product->description;
        }

        if (($options['include_sku'] ?? false) && filled($product->sku)) {
            $lines[] = 'SKU: '.$product->sku;
        }

        return implode("\n", $lines);
    }

    private function primaryImage(Product $product): ?ProductMedia
    {
        return $product->media
            ->first(fn (ProductMedia $media) => $media->type === ProductMediaType::Image);
    }

    private function imageMimeType(string $path): string
    {
        return match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'png' => 'image/png',
            'webp' => 'image/webp',
            default => 'image/jpeg',
        };
    }

    private function ensureSuccessful(Response $response): void
    {
        $response->throw();

        if (! $response->successful()) {
            throw new \RuntimeException('Resposta inesperada do serviço de WhatsApp.');
        }
    }

    private function uniqueMessageId(Response $response): string
    {
        $messageId = $response->json('key.id') ?? Str::uuid()->toString();

        if (WhatsappMessage::query()->where('message_id', $messageId)->exists()) {
            return Str::uuid()->toString();
        }

        return $messageId;
    }
}
