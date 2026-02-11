import { router } from '@inertiajs/react';
import { Building2, Users } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

type Status = 'none' | 'pending' | 'active' | 'rejected' | 'revoked';

interface Manufacturer {
    id: number;
    name: string;
    slug: string;
    users_count: number;
    affiliation_status: Status;
}

interface ManufacturerCardProps {
    manufacturer: Manufacturer;
}

const actionConfig: Record<
    Status,
    {
        label: string;
        variant: 'default' | 'outline' | 'secondary';
        disabled: boolean;
        action: (manufacturer: Manufacturer) => void;
    }
> = {
    none: {
        label: 'Solicitar afiliação',
        variant: 'default',
        disabled: false,
        action: (m) =>
            router.post(`/rep/manufacturers/${m.id}/affiliate`, {}, {
                preserveScroll: true,
            }),
    },
    pending: {
        label: 'Aguardando aprovação',
        variant: 'secondary',
        disabled: true,
        action: () => {},
    },
    active: {
        label: 'Acessar catálogo',
        variant: 'default',
        disabled: false,
        action: (m) => router.visit(`/rep/m/${m.slug}/catalog`),
    },
    rejected: {
        label: 'Solicitar novamente',
        variant: 'outline',
        disabled: false,
        action: (m) =>
            router.post(`/rep/manufacturers/${m.id}/affiliate`, {}, {
                preserveScroll: true,
            }),
    },
    revoked: {
        label: 'Solicitar novamente',
        variant: 'outline',
        disabled: false,
        action: (m) =>
            router.post(`/rep/manufacturers/${m.id}/affiliate`, {}, {
                preserveScroll: true,
            }),
    },
};

export function ManufacturerCard({ manufacturer }: ManufacturerCardProps) {
    const config = actionConfig[manufacturer.affiliation_status];

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">
                            {manufacturer.name}
                        </CardTitle>
                    </div>
                    <StatusBadge status={manufacturer.affiliation_status} />
                </div>
                <CardDescription>@{manufacturer.slug}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{manufacturer.users_count} usuário(s)</span>
                </div>
            </CardContent>
            <CardFooter>
                <Button
                    className="w-full"
                    variant={config.variant}
                    disabled={config.disabled}
                    onClick={() => config.action(manufacturer)}
                >
                    {config.label}
                </Button>
            </CardFooter>
        </Card>
    );
}
