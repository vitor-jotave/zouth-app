<?php

namespace App\Notifications;

use App\Models\Manufacturer;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TeamInvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $token,
        public Manufacturer $manufacturer,
        public User $invitedBy,
        public string $role,
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
        $roleLabel = $this->role === 'owner' ? 'proprietário' : 'colaborador';
        $accessUrl = route('password.reset', [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
            'intent' => 'team_invitation',
            'manufacturer' => $this->manufacturer->name,
        ]);
        $messageData = [
            'eyebrow' => 'CONVITE PARA A EQUIPE',
            'title' => $this->invitedBy->name.' abriu um lugar para você',
            'intro' => 'Você foi convidado para entrar na equipe da '.$this->manufacturer->name.' como '.$roleLabel.'. Crie sua senha para acessar somente as áreas preparadas para o seu trabalho.',
            'actionLabel' => 'Criar meu acesso',
            'actionUrl' => $accessUrl,
            'note' => 'Este convite é pessoal e o link expira em 60 minutos. Ao criar a senha, seu e-mail também será confirmado.',
            'textTitle' => 'Você foi convidado para a equipe da '.$this->manufacturer->name,
            'textIntro' => $this->invitedBy->name.' convidou você para entrar como '.$roleLabel.'.',
            'textNote' => 'Crie sua senha para ativar o acesso.',
        ];

        return (new MailMessage)
            ->subject($this->invitedBy->name.' convidou você para a equipe da '.$this->manufacturer->name)
            ->view('emails.onboarding.message', $messageData)
            ->text('emails.onboarding.message-text', $messageData);
    }
}
