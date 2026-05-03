<?php

namespace App\Services;

use App\Enums\ProductMediaType;
use App\Models\CatalogSetting;
use App\Models\Manufacturer;
use App\Models\Product;
use App\Models\ProductMedia;
use GdImage;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class ProductCatalogPdfService
{
    private const PAGE_WIDTH = 1240;

    private const PAGE_HEIGHT = 1754;

    private const MARGIN = 80;

    private const PRODUCTS_PER_PAGE = 4;

    /**
     * @param  Collection<int, Product>  $products
     * @param  array{include_photo: bool, include_price: bool, include_description: bool, include_sku: bool}  $options
     * @return array{path: string, url: string, file_name: string}
     */
    public function generate(Manufacturer $manufacturer, Collection $products, array $options): array
    {
        $catalogSetting = $manufacturer->catalogSetting()->first();
        $brandName = $catalogSetting?->brand_name ?: $manufacturer->name;
        $pagePaths = [];

        foreach ($products->values()->chunk(self::PRODUCTS_PER_PAGE) as $pageIndex => $pageProducts) {
            $pagePaths[] = $this->renderPage($manufacturer, $catalogSetting, $brandName, $pageProducts, $options, $pageIndex);
        }

        $pdfContent = $this->buildPdfFromJpegs($pagePaths);
        $fileName = 'catalogo-produtos-'.Str::slug($brandName).'-'.now()->format('Ymd-His').'-'.Str::lower(Str::random(6)).'.pdf';
        $path = 'whatsapp-product-catalogs/'.$fileName;

        Storage::disk('public')->put($path, $pdfContent);

        foreach ($pagePaths as $pagePath) {
            @unlink($pagePath);
        }

        return [
            'path' => $path,
            'url' => Storage::disk('public')->url($path),
            'file_name' => $fileName,
        ];
    }

    /**
     * @param  Collection<int, Product>  $products
     * @param  array{include_photo: bool, include_price: bool, include_description: bool, include_sku: bool}  $options
     */
    private function renderPage(
        Manufacturer $manufacturer,
        ?CatalogSetting $catalogSetting,
        string $brandName,
        Collection $products,
        array $options,
        int $pageIndex
    ): string {
        $image = imagecreatetruecolor(self::PAGE_WIDTH, self::PAGE_HEIGHT);
        imagefill($image, 0, 0, $this->color($image, '#FFFFFF'));

        $primaryColor = $catalogSetting?->primary_color ?: '#0F766E';
        $secondaryColor = $catalogSetting?->secondary_color ?: '#0F172A';

        imagefilledrectangle($image, 0, 0, self::PAGE_WIDTH, 170, $this->color($image, '#F8FAFC'));
        $this->drawLogo($image, $catalogSetting, self::MARGIN, 48);
        $this->drawText($image, $brandName, 30, 260, 68, $secondaryColor, true);
        $this->drawText($image, 'Produtos selecionados para atendimento', 18, 260, 105, '#64748B');

        $startY = 220;
        $cardHeight = 330;

        foreach ($products->values() as $index => $product) {
            $this->drawProduct($image, $product, $options, self::MARGIN, $startY + ($index * ($cardHeight + 24)), self::PAGE_WIDTH - (self::MARGIN * 2), $cardHeight, $primaryColor, $secondaryColor);
        }

        $this->drawText($image, 'Gerado em '.now()->format('d/m/Y H:i').' - '.$manufacturer->name, 13, self::MARGIN, self::PAGE_HEIGHT - 45, '#94A3B8');
        $this->drawText($image, 'Página '.($pageIndex + 1), 13, self::PAGE_WIDTH - 150, self::PAGE_HEIGHT - 45, '#94A3B8');

        $directory = storage_path('app/private/whatsapp-product-catalog-pages');
        File::ensureDirectoryExists($directory);
        $path = $directory.'/'.Str::uuid()->toString().'.jpg';

        imagejpeg($image, $path, 92);
        imagedestroy($image);

        return $path;
    }

    /**
     * @param  array{include_photo: bool, include_price: bool, include_description: bool, include_sku: bool}  $options
     */
    private function drawProduct(GdImage $image, Product $product, array $options, int $x, int $y, int $width, int $height, string $primaryColor, string $secondaryColor): void
    {
        imagefilledrectangle($image, $x, $y, $x + $width, $y + $height, $this->color($image, '#FFFFFF'));
        imagerectangle($image, $x, $y, $x + $width, $y + $height, $this->color($image, '#E2E8F0'));

        $textX = $x + 36;

        if ($options['include_photo']) {
            $media = $this->primaryImage($product);

            if ($media) {
                $productImage = $this->imageFromStorage('s3', $media->path);

                if ($productImage) {
                    $this->drawFittedImage($image, $productImage, $x + 28, $y + 32, 250, 250);
                    imagedestroy($productImage);
                } else {
                    $this->drawImagePlaceholder($image, $x + 28, $y + 32, 250, 250);
                }
            } else {
                $this->drawImagePlaceholder($image, $x + 28, $y + 32, 250, 250);
            }

            $textX = $x + 315;
        }

        $currentY = $y + 50;
        $this->drawWrappedText($image, $product->name, 24, $textX, $currentY, $width - ($textX - $x) - 36, $secondaryColor, true, 2);
        $currentY += 72;

        if ($options['include_price'] && $product->price_cents !== null) {
            imagefilledrectangle($image, $textX, $currentY - 24, $textX + 190, $currentY + 18, $this->color($image, '#ECFDF5'));
            $this->drawText($image, $this->formatPrice($product->price_cents), 18, $textX + 16, $currentY + 5, $primaryColor, true);
            $currentY += 58;
        }

        if ($options['include_sku'] && filled($product->sku)) {
            $this->drawText($image, 'SKU: '.$product->sku, 15, $textX, $currentY, '#64748B');
            $currentY += 34;
        }

        if ($options['include_description'] && filled($product->description)) {
            $this->drawWrappedText($image, (string) $product->description, 16, $textX, $currentY, $width - ($textX - $x) - 36, '#334155', false, 4);
        }
    }

    private function drawLogo(GdImage $image, ?CatalogSetting $catalogSetting, int $x, int $y): void
    {
        $logo = $catalogSetting?->logo_path ? $this->imageFromStorage('public', $catalogSetting->logo_path) : null;

        if ($logo) {
            $this->drawFittedImage($image, $logo, $x, $y, 140, 70);
            imagedestroy($logo);

            return;
        }

        imagefilledrectangle($image, $x, $y, $x + 140, $y + 70, $this->color($image, '#0F172A'));
        $this->drawText($image, 'Zouth', 22, $x + 24, $y + 44, '#FFFFFF', true);
    }

    private function drawImagePlaceholder(GdImage $image, int $x, int $y, int $width, int $height): void
    {
        imagefilledrectangle($image, $x, $y, $x + $width, $y + $height, $this->color($image, '#F1F5F9'));
        imagerectangle($image, $x, $y, $x + $width, $y + $height, $this->color($image, '#CBD5E1'));
        $this->drawText($image, 'Sem foto', 15, $x + 78, $y + 132, '#64748B');
    }

    private function drawFittedImage(GdImage $canvas, GdImage $source, int $x, int $y, int $width, int $height): void
    {
        $sourceWidth = imagesx($source);
        $sourceHeight = imagesy($source);
        $ratio = min($width / $sourceWidth, $height / $sourceHeight);
        $targetWidth = (int) round($sourceWidth * $ratio);
        $targetHeight = (int) round($sourceHeight * $ratio);
        $targetX = $x + (int) floor(($width - $targetWidth) / 2);
        $targetY = $y + (int) floor(($height - $targetHeight) / 2);

        imagefilledrectangle($canvas, $x, $y, $x + $width, $y + $height, $this->color($canvas, '#F8FAFC'));
        imagecopyresampled($canvas, $source, $targetX, $targetY, 0, 0, $targetWidth, $targetHeight, $sourceWidth, $sourceHeight);
    }

    private function imageFromStorage(string $disk, string $path): ?GdImage
    {
        try {
            $storage = Storage::disk($disk);

            if (! $storage->exists($path)) {
                return null;
            }

            $contents = $storage->get($path);
        } catch (Throwable) {
            return null;
        }

        $size = @getimagesizefromstring($contents);

        if (is_array($size) && (($size[0] ?? 0) * ($size[1] ?? 0)) > 8_000_000) {
            return $this->resizedImageFromContents($contents);
        }

        try {
            $image = @imagecreatefromstring($contents);
        } catch (Throwable) {
            return null;
        }

        return $image instanceof GdImage ? $image : null;
    }

    private function resizedImageFromContents(string $contents): ?GdImage
    {
        if (! class_exists(\Imagick::class)) {
            return null;
        }

        try {
            $image = new \Imagick;
            $image->readImageBlob($contents);
            $image->setImageFormat('jpeg');
            $image->thumbnailImage(900, 900, true, true);

            $resized = @imagecreatefromstring($image->getImagesBlob());
            $image->clear();
            $image->destroy();

            return $resized instanceof GdImage ? $resized : null;
        } catch (Throwable) {
            return null;
        }
    }

    private function primaryImage(Product $product): ?ProductMedia
    {
        return $product->media
            ->first(fn (ProductMedia $media) => $media->type === ProductMediaType::Image);
    }

    private function drawWrappedText(GdImage $image, string $text, int $size, int $x, int $y, int $maxWidth, string $color, bool $bold = false, int $maxLines = 3): void
    {
        $lines = $this->wrapText($text, $size, $maxWidth, $bold);

        foreach (array_slice($lines, 0, $maxLines) as $index => $line) {
            $this->drawText($image, $line, $size, $x, $y + ($index * ($size + 12)), $color, $bold);
        }
    }

    /**
     * @return array<int, string>
     */
    private function wrapText(string $text, int $size, int $maxWidth, bool $bold = false): array
    {
        $words = preg_split('/\s+/', trim($text)) ?: [];
        $lines = [];
        $current = '';

        foreach ($words as $word) {
            $candidate = trim($current.' '.$word);

            if ($this->textWidth($candidate, $size, $bold) <= $maxWidth || $current === '') {
                $current = $candidate;

                continue;
            }

            $lines[] = $current;
            $current = $word;
        }

        if ($current !== '') {
            $lines[] = $current;
        }

        return $lines;
    }

    private function drawText(GdImage $image, string $text, int $size, int $x, int $y, string $color, bool $bold = false): void
    {
        $font = $this->fontPath($bold);

        if ($font) {
            imagettftext($image, $size, 0, $x, $y, $this->color($image, $color), $font, $text);

            return;
        }

        imagestring($image, 5, $x, $y - 16, $text, $this->color($image, $color));
    }

    private function textWidth(string $text, int $size, bool $bold = false): int
    {
        $font = $this->fontPath($bold);

        if (! $font) {
            return strlen($text) * 10;
        }

        $box = imagettfbbox($size, 0, $font, $text);

        return abs($box[2] - $box[0]);
    }

    private function fontPath(bool $bold = false): ?string
    {
        $paths = $bold
            ? [
                '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
                '/Library/Fonts/Arial Bold.ttf',
            ]
            : [
                '/System/Library/Fonts/Supplemental/Arial.ttf',
                '/Library/Fonts/Arial.ttf',
                '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
            ];

        foreach ($paths as $path) {
            if (is_file($path)) {
                return $path;
            }
        }

        return null;
    }

    private function color(GdImage $image, string $hex): int
    {
        $hex = ltrim($hex, '#');

        return imagecolorallocate(
            $image,
            hexdec(substr($hex, 0, 2)),
            hexdec(substr($hex, 2, 2)),
            hexdec(substr($hex, 4, 2)),
        );
    }

    /**
     * @param  array<int, string>  $jpegPaths
     */
    private function buildPdfFromJpegs(array $jpegPaths): string
    {
        $objects = [];
        $pageObjectIds = [];
        $nextObjectId = 3;

        foreach ($jpegPaths as $index => $jpegPath) {
            [$width, $height] = getimagesize($jpegPath);
            $jpegData = file_get_contents($jpegPath);
            $imageObjectId = $nextObjectId++;
            $contentObjectId = $nextObjectId++;
            $pageObjectId = $nextObjectId++;
            $imageName = 'Im'.($index + 1);
            $content = "q\n{$width} 0 0 {$height} 0 0 cm\n/{$imageName} Do\nQ";

            $objects[$imageObjectId] = "<< /Type /XObject /Subtype /Image /Width {$width} /Height {$height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ".strlen($jpegData)." >>\nstream\n{$jpegData}\nendstream";
            $objects[$contentObjectId] = '<< /Length '.strlen($content)." >>\nstream\n{$content}\nendstream";
            $objects[$pageObjectId] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {$width} {$height}] /Resources << /XObject << /{$imageName} {$imageObjectId} 0 R >> >> /Contents {$contentObjectId} 0 R >>";
            $pageObjectIds[] = $pageObjectId;
        }

        $objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
        $objects[2] = '<< /Type /Pages /Count '.count($pageObjectIds).' /Kids ['.implode(' ', array_map(fn (int $id) => "{$id} 0 R", $pageObjectIds)).'] >>';
        ksort($objects);

        $pdf = "%PDF-1.4\n";
        $offsets = [0 => 0];

        foreach ($objects as $id => $object) {
            $offsets[$id] = strlen($pdf);
            $pdf .= "{$id} 0 obj\n{$object}\nendobj\n";
        }

        $xrefOffset = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n";
        $pdf .= "0000000000 65535 f \n";

        for ($id = 1; $id <= count($objects); $id++) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$id]);
        }

        $pdf .= "trailer\n<< /Size ".(count($objects) + 1)." /Root 1 0 R >>\nstartxref\n{$xrefOffset}\n%%EOF";

        return $pdf;
    }

    private function formatPrice(int $priceCents): string
    {
        return 'R$ '.number_format($priceCents / 100, 2, ',', '.');
    }
}
