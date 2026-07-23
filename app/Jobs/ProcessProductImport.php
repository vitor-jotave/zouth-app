<?php

namespace App\Jobs;

use App\Enums\ProductImportStatus;
use App\Models\ProductImport;
use App\Notifications\ProductImportFinishedNotification;
use App\Services\ProductImportExecutionService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\WithoutOverlapping;
use Illuminate\Support\Facades\Log;
use Throwable;

class ProcessProductImport implements ShouldQueue
{
    use Queueable;

    public int $tries = 2;

    public int $timeout = 1800;

    public function __construct(public ProductImport $productImport) {}

    /** @return list<object> */
    public function middleware(): array
    {
        return [
            (new WithoutOverlapping('product-import-manufacturer-'.$this->productImport->manufacturer_id))
                ->releaseAfter(30)
                ->expireAfter(1800),
        ];
    }

    /**
     * Execute the job.
     */
    public function handle(ProductImportExecutionService $execution): void
    {
        $execution->execute($this->productImport);
    }

    public function failed(?Throwable $exception): void
    {
        $this->productImport->update([
            'status' => ProductImportStatus::Failed,
            'error_message' => $exception?->getMessage() ?? 'Não foi possível concluir a importação.',
        ]);

        $this->productImport->loadMissing('user');

        if ($this->productImport->user?->hasVerifiedEmail()) {
            try {
                $this->productImport->user->notify(
                    new ProductImportFinishedNotification($this->productImport->refresh()),
                );
            } catch (Throwable $notificationException) {
                Log::error('Could not queue failed product import notification.', [
                    'product_import_id' => $this->productImport->id,
                    'exception' => $notificationException,
                ]);
            }
        }
    }
}
