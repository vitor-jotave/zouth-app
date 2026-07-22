<?php

namespace Database\Factories;

use App\Models\Manufacturer;
use App\Models\RepresentativeInvitation;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<RepresentativeInvitation>
 */
class RepresentativeInvitationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $email = fake()->unique()->safeEmail();

        return [
            'manufacturer_id' => Manufacturer::factory(),
            'invited_by_user_id' => User::factory()->state(['user_type' => 'manufacturer_user']),
            'name' => fake()->name(),
            'email' => $email,
            'email_normalized' => Str::lower($email),
            'whatsapp' => fake()->numerify('119########'),
            'personal_message' => fake()->sentence(),
            'token_hash' => hash('sha256', Str::random(64)),
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
            'last_sent_at' => now(),
            'send_count' => 1,
        ];
    }

    public function expired(): static
    {
        return $this->state(fn (): array => ['expires_at' => now()->subMinute()]);
    }

    public function accepted(): static
    {
        return $this->state(fn (): array => [
            'status' => 'accepted',
            'accepted_at' => now(),
        ]);
    }
}
