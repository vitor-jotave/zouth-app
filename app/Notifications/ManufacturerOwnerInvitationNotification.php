<?php

namespace App\Notifications;

use App\Models\Manufacturer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ManufacturerOwnerInvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $token,
        public Manufacturer $manufacturer,
    ) {
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
        $accessUrl = route('password.reset', [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
            'intent' => 'manufacturer_invitation',
            'manufacturer' => $this->manufacturer->name,
        ]);
        $messageData = [
            'eyebrow' => 'SUA MARCA JÁ TEM UM ESPAÇO',
            'title' => 'Seu acesso à '.$this->manufacturer->name.' está pronto',
            'intro' => 'A conta da '.$this->manufacturer->name.' foi preparada na Zouth e você será o proprietário principal. Crie sua senha para assumir a gestão da coleção.',
            'actionLabel' => 'Ativar meu acesso',
            'actionUrl' => $accessUrl,
            'note' => 'Este link é pessoal e expira em 60 minutos. Ao criar a senha, seu e-mail também será confirmado.',
            'textTitle' => 'Seu acesso à '.$this->manufacturer->name.' está pronto',
            'textIntro' => 'Crie sua senha para assumir a gestão da coleção.',
            'textNote' => 'O link é pessoal e expira em 60 minutos.',
        ];

        return (new MailMessage)
            ->subject('Seu acesso à '.$this->manufacturer->name.' está pronto')
            ->view('emails.onboarding.message', $messageData)
            ->text('emails.onboarding.message-text', $messageData);
    }
}
