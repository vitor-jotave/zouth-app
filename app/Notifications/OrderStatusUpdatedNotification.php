<?php

namespace App\Notifications;

use App\Enums\OrderStatus;
use App\Models\Order;
use Illuminate\Notifications\Messages\MailMessage;

class OrderStatusUpdatedNotification extends OrderMailNotification
{
    public function __construct(Order $order, public OrderStatus $previousStatus)
    {
        parent::__construct($order);
    }

    public function toMail(object $notifiable): MailMessage
    {
        $this->order->loadMissing('manufacturer');
        $manufacturerName = $this->order->manufacturer->name;
        $currentLabel = $this->order->statusLabel();
        [$title, $intro] = $this->statusCopy($manufacturerName);

        return $this->orderMail(
            "{$this->order->order_type->label()} atualizado: {$currentLabel}",
            [
                'eyebrow' => 'NOVIDADE NA SUA SELEÇÃO',
                'title' => $title,
                'intro' => $intro,
                'actionLabel' => $this->order->isQuote() ? 'Acompanhar orçamento' : 'Acompanhar pedido',
                'actionUrl' => route('public.order.show', $this->order->public_token),
                'note' => "O andamento mudou de “{$this->order->statusLabel($this->previousStatus)}” para “{$currentLabel}”.",
            ],
        );
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function statusCopy(string $manufacturerName): array
    {
        if ($this->order->isQuote()) {
            return match ($this->order->status) {
                OrderStatus::New => ['Sua seleção voltou para análise', "O comercial da {$manufacturerName} retomou a conferência da sua solicitação."],
                OrderStatus::Confirmed => ['A conversa comercial começou', "A {$manufacturerName} está negociando os detalhes da sua seleção."],
                OrderStatus::Preparing => ['Seu orçamento foi aprovado', 'A seleção avançou e está pronta para os próximos passos de formalização.'],
                OrderStatus::Shipped => ['Sua seleção foi formalizada', "A {$manufacturerName} concluiu a formalização comercial desta oportunidade."],
                OrderStatus::Delivered => ['Sua negociação foi concluída', 'A oportunidade chegou à etapa final e permanece disponível no seu histórico.'],
                OrderStatus::Cancelled => ['A negociação foi encerrada', "A {$manufacturerName} encerrou esta solicitação de orçamento."],
            };
        }

        return match ($this->order->status) {
            OrderStatus::New => ['Seu pedido voltou para análise', "A {$manufacturerName} retomou a conferência da sua seleção."],
            OrderStatus::Confirmed => ['Seu pedido foi confirmado', "A {$manufacturerName} confirmou a seleção da sua loja."],
            OrderStatus::Preparing => ['Sua seleção está em preparação', 'As peças avançaram para a etapa de preparação.'],
            OrderStatus::Shipped => ['Seu pedido está a caminho', "A {$manufacturerName} marcou a seleção como enviada."],
            OrderStatus::Delivered => ['Seu pedido foi entregue', 'A coleção chegou ao destino e o pedido foi concluído.'],
            OrderStatus::Cancelled => ['Seu pedido foi cancelado', "A {$manufacturerName} encerrou este pedido. O histórico continuará disponível no link abaixo."],
        };
    }
}
