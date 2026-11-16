<?php

namespace App\Services;

use App\Enums\ProductMediaType;
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

    private const A4_WIDTH_POINTS = 595.28;

    private const A4_HEIGHT_POINTS = 841.89;

    private const MARGIN = 112;

    private const CHARCOAL = '#18181F';

    private const MUTED = '#4C4B52';

    private const RULE = '#B9B6B2';

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

        $pages = $products->values()->chunk($options['include_photo'] ? 2 : 5);
        try {
            foreach ($pages as $pageIndex => $pageProducts) {
                $pagePaths[] = $this->renderPage($brandName, $pageProducts, $options, $products->count(), $pageIndex + 1, $pages->count());
            }

            $pdfContent = $this->buildPdfFromJpegs($pagePaths);
        } finally {
            foreach ($pagePaths as $pagePath) {
                @unlink($pagePath);
            }
        }
        $fileName = 'catalogo-produtos-'.Str::slug($brandName).'-'.now()->format('Ymd-His').'-'.Str::lower(Str::random(6)).'.pdf';
        $path = 'whatsapp-product-catalogs/'.$fileName;
        $disk = $this->catalogMediaDisk();

        Storage::disk($disk)->put($path, $pdfContent, [
            'ContentType' => 'application/pdf',
        ]);

        return [
            'path' => $path,
            'url' => Storage::disk($disk)->url($path),
            'file_name' => $fileName,
        ];
    }

    /**
     * @param  Collection<int, Product>  $products
     * @param  array{include_photo: bool, include_price: bool, include_description: bool, include_sku: bool}  $options
     */
    private function renderPage(
        string $brandName,
        Collection $products,
        array $options,
        int $productCount,
        int $page,
        int $pageCount
    ): string {
        $image = imagecreatetruecolor(self::PAGE_WIDTH, self::PAGE_HEIGHT);
        imagefill($image, 0, 0, $this->color($image, '#FFFFFF'));

        $right = self::PAGE_WIDTH - self::MARGIN;
        $this->drawLogo($image, self::MARGIN, 99);
        $this->drawRightText($image, $this->fitText(mb_strtoupper($brandName), 25, 560, true), 25, $right, 137, self::CHARCOAL, true);
        $this->drawRule($image, 182);
        $this->drawText($image, 'Seleção de peças', 51, self::MARGIN, 309, self::CHARCOAL, true);
        $this->drawText($image, 'Atacado · '.$productCount.($productCount === 1 ? ' peça' : ' peças'), 27, self::MARGIN, 366, self::MUTED);

        $rowHeight = $options['include_photo'] ? 595 : 237;
        foreach ($products->values() as $index => $product) {
            $rowTop = 421 + ($index * $rowHeight);
            if ($index > 0) {
                $this->drawRule($image, $rowTop - 20);
            }
            $this->drawProduct($image, $product, $options, $rowTop);
        }

        $this->drawRule($image, 1608);
        $this->drawText($image, $this->fitText($brandName, 22, 760), 22, self::MARGIN, 1659, self::MUTED);
        $this->drawRightText($image, sprintf('%02d / %02d', $page, $pageCount), 22, $right, 1659, self::MUTED);

        $directory = storage_path('app/private/whatsapp-product-catalog-pages');
        File::ensureDirectoryExists($directory);
        $path = $directory.'/'.Str::uuid()->toString().'.jpg';

        imagejpeg($image, $path, 92);
        unset($image);

        return $path;
    }

    /**
     * @param  array{include_photo: bool, include_price: bool, include_description: bool, include_sku: bool}  $options
     */
    private function drawProduct(GdImage $image, Product $product, array $options, int $y): void
    {
        $textX = self::MARGIN;
        $right = self::PAGE_WIDTH - self::MARGIN;

        if ($options['include_photo']) {
            $media = $this->primaryImage($product);
            $productImage = $media ? $this->imageFromStorage('s3', $media->path) : null;
            if ($productImage) {
                $this->drawFittedImage($image, $productImage, self::MARGIN, $y, 315, 534);
            } else {
                $this->drawImagePlaceholder($image, self::MARGIN, $y, 315, 534);
            }

            $textX += 350;
        }

        $currentY = $y + ($options['include_photo'] ? 85 : 47);
        $price = $options['include_price'] && $product->price_cents !== null ? $this->formatPrice($product->price_cents) : null;
        $priceWidth = $price === null ? 0 : $this->textWidth($price, 26, true) + 26;
        $nameLines = $options['include_photo'] ? 2 : 1;
        $currentY += $this->drawWrappedText($image, $product->name, 32, $textX, $currentY, $right - $textX - $priceWidth, self::CHARCOAL, true, $nameLines) * 44;
        if ($price !== null) {
            $this->drawRightText($image, $price, 26, $right, $y + ($options['include_photo'] ? 85 : 47), self::CHARCOAL, true);
        }

        if ($options['include_sku'] && filled($product->sku)) {
            $this->drawText($image, $this->fitText('REF. '.$product->sku, 23, $right - $textX), 23, $textX, $currentY, self::MUTED);
            $currentY += 48;
        }

        if ($options['include_description'] && filled($product->description)) {
            $this->drawWrappedText($image, (string) $product->description, 23, $textX, $currentY + 12, $right - $textX, self::MUTED, false, $options['include_photo'] ? 7 : 2);
        }
    }

    private function drawLogo(GdImage $image, int $x, int $y): void
    {
        $logo = imagecreatefrompng(public_path('brand/zouth/assets/logo-duotone-dark.png'));
        imagecopyresampled($image, $logo, $x, $y, 0, 0, 218, 38, imagesx($logo), imagesy($logo));
    }

    private function drawRule(GdImage $image, int $y): void
    {
        imageline($image, self::MARGIN, $y, self::PAGE_WIDTH - self::MARGIN, $y, $this->color($image, self::RULE));
    }

    private function drawRightText(GdImage $image, string $text, int $size, int $right, int $baseline, string $color, bool $bold = false): void
    {
        $this->drawText($image, $text, $size, $right - $this->textWidth($text, $size, $bold), $baseline, $color, $bold);
    }

    private function catalogMediaDisk(): string
    {
        return (string) config('filesystems.catalog_media_disk', 'public');
    }

    private function drawImagePlaceholder(GdImage $image, int $x, int $y, int $width, int $height): void
    {
        imagefilledrectangle($image, $x, $y, $x + $width - 1, $y + $height - 1, $this->color($image, '#F6F4F0'));
        $label = 'Sem foto';
        $this->drawText($image, $label, 19, $x + intdiv($width - $this->textWidth($label, 19), 2), $y + intdiv($height, 2), self::MUTED);
    }

    private function drawFittedImage(GdImage $canvas, GdImage $source, int $x, int $y, int $width, int $height): void
    {
        $sourceWidth = imagesx($source);
        $sourceHeight = imagesy($source);
        $fitRatio = min($width / $sourceWidth, $height / $sourceHeight);
        $fillRatio = max($width / $sourceWidth, $height / $sourceHeight);
        if ($fitRatio / $fillRatio >= 0.73) {
            $cropWidth = (int) round($width / $fillRatio);
            $cropHeight = (int) round($height / $fillRatio);
            imagecopyresampled($canvas, $source, $x, $y, intdiv($sourceWidth - $cropWidth, 2), intdiv($sourceHeight - $cropHeight, 2), $width, $height, $cropWidth, $cropHeight);

            return;
        }

        $targetWidth = (int) round($sourceWidth * $fitRatio);
        $targetHeight = (int) round($sourceHeight * $fitRatio);
        $targetX = $x + (int) floor(($width - $targetWidth) / 2);
        $targetY = $y + (int) floor(($height - $targetHeight) / 2);

        imagefilledrectangle($canvas, $x, $y, $x + $width - 1, $y + $height - 1, $this->color($canvas, '#F6F4F0'));
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

    private function drawWrappedText(GdImage $image, string $text, int $size, int $x, int $y, int $maxWidth, string $color, bool $bold = false, int $maxLines = 3): int
    {
        $lines = $this->wrapText($text, $size, $maxWidth, $bold);
        $visible = array_slice($lines, 0, $maxLines);

        foreach ($visible as $index => $line) {
            $suffix = $index === $maxLines - 1 && count($lines) > $maxLines ? '…' : '';
            $this->drawText($image, $this->fitText($line.$suffix, $size, $maxWidth, $bold), $size, $x, $y + ($index * ($size + 12)), $color, $bold);
        }

        return count($visible);
    }

    private function fitText(string $text, int $size, int $maxWidth, bool $bold = false): string
    {
        if ($this->textWidth($text, $size, $bold) <= $maxWidth) {
            return $text;
        }

        $left = 0;
        $right = mb_strlen($text);
        while ($left < $right) {
            $length = intdiv($left + $right + 1, 2);
            if ($this->textWidth(rtrim(mb_substr($text, 0, $length)).'…', $size, $bold) <= $maxWidth) {
                $left = $length;
            } else {
                $right = $length - 1;
            }
        }

        return rtrim(mb_substr($text, 0, $left)).'…';
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
            $ink = $this->color($image, $color);
            imagettftext($image, $size, 0, $x, $y, $ink, $font, $text);
            imagettftext($image, $size, 0, $x + 1, $y, $ink, $font, $text);
            if ($bold) {
                imagettftext($image, $size, 0, $x, $y + 1, $ink, $font, $text);
                imagettftext($image, $size, 0, $x + 1, $y + 1, $ink, $font, $text);
            }

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

        return abs($box[2] - $box[0]) + 1;
    }

    private function fontPath(bool $bold = false): ?string
    {
        $paths = $bold
            ? [
                public_path('brand/zouth/assets/sora-variable.ttf'),
                '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
                '/Library/Fonts/Arial Bold.ttf',
            ]
            : [
                public_path('brand/zouth/assets/manrope-variable.ttf'),
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
        $pageWidth = self::A4_WIDTH_POINTS;
        $pageHeight = self::A4_HEIGHT_POINTS;

        foreach ($jpegPaths as $index => $jpegPath) {
            [$width, $height] = getimagesize($jpegPath);
            $jpegData = file_get_contents($jpegPath);
            $imageObjectId = $nextObjectId++;
            $contentObjectId = $nextObjectId++;
            $pageObjectId = $nextObjectId++;
            $imageName = 'Im'.($index + 1);
            $content = "q\n{$pageWidth} 0 0 {$pageHeight} 0 0 cm\n/{$imageName} Do\nQ";

            $objects[$imageObjectId] = "<< /Type /XObject /Subtype /Image /Width {$width} /Height {$height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ".strlen($jpegData)." >>\nstream\n{$jpegData}\nendstream";
            $objects[$contentObjectId] = '<< /Length '.strlen($content)." >>\nstream\n{$content}\nendstream";
            $objects[$pageObjectId] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {$pageWidth} {$pageHeight}] /Resources << /XObject << /{$imageName} {$imageObjectId} 0 R >> >> /Contents {$contentObjectId} 0 R >>";
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
