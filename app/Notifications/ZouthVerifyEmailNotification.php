<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class ZouthVerifyEmailNotification extends VerifyEmail implements ShouldQueue
{
    use Queueable;

    public function __construct()
    {
        $this->afterCommit();
    }

    /**
     * Get the mail representation of the notification.
     */
    /** @return MailMessage */
    public function toMail($notifiable)
    {
        $manufacturerName = $notifiable->currentManufacturer?->name ?? 'sua marca';
        $messageData = [
            'eyebrow' => 'SUA VITRINE ESTÁ QUASE PRONTA',
            'title' => 'Confirme seu e-mail.',
            'intro' => 'A primeira vitrine da '.$manufacturerName.' já ganhou forma. Confirme seu endereço para trazer a coleção e continuar preparando sua apresentação comercial.',
            'actionLabel' => 'Confirmar e continuar',
            'actionUrl' => $this->verificationUrl($notifiable),
            'note' => 'Este link expira em 60 minutos. Se você não iniciou este cadastro, ignore esta mensagem.',
            'textTitle' => 'Confirme seu e-mail',
            'textIntro' => 'A primeira vitrine da '.$manufacturerName.' já ganhou forma.',
            'textNote' => 'Este link expira em 60 minutos.',
        ];

        return (new MailMessage)
            ->subject('Confirme seu e-mail e coloque '.$manufacturerName.' em movimento')
            ->view('emails.onboarding.message', $messageData)
            ->text('emails.onboarding.message-text', $messageData);
    }
}
