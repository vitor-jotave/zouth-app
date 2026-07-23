<?php

namespace App\Mail;

use App\Models\Manufacturer;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PlanSelectionInvite extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public Manufacturer $manufacturer,
        public string $ownerName,
        public string $planSelectionUrl,
    ) {}

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Selecione seu plano — '.$this->manufacturer->name,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.onboarding.message',
            text: 'emails.onboarding.message-text',
            with: [
                'eyebrow' => 'ESCOLHA O PRÓXIMO PASSO',
                'title' => 'Um plano para o momento da '.$this->manufacturer->name,
                'intro' => 'Olá, '.$this->ownerName.'. A estrutura comercial da '.$this->manufacturer->name.' já está criada. Escolha o plano que acompanha o tamanho da operação e coloque a coleção em movimento.',
                'actionLabel' => 'Escolher meu plano',
                'actionUrl' => $this->planSelectionUrl,
                'note' => 'Este link fica disponível por 3 dias. Depois desse prazo, fale com a equipe Zouth para receber um novo acesso.',
                'textTitle' => 'Escolha o plano da '.$this->manufacturer->name,
                'textIntro' => 'A estrutura comercial da marca já está criada.',
                'textNote' => 'Este link fica disponível por 3 dias.',
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
