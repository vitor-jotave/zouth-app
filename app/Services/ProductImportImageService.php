<?php

namespace App\Services;

use App\Enums\ProductMediaType;
use App\Models\Product;
use App\Models\ProductImport;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Psr\Http\Message\ResponseInterface;
use RuntimeException;
use ZipArchive;

class ProductImportImageService
{
    private const MAX_IMAGE_BYTES = 5_242_880;

    private const MAX_ARCHIVE_ENTRIES = 1_000;

    private const MAX_ARCHIVE_UNCOMPRESSED_BYTES = 524_288_000;

    public function __construct(private readonly ProductImageOptimizer $optimizer) {}

    /**
     * @param  array<string, list<string>>  $imageUrlsBySku
     * @return array{manifest: array<string, list<array<string, int|string>>>, errors: list<string>, total_bytes: int}
     */
    public function stage(ProductImport $productImport, array $imageUrlsBySku): array
    {
        $directory = "product-imports/{$productImport->id}/staged";
        Storage::disk('local')->deleteDirectory($directory);
        $manifest = [];
        $errors = [];
        $totalBytes = 0;
        $existingImageCounts = Product::query()
            ->where('manufacturer_id', $productImport->manufacturer_id)
            ->whereIn('sku', array_keys($imageUrlsBySku))
            ->withCount(['media as image_count' => fn ($query) => $query->where('type', ProductMediaType::Image->value)])
            ->pluck('image_count', 'sku');

        foreach ($imageUrlsBySku as $sku => $urls) {
            foreach (array_values(array_unique($urls)) as $index => $url) {
                try {
                    $contents = $this->download($url);
                    $staged = $this->storeOptimized($directory, $sku, 'url-'.($index + 1), $contents);
                    $manifest[$sku][] = $staged;
                    $totalBytes += $staged['file_size_bytes'] + $staged['thumbnail_size_bytes'];
                } catch (\Throwable $exception) {
                    $errors[] = "{$sku}: não foi possível preparar a imagem {$url}. {$exception->getMessage()}";
                }
            }
        }

        if ($productImport->image_archive_path) {
            $archiveResult = $this->stageArchive(
                $productImport,
                $directory,
                array_keys($imageUrlsBySku),
                $manifest,
            );
            $manifest = $archiveResult['manifest'];
            $errors = [...$errors, ...$archiveResult['errors']];
            $totalBytes += $archiveResult['total_bytes'];
        }

        foreach ($manifest as $sku => $images) {
            $currentCount = (int) ($existingImageCounts[$sku] ?? 0);

            if ($currentCount + count($images) > 10) {
                $errors[] = "{$sku}: o produto ultrapassaria o limite de 10 imagens.";
            }
        }

        return [
            'manifest' => $manifest,
            'errors' => array_values(array_unique($errors)),
            'total_bytes' => $totalBytes,
        ];
    }

    /**
     * @param  list<string>  $skus
     * @param  array<string, list<array<string, int|string>>>  $manifest
     * @return array{manifest: array<string, list<array<string, int|string>>>, errors: list<string>, total_bytes: int}
     */
    private function stageArchive(ProductImport $productImport, string $directory, array $skus, array $manifest): array
    {
        $archivePath = Storage::disk('local')->path($productImport->image_archive_path);
        $archive = new ZipArchive;
        $errors = [];
        $totalBytes = 0;

        if ($archive->open($archivePath) !== true) {
            return [
                'manifest' => $manifest,
                'errors' => ['O pacote de imagens não pôde ser aberto.'],
                'total_bytes' => 0,
            ];
        }

        try {
            if ($archive->numFiles > self::MAX_ARCHIVE_ENTRIES) {
                throw new RuntimeException('O pacote pode conter no máximo 1.000 arquivos.');
            }

            $uncompressedBytes = 0;
            $normalizedSkus = collect($skus)
                ->mapWithKeys(fn (string $sku): array => [$this->fileKey($sku) => $sku])
                ->sortKeysDesc();

            for ($index = 0; $index < $archive->numFiles; $index++) {
                $stat = $archive->statIndex($index);
                $name = (string) ($stat['name'] ?? '');
                $size = (int) ($stat['size'] ?? 0);
                $uncompressedBytes += $size;

                if ($uncompressedBytes > self::MAX_ARCHIVE_UNCOMPRESSED_BYTES) {
                    throw new RuntimeException('O conteúdo descompactado ultrapassa 500 MB.');
                }

                if ($name === '' || str_ends_with($name, '/') || $size === 0) {
                    continue;
                }

                if ($this->unsafeArchivePath($name)) {
                    throw new RuntimeException('O pacote contém um caminho de arquivo inseguro.');
                }

                if ($size > self::MAX_IMAGE_BYTES) {
                    $errors[] = basename($name).': a imagem ultrapassa 5 MB.';

                    continue;
                }

                $extension = Str::lower(pathinfo($name, PATHINFO_EXTENSION));

                if (! in_array($extension, ['jpg', 'jpeg', 'png', 'webp'], true)) {
                    continue;
                }

                $baseName = $this->fileKey(pathinfo($name, PATHINFO_FILENAME));
                $sku = $normalizedSkus->first(
                    fn (string $_sku, string $key): bool => $baseName === $key || preg_match('/^'.preg_quote($key, '/').'-[0-9]+$/', $baseName) === 1,
                );

                if (! is_string($sku)) {
                    continue;
                }

                $contents = $archive->getFromIndex($index);

                if (! is_string($contents)) {
                    $errors[] = basename($name).': não foi possível ler a imagem.';

                    continue;
                }

                try {
                    $staged = $this->storeOptimized($directory, $sku, 'zip-'.($index + 1), $contents);
                    $manifest[$sku][] = $staged;
                    $totalBytes += $staged['file_size_bytes'] + $staged['thumbnail_size_bytes'];
                } catch (\Throwable $exception) {
                    $errors[] = basename($name).': '.$exception->getMessage();
                }
            }
        } catch (\Throwable $exception) {
            $errors[] = $exception->getMessage();
        } finally {
            $archive->close();
        }

        return [
            'manifest' => $manifest,
            'errors' => $errors,
            'total_bytes' => $totalBytes,
        ];
    }

    /**
     * @return array<string, int|string>
     */
    private function storeOptimized(string $directory, string $sku, string $key, string $contents): array
    {
        if (strlen($contents) > self::MAX_IMAGE_BYTES) {
            throw new RuntimeException('A imagem ultrapassa 5 MB.');
        }

        $optimized = $this->optimizer->optimize($contents);
        $safeSku = $this->fileKey($sku);
        $masterPath = "{$directory}/{$safeSku}-{$key}-master.jpg";
        $thumbnailPath = "{$directory}/{$safeSku}-{$key}-thumbnail.jpg";
        Storage::disk('local')->put($masterPath, $optimized['master_contents']);
        Storage::disk('local')->put($thumbnailPath, $optimized['thumbnail_contents']);

        return [
            'master_path' => $masterPath,
            'thumbnail_path' => $thumbnailPath,
            'file_size_bytes' => strlen($optimized['master_contents']),
            'thumbnail_size_bytes' => strlen($optimized['thumbnail_contents']),
            'width' => $optimized['width'],
            'height' => $optimized['height'],
            'thumbnail_width' => $optimized['thumbnail_width'],
            'thumbnail_height' => $optimized['thumbnail_height'],
        ];
    }

    private function download(string $url): string
    {
        $currentUrl = $url;

        for ($redirects = 0; $redirects <= 3; $redirects++) {
            $target = $this->publicUrlTarget($currentUrl);
            $response = Http::timeout(15)
                ->connectTimeout(5)
                ->withOptions([
                    'allow_redirects' => false,
                    'curl' => [
                        CURLOPT_RESOLVE => ["{$target['host']}:{$target['port']}:{$target['ip']}"],
                        CURLOPT_PROXY => '',
                        CURLOPT_NOPROXY => '*',
                    ],
                    'on_headers' => function (ResponseInterface $response): void {
                        $contentLength = $response->getHeaderLine('Content-Length');

                        if (is_numeric($contentLength) && (int) $contentLength > self::MAX_IMAGE_BYTES) {
                            throw new RuntimeException('A imagem ultrapassa 5 MB.');
                        }
                    },
                    'progress' => function (
                        int $_downloadTotal,
                        int $downloadedBytes,
                        int $_uploadTotal,
                        int $_uploadedBytes,
                    ): void {
                        if ($downloadedBytes > self::MAX_IMAGE_BYTES) {
                            throw new RuntimeException('A imagem ultrapassa 5 MB.');
                        }
                    },
                ])
                ->get($currentUrl);

            if ($response->redirect()) {
                $location = $response->header('Location');

                if (! is_string($location) || ! str_starts_with($location, 'http')) {
                    throw new RuntimeException('O redirecionamento da imagem não é válido.');
                }

                $currentUrl = $location;

                continue;
            }

            $this->assertImageResponse($response);

            return $response->body();
        }

        throw new RuntimeException('A imagem fez redirecionamentos demais.');
    }

    /** @return array{host: string, ip: string, port: int} */
    private function publicUrlTarget(string $url): array
    {
        $parts = parse_url($url);

        if (! filter_var($url, FILTER_VALIDATE_URL)
            || ! in_array($parts['scheme'] ?? null, ['http', 'https'], true)
            || empty($parts['host'])) {
            throw new RuntimeException('A URL não é válida.');
        }

        $host = (string) $parts['host'];
        $port = isset($parts['port'])
            ? (int) $parts['port']
            : (($parts['scheme'] ?? null) === 'https' ? 443 : 80);

        if ($port < 1 || $port > 65_535) {
            throw new RuntimeException('A porta da URL de imagem não é válida.');
        }

        $addresses = filter_var($host, FILTER_VALIDATE_IP) ? [$host] : (gethostbynamel($host) ?: []);

        if ($addresses === []) {
            throw new RuntimeException('O endereço da imagem não pôde ser localizado.');
        }

        foreach ($addresses as $address) {
            if (filter_var($address, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
                throw new RuntimeException('Endereços internos não podem ser usados como imagem.');
            }
        }

        return [
            'host' => $host,
            'ip' => $addresses[0],
            'port' => $port,
        ];
    }

    private function assertImageResponse(Response $response): void
    {
        if (! $response->successful()) {
            throw new RuntimeException('O servidor da imagem recusou o acesso.');
        }

        if (strlen($response->body()) > self::MAX_IMAGE_BYTES) {
            throw new RuntimeException('A imagem ultrapassa 5 MB.');
        }

        if (@getimagesizefromstring($response->body()) === false) {
            throw new RuntimeException('O arquivo recebido não é uma imagem válida.');
        }
    }

    private function unsafeArchivePath(string $path): bool
    {
        return str_starts_with($path, '/')
            || str_starts_with($path, '\\')
            || preg_match('/(^|[\\\\\/])\.\.([\\\\\/]|$)/', $path) === 1;
    }

    private function fileKey(string $value): string
    {
        return trim(Str::lower(Str::ascii($value))) === ''
            ? 'produto'
            : (string) preg_replace('/[^a-z0-9]+/', '-', Str::lower(Str::ascii($value)));
    }
}
