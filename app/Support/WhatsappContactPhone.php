<?php

declare(strict_types=1);

namespace App\Support;

final class WhatsappContactPhone
{
    public static function normalize(?string $phone): ?string
    {
        $phone = trim($phone ?? '');
        if (! preg_match('/^\+?[\d\s().-]+$/D', $phone)) {
            return null;
        }

        $digits = preg_replace('/\D/', '', $phone);

        if (! str_starts_with($phone, '+') && preg_match('/^[1-9][0-9][2-9][0-9]{7,8}$/D', $digits)) {
            return '55'.$digits;
        }

        if (! str_starts_with($phone, '+') && str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }

        return preg_match('/^[1-9][0-9]{10,14}$/D', $digits) ? $digits : null;
    }
}
