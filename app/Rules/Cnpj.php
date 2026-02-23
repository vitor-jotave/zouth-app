<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class Cnpj implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $cnpj = preg_replace('/\D/', '', (string) $value);

        if (strlen($cnpj) !== 14) {
            $fail('O :attribute deve conter 14 dígitos.');

            return;
        }

        // Reject sequences of identical digits
        if (preg_match('/^(\d)\1{13}$/', $cnpj)) {
            $fail('O :attribute informado é inválido.');

            return;
        }

        $digits = array_map('intval', str_split($cnpj));

        // First check digit
        $weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        $sum1 = 0;

        for ($i = 0; $i < 12; $i++) {
            $sum1 += $digits[$i] * $weights1[$i];
        }

        $remainder1 = $sum1 % 11;
        $expected1 = $remainder1 < 2 ? 0 : 11 - $remainder1;

        if ($digits[12] !== $expected1) {
            $fail('O :attribute informado é inválido.');

            return;
        }

        // Second check digit
        $weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        $sum2 = 0;

        for ($i = 0; $i < 13; $i++) {
            $sum2 += $digits[$i] * $weights2[$i];
        }

        $remainder2 = $sum2 % 11;
        $expected2 = $remainder2 < 2 ? 0 : 11 - $remainder2;

        if ($digits[13] !== $expected2) {
            $fail('O :attribute informado é inválido.');
        }
    }
}
