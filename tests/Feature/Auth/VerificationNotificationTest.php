<?php

use App\Models\Manufacturer;
use App\Models\User;
use App\Notifications\TrialEndingNotification;
use App\Notifications\TrialPausedNotification;
use App\Notifications\TrialWelcomeNotification;
use App\Notifications\ZouthVerifyEmailNotification;
use Illuminate\Support\Facades\Notification;

test('sends verification notification', function () {
    Notification::fake();

    $user = User::factory()->unverified()->create();

    $this->actingAs($user)
        ->post(route('verification.send'))
        ->assertRedirect(route('home'));

    Notification::assertSentTo($user, ZouthVerifyEmailNotification::class);
});

test('does not send verification notification if email is verified', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('verification.send'))
        ->assertRedirect(route('dashboard', absolute: false));

    Notification::assertNothingSent();
});

test('renders the branded verification email in html and plain text', function () {
    $user = User::factory()->unverified()->create();
    $message = (new ZouthVerifyEmailNotification)->toMail($user);

    expect($message->view)->toBeArray()
        ->and($message->viewData)->toHaveKeys([
            'eyebrow',
            'title',
            'intro',
            'actionLabel',
            'actionUrl',
            'note',
        ]);

    $html = view($message->view['html'], $message->viewData)->render();
    $text = view($message->view['text'], $message->viewData)->render();

    expect($html)
        ->toContain('SUA VITRINE ESTÁ QUASE PRONTA')
        ->toContain('Confirmar e continuar')
        ->and($text)
        ->toContain('Confirme seu e-mail')
        ->toContain('Confirmar e continuar');
});

test('renders every onboarding lifecycle email with the complete shared view data', function () {
    $manufacturer = Manufacturer::factory()->create(['name' => 'Petit Monde']);
    $user = User::factory()->create();
    $notifications = [
        new TrialWelcomeNotification($manufacturer),
        new TrialEndingNotification($manufacturer, 3),
        new TrialPausedNotification($manufacturer),
    ];

    foreach ($notifications as $notification) {
        $message = $notification->toMail($user);
        $html = view($message->view['html'], $message->viewData)->render();
        $text = view($message->view['text'], $message->viewData)->render();

        expect($message->viewData)->toHaveKeys(['eyebrow', 'title', 'intro', 'actionLabel', 'actionUrl', 'note'])
            ->and($html)->toContain('Petit Monde')
            ->and($text)->toContain('Petit Monde');
    }
});
