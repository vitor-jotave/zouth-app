import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    type DragEndEvent,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    rectSortingStrategy,
    sortableKeyboardCoordinates,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Film, Grip, ImagePlus, Loader2, Play, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ImageDropzone } from '@/components/image-dropzone';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EditorField, EditorSection } from './editor-section';
import type {
    ProductEditorErrors,
    ProductEditorMode,
    ProductMediaItem,
} from './types';

type ProductMediaStudioProps = {
    mode: ProductEditorMode;
    mediaItems: ProductMediaItem[];
    stagedImages: File[];
    videoUrl: string;
    maxImages: number;
    uploadingMedia: boolean;
    errors: ProductEditorErrors;
    onFilesSelected: (files: File[]) => void;
    onRemoveStagedImage: (index: number) => void;
    onVideoUrlChange: (url: string) => void;
    onReorder: (activeId: number, overId: number) => void;
    onDelete: (media: ProductMediaItem) => void;
};

function firstErrorStartingWith(
    errors: ProductEditorErrors,
    prefixes: string[],
): string | undefined {
    const entry = Object.entries(errors).find(
        ([key, value]) =>
            prefixes.some(
                (prefix) => key === prefix || key.startsWith(`${prefix}.`),
            ) && Boolean(value),
    );

    return entry?.[1];
}

function SortableMediaTile({
    media,
    index,
    onRequestDelete,
}: {
    media: ProductMediaItem;
    index: number;
    onRequestDelete: (media: ProductMediaItem) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: media.id });
    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
        zIndex: isDragging ? 30 : undefined,
    };

    return (
        <article
            ref={setNodeRef}
            style={style}
            className="group relative min-w-0 border border-border bg-[#e7e3dc]/45"
        >
            <div className="relative aspect-[4/5] overflow-hidden bg-[#e7e3dc]">
                {media.type === 'image' && media.url ? (
                    <img
                        src={media.thumbnail_url ?? media.url}
                        alt={`Foto ${index + 1} do produto`}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover"
                    />
                ) : media.type === 'video' ? (
                    <div className="flex size-full flex-col items-center justify-center gap-3 bg-[#18181f] text-[#f6f4f0]">
                        <span className="flex size-11 items-center justify-center rounded-full border border-[#f6f4f0]/35">
                            <Play className="size-4 fill-current" />
                        </span>
                        <span className="text-[0.65rem] font-bold tracking-[0.12em] uppercase">
                            Vídeo
                        </span>
                    </div>
                ) : (
                    <div className="flex size-full items-center justify-center text-muted-foreground">
                        <ImagePlus className="size-8" aria-hidden="true" />
                    </div>
                )}

                {index === 0 && media.type === 'image' && (
                    <span className="absolute top-2 left-2 bg-[#ff4d3d] px-2.5 py-1 text-[0.62rem] font-bold tracking-[0.1em] text-[#18181f] uppercase">
                        Capa
                    </span>
                )}

                <div className="absolute right-2 bottom-2 left-2 flex items-center justify-between gap-2 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                    <button
                        type="button"
                        aria-label={`Reordenar mídia ${index + 1}`}
                        className="flex size-11 cursor-grab touch-none items-center justify-center bg-[#18181f] text-[#f6f4f0] active:cursor-grabbing"
                        {...attributes}
                        {...listeners}
                    >
                        <Grip className="size-4" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        aria-label={`Remover mídia ${index + 1}`}
                        onClick={() => onRequestDelete(media)}
                        className="flex size-11 items-center justify-center bg-[#f6f4f0] text-[#b42318] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]"
                    >
                        <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                </div>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-[0.68rem] font-semibold text-muted-foreground">
                <span>
                    {media.type === 'image' ? `Foto ${index + 1}` : 'Vídeo'}
                </span>
                <span className="tabular-nums">{index + 1}</span>
            </div>
        </article>
    );
}

export function ProductMediaStudio({
    mode,
    mediaItems,
    stagedImages,
    videoUrl,
    maxImages,
    uploadingMedia,
    errors,
    onFilesSelected,
    onRemoveStagedImage,
    onVideoUrlChange,
    onReorder,
    onDelete,
}: ProductMediaStudioProps) {
    const [mediaToDelete, setMediaToDelete] = useState<ProductMediaItem | null>(
        null,
    );
    const stagedImageUrls = useMemo(
        () => stagedImages.map((file) => URL.createObjectURL(file)),
        [stagedImages],
    );
    const existingImageCount = mediaItems.filter(
        (media) => media.type === 'image',
    ).length;
    const imageCount =
        mode === 'create' ? stagedImages.length : existingImageCount;
    const imageError = firstErrorStartingWith(errors, ['images', 'files']);
    const videoError = firstErrorStartingWith(errors, ['video_url']);
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    useEffect(() => {
        return () => {
            stagedImageUrls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [stagedImageUrls]);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) {
            return;
        }

        onReorder(Number(active.id), Number(over.id));
    };

    return (
        <>
            <EditorSection
                id="images"
                eyebrow="04 · Imagens e vídeo"
                title="A vitrine começa pela primeira foto."
                description="Escolha a capa, organize o ritmo da galeria e mostre os detalhes que ajudam o lojista a decidir."
                marker={
                    <span className="inline-flex min-h-8 items-center gap-2 bg-[#e7e3dc] px-3 text-[0.68rem] font-bold tracking-[0.08em] text-foreground uppercase">
                        <Film className="size-3.5" aria-hidden="true" />
                        {imageCount}/{maxImages} fotos
                    </span>
                }
            >
                <div className="space-y-7">
                    {mode === 'edit' && mediaItems.length > 0 && (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={mediaItems.map((media) => media.id)}
                                strategy={rectSortingStrategy}
                            >
                                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                                    {mediaItems.map((media, index) => (
                                        <SortableMediaTile
                                            key={media.id}
                                            media={media}
                                            index={index}
                                            onRequestDelete={setMediaToDelete}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}

                    {mode === 'create' && stagedImages.length > 0 && (
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                            {stagedImages.map((file, index) => (
                                <article
                                    key={`${file.name}-${file.lastModified}-${index}`}
                                    className="group relative border border-border bg-[#e7e3dc]/45"
                                >
                                    <div className="relative aspect-[4/5] overflow-hidden bg-[#e7e3dc]">
                                        <img
                                            src={stagedImageUrls[index]}
                                            alt={`Foto ${index + 1} pronta para envio`}
                                            decoding="async"
                                            className="size-full object-cover"
                                        />
                                        {index === 0 && (
                                            <span className="absolute top-2 left-2 bg-[#ff4d3d] px-2.5 py-1 text-[0.62rem] font-bold tracking-[0.1em] text-[#18181f] uppercase">
                                                Capa
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            aria-label={`Remover foto ${index + 1}`}
                                            onClick={() =>
                                                onRemoveStagedImage(index)
                                            }
                                            className="absolute right-2 bottom-2 flex size-11 items-center justify-center bg-[#f6f4f0] text-[#b42318] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]"
                                        >
                                            <X
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </button>
                                    </div>
                                    <div className="border-t border-border px-3 py-2 text-[0.68rem] font-semibold text-muted-foreground">
                                        Foto {index + 1}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    {mode === 'edit' && mediaItems.length === 0 && (
                        <div className="border border-dashed border-border bg-[#e7e3dc]/35 px-5 py-7 text-center">
                            <ImagePlus
                                className="mx-auto size-7 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <p className="mt-3 font-zouth-display text-base font-semibold tracking-[-0.02em]">
                                Esta peça ainda está sem fotografia.
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                A primeira imagem enviada será a capa no
                                catálogo.
                            </p>
                        </div>
                    )}

                    <ImageDropzone
                        onFilesSelected={onFilesSelected}
                        maxFiles={maxImages}
                        currentCount={imageCount}
                        disabled={uploadingMedia || imageCount >= maxImages}
                        className="min-h-44 rounded-[2px] border border-dashed border-border bg-transparent py-8 shadow-none hover:border-[#98968d] hover:bg-[#e7e3dc]/35"
                    />
                    {imageError && (
                        <p
                            className="text-sm font-medium text-[#b42318]"
                            role="alert"
                        >
                            {imageError}
                        </p>
                    )}

                    <div className="border-t border-border pt-6">
                        <EditorField
                            label="Link do vídeo"
                            htmlFor="product-video-url"
                            hint="Opcional · YouTube, Vimeo, Dailymotion, Loom ou link direto em MP4/WebM."
                            error={videoError}
                        >
                            <div className="relative">
                                <Play
                                    className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
                                    aria-hidden="true"
                                />
                                <input
                                    id="product-video-url"
                                    type="url"
                                    inputMode="url"
                                    value={videoUrl}
                                    onChange={(event) =>
                                        onVideoUrlChange(event.target.value)
                                    }
                                    placeholder="https://youtube.com/watch?v=..."
                                    aria-invalid={Boolean(videoError)}
                                    className="block min-h-[52px] w-full rounded-[2px] border border-border bg-transparent py-3 pr-4 pl-11 text-sm transition-colors outline-none placeholder:text-muted-foreground/65 focus:border-[#18181f] focus:ring-1 focus:ring-[#18181f] aria-invalid:border-[#b42318] aria-invalid:ring-[#b42318]"
                                />
                            </div>
                        </EditorField>

                        {videoUrl && !videoError && (
                            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border border-border bg-[#e7e3dc]/35 px-4 py-3 text-sm">
                                <span className="inline-flex items-center gap-2 font-medium">
                                    <span className="size-2 rounded-full bg-[#ff4d3d]" />
                                    O vídeo aparecerá no detalhe da peça.
                                </span>
                                <a
                                    href={videoUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="font-semibold underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground"
                                >
                                    Conferir link
                                </a>
                            </div>
                        )}

                        {mediaItems.some((media) => media.type === 'video') && (
                            <p className="mt-3 text-xs leading-5 text-muted-foreground">
                                O arquivo enviado anteriormente continua
                                guardado. Quando houver um link, ele será o
                                vídeo principal no catálogo.
                            </p>
                        )}
                    </div>

                    {uploadingMedia && (
                        <div
                            className="flex items-center gap-3 border border-[#ff4d3d]/30 bg-[#ff4d3d]/7 px-4 py-3 text-sm font-semibold text-foreground"
                            role="status"
                        >
                            <Loader2
                                className="size-4 animate-spin text-[#e93d30]"
                                aria-hidden="true"
                            />
                            Preparando a vitrine da peça…
                        </div>
                    )}
                </div>
            </EditorSection>

            <AlertDialog
                open={Boolean(mediaToDelete)}
                onOpenChange={(open) => {
                    if (!open) {
                        setMediaToDelete(null);
                    }
                }}
            >
                <AlertDialogContent className="rounded-[2px] border-border bg-[#f6f4f0] shadow-none">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-zouth-display tracking-[-0.03em]">
                            Remover esta mídia da peça?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="leading-6">
                            Ela deixará de aparecer no catálogo imediatamente.
                            As outras alterações desta página serão mantidas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="min-h-11 rounded-[2px] border-[#18181f] bg-transparent shadow-none">
                            Manter mídia
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            className="min-h-11 rounded-[2px] bg-[#b42318] text-white shadow-none"
                            onClick={() => {
                                if (mediaToDelete) {
                                    onDelete(mediaToDelete);
                                    setMediaToDelete(null);
                                }
                            }}
                        >
                            Remover mídia
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
