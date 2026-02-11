import { router } from '@inertiajs/react';
import { Check, Clock, UserCheck, UserX, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

interface AffiliationCardProps {
    affiliation: {
        id: number;
        status: 'pending' | 'active' | 'rejected' | 'revoked';
        created_at: string;
        updated_at: string;
        user: {
            id: number;
            name: string;
            email: string;
        };
    };
}

const statusConfig = {
    pending: {
        label: 'Pendente',
        variant: 'secondary' as const,
        icon: Clock,
    },
    active: {
        label: 'Ativo',
        variant: 'default' as const,
        icon: UserCheck,
    },
    rejected: {
        label: 'Rejeitado',
        variant: 'destructive' as const,
        icon: UserX,
    },
    revoked: {
        label: 'Revogado',
        variant: 'outline' as const,
        icon: UserX,
    },
};

export function AffiliationCard({ affiliation }: AffiliationCardProps) {
    const config = statusConfig[affiliation.status];
    const Icon = config.icon;

    const handleApprove = () => {
        router.post(
            `/affiliations/${affiliation.id}/approve`,
            {},
            {
                preserveScroll: true,
            },
        );
    };

    const handleReject = () => {
        router.post(
            `/affiliations/${affiliation.id}/reject`,
            {},
            {
                preserveScroll: true,
            },
        );
    };

    const handleRevoke = () => {
        if (
            confirm(
                'Tem certeza que deseja revogar esta afiliação? O representante perderá acesso ao catálogo.',
            )
        ) {
            router.post(
                `/affiliations/${affiliation.id}/revoke`,
                {},
                {
                    preserveScroll: true,
                },
            );
        }
    };

    const formattedDate = new Date(affiliation.created_at).toLocaleDateString(
        'pt-BR',
        {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        },
    );

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <CardTitle className="text-lg">
                            {affiliation.user.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {affiliation.user.email}
                        </p>
                    </div>
                    <Badge variant={config.variant} className="ml-2">
                        <Icon className="mr-1 h-3 w-3" />
                        {config.label}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Solicitado em {formattedDate}
                </p>
            </CardContent>
            <CardFooter className="gap-2">
                {affiliation.status === 'pending' && (
                    <>
                        <Button
                            onClick={handleApprove}
                            className="flex-1"
                            size="sm"
                        >
                            <Check className="mr-1 h-4 w-4" />
                            Aprovar
                        </Button>
                        <Button
                            onClick={handleReject}
                            variant="outline"
                            className="flex-1"
                            size="sm"
                        >
                            <X className="mr-1 h-4 w-4" />
                            Rejeitar
                        </Button>
                    </>
                )}
                {affiliation.status === 'active' && (
                    <Button
                        onClick={handleRevoke}
                        variant="destructive"
                        className="w-full"
                        size="sm"
                    >
                        <UserX className="mr-1 h-4 w-4" />
                        Revogar afiliação
                    </Button>
                )}
                {(affiliation.status === 'rejected' ||
                    affiliation.status === 'revoked') && (
                    <div className="w-full text-center text-sm text-muted-foreground">
                        Nenhuma ação disponível
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
