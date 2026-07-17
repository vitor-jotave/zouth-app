<?php

namespace App\Console\Commands;

use App\Models\CatalogVisit;
use Illuminate\Console\Command;

class AnonymizeCatalogVisits extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:anonymize-catalog-visits
                            {--days= : Override the configured retention period in days}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Anonymize technical visitor data after the configured retention period';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $days = (int) ($this->option('days') ?? config('privacy.catalog_visit_retention_days'));

        if ($days < 1) {
            $this->error('O periodo de retencao deve ser de pelo menos 1 dia.');

            return self::FAILURE;
        }

        $updated = CatalogVisit::query()
            ->where('visited_at', '<=', now()->subDays($days))
            ->where(function ($query) {
                $query->whereNotNull('ip_address')
                    ->orWhereNotNull('user_agent')
                    ->orWhereNotNull('referer');
            })
            ->update([
                'ip_address' => null,
                'user_agent' => null,
                'referer' => null,
            ]);

        $this->info("{$updated} visita(s) anonimizada(s).");

        return self::SUCCESS;
    }
}
