<?php

namespace Database\Factories;

use App\Models\OnboardingSession;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<OnboardingSession>
 */
class OnboardingSessionFactory extends Factory
{
    protected $model = OnboardingSession::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'public_id' => (string) Str::uuid(),
            'source' => 'landing',
            'current_step' => 1,
            'context' => [],
            'started_at' => now(),
            'last_activity_at' => now(),
        ];
    }
}
