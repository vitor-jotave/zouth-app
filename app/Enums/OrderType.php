<?php

namespace App\Enums;

enum OrderType: string
{
    case Standard = 'standard';
    case Quote = 'quote';

    public function label(): string
    {
        return match ($this) {
            self::Standard => 'Pedido',
            self::Quote => 'Orçamento',
        };
    }
}
