<?php

use App\Models\CatalogVisit;

it('anonymizes technical visit data after the retention period', function () {
    config(['privacy.catalog_visit_retention_days' => 90]);

    $oldVisit = CatalogVisit::factory()->create([
        'ip_address' => '203.0.113.10',
        'user_agent' => 'Old Browser',
        'referer' => 'https://example.com/customer-source',
        'utm_source' => 'campaign',
        'visited_at' => now()->subDays(91),
    ]);
    $recentVisit = CatalogVisit::factory()->create([
        'ip_address' => '203.0.113.11',
        'user_agent' => 'Current Browser',
        'referer' => 'https://example.com/current-source',
        'visited_at' => now()->subDays(89),
    ]);

    $this->artisan('app:anonymize-catalog-visits')
        ->expectsOutput('1 visita(s) anonimizada(s).')
        ->assertSuccessful();

    expect($oldVisit->fresh())
        ->ip_address->toBeNull()
        ->user_agent->toBeNull()
        ->referer->toBeNull()
        ->utm_source->toBe('campaign')
        ->and($recentVisit->fresh())
        ->ip_address->toBe('203.0.113.11')
        ->user_agent->toBe('Current Browser')
        ->referer->toBe('https://example.com/current-source');
});

it('rejects an invalid retention override', function () {
    $this->artisan('app:anonymize-catalog-visits', ['--days' => 0])
        ->expectsOutputToContain('O periodo de retencao deve ser de pelo menos 1 dia.')
        ->assertFailed();
});
