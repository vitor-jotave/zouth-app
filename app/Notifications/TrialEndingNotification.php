<?php

namespace App\Notifications;

use App\Models\Manufacturer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TrialEndingNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        public Manufacturer $manufacturer,
        public int $daysRemaining,
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
        $timeLabel = $this->daysRemaining === 1 ? 'último dia' : 'três dias';
        $messageData = [
            'eyebrow' => $this->daysRemaining === 1 ? 'ÚLTIMO DIA DE TESTE' : 'FALTAM 3 DIAS',
            'title' => $this->daysRemaining === 1 ? 'Mantenha a coleção em movimento' : 'Sua coleção já encontrou um novo ritmo',
            'intro' => 'Escolha o plano que acompanha o momento da '.$this->manufacturer->name.'. Ao continuar, todo o trabalho feito até aqui permanece exatamente onde está.',
            'actionLabel' => 'Escolher meu plano',
            'actionUrl' => route('manufacturer.billing.index'),
            'note' => 'Se não houver contratação, a conta será pausada e o catálogo deixará de circular. Nada será apagado.',
            'textTitle' => 'Mantenha a coleção em movimento',
            'textIntro' => 'O teste da '.$this->manufacturer->name.' está perto do fim.',
            'textNote' => 'Seu trabalho será preservado mesmo se a conta for pausada.',
        ];

        return (new MailMessage)
            ->subject($this->manufacturer->name.' está nos '.$timeLabel.' de teste')
            ->view('emails.onboarding.message', $messageData)
            ->text('emails.onboarding.message-text', $messageData);
    }
}
