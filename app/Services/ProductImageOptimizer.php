<?php

namespace App\Services;

use GdImage;
use InvalidArgumentException;
use Throwable;

class ProductImageOptimizer
{
    public const MASTER_MAX_EDGE = 2000;

    public const THUMBNAIL_MAX_EDGE = 640;

    private const MASTER_QUALITY = 84;

    private const THUMBNAIL_QUALITY = 80;

    private const MAX_GD_PIXELS = 12_000_000;

    /**
     * @return array{
     *     master_contents: string,
     *     thumbnail_contents: string,
     *     width: int,
     *     height: int,
     *     thumbnail_width: int,
     *     thumbnail_height: int
     * }
     */
    public function optimize(string $contents): array
    {
        if ($contents === '') {
            throw new InvalidArgumentException('A imagem enviada está vazia.');
        }

        if (class_exists(\Imagick::class)) {
            return $this->optimizeWithImagick($contents);
        }

        return $this->optimizeWithGd($contents);
    }

    /**
     * @return array{
     *     master_contents: string,
     *     thumbnail_contents: string,
     *     width: int,
     *     height: int,
     *     thumbnail_width: int,
     *     thumbnail_height: int
     * }
     */
    private function optimizeWithImagick(string $contents): array
    {
        $source = new \Imagick;
        $master = null;
        $thumbnail = null;

        try {
            $source->setOption('jpeg:size', '2400x2400');
            $source->readImageBlob($contents);
            $source->setIteratorIndex(0);

            if (method_exists($source, 'autoOrient')) {
                $source->autoOrient();
            } else {
                $source->autoOrientImage();
            }

            $source->setImageBackgroundColor('#ffffff');
            $master = $source->mergeImageLayers(\Imagick::LAYERMETHOD_FLATTEN);
            $master->setImagePage(0, 0, 0, 0);
            $master->thumbnailImage(self::MASTER_MAX_EDGE, self::MASTER_MAX_EDGE, true, false);

            $thumbnail = clone $master;
            $thumbnail->thumbnailImage(self::THUMBNAIL_MAX_EDGE, self::THUMBNAIL_MAX_EDGE, true, false);

            return [
                'master_contents' => $this->encodeImagick($master, self::MASTER_QUALITY),
                'thumbnail_contents' => $this->encodeImagick($thumbnail, self::THUMBNAIL_QUALITY),
                'width' => $master->getImageWidth(),
                'height' => $master->getImageHeight(),
                'thumbnail_width' => $thumbnail->getImageWidth(),
                'thumbnail_height' => $thumbnail->getImageHeight(),
            ];
        } catch (Throwable $exception) {
            throw new InvalidArgumentException('Não foi possível processar a imagem enviada.', 0, $exception);
        } finally {
            foreach ([$thumbnail, $master, $source] as $image) {
                if ($image instanceof \Imagick) {
                    $image->clear();
                    $image->destroy();
                }
            }
        }
    }

    private function encodeImagick(\Imagick $image, int $quality): string
    {
        $image->setImageFormat('jpeg');
        $image->setImageCompression(\Imagick::COMPRESSION_JPEG);
        $image->setImageCompressionQuality($quality);
        $image->setInterlaceScheme(\Imagick::INTERLACE_PLANE);
        $image->stripImage();

        return $image->getImageBlob();
    }

    /**
     * @return array{
     *     master_contents: string,
     *     thumbnail_contents: string,
     *     width: int,
     *     height: int,
     *     thumbnail_width: int,
     *     thumbnail_height: int
     * }
     */
    private function optimizeWithGd(string $contents): array
    {
        $size = @getimagesizefromstring($contents);

        if (! is_array($size) || ! isset($size[0], $size[1])) {
            throw new InvalidArgumentException('O arquivo enviado não é uma imagem válida.');
        }

        if ($size[0] * $size[1] > self::MAX_GD_PIXELS) {
            throw new InvalidArgumentException('A imagem é grande demais para ser processada neste servidor.');
        }

        try {
            $source = @imagecreatefromstring($contents);
        } catch (Throwable $exception) {
            throw new InvalidArgumentException('Não foi possível abrir a imagem enviada.', 0, $exception);
        }

        if (! $source instanceof GdImage) {
            throw new InvalidArgumentException('Não foi possível abrir a imagem enviada.');
        }

        $master = $this->resizeWithGd($source, self::MASTER_MAX_EDGE);
        $thumbnail = $this->resizeWithGd($master, self::THUMBNAIL_MAX_EDGE);

        try {
            return [
                'master_contents' => $this->encodeGd($master, self::MASTER_QUALITY),
                'thumbnail_contents' => $this->encodeGd($thumbnail, self::THUMBNAIL_QUALITY),
                'width' => imagesx($master),
                'height' => imagesy($master),
                'thumbnail_width' => imagesx($thumbnail),
                'thumbnail_height' => imagesy($thumbnail),
            ];
        } finally {
            imagedestroy($thumbnail);
            imagedestroy($master);
            imagedestroy($source);
        }
    }

    private function resizeWithGd(GdImage $source, int $maxEdge): GdImage
    {
        $sourceWidth = imagesx($source);
        $sourceHeight = imagesy($source);
        $ratio = min(1, $maxEdge / max($sourceWidth, $sourceHeight));
        $targetWidth = max(1, (int) round($sourceWidth * $ratio));
        $targetHeight = max(1, (int) round($sourceHeight * $ratio));
        $target = imagecreatetruecolor($targetWidth, $targetHeight);

        if (! $target instanceof GdImage) {
            throw new InvalidArgumentException('Não foi possível redimensionar a imagem enviada.');
        }

        $white = imagecolorallocate($target, 255, 255, 255);
        imagefilledrectangle($target, 0, 0, $targetWidth, $targetHeight, $white);
        imagecopyresampled(
            $target,
            $source,
            0,
            0,
            0,
            0,
            $targetWidth,
            $targetHeight,
            $sourceWidth,
            $sourceHeight,
        );

        return $target;
    }

    private function encodeGd(GdImage $image, int $quality): string
    {
        ob_start();
        imageinterlace($image, true);
        imagejpeg($image, null, $quality);
        $contents = ob_get_clean();

        if (! is_string($contents) || $contents === '') {
            throw new InvalidArgumentException('Não foi possível comprimir a imagem enviada.');
        }

        return $contents;
    }
}
