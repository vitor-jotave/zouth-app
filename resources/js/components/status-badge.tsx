import { Badge } from '@/components/ui/badge';

type Status = 'none' | 'pending' | 'active' | 'rejected' | 'revoked';

interface StatusBadgeProps {
    status: Status;
}

const statusConfig: Record<
    Status,
    { label: string; variant: 'default' | 'secondary' | 'outline' }
> = {
    none: { label: 'Disponível', variant: 'outline' },
    pending: { label: 'Pendente', variant: 'secondary' },
    active: { label: 'Ativo', variant: 'default' },
    rejected: { label: 'Rejeitado', variant: 'secondary' },
    revoked: { label: 'Revogado', variant: 'secondary' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
    const config = statusConfig[status];

    return <Badge variant={config.variant}>{config.label}</Badge>;
}
