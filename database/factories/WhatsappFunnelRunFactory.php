<?php

namespace Database\Factories;

use App\Models\WhatsappConversation;
use App\Models\WhatsappFunnel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\WhatsappFunnelRun>
 */
class WhatsappFunnelRunFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'whatsapp_funnel_id' => WhatsappFunnel::factory(),
            'whatsapp_conversation_id' => WhatsappConversation::factory(),
            'status' => 'pending',
            'started_at' => null,
            'completed_at' => null,
            'error_message' => null,
        ];
    }
}
