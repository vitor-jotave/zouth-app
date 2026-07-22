<?php

namespace App\Services;

use App\Models\WhatsappMessage;

class WhatsappMessageReactionService
{
    /**
     * @return array<int, array{actor: string, from_me: bool, emoji: string}>
     */
    public function apply(
        WhatsappMessage $message,
        bool $fromMe,
        ?string $senderJid,
        string $emoji,
    ): array {
        $actor = $fromMe ? 'self' : ($senderJid ?: 'contact');
        $reactions = collect($message->reactions ?? [])
            ->filter(fn (mixed $reaction): bool => is_array($reaction)
                && isset($reaction['actor'], $reaction['emoji']))
            ->reject(fn (array $reaction): bool => $reaction['actor'] === $actor)
            ->values()
            ->all();

        if ($emoji !== '') {
            $reactions[] = [
                'actor' => $actor,
                'from_me' => $fromMe,
                'emoji' => $emoji,
            ];
        }

        $message->update(['reactions' => $reactions ?: null]);

        return $reactions;
    }

    public function ownReaction(WhatsappMessage $message): ?string
    {
        $reaction = collect($message->reactions ?? [])
            ->first(fn (mixed $reaction): bool => is_array($reaction)
                && ($reaction['from_me'] ?? false) === true);

        return is_array($reaction) && is_string($reaction['emoji'] ?? null)
            ? $reaction['emoji']
            : null;
    }
}
