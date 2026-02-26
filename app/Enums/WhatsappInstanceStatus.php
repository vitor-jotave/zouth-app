<?php

namespace App\Enums;

enum WhatsappInstanceStatus: string
{
    case Disconnected = 'disconnected';
    case Connecting = 'connecting';
    case Connected = 'connected';

    public function label(): string
    {
        return match ($this) {
            self::Disconnected => 'Desconectado',
            self::Connecting => 'Conectando',
            self::Connected => 'Conectado',
        };
    }
}
