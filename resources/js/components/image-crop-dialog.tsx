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

const ASPECT_RATIO = 4 / 5;

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
}

function createInitialCrop(width: number, height: number): Crop {
    return centerCrop(
        makeAspectCrop({ unit: '%', width: 90 }, ASPECT_RATIO, width, height),
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
}: ImageCropDialogProps) {
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [processing, setProcessing] = useState(false);
    const [scale, setScale] = useState(1);
    const [bgColor, setBgColor] = useState('#ffffff');
    const imgRef = useRef<HTMLImageElement>(null);

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
        prevScaleRef.current = 1;
    }, [imageFile]);

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
            const initial = createInitialCrop(width, height);
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
        [],
    );

    const handleConfirm = useCallback(async () => {
        if (!imgRef.current || !completedCrop || !imageFile) return;

        setProcessing(true);

        try {
            const file = await cropAndCompress(
                imgRef.current,
                completedCrop,
                imageFile.name,
                { backgroundColor: bgColor, scale },
            );

            onCropped(file);
        } catch {
            onCropped(imageFile);
        } finally {
            setProcessing(false);
        }
    }, [completedCrop, imageFile, bgColor, onCropped]);

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
                    <DialogTitle>Ajustar imagem</DialogTitle>
                    <DialogDescription>
                        Enquadre a imagem no formato 4:5. Use o zoom para
                        ampliar e escolha a cor de fundo para áreas
                        transparentes.
                    </DialogDescription>
                </DialogHeader>

                {/* Crop area — overflow-hidden para conter a imagem com zoom */}
                {imageUrl && (
                    <div
                        className="flex items-start justify-center overflow-hidden rounded-md p-2"
                        style={{ backgroundColor: bgColor }}
                    >
                        <ReactCrop
                            crop={crop}
                            onChange={(_, percentCrop) => setCrop(percentCrop)}
                            onComplete={(c) => setCompletedCrop(c)}
                            aspect={ASPECT_RATIO}
                            scale={scale}
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
                        <Label className="text-xs">
                            Cor de fundo (para transparências)
                        </Label>
                        <div className="flex flex-wrap items-center gap-2">
                            {BG_PRESETS.map((preset) => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    title={preset.label}
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
                                value={bgColor}
                                onChange={(e) => setBgColor(e.target.value)}
                                title="Cor personalizada"
                                className="size-8 cursor-pointer rounded-md border border-input p-0.5"
                            />

                            <span className="font-mono text-xs text-muted-foreground">
                                {bgColor}
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
