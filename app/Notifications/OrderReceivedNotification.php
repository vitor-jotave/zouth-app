<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;

class OrderReceivedNotification extends OrderMailNotification
{
    public function toMail(object $notifiable): MailMessage
    {
        $this->order->loadMissing('manufacturer');
        $isQuote = $this->order->isQuote();
        $manufacturerName = $this->order->manufacturer->name;

        return $this->orderMail(
            $isQuote
                ? "Sua seleção chegou à {$manufacturerName}"
                : "Seu pedido chegou à {$manufacturerName}",
            [
                'eyebrow' => $isQuote ? 'SELEÇÃO RECEBIDA' : 'PEDIDO RECEBIDO',
                'title' => $isQuote
                    ? "A {$manufacturerName} recebeu sua seleção"
                    : "Seu pedido já está com a {$manufacturerName}",
                'intro' => $isQuote
                    ? 'O comercial agora pode conferir disponibilidade e preparar uma proposta para a sua loja.'
                    : 'A seleção foi registrada e você poderá acompanhar cada mudança até a conclusão.',
                'actionLabel' => $isQuote ? 'Acompanhar solicitação' : 'Acompanhar pedido',
                'actionUrl' => route('public.order.show', $this->order->public_token),
                'note' => $isQuote
                    ? 'Esta é uma solicitação de orçamento e ainda não representa reserva de estoque ou venda confirmada.'
                    : 'Guarde este e-mail: o link permite acompanhar o andamento sem criar uma conta.',
            ],
        );
    }
}
