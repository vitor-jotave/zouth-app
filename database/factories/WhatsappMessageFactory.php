<?php

namespace Database\Factories;

use App\Models\WhatsappConversation;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\WhatsappMessage>
 */
class WhatsappMessageFactory extends Factory
{
    public function definition(): array
    {
        return [
            'whatsapp_conversation_id' => WhatsappConversation::factory(),
            'message_id' => fake()->unique()->uuid(),
            'from_me' => false,
            'sender_jid' => fake()->numerify('5511########').'@s.whatsapp.net',
            'body' => fake()->sentence(),
            'media_type' => null,
            'media_url' => null,
            'media_mimetype' => null,
            'media_file_name' => null,
            'status' => 'delivered',
            'message_timestamp' => fake()->dateTimeBetween('-7 days', 'now'),
        ];
    }

    public function fromMe(): static
    {
        return $this->state(fn (array $attributes) => [
            'from_me' => true,
            'sender_jid' => null,
            'status' => 'sent',
        ]);
    }

    public function read(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'read',
        ]);
    }
}
