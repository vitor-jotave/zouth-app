import { Head } from '@inertiajs/react';
import { PackageOpen } from 'lucide-react';
import { FiltersBar } from '@/components/filters-bar';
import { ManufacturerCard } from '@/components/manufacturer-card';
import { ManufacturerCardSkeleton } from '@/components/manufacturer-card-skeleton';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';

interface Manufacturer {
    id: number;
    name: string;
    slug: string;
    users_count: number;
    affiliation_status: 'none' | 'pending' | 'active' | 'rejected' | 'revoked';
}

interface Props {
    manufacturers: {
        data: Manufacturer[];
    };
    filters: {
        search?: string;
        status: string;
        sort: string;
    };
    processing?: boolean;
}

export default function Index({ manufacturers, filters, processing = false }: Props) {
    const hasManufacturers = manufacturers.data.length > 0;
    const hasActiveFilters =
        filters.search ||
        (filters.status && filters.status !== 'all') ||
        (filters.sort && filters.sort !== 'name');

    return (
        <AppLayout>
            <Head title="Fabricantes" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <FiltersBar filters={filters} />

                    {processing ? (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <ManufacturerCardSkeleton key={i} />
                            ))}
                        </div>
                    ) : hasManufacturers ? (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {manufacturers.data.map((manufacturer) => (
                                <ManufacturerCard
                                    key={manufacturer.id}
                                    manufacturer={manufacturer}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                            <PackageOpen className="mb-4 h-12 w-12 text-muted-foreground" />
                            <h3 className="mb-2 text-lg font-medium">
                                {hasActiveFilters
                                    ? 'Nenhum fabricante encontrado'
                                    : 'Nenhum fabricante disponível'}
                            </h3>
                            <p className="mb-4 text-sm text-muted-foreground">
                                {hasActiveFilters
                                    ? 'Tente ajustar os filtros para encontrar fabricantes.'
                                    : 'Não há fabricantes cadastrados no momento.'}
                            </p>
                            {hasActiveFilters && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        window.location.href = '/rep/manufacturers';
                                    }}
                                >
                                    Limpar filtros
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
