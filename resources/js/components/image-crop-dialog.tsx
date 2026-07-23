import { Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactCrop, {
    centerCrop,
    makeAspectCrop,
    type Crop,
    type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cropAndCompress } from '@/lib/image-utils';
import { cn } from '@/lib/utils';

const DEFAULT_ASPECT_RATIO = 4 / 5;
const DEFAULT_DESCRIPTION =
    'Enquadre a imagem no formato 4:5. Use o zoom para ampliar e escolha a cor de fundo para áreas transparentes.';

const BG_PRESETS = [
    { label: 'Branco', value: '#ffffff' },
    { label: 'Cinza claro', value: '#f3f4f6' },
    { label: 'Cinza escuro', value: '#374151' },
    { label: 'Preto', value: '#000000' },
] as const;

interface ImageCropDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imageFile: File | null;
    onCropped: (croppedFile: File) => void;
    onSkip?: () => void;
    aspectRatio?: number | null;
    title?: string;
    description?: string;
    allowTransparentBackground?: boolean;
}

function createInitialCrop(
    width: number,
    height: number,
    aspectRatio: number | null,
): Crop {
    if (aspectRatio === null) {
        return centerCrop({ unit: '%', width: 90, height: 90 }, width, height);
    }

    return centerCrop(
        makeAspectCrop({ unit: '%', width: 90 }, aspectRatio, width, height),
        width,
        height,
    );
}

export function ImageCropDialog({
    open,
    onOpenChange,
    imageFile,
    onCropped,
    onSkip,
    aspectRatio = DEFAULT_ASPECT_RATIO,
    title = 'Ajustar imagem',
    description = DEFAULT_DESCRIPTION,
    allowTransparentBackground = false,
}: ImageCropDialogProps) {
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [processing, setProcessing] = useState(false);
    const [scale, setScale] = useState(1);
    const [bgColor, setBgColor] = useState<string | null>('#ffffff');
    const imgRef = useRef<HTMLImageElement>(null);
    const canUseTransparency =
        allowTransparentBackground &&
        imageFile !== null &&
        (imageFile.type === 'image/png' ||
            imageFile.type === 'image/webp' ||
            /\.(png|webp)$/i.test(imageFile.name));

    // Cria a blob URL uma única vez por arquivo e revoga quando o componente desmonta
    // ou o arquivo muda — evita recriar a URL a cada render e recarregar a imagem.
    const imageUrl = useMemo(() => {
        if (!imageFile) return null;
        return URL.createObjectURL(imageFile);
    }, [imageFile]);

    useEffect(() => {
        return () => {
            if (imageUrl) URL.revokeObjectURL(imageUrl);
        };
    }, [imageUrl]);

    const prevScaleRef = useRef(scale);

    // Reset state when a new image file is provided
    useEffect(() => {
        setScale(1);
        setBgColor(canUseTransparency ? null : '#ffffff');
        prevScaleRef.current = 1;
    }, [imageFile, canUseTransparency]);

    // When zoom changes, adjust the crop area proportionally so the
    // output actually reflects the zoom level (zoom in → smaller crop → more detail).
    useEffect(() => {
        const prev = prevScaleRef.current;
        prevScaleRef.current = scale;

        if (!crop || prev === scale || !imgRef.current) return;

        const ratio = prev / scale;

        let newWidth = crop.width * ratio;
        let newHeight = crop.height * ratio;

        // Cap to image bounds while preserving aspect
        if (newWidth > 100 || newHeight > 100) {
            const cap = Math.min(100 / newWidth, 100 / newHeight);
            newWidth *= cap;
            newHeight *= cap;
        }

        // Minimum visible size
        if (newWidth < 10 || newHeight < 10) {
            const min = Math.max(10 / newWidth, 10 / newHeight);
            newWidth *= min;
            newHeight *= min;
        }

        // Keep the crop centred on the same point
        const cx = crop.x + crop.width / 2;
        const cy = crop.y + crop.height / 2;
        let newX = cx - newWidth / 2;
        let newY = cy - newHeight / 2;
        newX = Math.max(0, Math.min(newX, 100 - newWidth));
        newY = Math.max(0, Math.min(newY, 100 - newHeight));

        const next: Crop = {
            unit: '%',
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
        };

        setCrop(next);

        // Sync completedCrop in pixels
        const { width, height } = imgRef.current;
        setCompletedCrop({
            unit: 'px',
            x: (newX / 100) * width,
            y: (newY / 100) * height,
            width: (newWidth / 100) * width,
            height: (newHeight / 100) * height,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scale]);

    const onImageLoad = useCallback(
        (e: React.SyntheticEvent<HTMLImageElement>) => {
            const { width, height } = e.currentTarget;
            const initial = createInitialCrop(width, height, aspectRatio);
            setCrop(initial);

            // Set initial completedCrop so "Confirmar" is enabled immediately
            if (initial.unit === '%') {
                setCompletedCrop({
                    unit: 'px',
                    x: (initial.x / 100) * width,
                    y: (initial.y / 100) * height,
                    width: (initial.width / 100) * width,
                    height: (initial.height / 100) * height,
                });
            }
        },
        [aspectRatio],
    );

    const handleConfirm = useCallback(async () => {
        if (!imgRef.current || !completedCrop || !imageFile) return;

        setProcessing(true);

        try {
            const file = await cropAndCompress(
                imgRef.current,
                completedCrop,
                imageFile.name,
                {
                    backgroundColor: bgColor,
                    scale,
                    preserveTransparency: bgColor === null,
                },
            );

            onCropped(file);
        } catch {
            onCropped(imageFile);
        } finally {
            setProcessing(false);
        }
    }, [completedCrop, imageFile, bgColor, scale, onCropped]);

    const handleCancel = useCallback(() => {
        setCrop(undefined);
        setCompletedCrop(undefined);
        setScale(1);

        if (onSkip) {
            onSkip();
        } else {
            onOpenChange(false);
        }
    }, [onSkip, onOpenChange]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                {/* Crop area — overflow-hidden para conter a imagem com zoom */}
                {imageUrl && (
                    <div
                        className="flex items-start justify-center overflow-hidden rounded-md p-2"
                        style={{
                            backgroundColor: bgColor ?? '#ffffff',
                            backgroundImage:
                                bgColor === null
                                    ? 'linear-gradient(45deg, #e2e0dc 25%, transparent 25%), linear-gradient(-45deg, #e2e0dc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e0dc 75%), linear-gradient(-45deg, transparent 75%, #e2e0dc 75%)'
                                    : undefined,
                            backgroundPosition:
                                bgColor === null
                                    ? '0 0, 0 8px, 8px -8px, -8px 0'
                                    : undefined,
                            backgroundSize:
                                bgColor === null ? '16px 16px' : undefined,
                        }}
                    >
                        <ReactCrop
                            crop={crop}
                            onChange={(_, percentCrop) => setCrop(percentCrop)}
                            onComplete={(c) => setCompletedCrop(c)}
                            aspect={aspectRatio ?? undefined}
                        >
                            <img
                                ref={imgRef}
                                src={imageUrl}
                                alt="Preview para corte"
                                onLoad={onImageLoad}
                                style={{
                                    maxHeight: '55vh',
                                    maxWidth: '100%',
                                    display: 'block',
                                    transform: `scale(${scale})`,
                                    transformOrigin: 'center',
                                }}
                            />
                        </ReactCrop>
                    </div>
                )}

                {/* Controls */}
                <div className="space-y-4 pt-1">
                    {/* Zoom */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs">Zoom</Label>
                            <span className="text-xs text-muted-foreground">
                                {Math.round(scale * 100)}%
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <ZoomOut className="size-4 shrink-0 text-muted-foreground" />
                            <Slider
                                min={50}
                                max={300}
                                step={5}
                                value={[Math.round(scale * 100)]}
                                onValueChange={([v]) => setScale(v / 100)}
                                className="flex-1"
                            />
                            <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
                        </div>
                    </div>

                    {/* Background color */}
                    <div className="space-y-2">
                        <Label className="text-xs">Fundo da imagem</Label>
                        <div className="flex flex-wrap items-center gap-2">
                            {canUseTransparency && (
                                <button
                                    type="button"
                                    title="Preservar transparência"
                                    aria-label="Preservar transparência"
                                    aria-pressed={bgColor === null}
                                    onClick={() => setBgColor(null)}
                                    className={cn(
                                        'relative size-8 overflow-hidden rounded-md border-2 transition-all',
                                        bgColor === null
                                            ? 'scale-110 border-primary shadow-md'
                                            : 'border-transparent hover:border-muted-foreground/50',
                                    )}
                                    style={{
                                        backgroundColor: '#ffffff',
                                        backgroundImage:
                                            'linear-gradient(45deg, #d7d4ce 25%, transparent 25%), linear-gradient(-45deg, #d7d4ce 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d7d4ce 75%), linear-gradient(-45deg, transparent 75%, #d7d4ce 75%)',
                                        backgroundPosition:
                                            '0 0, 0 6px, 6px -6px, -6px 0',
                                        backgroundSize: '12px 12px',
                                    }}
                                />
                            )}

                            {BG_PRESETS.map((preset) => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    title={preset.label}
                                    aria-label={`Usar fundo ${preset.label.toLocaleLowerCase('pt-BR')}`}
                                    aria-pressed={bgColor === preset.value}
                                    onClick={() => setBgColor(preset.value)}
                                    className={cn(
                                        'size-8 rounded-md border-2 transition-all',
                                        bgColor === preset.value
                                            ? 'scale-110 border-primary shadow-md'
                                            : 'border-transparent hover:border-muted-foreground/50',
                                    )}
                                    style={{ backgroundColor: preset.value }}
                                />
                            ))}

                            {/* Custom color picker */}
                            <input
                                type="color"
                                value={bgColor ?? '#ffffff'}
                                onChange={(e) => setBgColor(e.target.value)}
                                title="Cor personalizada"
                                aria-label="Escolher cor de fundo personalizada"
                                className="size-8 cursor-pointer rounded-md border border-input p-0.5"
                            />

                            <span className="font-mono text-xs text-muted-foreground">
                                {bgColor ?? 'Transparente'}
                            </span>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={processing}
                    >
                        Pular
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={processing || !completedCrop}
                    >
                        {processing && (
                            <Loader2 className="size-4 animate-spin" />
                        )}
                        {processing ? 'Processando...' : 'Confirmar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
