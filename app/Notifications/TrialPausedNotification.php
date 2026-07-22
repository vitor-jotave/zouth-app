<?php

namespace App\Notifications;

use App\Models\Manufacturer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TrialPausedNotification extends Notification implements ShouldQueue
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
        return (new MailMessage)
            ->subject('A conta da '.$this->manufacturer->name.' foi pausada')
            ->view('emails.onboarding.message', [
                'eyebrow' => 'SEU TRABALHO ESTÁ PRESERVADO',
                'title' => 'A coleção parou. Nada foi perdido.',
                'intro' => 'A conta da '.$this->manufacturer->name.' foi pausada e o catálogo deixou de circular. Produtos, imagens, clientes e configurações continuam guardados para quando você quiser retomar.',
                'actionLabel' => 'Retomar minha coleção',
                'actionUrl' => route('manufacturer.account-paused'),
                'note' => 'Escolha um plano para reabrir o catálogo e voltar a receber pedidos.',
            ])
            ->text('emails.onboarding.message-text', [
                'title' => 'A coleção parou. Nada foi perdido.',
                'intro' => 'A conta da '.$this->manufacturer->name.' foi pausada, mas todo o trabalho permanece preservado.',
                'actionLabel' => 'Retomar minha coleção',
                'actionUrl' => route('manufacturer.account-paused'),
                'note' => 'Escolha um plano para reabrir o catálogo.',
            ]);
    }
}
