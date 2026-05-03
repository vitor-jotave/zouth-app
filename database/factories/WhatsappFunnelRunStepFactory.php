<?php

namespace Database\Factories;

use App\Models\WhatsappFunnelRun;
use App\Models\WhatsappFunnelStep;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\WhatsappFunnelRunStep>
 */
class WhatsappFunnelRunStepFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'whatsapp_funnel_run_id' => WhatsappFunnelRun::factory(),
            'whatsapp_funnel_step_id' => WhatsappFunnelStep::factory(),
            'whatsapp_message_id' => null,
            'type' => 'text',
            'sort_order' => 1,
            'payload' => ['body' => fake()->sentence()],
            'status' => 'pending',
            'scheduled_at' => null,
            'sent_at' => null,
            'error_message' => null,
        ];
    }
}
