<?php

namespace App\Jobs;

use App\Enums\ProductImportStatus;
use App\Models\ProductImport;
use App\Services\ProductImportPreviewService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class ValidateProductImport implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public function __construct(public ProductImport $productImport) {}

    /**
     * Execute the job.
     */
    public function handle(ProductImportPreviewService $preview): void
    {
        $preview->validate($this->productImport);
    }

    public function failed(?Throwable $exception): void
    {
        $this->productImport->update([
            'status' => ProductImportStatus::Failed,
            'error_message' => $exception?->getMessage() ?? 'Não foi possível conferir a planilha.',
            'progress' => 0,
        ]);
    }
}
