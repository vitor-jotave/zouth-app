import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    CheckCircle2,
    Clock3,
    FileSpreadsheet,
    LoaderCircle,
    Plus,
    TriangleAlert,
} from 'lucide-react';
import { AppPageHeader } from '@/components/app-page-header';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import manufacturer from '@/routes/manufacturer';
import type { BreadcrumbItem } from '@/types';
import type { Paginated, ProductImport } from './types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Visão geral', href: dashboard().url },
    { title: 'Produtos', href: manufacturer.products.index().url },
    { title: 'Importações', href: manufacturer.productImports.index().url },
];

const activeStatuses = [
    'uploaded',
    'mapping',
    'validating',
    'ready',
    'processing',
];

function statusIcon(productImport: ProductImport) {
    if (['completed'].includes(productImport.status)) {
        return CheckCircle2;
    }

    if (['failed', 'completed_with_errors'].includes(productImport.status)) {
        return TriangleAlert;
    }

    if (['validating', 'processing'].includes(productImport.status)) {
        return LoaderCircle;
    }

    return Clock3;
}

function statusTone(status: ProductImport['status']): string {
    if (status === 'completed') {
        return 'text-[#2e705a]';
    }

    if (status === 'failed' || status === 'completed_with_errors') {
        return 'text-[#b42318]';
    }

    if (status === 'ready') {
        return 'text-[#c53024]';
    }

    return 'text-muted-foreground';
}

export default function ProductImportsIndex({
    imports,
}: {
    imports: Paginated<ProductImport>;
}) {
    const activeCount = imports.data.filter((item) =>
        activeStatuses.includes(item.status),
    ).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Importações de produtos" />

            <main className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col px-5 py-8 sm:px-7 md:px-9 lg:pb-14 xl:px-12 2xl:px-14">
                <AppPageHeader
                    eyebrow="Coleção em movimento"
                    title={
                        <>
                            Importações
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description={
                        <>
                            <p>
                                Traga a coleção que já existe no seu ERP e deixe
                                a Zouth organizar o caminho até o catálogo.
                            </p>
                            <p className="mt-3 font-zouth-display text-sm font-semibold tracking-[-0.01em] text-foreground tabular-nums">
                                {imports.meta?.total ?? imports.data.length}{' '}
                                envios
                                <span className="px-2 text-[#98968d]">·</span>
                                {activeCount} em movimento
                            </p>
                        </>
                    }
                    aside={
                        <Button
                            asChild
                            className="min-h-12 rounded-[2px] bg-[#ff4d3d] text-[#18181f] hover:-translate-y-px hover:bg-[#ff4d3d]"
                        >
                            <Link
                                href={manufacturer.productImports.create().url}
                            >
                                <Plus className="size-4" aria-hidden="true" />
                                Trazer coleção
                            </Link>
                        </Button>
                    }
                />

                {imports.data.length === 0 ? (
                    <EmptyState
                        visual={
                            <div className="grid size-14 place-items-center border border-border bg-[#efebe4]">
                                <FileSpreadsheet className="size-6 text-[#ff4d3d]" />
                            </div>
                        }
                        eyebrow="Primeiro envio"
                        title="Sua primeira coleção pode chegar inteira."
                        description="Envie o arquivo do ERP, relacione as colunas e confira cada peça antes de publicar."
                        actions={
                            <Button asChild className="rounded-[2px]">
                                <Link
                                    href={
                                        manufacturer.productImports.create().url
                                    }
                                >
                                    Trazer coleção
                                </Link>
                            </Button>
                        }
                        className="mt-10"
                    />
                ) : (
                    <section
                        className="mt-10"
                        aria-label="Histórico de importações"
                    >
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-6 border-b border-border pb-4">
                            <div>
                                <p className="text-[0.68rem] font-bold tracking-[0.22em] text-[#ff4d3d] uppercase">
                                    Caminho recente
                                </p>
                                <h2 className="mt-2 font-zouth-display text-2xl font-semibold tracking-[-0.035em]">
                                    Coleções trazidas para a Zouth
                                </h2>
                            </div>
                            <p className="hidden text-xs text-muted-foreground sm:block">
                                Histórico preservado
                            </p>
                        </div>

                        <div className="divide-y divide-border">
                            {imports.data.map((productImport, index) => {
                                const StatusIcon = statusIcon(productImport);
                                const isMoving = [
                                    'validating',
                                    'processing',
                                ].includes(productImport.status);

                                return (
                                    <Link
                                        key={productImport.id}
                                        href={
                                            manufacturer.productImports.show(
                                                productImport.id,
                                            ).url
                                        }
                                        className="group grid min-h-32 gap-5 py-6 transition-colors hover:bg-[#efebe4]/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d] sm:grid-cols-[56px_minmax(0,1.15fr)_minmax(200px,0.7fr)_auto] sm:items-center sm:px-3"
                                    >
                                        <div className="font-zouth-display text-2xl font-semibold text-[#98968d] tabular-nums">
                                            {String(index + 1).padStart(2, '0')}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate font-zouth-display text-xl font-semibold tracking-[-0.025em] text-foreground">
                                                {productImport.source_name}
                                            </p>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {productImport.summary
                                                    .products ?? 0}{' '}
                                                peças encontradas
                                                <span className="px-2">·</span>
                                                {productImport.summary.images ??
                                                    0}{' '}
                                                imagens
                                            </p>
                                        </div>
                                        <div className="min-w-0">
                                            <div
                                                className={cn(
                                                    'flex items-center gap-2 text-sm font-semibold',
                                                    statusTone(
                                                        productImport.status,
                                                    ),
                                                )}
                                            >
                                                <StatusIcon
                                                    className={cn(
                                                        'size-4',
                                                        isMoving &&
                                                            'animate-spin',
                                                    )}
                                                    aria-hidden="true"
                                                />
                                                {productImport.status_label}
                                            </div>
                                            <p className="mt-2 text-xs text-muted-foreground">
                                                {productImport.created_at_label}
                                            </p>
                                        </div>
                                        <ArrowRight
                                            className="size-5 transition-transform group-hover:translate-x-1"
                                            aria-hidden="true"
                                        />
                                    </Link>
                                );
                            })}
                        </div>

                        {imports.meta && imports.meta.last_page > 1 && (
                            <Pagination
                                links={
                                    imports.meta.links ?? imports.links ?? []
                                }
                            />
                        )}
                    </section>
                )}
            </main>
        </AppLayout>
    );
}
