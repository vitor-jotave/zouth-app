<?php

namespace App\Enums;

enum WhatsappMessageStatus: string
{
    case Pending = 'pending';
    case Sent = 'sent';
    case Delivered = 'delivered';
    case Read = 'read';
    case Error = 'error';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Pendente',
            self::Sent => 'Enviado',
            self::Delivered => 'Entregue',
            self::Read => 'Lido',
            self::Error => 'Erro',
        };
    }
}
