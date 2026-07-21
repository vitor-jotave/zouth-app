import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type EditorSectionProps = {
    id: string;
    eyebrow: string;
    title?: string;
    description?: string;
    marker?: ReactNode;
    children: ReactNode;
    className?: string;
};

export function EditorSection({
    id,
    eyebrow,
    title,
    description,
    marker,
    children,
    className,
}: EditorSectionProps) {
    return (
        <section
            id={id}
            aria-labelledby={title ? `${id}-title` : undefined}
            className={cn(
                'scroll-mt-20 border-t border-border py-7 sm:py-9',
                className,
            )}
        >
            <div className="mb-7 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-8">
                <div>
                    <p className="text-[0.68rem] font-bold tracking-[0.2em] text-[#e93d30] uppercase">
                        {eyebrow}
                    </p>
                    {title && (
                        <h2
                            id={`${id}-title`}
                            className="mt-2 font-zouth-display text-[clamp(1.4rem,2.2vw,2rem)] leading-[1.05] font-semibold tracking-[-0.04em] text-foreground"
                        >
                            {title}
                        </h2>
                    )}
                    {description && (
                        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                            {description}
                        </p>
                    )}
                </div>
                {marker && <div className="sm:pt-1">{marker}</div>}
            </div>
            {children}
        </section>
    );
}

type EditorFieldProps = {
    label: string;
    htmlFor?: string;
    hint?: ReactNode;
    error?: string;
    required?: boolean;
    children: ReactNode;
    className?: string;
};

export function EditorField({
    label,
    htmlFor,
    hint,
    error,
    required = false,
    children,
    className,
}: EditorFieldProps) {
    const labelContent = (
        <>
            {label}
            {required && (
                <span className="ml-1 text-[#e93d30]" aria-hidden="true">
                    *
                </span>
            )}
        </>
    );

    return (
        <div className={cn('min-w-0', className)}>
            {htmlFor ? (
                <label
                    htmlFor={htmlFor}
                    className="mb-2 block font-zouth-display text-[0.68rem] font-bold tracking-[0.12em] text-foreground uppercase"
                >
                    {labelContent}
                </label>
            ) : (
                <div className="mb-2 font-zouth-display text-[0.68rem] font-bold tracking-[0.12em] text-foreground uppercase">
                    {labelContent}
                </div>
            )}
            {children}
            {error ? (
                <p
                    className="mt-2 text-sm font-medium text-[#b42318]"
                    role="alert"
                >
                    {error}
                </p>
            ) : hint ? (
                <div className="mt-2 text-xs leading-5 text-muted-foreground">
                    {hint}
                </div>
            ) : null}
        </div>
    );
}
