<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;

class NewOrderNotification extends OrderMailNotification
{
    public function toMail(object $notifiable): MailMessage
    {
        $isQuote = $this->order->isQuote();
        $customerName = $this->order->customer_name;
        $subject = $isQuote
            ? "Nova solicitação de orçamento de {$customerName}"
            : "Novo pedido de {$customerName}";

        return $this->orderMail($subject, [
            'eyebrow' => $isQuote ? 'NOVA SOLICITAÇÃO DE ORÇAMENTO' : 'NOVO PEDIDO',
            'title' => $isQuote
                ? "{$customerName} quer conversar sobre a coleção"
                : "{$customerName} acaba de movimentar sua coleção",
            'intro' => $isQuote
                ? 'A seleção chegou pronta para o comercial analisar disponibilidade, condições e próximos passos.'
                : 'O lojista concluiu a seleção no catálogo. O pedido já está organizado para sua equipe acompanhar.',
            'actionLabel' => $isQuote ? 'Analisar solicitação' : 'Abrir pedido',
            'actionUrl' => route('manufacturer.orders.show', $this->order),
            'note' => $isQuote
                ? 'O estoque não foi reservado. Entre em contato com o lojista antes de formalizar a venda.'
                : 'O estoque correspondente já foi reservado pela Zouth.',
        ]);
    }
}
