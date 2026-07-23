<?php

namespace App\Notifications;

use App\Models\ManufacturerAffiliation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RepresentativeApplicationReceivedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public ManufacturerAffiliation $affiliation)
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
        $this->affiliation->loadMissing([
            'manufacturer',
            'user.salesRepresentativeProfile',
        ]);
        $representative = $this->affiliation->user;
        $profile = $representative->salesRepresentativeProfile;
        $location = collect([$profile?->city, $profile?->state])->filter()->implode('/');
        $context = collect([
            $location !== '' ? "atua em {$location}" : null,
            $profile?->territory ? "cobre {$profile->territory}" : null,
        ])->filter()->implode(' e ');
        $messageData = [
            'eyebrow' => 'NOVA SOLICITAÇÃO DE REPRESENTAÇÃO',
            'title' => $representative->name.' quer levar sua coleção para novas vitrines',
            'intro' => $context !== ''
                ? "O perfil comercial chegou para análise: {$representative->name} {$context}."
                : 'Um novo perfil comercial chegou para análise da sua equipe.',
            'actionLabel' => 'Conhecer o perfil',
            'actionUrl' => route('manufacturer.representatives.index', ['segment' => 'requests']),
            'note' => 'A afiliação só será ativada depois da aprovação do fabricante e da conferência das vagas do plano.',
            'textTitle' => $representative->name.' solicitou representar a '.$this->affiliation->manufacturer->name,
            'textIntro' => 'Abra a área de Representantes para conhecer o perfil comercial.',
            'textNote' => 'A solicitação ainda aguarda análise.',
        ];

        return (new MailMessage)
            ->subject($representative->name.' quer representar a '.$this->affiliation->manufacturer->name)
            ->view('emails.onboarding.message', $messageData)
            ->text('emails.onboarding.message-text', $messageData);
    }
}
