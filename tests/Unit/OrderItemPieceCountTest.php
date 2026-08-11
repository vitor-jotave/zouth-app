<?php

use App\Models\OrderItem;

it('counts a regular order line by its selected quantity', function () {
    $item = new OrderItem([
        'quantity' => 3,
        'combo_components' => null,
    ]);

    expect($item->totalPieces())->toBe(3);
});

it('counts every physical piece inside all selected combo compositions', function () {
    $item = new OrderItem([
        'quantity' => 2,
        'combo_components' => [
            ['product_id' => 10, 'quantity' => 1],
            ['product_id' => 20, 'quantity' => 2],
        ],
    ]);

    expect($item->totalPieces())->toBe(6);
});

it('falls back to the line quantity for an incomplete historical combo snapshot', function () {
    $item = new OrderItem([
        'quantity' => 2,
        'combo_components' => [
            ['product_id' => 10],
        ],
    ]);

    expect($item->totalPieces())->toBe(2);
});
