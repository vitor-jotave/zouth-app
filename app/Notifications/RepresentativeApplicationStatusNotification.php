<?php

namespace App\Notifications;

use App\Models\ManufacturerAffiliation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RepresentativeApplicationStatusNotification extends Notification implements ShouldQueue
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
        $this->affiliation->loadMissing('manufacturer');
        $manufacturerName = $this->affiliation->manufacturer->name;
        $content = match ($this->affiliation->status) {
            'active' => [
                'eyebrow' => 'PARCERIA APROVADA',
                'title' => "Você agora representa a {$manufacturerName}",
                'intro' => 'A coleção já pode entrar nas suas conversas com lojistas. Seu vínculo e o acesso comercial estão ativos.',
                'actionLabel' => 'Abrir minhas marcas',
                'note' => 'Use seu link rastreável para que os pedidos movimentados por você apareçam no seu histórico.',
            ],
            'rejected' => [
                'eyebrow' => 'SOLICITAÇÃO ANALISADA',
                'title' => "A {$manufacturerName} concluiu a análise do seu perfil",
                'intro' => 'A marca decidiu não iniciar a parceria neste momento. Seu perfil continua disponível para conhecer outras coleções.',
                'actionLabel' => 'Conhecer outras marcas',
                'note' => 'Uma recusa não impede uma nova solicitação futura caso o momento comercial da marca mude.',
            ],
            'revoked' => [
                'eyebrow' => 'VÍNCULO ENCERRADO',
                'title' => "A parceria com a {$manufacturerName} foi encerrada",
                'intro' => 'O acesso comercial à coleção foi removido, mas o histórico de pedidos atribuídos a você permanece preservado.',
                'actionLabel' => 'Ver minhas marcas',
                'note' => 'Se precisar entender essa decisão, fale diretamente com o fabricante.',
            ],
            default => [
                'eyebrow' => 'NOVIDADE NA SUA REDE',
                'title' => "Sua relação com a {$manufacturerName} foi atualizada",
                'intro' => 'Abra sua área de representante para conferir o novo estado da parceria.',
                'actionLabel' => 'Ver minhas marcas',
                'note' => 'Seu histórico comercial permanece preservado.',
            ],
        };
        $messageData = [
            ...$content,
            'actionUrl' => route('rep.manufacturers.index'),
            'textTitle' => $content['title'],
            'textIntro' => $content['intro'],
            'textNote' => $content['note'],
        ];

        return (new MailMessage)
            ->subject($content['title'])
            ->view('emails.onboarding.message', $messageData)
            ->text('emails.onboarding.message-text', $messageData);
    }
}
