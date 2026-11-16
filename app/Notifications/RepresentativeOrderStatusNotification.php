<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;

class RepresentativeOrderStatusNotification extends OrderMailNotification
{
    public readonly OrderStatus $currentStatus;

    public function __construct(Order $order, public readonly OrderStatus $previousStatus)
    {
        parent::__construct($order);
        $this->currentStatus = $order->status;
    }

    public function shouldSend(User $representative, string $channel): bool
    {
        return $representative->isSalesRep()
            && $representative->hasVerifiedEmail()
            && Order::query()->whereKey($this->order->id)->where('sales_rep_id', $representative->id)->exists();
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->order->loadMissing('manufacturer');
        $manufacturer = $this->order->manufacturer->name;
        $type = $this->order->order_type->label();
        $previousLabel = $this->order->statusLabel($this->previousStatus);
        $currentLabel = $this->order->statusLabel($this->currentStatus);

        return $this->orderMail(
            "{$type} #{$this->order->id} atualizado: {$currentLabel}",
            [
                'eyebrow' => 'ANDAMENTO COMERCIAL',
                'title' => "{$type} atualizado pela {$manufacturer}",
                'intro' => "A marca mudou o status de “{$previousLabel}” para “{$currentLabel}”.",
                'actionLabel' => $this->order->isQuote() ? 'Ver orçamento' : 'Ver pedido',
                'actionUrl' => route('rep.orders.show', $this->order),
                'note' => 'Consulte o histórico no portal para ver o andamento mais recente.',
            ],
            $this->currentStatus,
        );
    }
}
