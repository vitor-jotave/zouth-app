import { CloudUpload } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ImageDropzoneProps {
    onFilesSelected: (files: File[]) => void;
    maxFiles?: number;
    currentCount?: number;
    disabled?: boolean;
    className?: string;
}

export function ImageDropzone({
    onFilesSelected,
    maxFiles = 10,
    currentCount = 0,
    disabled = false,
    className,
}: ImageDropzoneProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const remaining = maxFiles - currentCount;

    const handleFiles = useCallback(
        (fileList: FileList | null) => {
            if (!fileList || disabled) return;

            const files = Array.from(fileList).filter((f) =>
                f.type.startsWith('image/'),
            );

            if (files.length === 0) return;

            const limited = files.slice(0, Math.max(remaining, 0));
            onFilesSelected(limited);

            if (inputRef.current) {
                inputRef.current.value = '';
            }
        },
        [disabled, remaining, onFilesSelected],
    );

    const handleDragOver = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            if (!disabled) setIsDragOver(true);
        },
        [disabled],
    );

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setIsDragOver(false);
            handleFiles(e.dataTransfer.files);
        },
        [handleFiles],
    );

    const handleClick = useCallback(() => {
        if (!disabled) inputRef.current?.click();
    }, [disabled]);

    return (
        <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            onClick={handleClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                }
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
                'group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition-colors',
                isDragOver
                    ? 'border-primary bg-primary/5'
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
                disabled && 'pointer-events-none opacity-50',
                className,
            )}
        >
            <div
                className={cn(
                    'flex size-12 items-center justify-center rounded-full transition-colors',
                    isDragOver
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary',
                )}
            >
                <CloudUpload className="size-6" />
            </div>

            <div className="text-center">
                <p className="text-sm font-medium">
                    {isDragOver ? (
                        'Solte as imagens aqui'
                    ) : (
                        <>
                            Arraste imagens aqui ou{' '}
                            <span className="text-primary underline underline-offset-2">
                                clique para selecionar
                            </span>
                        </>
                    )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                    PNG, JPG ou WebP &bull; Máx. {maxFiles} fotos
                    {currentCount > 0 && (
                        <> &bull; {remaining} restante{remaining !== 1 && 's'}</>
                    )}
                </p>
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={disabled}
                onChange={(e) => handleFiles(e.target.files)}
            />
        </div>
    );
}
