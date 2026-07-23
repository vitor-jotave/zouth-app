<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;

class OrderAttributedToRepresentativeNotification extends OrderMailNotification
{
    public function toMail(object $notifiable): MailMessage
    {
        $this->order->loadMissing('manufacturer');
        $customerName = $this->order->customer_name;
        $manufacturerName = $this->order->manufacturer->name;

        return $this->orderMail(
            "Uma nova oportunidade da {$manufacturerName} passou pela sua rede",
            [
                'eyebrow' => 'SUA REDE MOVIMENTOU A COLEÇÃO',
                'title' => "{$customerName} chegou pela sua apresentação",
                'intro' => 'A seleção foi atribuída ao seu link comercial e já aparece no seu histórico de vendas.',
                'actionLabel' => 'Ver minhas vendas',
                'actionUrl' => route('rep.orders.index'),
                'note' => 'O fabricante conduz o andamento do pedido. Você acompanha os resultados pela sua área de representante.',
            ],
        );
    }
}
