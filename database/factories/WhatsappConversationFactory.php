<?php

namespace Database\Factories;

use App\Models\WhatsappInstance;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\WhatsappConversation>
 */
class WhatsappConversationFactory extends Factory
{
    public function definition(): array
    {
        $phone = fake()->numerify('5511########');

        return [
            'whatsapp_instance_id' => WhatsappInstance::factory(),
            'remote_jid' => $phone.'@s.whatsapp.net',
            'is_group' => false,
            'contact_name' => fake()->name(),
            'contact_phone' => $phone,
            'contact_picture_url' => null,
            'last_message_body' => fake()->sentence(),
            'last_message_from_me' => fake()->boolean(),
            'last_message_at' => fake()->dateTimeBetween('-7 days', 'now'),
            'unread_count' => fake()->numberBetween(0, 20),
        ];
    }

    public function group(): static
    {
        return $this->state(fn (array $attributes) => [
            'is_group' => true,
            'remote_jid' => fake()->numerify('################').'@g.us',
            'contact_name' => 'Grupo '.fake()->word(),
        ]);
    }
}
