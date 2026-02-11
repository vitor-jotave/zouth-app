import { router } from '@inertiajs/react';
import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface FiltersBarProps {
    filters: {
        search?: string;
        status: string;
        sort: string;
    };
}

export function FiltersBar({ filters }: FiltersBarProps) {
    const [search, setSearch] = useState(filters.search || '');

    const handleSearchChange = (value: string) => {
        setSearch(value);
        router.get(
            '/rep/manufacturers',
            {
                search: value,
                status: filters.status,
                sort: filters.sort,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const handleStatusChange = (value: string) => {
        router.get(
            '/rep/manufacturers',
            {
                search: filters.search,
                status: value,
                sort: filters.sort,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const handleSortChange = (value: string) => {
        router.get(
            '/rep/manufacturers',
            {
                search: filters.search,
                status: filters.status,
                sort: value,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const clearFilters = () => {
        setSearch('');
        router.get(
            '/rep/manufacturers',
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const hasActiveFilters =
        filters.search ||
        (filters.status && filters.status !== 'all') ||
        (filters.sort && filters.sort !== 'name');

    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Buscar por nome ou slug..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9"
                />
            </div>

            <div className="flex gap-2">
                <Select value={filters.status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="available">Disponíveis</SelectItem>
                        <SelectItem value="pending">Pendentes</SelectItem>
                        <SelectItem value="active">Ativos</SelectItem>
                        <SelectItem value="rejected">Rejeitados</SelectItem>
                        <SelectItem value="revoked">Revogados</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={filters.sort} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Ordenar" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="name">A-Z</SelectItem>
                        <SelectItem value="recent">Mais recentes</SelectItem>
                    </SelectContent>
                </Select>

                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={clearFilters}
                        title="Limpar filtros"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
