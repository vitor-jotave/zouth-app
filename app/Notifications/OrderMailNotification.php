<?php

namespace App\Notifications;

use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

abstract class OrderMailNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Order $order)
    {
        $this->afterCommit();
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * @param  array{
     *     eyebrow: string,
     *     title: string,
     *     intro: string,
     *     actionLabel: string,
     *     actionUrl: string,
     *     note: string
     * }  $content
     */
    protected function orderMail(string $subject, array $content): MailMessage
    {
        $order = $this->order->loadMissing(['manufacturer', 'items']);
        $messageData = [
            ...$content,
            'manufacturerName' => $order->manufacturer->name,
            'orderNumber' => '#'.str_pad((string) $order->id, 5, '0', STR_PAD_LEFT),
            'orderType' => $order->order_type->label(),
            'statusLabel' => $order->statusLabel(),
            'customerName' => $order->customer_name,
            'totalItems' => $order->totalItems(),
            'items' => $order->items->map(fn (OrderItem $item): array => [
                'name' => $item->product_name,
                'sku' => $item->product_sku,
                'quantity' => $item->quantity,
                'variations' => $this->variationLabel($item),
                'lineTotal' => $item->unit_price !== null
                    ? $this->formatMoney((int) round((float) $item->unit_price * $item->quantity * 100))
                    : null,
            ])->values()->all(),
            'amountLabel' => $order->isQuote() ? 'Valor estimado' : 'Total',
            'amount' => $this->formatMoney($order->totalCents()),
            'showAmount' => ! $order->isQuote() || $order->totalCents() > 0,
        ];

        return (new MailMessage)
            ->subject($subject)
            ->view('emails.orders.message', $messageData)
            ->text('emails.orders.message-text', $messageData);
    }

    private function variationLabel(OrderItem $item): ?string
    {
        $variations = collect($item->selected_variations ?? [])
            ->map(fn (mixed $value, mixed $key): string => "{$key}: {$value}")
            ->values();

        if ($variations->isEmpty()) {
            $variations = collect([
                'Cor' => $item->color,
                'Tamanho' => $item->size,
            ])->filter()
                ->map(fn (mixed $value, mixed $key): string => "{$key}: {$value}")
                ->values();
        }

        return $variations->isEmpty() ? null : $variations->implode(' · ');
    }

    private function formatMoney(int $amountCents): string
    {
        return 'R$ '.number_format($amountCents / 100, 2, ',', '.');
    }
}
