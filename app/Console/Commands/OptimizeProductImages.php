<?php

namespace App\Console\Commands;

use App\Enums\ProductMediaType;
use App\Models\ProductMedia;
use App\Services\ProductImageOptimizer;
use App\Services\ProductImageStorage;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Number;
use Throwable;

class OptimizeProductImages extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:optimize-product-images
                            {--product= : Optimize images from a single product}
                            {--force : Reprocess images that are already optimized}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create lightweight masters and thumbnails for product images';

    public function __construct(
        private readonly ProductImageOptimizer $imageOptimizer,
        private readonly ProductImageStorage $imageStorage,
    ) {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $query = ProductMedia::query()
            ->with('product')
            ->where('type', ProductMediaType::Image->value)
            ->orderBy('id');

        if ($productId = $this->option('product')) {
            $query->where('product_id', (int) $productId);
        }

        if (! $this->option('force')) {
            $query->whereNull('optimized_at');
        }

        $mediaItems = $query->get();

        if ($mediaItems->isEmpty()) {
            $this->info('Nenhuma imagem precisa ser otimizada.');

            return self::SUCCESS;
        }

        $disk = Storage::disk('s3');
        $optimizedCache = [];
        $beforeBytes = 0;
        $afterBytes = 0;
        $optimizedCount = 0;
        $failedCount = 0;
        $progress = $this->output->createProgressBar($mediaItems->count());
        $progress->start();

        foreach ($mediaItems as $media) {
            $newPaths = [];

            try {
                if (! $disk->exists($media->path)) {
                    throw new \RuntimeException("Arquivo não encontrado: {$media->path}");
                }

                if (! isset($optimizedCache[$media->path])) {
                    $optimizedCache[$media->path] = $this->imageOptimizer->optimize(
                        $disk->get($media->path),
                    );
                }

                $attributes = $this->imageStorage->storeOptimized(
                    $media->product,
                    $optimizedCache[$media->path],
                );
                $newPaths = [$attributes['path'], $attributes['thumbnail_path']];
                $beforeBytes += $media->file_size_bytes
                    ?? strlen($optimizedCache[$media->path]['master_contents']);
                $afterBytes += $attributes['file_size_bytes'];
                $media->update($attributes);
                $optimizedCount++;
            } catch (Throwable $exception) {
                if ($newPaths !== []) {
                    $disk->delete($newPaths);
                }

                $failedCount++;
                $this->newLine();
                $this->warn("Mídia {$media->id}: {$exception->getMessage()}");
            } finally {
                $progress->advance();
            }
        }

        $progress->finish();
        $this->newLine(2);
        $this->info("{$optimizedCount} imagem(ns) otimizada(s).");
        $this->line('Masters: '.Number::fileSize($beforeBytes).' → '.Number::fileSize($afterBytes));

        if ($failedCount > 0) {
            $this->warn("{$failedCount} imagem(ns) não puderam ser processadas.");

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
