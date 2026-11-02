<?php

it('separates brand settings from catalog structure without changing the hero settings contract', function () {
    $editor = file_get_contents(resource_path('js/pages/manufacturer/catalog-settings/index.tsx'));
    $brandStart = strpos($editor, "if (activePanel === 'brand')");
    $heroStart = strpos($editor, "if (activePanel === 'hero')", $brandStart);
    $collectionsStart = strpos($editor, "if (activePanel === 'collections')", $heroStart);
    $brandPanel = substr($editor, $brandStart, $heroStart - $brandStart);
    $heroPanel = substr($editor, $heroStart, $collectionsStart - $heroStart);

    expect($brandPanel)
        ->toContain('Nome da marca')
        ->toContain('Exibição da marca')
        ->toContain('Tamanho da logo')
        ->toContain('Alinhamento da logo')
        ->toContain("'hero'")
        ->not->toContain('Imagem de campanha');
    expect($heroPanel)
        ->toContain('Imagem de campanha')
        ->toContain('Apresentação')
        ->not->toContain('Nome da marca')
        ->not->toContain('catalog-logo-file');
    expect($editor)
        ->toContain("selectPanel('brand')")
        ->toContain('panelErrorCounts.brand')
        ->toContain("activePanel === 'brand' ? 'hero' : activePanel");
});

it('aligns catalog structure labels and visibility controls in consistent single rows', function () {
    $editor = file_get_contents(resource_path('js/pages/manufacturer/catalog-settings/index.tsx'));

    expect($editor)
        ->toContain('group relative flex h-16 items-center')
        ->toContain('flex h-full min-w-0 flex-1 items-center gap-3 pl-4')
        ->toContain('flex shrink-0 items-center pr-2')
        ->not->toContain('min-h-[4.75rem]');
});

it('uses drag and drop instead of arrow controls to reorder catalog sections', function () {
    $editor = file_get_contents(resource_path('js/pages/manufacturer/catalog-settings/index.tsx'));

    expect($editor)
        ->toContain('draggable')
        ->toContain('handleSectionDrop(section.type)')
        ->not->toContain('const moveSection =')
        ->not->toContain('Mover ${meta.label} para cima')
        ->not->toContain('Mover ${meta.label} para baixo');
});

it('keeps catalog structure navigation free of secondary descriptions', function () {
    $editor = file_get_contents(resource_path('js/pages/manufacturer/catalog-settings/index.tsx'));

    expect($editor)
        ->not->toContain('{meta.description}')
        ->not->toContain('Arraste para mudar a ordem.')
        ->not->toContain('Cores, fonte e fundo')
        ->not->toContain('Link e interesse');
});

it('isolates preview zoom measurements from the scaled content and reserves scrollbar space', function () {
    $editor = file_get_contents(resource_path('js/pages/manufacturer/catalog-settings/index.tsx'));

    expect($editor)
        ->toContain('[scrollbar-gutter:stable]')
        ->toContain('observer.observe(viewportElement)')
        ->toContain('Math.floor(viewportEntry.contentRect.width)')
        ->toContain('relative mx-auto shrink-0 overflow-clip')
        ->not->toContain('observer.observe(stage)');
});

it('keeps catalog publication actions below the editing panels without the old display header', function () {
    $editor = file_get_contents(resource_path('js/pages/manufacturer/catalog-settings/index.tsx'));

    expect($editor)
        ->toContain('data-testid="catalog-studio-actions"')
        ->toContain('aria-label="Ações de publicação do catálogo"')
        ->toContain('form="catalog-studio-form"')
        ->not->toContain('Seu Catálogo')
        ->not->toContain('Catálogo digital');

    expect(strpos($editor, 'data-testid="catalog-studio-actions"'))
        ->toBeGreaterThan(strpos($editor, '</form>'));
});

it('collapses the catalog sidebar and preserves its restoration until leaving the editor', function () {
    $sidebar = file_get_contents(resource_path('js/components/app-sidebar.tsx'));

    expect($sidebar)
        ->toContain("icon: Palette,\n                collapseSidebarOnNavigate: true,")
        ->toContain("pathname === '/manufacturer/catalog-settings'")
        ->toContain('previousFocusedWorkspace.current === focusedWorkspace')
        ->toContain('setOpen(false)')
        ->toContain("setOpen(previousState === 'true')");

    expect(file_get_contents(resource_path('js/components/nav-main.tsx')))
        ->not->toContain('sessionStorage');
});

it('keeps the catalog workspace from scrolling when nested controls receive focus', function () {
    $editor = file_get_contents(resource_path('js/pages/manufacturer/catalog-settings/index.tsx'));

    expect($editor)
        ->toContain('min-h-0 flex-col overflow-clip')
        ->toContain('relative grid min-h-0 flex-1 grid-cols-1 overflow-clip')
        ->toContain('relative min-h-0 min-w-0 overflow-y-auto overscroll-contain')
        ->not->toContain('inspectorRef.current?.scrollIntoView(');
});

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
