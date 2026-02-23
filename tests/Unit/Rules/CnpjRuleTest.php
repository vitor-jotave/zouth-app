<?php

use App\Rules\Cnpj;

/**
 * Returns true if the Cnpj rule passes for the given value.
 */
function cnpjPasses(string $value): bool
{
    $failed = false;
    (new Cnpj)->validate('cnpj', $value, function () use (&$failed) {
        $failed = true;
    });

    return ! $failed;
}

it('passes for a valid CNPJ with digits only', function () {
    expect(cnpjPasses('11222333000181'))->toBeTrue();
});

it('passes for a valid CNPJ with formatting', function () {
    expect(cnpjPasses('11.222.333/0001-81'))->toBeTrue();
});

it('fails for a CNPJ with all same digits', function () {
    expect(cnpjPasses('11111111111111'))->toBeFalse();
    expect(cnpjPasses('00000000000000'))->toBeFalse();
});

it('fails for a CNPJ with wrong check digits', function () {
    expect(cnpjPasses('11222333000199'))->toBeFalse();
});

it('fails for a CNPJ shorter than 14 digits', function () {
    expect(cnpjPasses('1122233300018'))->toBeFalse();
});

it('fails for an empty string', function () {
    expect(cnpjPasses(''))->toBeFalse();
});

it('passes for another known valid CNPJ', function () {
    // 07.526.557/0001-00
    expect(cnpjPasses('07526557000100'))->toBeTrue();
});
