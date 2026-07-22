<?php

namespace App\Console\Commands;

use App\Enums\ProductImportStatus;
use App\Models\ProductImport;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class PurgeExpiredProductImportFiles extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:purge-expired-product-import-files';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Remove arquivos privados de importações vencidas, preservando o histórico resumido';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $purged = 0;

        ProductImport::query()
            ->withTrashed()
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->whereNull('options->files_purged_at')
            ->chunkById(100, function ($imports) use (&$purged): void {
                foreach ($imports as $productImport) {
                    Storage::disk('local')->deleteDirectory(dirname($productImport->source_path));
                    $options = $productImport->options ?? [];
                    $options['files_purged_at'] = now()->toIso8601String();
                    $updates = [
                        'options' => $options,
                        'image_archive_path' => null,
                    ];

                    if (! $productImport->status->isTerminal()) {
                        $updates['status'] = ProductImportStatus::Cancelled;
                        $updates['error_message'] = 'Os arquivos venceram antes da conclusão desta importação.';
                    }

                    $productImport->update($updates);
                    $purged++;
                }
            });

        $this->components->info("{$purged} importações tiveram seus arquivos temporários removidos.");

        return self::SUCCESS;
    }
}
