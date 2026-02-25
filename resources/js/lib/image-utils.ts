import type { PixelCrop } from 'react-image-crop';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const INITIAL_QUALITY = 0.92;
const MIN_QUALITY = 0.5;
const QUALITY_STEP = 0.05;
const RESIZE_FACTOR = 0.8;

/**
 * Draw the cropped region of an image onto a new canvas.
 * `backgroundColor` fills the canvas before drawing — important for PNGs with
 * transparency, since JPEG output doesn't support alpha channels.
 * `scale` controls zoom: >1 = zoom in (handled via crop coords), <1 = zoom out
 * (image is centred on a larger canvas padded with backgroundColor).
 */
export function cropToCanvas(
    image: HTMLImageElement,
    crop: PixelCrop,
    backgroundColor: string = '#ffffff',
    scale: number = 1,
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Could not get canvas 2d context');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Natural pixel dimensions of the cropped area
    const srcW = Math.floor(crop.width * scaleX);
    const srcH = Math.floor(crop.height * scaleY);

    if (scale >= 1) {
        // Zoom in (or 100%): canvas = cropped area
        canvas.width = srcW;
        canvas.height = srcH;
    } else {
        // Zoom out: canvas is larger — image will be centred with padding
        canvas.width = Math.floor(srcW / scale);
        canvas.height = Math.floor(srcH / scale);
    }

    console.debug('[cropToCanvas]', {
        naturalSize: `${image.naturalWidth}x${image.naturalHeight}`,
        renderedSize: `${image.width}x${image.height}`,
        scale,
        crop,
        srcSize: `${srcW}x${srcH}`,
        canvasSize: `${canvas.width}x${canvas.height}`,
        backgroundColor,
    });

    if (canvas.width === 0 || canvas.height === 0) {
        console.error('[cropToCanvas] Canvas tem dimensão zero — crop inválido!', crop);
    }

    ctx.imageSmoothingQuality = 'high';

    // Fill background before drawing so transparent / padded areas use the chosen color
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (scale >= 1) {
        // Draw the cropped portion filling the entire canvas
        ctx.drawImage(
            image,
            crop.x * scaleX,
            crop.y * scaleY,
            srcW,
            srcH,
            0,
            0,
            srcW,
            srcH,
        );
    } else {
        // Draw the cropped portion centred on the larger canvas
        const dx = Math.floor((canvas.width - srcW) / 2);
        const dy = Math.floor((canvas.height - srcH) / 2);

        ctx.drawImage(
            image,
            crop.x * scaleX,
            crop.y * scaleY,
            srcW,
            srcH,
            dx,
            dy,
            srcW,
            srcH,
        );
    }

    return canvas;
}

/**
 * Convert a canvas to a JPEG blob, reducing quality iteratively until
 * the result fits within `maxSizeBytes`. If quality alone doesn't suffice,
 * the canvas is resized down proportionally.
 */
export async function compressCanvas(
    source: HTMLCanvasElement,
    maxSizeBytes: number = MAX_FILE_SIZE,
): Promise<Blob> {
    let canvas = source;
    let quality = INITIAL_QUALITY;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const blob = await canvasToBlob(canvas, 'image/jpeg', quality);

        if (blob.size <= maxSizeBytes) {
            return blob;
        }

        if (quality > MIN_QUALITY) {
            quality = Math.max(quality - QUALITY_STEP, MIN_QUALITY);
            continue;
        }

        // Quality is already at minimum — resize the canvas down
        canvas = resizeCanvas(canvas, RESIZE_FACTOR);
        quality = INITIAL_QUALITY;
    }
}

/**
 * Full pipeline: crop an image using a PixelCrop, compress to ≤ maxSize,
 * and return a File object ready for upload.
 */
export async function cropAndCompress(
    image: HTMLImageElement,
    crop: PixelCrop,
    fileName: string,
    options: { maxSizeBytes?: number; backgroundColor?: string; scale?: number } = {},
): Promise<File> {
    const {
        maxSizeBytes = MAX_FILE_SIZE,
        backgroundColor = '#ffffff',
        scale = 1,
    } = options;
    const canvas = cropToCanvas(image, crop, backgroundColor, scale);
    const blob = await compressCanvas(canvas, maxSizeBytes);

    // Preserve original name stem, always .jpg extension
    const stem = fileName.replace(/\.[^.]+$/, '');

    return new File([blob], `${stem}.jpg`, { type: 'image/jpeg' });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string,
    quality: number,
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Canvas toBlob returned null'));
                }
            },
            type,
            quality,
        );
    });
}

function resizeCanvas(
    source: HTMLCanvasElement,
    factor: number,
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(source.width * factor);
    canvas.height = Math.floor(source.height * factor);

    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('Could not get canvas 2d context');
    }

    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    return canvas;
}
