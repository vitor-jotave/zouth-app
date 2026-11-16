<?php

namespace App\Notifications;

use App\Models\Order;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;

class OrderAttributedToRepresentativeNotification extends OrderMailNotification
{
    public function shouldSend(User $representative, string $channel): bool
    {
        return $representative->isSalesRep()
            && $representative->hasVerifiedEmail()
            && Order::query()->whereKey($this->order->id)->where('sales_rep_id', $representative->id)->exists();
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->order->loadMissing('manufacturer');
        $customerName = $this->order->customer_name;
        $manufacturerName = $this->order->manufacturer->name;

        return $this->orderMail(
            ($this->order->isQuote() ? 'Novo orçamento' : 'Novo pedido')." da {$manufacturerName} pelo seu link",
            [
                'eyebrow' => 'SUA REDE MOVIMENTOU A COLEÇÃO',
                'title' => "{$customerName} chegou pela sua apresentação",
                'intro' => 'A seleção foi atribuída ao seu link comercial e já aparece no seu histórico de vendas.',
                'actionLabel' => $this->order->isQuote() ? 'Ver orçamento' : 'Ver pedido',
                'actionUrl' => route('rep.orders.show', $this->order),
                'note' => 'O fabricante conduz o andamento do pedido. Você acompanha os resultados pela sua área de representante.',
            ],
        );
    }
}
