<?php

namespace Database\Factories;

use App\Models\WhatsappFunnel;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\WhatsappFunnelStep>
 */
class WhatsappFunnelStepFactory extends Factory
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
            'type' => 'text',
            'sort_order' => 1,
            'payload' => ['body' => fake()->sentence()],
        ];
    }

    public function forFunnel(WhatsappFunnel $funnel): static
    {
        return $this->state(fn () => [
            'whatsapp_funnel_id' => $funnel->id,
        ]);
    }
}
