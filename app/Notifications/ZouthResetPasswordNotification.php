<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ZouthResetPasswordNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $token)
    {
        $this->afterCommit();
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $resetUrl = route('password.reset', [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ]);
        $messageData = [
            'eyebrow' => 'ACESSO À SUA CONTA',
            'title' => 'Crie uma nova senha',
            'intro' => 'Recebemos um pedido para trocar a senha da sua conta Zouth. Escolha uma nova senha para voltar a movimentar sua coleção com segurança.',
            'actionLabel' => 'Criar nova senha',
            'actionUrl' => $resetUrl,
            'note' => 'Este link expira em 60 minutos. Se você não pediu a troca, ignore esta mensagem e sua senha continuará a mesma.',
            'textTitle' => 'Crie uma nova senha',
            'textIntro' => 'Recebemos um pedido para trocar a senha da sua conta Zouth.',
            'textNote' => 'Se você não pediu a troca, ignore esta mensagem.',
        ];

        return (new MailMessage)
            ->subject('Crie uma nova senha para sua conta Zouth')
            ->view('emails.onboarding.message', $messageData)
            ->text('emails.onboarding.message-text', $messageData);
    }
}
