import { cn } from '@/lib/utils';

type ZouthLogoProps = {
    tone?: 'dark' | 'light';
    className?: string;
    alt?: string;
};

export default function ZouthLogo({
    tone = 'dark',
    className,
    alt = 'Zouth',
}: ZouthLogoProps) {
    return (
        <img
            src={`/brand/zouth/assets/logo-duotone-${tone}.png`}
            alt={alt}
            width={713}
            height={124}
            draggable={false}
            className={cn('block h-auto w-[8.75rem] object-contain', className)}
        />
    );
}
