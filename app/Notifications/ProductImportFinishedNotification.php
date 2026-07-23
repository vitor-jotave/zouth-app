<?php

namespace App\Notifications;

use App\Enums\ProductImportStatus;
use App\Models\ProductImport;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ProductImportFinishedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public ProductImport $productImport)
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
        $this->productImport->loadMissing('manufacturer');
        $manufacturerName = $this->productImport->manufacturer->name;
        $content = match ($this->productImport->status) {
            ProductImportStatus::Completed => [
                'eyebrow' => 'COLEÇÃO IMPORTADA',
                'title' => 'Sua coleção terminou de entrar',
                'intro' => "As peças da {$manufacturerName} foram processadas e já podem ser conferidas no catálogo.",
                'actionLabel' => 'Conferir importação',
                'note' => 'Revise as peças e imagens antes de publicar a coleção para os lojistas.',
            ],
            ProductImportStatus::CompletedWithErrors => [
                'eyebrow' => 'IMPORTAÇÃO COM PENDÊNCIAS',
                'title' => 'A maior parte da coleção já entrou',
                'intro' => 'Algumas peças precisam de uma nova tentativa. As demais foram preservadas e não serão processadas novamente.',
                'actionLabel' => 'Revisar pendências',
                'note' => 'A Zouth mostra exatamente quais linhas precisam ser corrigidas ou reprocessadas.',
            ],
            default => [
                'eyebrow' => 'IMPORTAÇÃO INTERROMPIDA',
                'title' => 'A coleção precisa da sua atenção',
                'intro' => 'Não foi possível concluir o processamento da planilha. Nenhuma peça concluída anteriormente será duplicada.',
                'actionLabel' => 'Entender o que aconteceu',
                'note' => 'Abra o histórico para revisar a falha e decidir o próximo passo.',
            ],
        };
        $messageData = [
            ...$content,
            'actionUrl' => route('manufacturer.product-imports.show', $this->productImport),
            'textTitle' => $content['title'],
            'textIntro' => $content['intro'],
            'textNote' => $content['note'],
        ];

        return (new MailMessage)
            ->subject($content['title'].' — '.$manufacturerName)
            ->view('emails.onboarding.message', $messageData)
            ->text('emails.onboarding.message-text', $messageData);
    }
}
