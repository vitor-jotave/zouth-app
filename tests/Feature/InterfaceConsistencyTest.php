<?php

it('uses natural Portuguese pluralization in customer-facing interfaces', function () {
    $files = [
        resource_path('js/components/catalog-preview.tsx'),
        resource_path('js/pages/public/catalog.tsx'),
        resource_path('js/pages/public/order-tracking.tsx'),
        resource_path('js/pages/rep/dashboard.tsx'),
    ];
    $content = collect($files)->map(fn (string $file): string => file_get_contents($file))->join("\n");

    expect($content)
        ->not->toContain('disponível(is)')
        ->not->toContain('unidade(s)')
        ->not->toContain('item(ns)')
        ->not->toContain('produto(s)');
});

it('localizes accessible dialog controls and welcome copy', function () {
    $dialog = file_get_contents(resource_path('js/components/ui/dialog.tsx'));
    $login = file_get_contents(resource_path('js/pages/auth/login.tsx'));
    $dashboard = file_get_contents(resource_path('js/pages/dashboard.tsx'));

    expect($dialog)
        ->toContain('<span className="sr-only">Fechar</span>')
        ->not->toContain('<span className="sr-only">Close</span>')
        ->and($login)
        ->toContain('Seja bem-vindo à Zouth!')
        ->toContain('Manter conectado')
        ->and($dashboard)
        ->toContain('Bem-vindo, {company.name}');
});

it('makes every kanban stage count grammatical and horizontal navigation explicit', function () {
    $orders = file_get_contents(resource_path('js/pages/manufacturer/orders/index.tsx'));

    expect($orders)
        ->toContain("stage.count === 1 ? 'pedido' : 'pedidos'")
        ->toContain('aria-label="Ver etapas anteriores"')
        ->toContain('aria-label="Ver próximas etapas"')
        ->toContain('aria-label="Fluxo de pedidos por etapa"')
        ->toContain('overflow-x-scroll');
});
