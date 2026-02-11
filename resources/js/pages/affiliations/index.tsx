import { Head } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { UserCheck } from 'lucide-react';
import { AffiliationCard } from '@/components/affiliation-card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';

interface Affiliation {
    id: number;
    status: 'pending' | 'active' | 'rejected' | 'revoked';
    created_at: string;
    updated_at: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
}

interface Props {
    affiliations: {
        data: Affiliation[];
    };
    filters: {
        status: string;
    };
}

export default function Index({ affiliations, filters }: Props) {
    const hasAffiliations = affiliations.data.length > 0;

    const handleStatusChange = (value: string) => {
        router.get(
            '/affiliations',
            { status: value },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const counts = {
        pending: affiliations.data.filter((a) => a.status === 'pending').length,
        active: affiliations.data.filter((a) => a.status === 'active').length,
        rejected: affiliations.data.filter((a) => a.status === 'rejected').length,
        revoked: affiliations.data.filter((a) => a.status === 'revoked').length,
    };

    return (
        <AppLayout>
            <Head title="Afiliações" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold">Afiliações</h2>
                            <p className="text-sm text-muted-foreground">
                                Gerencie solicitações de representantes comerciais
                            </p>
                        </div>

                        <Select
                            value={filters.status}
                            onValueChange={handleStatusChange}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filtrar por status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    Todos ({affiliations.data.length})
                                </SelectItem>
                                <SelectItem value="pending">
                                    Pendentes ({counts.pending})
                                </SelectItem>
                                <SelectItem value="active">
                                    Ativos ({counts.active})
                                </SelectItem>
                                <SelectItem value="rejected">
                                    Rejeitados ({counts.rejected})
                                </SelectItem>
                                <SelectItem value="revoked">
                                    Revogados ({counts.revoked})
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {hasAffiliations ? (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {affiliations.data.map((affiliation) => (
                                <AffiliationCard
                                    key={affiliation.id}
                                    affiliation={affiliation}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                            <UserCheck className="mb-4 h-12 w-12 text-muted-foreground" />
                            <h3 className="mb-2 text-lg font-medium">
                                Nenhuma afiliação encontrada
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                {filters.status === 'pending'
                                    ? 'Não há solicitações pendentes no momento.'
                                    : filters.status === 'all'
                                      ? 'Nenhum representante solicitou afiliação ainda.'
                                      : `Não há afiliações com status "${filters.status}".`}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
