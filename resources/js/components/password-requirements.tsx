import { cn } from '@/lib/utils';

type PasswordRequirementsProps = {
    id?: string;
    className?: string;
};

export default function PasswordRequirements({
    id,
    className,
}: PasswordRequirementsProps) {
    return (
        <p
            id={id}
            className={cn('text-sm leading-5 text-muted-foreground', className)}
        >
            Use 6 ou mais caracteres, com uma letra maiúscula e um número.
        </p>
    );
}
