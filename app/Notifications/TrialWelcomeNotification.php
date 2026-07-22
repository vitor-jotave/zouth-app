<?php

namespace App\Notifications;

use App\Models\Manufacturer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TrialWelcomeNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(public Manufacturer $manufacturer)
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
        $messageData = [
            'eyebrow' => 'SEUS 7 DIAS COMEÇARAM',
            'title' => 'Sua vitrine já tem nome.',
            'intro' => 'Agora é hora de trazer as peças da '.$this->manufacturer->name.' e ver a coleção ganhar presença diante de representantes e lojistas.',
            'actionLabel' => 'Continuar minha vitrine',
            'actionUrl' => route('onboarding.index'),
            'note' => 'Sem cartão. Você escolhe um plano somente se quiser continuar depois do teste.',
            'textTitle' => 'Sua vitrine já tem nome',
            'textIntro' => 'Seus sete dias grátis começaram. Traga as peças da '.$this->manufacturer->name.' para continuar.',
            'textNote' => 'Sem cartão.',
        ];

        return (new MailMessage)
            ->subject($this->manufacturer->name.' já está em movimento na Zouth')
            ->view('emails.onboarding.message', $messageData)
            ->text('emails.onboarding.message-text', $messageData);
    }
}
