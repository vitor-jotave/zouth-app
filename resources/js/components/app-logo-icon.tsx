import type { ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type AppLogoIconProps = Omit<
    ImgHTMLAttributes<HTMLImageElement>,
    'src' | 'width' | 'height'
> & {
    tone?: 'dark' | 'light';
};

export default function AppLogoIcon({
    tone = 'dark',
    alt = 'Zouth',
    className,
    ...props
}: AppLogoIconProps) {
    return (
        <img
            {...props}
            src={`/brand/zouth/assets/symbol-duotone-${tone}.png`}
            alt={alt}
            width={230}
            height={211}
            draggable={false}
            className={cn('block object-contain', className)}
        />
    );
}
