<?php

it('exposes liveness and readiness endpoints', function () {
    $this->get('/up')->assertSuccessful();
    $this->get('/health/live')
        ->assertSuccessful()
        ->assertJson(['status' => 'ok']);
    $this->get('/health/ready')
        ->assertSuccessful()
        ->assertJson([
            'status' => 'ok',
            'checks' => ['database' => true, 'cache' => true],
        ]);
});
