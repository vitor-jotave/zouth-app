<?php

namespace App\Services;

use GdImage;
use InvalidArgumentException;
use Throwable;

class VariationTextureOptimizer
{
    public const MASTER_SIZE = 512;

    public const THUMBNAIL_SIZE = 128;

    public const MAX_MASTER_BYTES = 500_000;

    public const MAX_THUMBNAIL_BYTES = 40_000;

    private const MASTER_QUALITY = 80;

    private const THUMBNAIL_QUALITY = 68;

    private const MINIMUM_QUALITY = 20;

    private const QUALITY_STEP = 5;

    private const MAX_GD_PIXELS = 16_000_000;

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
            throw new InvalidArgumentException('A textura enviada está vazia.');
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
            $source->setOption('jpeg:size', '1800x1800');
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
            $master->cropThumbnailImage(self::MASTER_SIZE, self::MASTER_SIZE);

            $thumbnail = clone $master;
            $thumbnail->resizeImage(
                self::THUMBNAIL_SIZE,
                self::THUMBNAIL_SIZE,
                \Imagick::FILTER_LANCZOS,
                1,
            );

            return [
                'master_contents' => $this->encodeImagickWithinLimit(
                    $master,
                    self::MASTER_QUALITY,
                    self::MAX_MASTER_BYTES,
                ),
                'thumbnail_contents' => $this->encodeImagickWithinLimit(
                    $thumbnail,
                    self::THUMBNAIL_QUALITY,
                    self::MAX_THUMBNAIL_BYTES,
                ),
                'width' => $master->getImageWidth(),
                'height' => $master->getImageHeight(),
                'thumbnail_width' => $thumbnail->getImageWidth(),
                'thumbnail_height' => $thumbnail->getImageHeight(),
            ];
        } catch (InvalidArgumentException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            throw new InvalidArgumentException('Não foi possível processar a textura enviada.', 0, $exception);
        } finally {
            foreach ([$thumbnail, $master, $source] as $image) {
                if ($image instanceof \Imagick) {
                    $image->clear();
                    $image->destroy();
                }
            }
        }
    }

    private function encodeImagickWithinLimit(\Imagick $image, int $startingQuality, int $maxBytes): string
    {
        for ($quality = $startingQuality; $quality >= self::MINIMUM_QUALITY; $quality -= self::QUALITY_STEP) {
            $candidate = clone $image;

            try {
                $candidate->setImageFormat('webp');
                $candidate->setOption('webp:method', '6');
                $candidate->setImageCompressionQuality($quality);
                $candidate->stripImage();
                $encoded = $candidate->getImageBlob();
            } finally {
                $candidate->clear();
                $candidate->destroy();
            }

            if ($encoded !== '' && strlen($encoded) <= $maxBytes) {
                return $encoded;
            }
        }

        throw new InvalidArgumentException('Não foi possível reduzir a textura ao tamanho permitido.');
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
        if (! function_exists('imagewebp')) {
            throw new InvalidArgumentException('Este servidor não possui suporte para otimização em WebP.');
        }

        $size = @getimagesizefromstring($contents);

        if (! is_array($size) || ! isset($size[0], $size[1])) {
            throw new InvalidArgumentException('O arquivo enviado não é uma imagem válida.');
        }

        if ($size[0] * $size[1] > self::MAX_GD_PIXELS) {
            throw new InvalidArgumentException('A textura é grande demais para ser processada neste servidor.');
        }

        try {
            $source = @imagecreatefromstring($contents);
        } catch (Throwable $exception) {
            throw new InvalidArgumentException('Não foi possível abrir a textura enviada.', 0, $exception);
        }

        if (! $source instanceof GdImage) {
            throw new InvalidArgumentException('Não foi possível abrir a textura enviada.');
        }

        $master = $this->cropSquareWithGd($source, self::MASTER_SIZE);
        $thumbnail = $this->cropSquareWithGd($master, self::THUMBNAIL_SIZE);

        try {
            return [
                'master_contents' => $this->encodeGdWithinLimit(
                    $master,
                    self::MASTER_QUALITY,
                    self::MAX_MASTER_BYTES,
                ),
                'thumbnail_contents' => $this->encodeGdWithinLimit(
                    $thumbnail,
                    self::THUMBNAIL_QUALITY,
                    self::MAX_THUMBNAIL_BYTES,
                ),
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

    private function cropSquareWithGd(GdImage $source, int $targetSize): GdImage
    {
        $sourceWidth = imagesx($source);
        $sourceHeight = imagesy($source);
        $cropSize = min($sourceWidth, $sourceHeight);
        $sourceX = (int) floor(($sourceWidth - $cropSize) / 2);
        $sourceY = (int) floor(($sourceHeight - $cropSize) / 2);
        $target = imagecreatetruecolor($targetSize, $targetSize);

        if (! $target instanceof GdImage) {
            throw new InvalidArgumentException('Não foi possível redimensionar a textura enviada.');
        }

        $white = imagecolorallocate($target, 255, 255, 255);
        imagefilledrectangle($target, 0, 0, $targetSize, $targetSize, $white);
        imagecopyresampled(
            $target,
            $source,
            0,
            0,
            $sourceX,
            $sourceY,
            $targetSize,
            $targetSize,
            $cropSize,
            $cropSize,
        );

        return $target;
    }

    private function encodeGdWithinLimit(GdImage $image, int $startingQuality, int $maxBytes): string
    {
        for ($quality = $startingQuality; $quality >= self::MINIMUM_QUALITY; $quality -= self::QUALITY_STEP) {
            ob_start();
            $encodedSuccessfully = imagewebp($image, null, $quality);
            $encoded = ob_get_clean();

            if (
                $encodedSuccessfully
                && is_string($encoded)
                && $encoded !== ''
                && strlen($encoded) <= $maxBytes
            ) {
                return $encoded;
            }
        }

        throw new InvalidArgumentException('Não foi possível reduzir a textura ao tamanho permitido.');
    }
}
