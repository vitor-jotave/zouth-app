<?php

namespace App\Services;

use App\Models\WhatsappConversation;
use App\Models\WhatsappInstance;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Throwable;

class WhatsappContactProfileSyncService
{
    public function __construct(private EvolutionApiService $evolution) {}

    public function sync(WhatsappInstance $instance): void
    {
        $cacheKey = "whatsapp-contact-profiles:{$instance->id}";

        if (! Cache::add($cacheKey, true, now()->addMinutes(10))) {
            return;
        }

        try {
            $response = $this->evolution->fetchContacts($instance->instance_name);

            if (! $response->successful() || ! is_array($response->json())) {
                Cache::forget($cacheKey);

                return;
            }

            $conversations = $instance->conversations()->get();

            foreach ($response->json() as $contact) {
                if (! is_array($contact)) {
                    continue;
                }

                $conversation = $this->matchingConversation($conversations, $contact);

                if (! $conversation || ! $this->hasProfilePictureField($contact)) {
                    continue;
                }

                $profilePictureUrl = $contact['profilePicUrl']
                    ?? $contact['profilePictureUrl']
                    ?? null;
                $profilePictureUrl = is_string($profilePictureUrl) && filled($profilePictureUrl)
                    ? $profilePictureUrl
                    : null;

                if ($conversation->contact_picture_url !== $profilePictureUrl) {
                    $conversation->update([
                        'contact_picture_url' => $profilePictureUrl,
                    ]);
                }
            }
        } catch (Throwable $exception) {
            Cache::forget($cacheKey);
            report($exception);
        }
    }

    /**
     * @param  Collection<int, WhatsappConversation>  $conversations
     * @param  array<string, mixed>  $contact
     */
    private function matchingConversation(Collection $conversations, array $contact): ?WhatsappConversation
    {
        $remoteJids = collect([
            $contact['remoteJid'] ?? null,
            $contact['id'] ?? null,
        ])->filter(fn ($remoteJid) => is_string($remoteJid) && filled($remoteJid));

        $conversation = $conversations->first(
            fn (WhatsappConversation $candidate) => $remoteJids->contains($candidate->remote_jid)
        );

        if ($conversation) {
            return $conversation;
        }

        $phoneNumbers = $remoteJids
            ->map(fn (string $remoteJid) => preg_replace('/@.*/', '', $remoteJid))
            ->filter();

        return $conversations->first(
            fn (WhatsappConversation $candidate) => filled($candidate->contact_phone)
                && $phoneNumbers->contains($candidate->contact_phone)
        );
    }

    /**
     * @param  array<string, mixed>  $contact
     */
    private function hasProfilePictureField(array $contact): bool
    {
        return array_key_exists('profilePicUrl', $contact)
            || array_key_exists('profilePictureUrl', $contact);
    }
}
