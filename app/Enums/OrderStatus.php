<?php

namespace App\Enums;

enum OrderStatus: string
{
    case New = 'new';
    case Confirmed = 'confirmed';
    case Preparing = 'preparing';
    case Shipped = 'shipped';
    case Delivered = 'delivered';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::New => 'Novo',
            self::Confirmed => 'Confirmado',
            self::Preparing => 'Em preparação',
            self::Shipped => 'Enviado',
            self::Delivered => 'Entregue',
            self::Cancelled => 'Cancelado',
        };
    }

    /**
     * @return array<int, self>
     */
    public function allowedTransitions(): array
    {
        return match ($this) {
            self::New => [
                self::Confirmed,
                self::Preparing,
                self::Shipped,
                self::Delivered,
                self::Cancelled,
            ],
            self::Confirmed => [
                self::New,
                self::Preparing,
                self::Shipped,
                self::Delivered,
                self::Cancelled,
            ],
            self::Preparing => [
                self::New,
                self::Confirmed,
                self::Shipped,
                self::Delivered,
                self::Cancelled,
            ],
            self::Shipped => [
                self::New,
                self::Confirmed,
                self::Preparing,
                self::Delivered,
                self::Cancelled,
            ],
            self::Delivered => [
                self::New,
                self::Confirmed,
                self::Preparing,
                self::Shipped,
            ],
            self::Cancelled => [],
        };
    }

    public function canTransitionTo(self $target): bool
    {
        return in_array($target, $this->allowedTransitions(), true);
    }
}
