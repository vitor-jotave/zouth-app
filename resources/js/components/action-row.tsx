import { Link, type InertiaLinkProps } from '@inertiajs/react';
import { ArrowRight, type LucideIcon } from 'lucide-react';

type ActionRowProps = {
    href: NonNullable<InertiaLinkProps['href']>;
    icon: LucideIcon;
    title: string;
    description: string;
};

export function ActionRow({
    href,
    icon: Icon,
    title,
    description,
}: ActionRowProps) {
    return (
        <Link
            href={href}
            className="group grid min-h-20 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 border border-border bg-background px-5 py-4 transition-colors hover:border-[#98968d] hover:bg-[#e7e3dc]/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]"
        >
            <span className="flex size-10 items-center justify-center bg-[#e7e3dc]/70 text-foreground transition-colors group-hover:bg-[#ff4d3d]/10 group-hover:text-[#d9382b]">
                <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
                <span className="block font-zouth-display text-sm font-semibold tracking-[-0.01em] text-foreground">
                    {title}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {description}
                </span>
            </span>
            <ArrowRight
                className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground"
                aria-hidden="true"
            />
        </Link>
    );
}
