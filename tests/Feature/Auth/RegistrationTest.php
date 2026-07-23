<?php

use App\Enums\UserType;
use App\Models\User;
use App\Notifications\ZouthVerifyEmailNotification;
use Illuminate\Support\Facades\Notification;

test('registration screen can be rendered', function () {
    $this->get(route('register'))->assertOk();
});

test('new users can register as sales reps', function () {
    Notification::fake();

    $this->post('/register', [
        'name' => 'João Representante',
        'email' => 'rep@example.com',
        'password' => 'Senha1',
        'password_confirmation' => 'Senha1',
        'terms' => true,
    ])->assertRedirect(route('verification.notice'));

    $user = User::where('email', 'rep@example.com')->firstOrFail();

    expect($user->user_type)->toBe(UserType::SalesRep);
    $this->assertAuthenticated();
    Notification::assertSentTo($user, ZouthVerifyEmailNotification::class);
});

test('registered user has no current_manufacturer_id', function () {
    $this->post('/register', [
        'name' => 'Rep Test',
        'email' => 'rep2@example.com',
        'password' => 'Senha1',
        'password_confirmation' => 'Senha1',
        'terms' => true,
    ]);

    $user = User::where('email', 'rep2@example.com')->firstOrFail();

    expect($user->current_manufacturer_id)->toBeNull();
});

test('registration requires name', function () {
    $this->post('/register', [
        'email' => 'rep@example.com',
        'password' => 'Senha1',
        'password_confirmation' => 'Senha1',
        'terms' => true,
    ])->assertSessionHasErrors('name');
});

test('registration requires email', function () {
    $this->post('/register', [
        'name' => 'João Rep',
        'password' => 'Senha1',
        'password_confirmation' => 'Senha1',
        'terms' => true,
    ])->assertSessionHasErrors('email');
});

test('registration requires unique email', function () {
    User::factory()->create(['email' => 'existing@example.com']);

    $this->post('/register', [
        'name' => 'Another Rep',
        'email' => 'existing@example.com',
        'password' => 'Senha1',
        'password_confirmation' => 'Senha1',
        'terms' => true,
    ])->assertSessionHasErrors('email');
});

test('registration requires password confirmation', function () {
    $this->post('/register', [
        'name' => 'João Rep',
        'email' => 'rep@example.com',
        'password' => 'Senha1',
        'password_confirmation' => 'different',
        'terms' => true,
    ])->assertSessionHasErrors('password');
});

test('registration requires acceptance of legal terms', function () {
    $this->post('/register', [
        'name' => 'João Rep',
        'email' => 'rep@example.com',
        'password' => 'Senha1',
        'password_confirmation' => 'Senha1',
        'terms' => false,
    ])->assertSessionHasErrors('terms');

    $this->assertGuest();
});
