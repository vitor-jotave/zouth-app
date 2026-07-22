import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginationProps {
    links: PaginationLink[] | { links?: PaginationLink[] } | null | undefined;
}

function normalizeLabel(label: string): string {
    const normalizedLabel = label
        .replace(/&laquo;/g, '«')
        .replace(/&raquo;/g, '»')
        .replace(/<[^>]*>/g, '')
        .trim();

    if (/previous/i.test(normalizedLabel)) {
        return '← Anterior';
    }

    if (/next/i.test(normalizedLabel)) {
        return 'Próxima →';
    }

    return normalizedLabel;
}

export function Pagination({ links }: PaginationProps) {
    const resolvedLinks = Array.isArray(links)
        ? links
        : Array.isArray(links?.links)
          ? links?.links
          : [];
    const numberedLinks = resolvedLinks.filter((link) =>
        /^\d+$/.test(normalizeLabel(link.label)),
    );

    if (numberedLinks.length <= 1) {
        return null;
    }

    return (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {resolvedLinks.map((link, index) => {
                const label = normalizeLabel(link.label);
                const isDisabled = !link.url;

                return (
                    <Button
                        key={`${label}-${index}`}
                        variant={link.active ? 'default' : 'outline'}
                        size="sm"
                        asChild={!isDisabled}
                        disabled={isDisabled}
                        className={cn(
                            'min-h-11 min-w-11 rounded-[2px] px-4',
                            isDisabled && 'cursor-not-allowed opacity-60',
                        )}
                    >
                        {isDisabled ? (
                            <span>{label}</span>
                        ) : (
                            <Link href={link.url ?? undefined}>{label}</Link>
                        )}
                    </Button>
                );
            })}
        </div>
    );
}
