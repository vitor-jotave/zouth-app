<?php

namespace App\Jobs;

use App\Models\WhatsappConversation;
use App\Services\EvolutionApiService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class FetchWhatsappContactPicture implements ShouldQueue
{
    use Queueable;

    public function __construct(public int $conversationId) {}

    public function handle(EvolutionApiService $evolution): void
    {
        $conversation = WhatsappConversation::query()->with('instance')->find($this->conversationId);

        if (! $conversation || $conversation->is_group || filled($conversation->contact_picture_url) || ! $conversation->instance?->isConnected()) {
            return;
        }

        $response = $evolution->fetchContactPicture($conversation->instance->instance_name, $conversation->remote_jid);

        if (! $response->successful()) {
            return;
        }

        $url = $response->json('profilePictureUrl') ?? $response->json('profilePicUrl');
        $parts = is_string($url) ? parse_url($url) : false;

        if (($parts['scheme'] ?? null) !== 'https' || ($parts['host'] ?? null) !== 'pps.whatsapp.net' || isset($parts['port']) || isset($parts['user'])) {
            return;
        }

        $conversation->newQuery()->whereKey($conversation->id)->where('contact_picture_url', $conversation->contact_picture_url)->update([
            'contact_picture_url' => $url,
        ]);
    }
}
