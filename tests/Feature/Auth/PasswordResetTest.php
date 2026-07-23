<?php

use App\Models\User;
use App\Notifications\ZouthResetPasswordNotification;
use Illuminate\Support\Facades\Notification;

test('reset password link screen can be rendered', function () {
    $response = $this->get(route('password.request'));

    $response->assertOk();
});

test('reset password link can be requested', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->post(route('password.email'), ['email' => $user->email]);

    Notification::assertSentTo($user, ZouthResetPasswordNotification::class);
});

test('reset password screen can be rendered', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->post(route('password.email'), ['email' => $user->email]);

    Notification::assertSentTo($user, ZouthResetPasswordNotification::class, function ($notification) {
        $response = $this->get(route('password.reset', $notification->token));

        $response->assertOk();

        return true;
    });
});

test('password can be reset with valid token', function () {
    Notification::fake();

    $user = User::factory()->create();

    $this->post(route('password.email'), ['email' => $user->email]);

    Notification::assertSentTo($user, ZouthResetPasswordNotification::class, function ($notification) use ($user) {
        $response = $this->post(route('password.update'), [
            'token' => $notification->token,
            'email' => $user->email,
            'password' => 'NovaSenha1',
            'password_confirmation' => 'NovaSenha1',
        ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('login'));

        return true;
    });
});

test('resetting a password verifies an invited account email', function () {
    Notification::fake();

    $user = User::factory()->unverified()->create();

    $this->post(route('password.email'), ['email' => $user->email]);

    Notification::assertSentTo($user, ZouthResetPasswordNotification::class, function ($notification) use ($user) {
        $this->post(route('password.update'), [
            'token' => $notification->token,
            'email' => $user->email,
            'password' => 'NovaSenha1',
            'password_confirmation' => 'NovaSenha1',
        ])->assertSessionHasNoErrors();

        return true;
    });

    expect($user->refresh()->hasVerifiedEmail())->toBeTrue();
});

test('renders the password recovery email with the Zouth identity in Portuguese', function () {
    $user = User::factory()->create();
    $message = (new ZouthResetPasswordNotification('reset-token'))->toMail($user);

    $html = view($message->view['html'], $message->viewData)->render();
    $text = view($message->view['text'], $message->viewData)->render();

    expect($message->subject)
        ->toBe('Crie uma nova senha para sua conta Zouth')
        ->and($html)
        ->toContain('ACESSO À SUA CONTA')
        ->toContain('Criar nova senha')
        ->not->toContain('Reset Password Notification')
        ->and($text)
        ->toContain('Crie uma nova senha')
        ->toContain('Criar nova senha');
});

test('password cannot be reset with invalid token', function () {
    $user = User::factory()->create();

    $response = $this->post(route('password.update'), [
        'token' => 'invalid-token',
        'email' => $user->email,
        'password' => 'NovaSenha1',
        'password_confirmation' => 'NovaSenha1',
    ]);

    $response->assertSessionHasErrors('email');
});
