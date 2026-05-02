<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class Cpf implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $cpf = preg_replace('/\D/', '', (string) $value);

        if (strlen($cpf) !== 11) {
            $fail('O :attribute deve conter 11 dígitos.');

            return;
        }

        if (preg_match('/^(\d)\1{10}$/', $cpf)) {
            $fail('O :attribute informado é inválido.');

            return;
        }

        $digits = array_map('intval', str_split($cpf));

        $sum = 0;
        for ($i = 0; $i < 9; $i++) {
            $sum += $digits[$i] * (10 - $i);
        }

        $remainder = $sum % 11;
        $expectedFirst = $remainder < 2 ? 0 : 11 - $remainder;

        if ($digits[9] !== $expectedFirst) {
            $fail('O :attribute informado é inválido.');

            return;
        }

        $sum = 0;
        for ($i = 0; $i < 10; $i++) {
            $sum += $digits[$i] * (11 - $i);
        }

        $remainder = $sum % 11;
        $expectedSecond = $remainder < 2 ? 0 : 11 - $remainder;

        if ($digits[10] !== $expectedSecond) {
            $fail('O :attribute informado é inválido.');
        }
    }
}
