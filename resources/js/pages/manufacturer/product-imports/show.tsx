import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    Check,
    CheckCircle2,
    ChevronDown,
    Download,
    FileSpreadsheet,
    Images,
    Layers3,
    LoaderCircle,
    PackageCheck,
    RefreshCw,
    Tags,
    X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AppPageHeader } from '@/components/app-page-header';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import manufacturer from '@/routes/manufacturer';
import type { BreadcrumbItem } from '@/types';
import type { ImportRow, MappingField, ProductImport } from './types';

function formatMoney(cents: number | null): string {
    if (cents === null) {
        return 'Preservado';
    }

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(cents / 100);
}

function MappingEditor({
    productImport,
    fields,
    compact = false,
}: {
    productImport: ProductImport;
    fields: MappingField[];
    compact?: boolean;
}) {
    const form = useForm<{
        mapping: Record<string, string>;
        mapping_name: string;
    }>({
        mapping: Object.fromEntries(
            fields.map((field) => [
                field.key,
                productImport.mapping[field.key] ?? '',
            ]),
        ),
        mapping_name: '',
    });
    const groups = useMemo(
        () =>
            fields.reduce<Record<string, MappingField[]>>((result, field) => {
                result[field.group] = [...(result[field.group] ?? []), field];
                return result;
            }, {}),
        [fields],
    );
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.put(
            manufacturer.productImports.mapping.update(productImport.id).url,
            { preserveScroll: true },
        );
    };

    return (
        <form onSubmit={submit} className={cn(compact && 'pt-2')}>
            <div className="grid gap-9">
                {Object.entries(groups).map(([group, groupFields]) => (
                    <section key={group}>
                        <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
                            <h3 className="text-[0.68rem] font-bold tracking-[0.2em] uppercase">
                                {group}
                            </h3>
                            <span className="text-[0.65rem] text-muted-foreground">
                                {groupFields.filter((field) => field.required)
                                    .length > 0
                                    ? 'SKU obrigatório'
                                    : 'Opcional'}
                            </span>
                        </div>
                        <div className="divide-y divide-border">
                            {groupFields.map((field) => (
                                <label
                                    key={field.key}
                                    className="grid min-h-20 gap-2 py-4 sm:grid-cols-[minmax(160px,0.75fr)_minmax(220px,1.25fr)] sm:items-center sm:gap-6"
                                >
                                    <span className="text-sm font-medium">
                                        {field.label}
                                        {field.required && (
                                            <span className="ml-1 text-[#ff4d3d]">
                                                *
                                            </span>
                                        )}
                                    </span>
                                    <Select
                                        value={
                                            form.data.mapping[field.key] ||
                                            '__none__'
                                        }
                                        onValueChange={(value) =>
                                            form.setData('mapping', {
                                                ...form.data.mapping,
                                                [field.key]:
                                                    value === '__none__'
                                                        ? ''
                                                        : value,
                                            })
                                        }
                                    >
                                        <SelectTrigger className="min-h-12 w-full rounded-[2px] bg-background">
                                            <SelectValue placeholder="Não relacionar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">
                                                Não relacionar
                                            </SelectItem>
                                            {productImport.headers.map(
                                                (header) => (
                                                    <SelectItem
                                                        key={header}
                                                        value={header}
                                                    >
                                                        {header}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                </label>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            <InputError message={form.errors['mapping.sku']} className="mt-5" />
            <div className="mt-7 flex flex-col-reverse gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-xs leading-5 text-muted-foreground">
                    Este relacionamento fica guardado para reconhecer o mesmo
                    formato na próxima coleção.
                </p>
                <Button
                    type="submit"
                    disabled={form.processing || !form.data.mapping.sku}
                    className="min-h-12 rounded-[2px] bg-[#ff4d3d] px-6 text-[#18181f] hover:bg-[#ff4d3d]"
                >
                    {form.processing ? 'Conferindo…' : 'Conferir coleção'}
                    <ArrowRight className="size-4" />
                </Button>
            </div>
        </form>
    );
}

function Journey({ productImport }: { productImport: ProductImport }) {
    const summary = productImport.summary;
    const current =
        productImport.status === 'processing'
            ? 4
            : ['completed', 'completed_with_errors'].includes(
                    productImport.status,
                )
              ? 5
              : summary.rows
                ? 3
                : ['mapping', 'validating'].includes(productImport.status)
                  ? 2
                  : 1;
    const steps = ['Arquivo', 'Colunas', 'Revisão', 'Catálogo', 'Pronta'];

    return (
        <ol
            className="grid grid-cols-5 border-y border-border"
            aria-label="Etapas da importação"
        >
            {steps.map((step, index) => {
                const number = index + 1;
                const complete = number < current;
                const active = number === current;

                return (
                    <li
                        key={step}
                        className={cn(
                            'relative min-w-0 border-r border-border px-2 py-4 last:border-r-0 sm:px-4',
                            active && 'bg-[#ff4d3d]/6',
                        )}
                    >
                        {active && (
                            <span className="absolute inset-x-0 -bottom-px h-0.5 bg-[#ff4d3d]" />
                        )}
                        <div className="flex items-center gap-2">
                            <span
                                className={cn(
                                    'grid size-5 shrink-0 place-items-center border text-[0.62rem] font-bold',
                                    complete
                                        ? 'border-[#2e705a] bg-[#2e705a] text-white'
                                        : active
                                          ? 'border-[#ff4d3d] text-[#c53024]'
                                          : 'border-border text-[#98968d]',
                                )}
                            >
                                {complete ? (
                                    <Check className="size-3" />
                                ) : (
                                    number
                                )}
                            </span>
                            <span
                                className={cn(
                                    'hidden truncate text-xs sm:block',
                                    active
                                        ? 'font-semibold text-foreground'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {step}
                            </span>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
}

function ProductPreview({ rows }: { rows: ImportRow[] }) {
    const groups = useMemo(
        () =>
            Object.values(
                rows.reduce<Record<string, ImportRow[]>>((result, row) => {
                    const key = row.product_sku ?? `linha-${row.row_number}`;
                    result[key] = [...(result[key] ?? []), row];
                    return result;
                }, {}),
            ),
        [rows],
    );

    return (
        <div className="divide-y divide-border border-y border-border">
            {groups.map((group, index) => {
                const first = group[0];
                const errors = group.flatMap((row) => row.errors);
                const variations = group.filter(
                    (row) => row.normalized.variations.length > 0,
                );

                return (
                    <details
                        key={`${first.product_sku}-${index}`}
                        className="group/details"
                        open={errors.length > 0 && index < 3}
                    >
                        <summary className="grid cursor-pointer list-none gap-4 py-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d] sm:grid-cols-[42px_minmax(0,1fr)_auto_24px] sm:items-center">
                            <span className="font-zouth-display text-lg font-semibold text-[#98968d] tabular-nums">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <span className="min-w-0">
                                <span className="block truncate font-zouth-display text-lg font-semibold tracking-[-0.02em]">
                                    {first.normalized.name ||
                                        first.product_sku ||
                                        'Peça sem SKU'}
                                </span>
                                <span className="mt-1 block text-xs text-muted-foreground">
                                    SKU {first.product_sku || 'não informado'}
                                    <span className="px-2">·</span>
                                    {first.normalized.category ||
                                        'Sem categoria'}
                                </span>
                            </span>
                            <span
                                className={cn(
                                    'w-fit text-[0.65rem] font-bold tracking-[0.14em] uppercase',
                                    errors.length > 0
                                        ? 'text-[#b42318]'
                                        : first.action === 'create'
                                          ? 'text-[#c53024]'
                                          : 'text-[#2e705a]',
                                )}
                            >
                                {errors.length > 0
                                    ? `${errors.length} pendência${errors.length > 1 ? 's' : ''}`
                                    : first.action === 'create'
                                      ? 'Nova peça'
                                      : 'Atualização'}
                            </span>
                            <ChevronDown className="size-4 transition-transform group-open/details:rotate-180" />
                        </summary>
                        <div className="grid gap-7 bg-[#efebe4]/60 px-5 py-6 sm:grid-cols-[minmax(0,1fr)_minmax(260px,0.7fr)] sm:px-7">
                            <div>
                                <p className="text-[0.65rem] font-bold tracking-[0.18em] uppercase">
                                    Como ficará
                                </p>
                                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                                    <div>
                                        <dt className="text-xs text-muted-foreground">
                                            Preço geral
                                        </dt>
                                        <dd className="mt-1 font-semibold tabular-nums">
                                            {formatMoney(
                                                first.normalized.price_cents,
                                            )}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">
                                            Estoque
                                        </dt>
                                        <dd className="mt-1 font-semibold tabular-nums">
                                            {variations.length > 0
                                                ? `${variations.length} opções`
                                                : (first.normalized.stock ??
                                                  'Preservado')}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">
                                            Descrição
                                        </dt>
                                        <dd className="mt-1 line-clamp-2">
                                            {first.normalized.description ||
                                                'Preservada'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">
                                            Fotografias
                                        </dt>
                                        <dd className="mt-1 font-semibold">
                                            {group.flatMap(
                                                (row) =>
                                                    row.normalized.image_urls,
                                            ).length || 'ZIP ou atuais'}
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                            <div>
                                <p className="text-[0.65rem] font-bold tracking-[0.18em] uppercase">
                                    {errors.length > 0
                                        ? 'O que precisa de atenção'
                                        : 'Opções encontradas'}
                                </p>
                                {errors.length > 0 ? (
                                    <ul className="mt-4 grid gap-2 text-sm text-[#8f251d]">
                                        {[...new Set(errors)].map((error) => (
                                            <li
                                                key={error}
                                                className="flex gap-2"
                                            >
                                                <X className="mt-0.5 size-4 shrink-0" />
                                                {error}
                                            </li>
                                        ))}
                                    </ul>
                                ) : variations.length > 0 ? (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {variations.slice(0, 12).map((row) => (
                                            <span
                                                key={row.id}
                                                className="border border-border bg-background px-2.5 py-1.5 text-xs"
                                            >
                                                {row.normalized.variations
                                                    .map(
                                                        (variation) =>
                                                            variation.value,
                                                    )
                                                    .join(' / ')}
                                                <span className="ml-2 text-muted-foreground">
                                                    {row.normalized
                                                        .variant_stock ??
                                                        0}{' '}
                                                    un.
                                                </span>
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-4 text-sm text-muted-foreground">
                                        Produto simples, sem matriz de
                                        variações.
                                    </p>
                                )}
                            </div>
                        </div>
                    </details>
                );
            })}
        </div>
    );
}

export default function ShowProductImport({
    product_import: productImport,
    mapping_fields: mappingFields,
}: {
    product_import: ProductImport;
    mapping_fields: MappingField[];
}) {
    const [acceptTaxonomies, setAcceptTaxonomies] = useState(false);
    const isPolling = ['validating', 'processing'].includes(
        productImport.status,
    );
    const hasSummary = Boolean(productImport.summary.rows);
    const hasErrors = (productImport.summary.errors ?? 0) > 0;
    const newTaxonomyCount = productImport.summary.new_taxonomies ?? 0;
    const isComplete = ['completed', 'completed_with_errors'].includes(
        productImport.status,
    );
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Visão geral', href: dashboard().url },
        { title: 'Produtos', href: manufacturer.products.index().url },
        { title: 'Importações', href: manufacturer.productImports.index().url },
        {
            title: productImport.source_name,
            href: manufacturer.productImports.show(productImport.id).url,
        },
    ];

    useEffect(() => {
        if (!isPolling) {
            return;
        }

        const timer = window.setInterval(() => {
            router.reload({
                only: ['product_import'],
            });
        }, 2500);

        return () => window.clearInterval(timer);
    }, [isPolling]);

    const confirm = () => {
        if (!productImport.preview_signature) {
            return;
        }

        router.post(
            manufacturer.productImports.confirm(productImport.id).url,
            {
                preview_signature: productImport.preview_signature,
                accept_new_taxonomies: acceptTaxonomies,
            },
            { preserveScroll: true },
        );
    };

    const cancel = () => {
        router.post(
            manufacturer.productImports.cancel(productImport.id).url,
            {},
            { preserveScroll: true },
        );
    };
    const retry = () => {
        router.post(
            manufacturer.productImports.retry(productImport.id).url,
            {},
            { preserveScroll: true },
        );
    };
    const summaryMetrics: Array<[string, number, LucideIcon]> = [
        [
            'Peças encontradas',
            productImport.summary.products ?? 0,
            PackageCheck,
        ],
        ['Novas peças', productImport.summary.create ?? 0, FileSpreadsheet],
        ['Atualizações', productImport.summary.update ?? 0, RefreshCw],
        ['Fotografias', productImport.summary.images ?? 0, Images],
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Importação — ${productImport.source_name}`} />

            <main className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col px-5 py-8 sm:px-7 md:px-9 lg:pb-14 xl:px-12 2xl:px-14">
                <Link
                    href={manufacturer.productImports.index().url}
                    className="mb-7 inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]"
                >
                    <ArrowLeft className="size-4" />
                    Voltar às importações
                </Link>

                <AppPageHeader
                    eyebrow="Coleção em movimento"
                    title={
                        <>
                            {isComplete
                                ? 'Coleção recebida'
                                : 'Confira sua coleção'}
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description={
                        <>
                            <p className="truncate">
                                {productImport.source_name}
                            </p>
                            <p className="mt-3 text-xs text-muted-foreground">
                                Enviada em {productImport.created_at_label}
                                {productImport.has_image_archive && (
                                    <span className="ml-2">
                                        · Fotografias em ZIP
                                    </span>
                                )}
                            </p>
                        </>
                    }
                    aside={
                        <div className="border-l-2 border-[#ff4d3d] pl-5">
                            <p className="text-[0.65rem] font-bold tracking-[0.18em] uppercase">
                                Estado atual
                            </p>
                            <p className="mt-2 font-zouth-display text-lg font-semibold">
                                {productImport.status_label}
                            </p>
                        </div>
                    }
                />

                <div className="mt-8">
                    <Journey productImport={productImport} />
                </div>

                {isPolling && (
                    <section
                        className="grid min-h-[30rem] place-items-center border-b border-border py-16 text-center"
                        aria-live="polite"
                    >
                        <div className="max-w-xl">
                            <LoaderCircle className="mx-auto size-9 animate-spin text-[#ff4d3d]" />
                            <p className="mt-7 text-[0.68rem] font-bold tracking-[0.22em] text-[#ff4d3d] uppercase">
                                {productImport.status === 'processing'
                                    ? 'Levando para o catálogo'
                                    : 'Conferindo cada detalhe'}
                            </p>
                            <h2 className="mt-3 font-zouth-display text-4xl font-semibold tracking-[-0.045em]">
                                {productImport.status === 'processing'
                                    ? 'Sua coleção está entrando.'
                                    : 'A planilha está tomando forma.'}
                            </h2>
                            <p className="mt-4 text-sm leading-6 text-muted-foreground">
                                Pode continuar usando a Zouth. Esta página se
                                atualiza sozinha.
                            </p>
                            <div className="mt-8 h-1 overflow-hidden bg-[#d8d4cc]">
                                <div
                                    className="h-full bg-[#ff4d3d] transition-[width] duration-500"
                                    style={{
                                        width: `${productImport.progress}%`,
                                    }}
                                />
                            </div>
                            <p className="mt-2 text-right text-xs font-semibold tabular-nums">
                                {productImport.progress}%
                            </p>
                        </div>
                    </section>
                )}

                {!isPolling &&
                    productImport.status === 'mapping' &&
                    !hasSummary && (
                        <section className="mt-10">
                            <div className="mb-7 max-w-3xl">
                                <p className="text-[0.68rem] font-bold tracking-[0.22em] text-[#ff4d3d] uppercase">
                                    02 · Relacione as colunas
                                </p>
                                <h2 className="mt-2 font-zouth-display text-3xl font-semibold tracking-[-0.04em]">
                                    Mostre onde cada informação vive.
                                </h2>
                                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                    A Zouth já sugeriu o que reconheceu. Revise
                                    apenas o necessário.
                                </p>
                            </div>
                            <MappingEditor
                                productImport={productImport}
                                fields={mappingFields}
                            />
                        </section>
                    )}

                {!isPolling && hasSummary && !isComplete && (
                    <div className="mt-10 grid gap-10 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-12">
                        <section className="min-w-0">
                            <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-[0.68rem] font-bold tracking-[0.22em] text-[#ff4d3d] uppercase">
                                        03 · Prévia da coleção
                                    </p>
                                    <h2 className="mt-2 font-zouth-display text-3xl font-semibold tracking-[-0.04em]">
                                        {hasErrors
                                            ? 'Ainda há pontos para ajustar.'
                                            : 'Pronta para entrar no catálogo.'}
                                    </h2>
                                </div>
                                {hasErrors && (
                                    <a
                                        href={
                                            manufacturer.productImports.errors(
                                                productImport.id,
                                            ).url
                                        }
                                        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold underline decoration-[#cac4ba] underline-offset-4"
                                    >
                                        <Download className="size-4" />
                                        Baixar pendências
                                    </a>
                                )}
                            </div>

                            {productImport.errors.length > 0 && (
                                <div className="mt-6 border-l-2 border-[#b42318] bg-[#b42318]/5 px-5 py-4">
                                    <p className="font-zouth-display text-sm font-semibold text-[#8f251d]">
                                        A coleção precisa destes ajustes gerais:
                                    </p>
                                    <ul className="mt-3 grid gap-2 text-sm text-[#8f251d]">
                                        {productImport.errors.map((error) => (
                                            <li
                                                key={error}
                                                className="flex gap-2"
                                            >
                                                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                                {error}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="mt-6">
                                <ProductPreview
                                    rows={productImport.rows ?? []}
                                />
                            </div>

                            {(productImport.summary.products ?? 0) >
                                (productImport.rows?.length ?? 0) && (
                                <p className="mt-4 text-xs text-muted-foreground">
                                    A tela mostra uma amostra da coleção; todos
                                    os produtos foram considerados na
                                    conferência.
                                </p>
                            )}

                            {hasErrors && (
                                <details className="mt-9 border-t border-border pt-6">
                                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-zouth-display text-lg font-semibold">
                                        Ajustar relação de colunas
                                        <ChevronDown className="size-4" />
                                    </summary>
                                    <div className="mt-6">
                                        <MappingEditor
                                            productImport={productImport}
                                            fields={mappingFields}
                                            compact
                                        />
                                    </div>
                                </details>
                            )}
                        </section>

                        <aside className="min-w-0 xl:sticky xl:top-8 xl:self-start">
                            <div className="border border-border bg-background p-6">
                                <p className="text-[0.68rem] font-bold tracking-[0.2em] uppercase">
                                    Leitura da coleção
                                </p>
                                <dl className="mt-6 divide-y divide-border">
                                    {summaryMetrics.map(
                                        ([label, value, Icon]) => (
                                            <div
                                                key={String(label)}
                                                className="flex items-center justify-between gap-4 py-3.5 text-sm"
                                            >
                                                <dt className="flex items-center gap-2 text-muted-foreground">
                                                    <Icon className="size-4" />
                                                    {label}
                                                </dt>
                                                <dd className="font-zouth-display font-semibold tabular-nums">
                                                    {value}
                                                </dd>
                                            </div>
                                        ),
                                    )}
                                </dl>

                                {newTaxonomyCount > 0 && (
                                    <div className="mt-6 border-t border-border pt-5">
                                        <p className="text-[0.65rem] font-bold tracking-[0.18em] text-[#c53024] uppercase">
                                            Novos cadastros
                                        </p>
                                        <div className="mt-4 grid gap-3 text-sm">
                                            {productImport.taxonomy_preview
                                                .categories.length > 0 && (
                                                <div className="flex gap-2">
                                                    <Tags className="mt-0.5 size-4 shrink-0" />
                                                    <span>
                                                        {productImport.taxonomy_preview.categories.join(
                                                            ', ',
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                            {productImport.taxonomy_preview
                                                .variation_types.length > 0 && (
                                                <div className="flex gap-2">
                                                    <Layers3 className="mt-0.5 size-4 shrink-0" />
                                                    <span>
                                                        {productImport.taxonomy_preview.variation_types.join(
                                                            ', ',
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {!hasErrors && newTaxonomyCount > 0 && (
                                    <label className="mt-6 flex cursor-pointer gap-3 border-t border-border pt-5 text-sm leading-5">
                                        <input
                                            type="checkbox"
                                            checked={acceptTaxonomies}
                                            onChange={(event) =>
                                                setAcceptTaxonomies(
                                                    event.target.checked,
                                                )
                                            }
                                            className="mt-0.5 size-4 accent-[#ff4d3d]"
                                        />
                                        <span>
                                            Confirmo a criação dos novos
                                            cadastros destacados.
                                        </span>
                                    </label>
                                )}

                                <Button
                                    type="button"
                                    onClick={confirm}
                                    disabled={
                                        hasErrors ||
                                        !productImport.preview_signature ||
                                        (newTaxonomyCount > 0 &&
                                            !acceptTaxonomies)
                                    }
                                    className="mt-7 min-h-12 w-full rounded-[2px] bg-[#ff4d3d] text-[#18181f] hover:bg-[#ff4d3d]"
                                >
                                    Levar para o catálogo
                                    <ArrowRight className="size-4" />
                                </Button>
                                {hasErrors && (
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="mt-3 min-h-12 w-full rounded-[2px]"
                                    >
                                        <Link
                                            href={
                                                manufacturer.productImports.create()
                                                    .url
                                            }
                                        >
                                            Enviar planilha corrigida
                                        </Link>
                                    </Button>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={cancel}
                                className="mt-4 min-h-11 w-full text-sm font-semibold text-muted-foreground hover:text-[#b42318]"
                            >
                                Cancelar esta importação
                            </button>
                        </aside>
                    </div>
                )}

                {!isPolling && isComplete && (
                    <section className="grid min-h-[34rem] place-items-center border-b border-border py-16 text-center">
                        <div className="max-w-2xl">
                            {productImport.status === 'completed' ? (
                                <CheckCircle2 className="mx-auto size-11 text-[#2e705a]" />
                            ) : (
                                <AlertTriangle className="mx-auto size-11 text-[#b42318]" />
                            )}
                            <p className="mt-7 text-[0.68rem] font-bold tracking-[0.22em] text-[#ff4d3d] uppercase">
                                {productImport.status === 'completed'
                                    ? 'Coleção recebida'
                                    : 'Importação com pendências'}
                            </p>
                            <h2 className="mt-3 font-zouth-display text-[clamp(2.4rem,5vw,4.4rem)] leading-[0.95] font-semibold tracking-[-0.055em]">
                                {productImport.status === 'completed'
                                    ? 'As peças já estão no catálogo.'
                                    : 'Parte da coleção precisa de atenção.'}
                            </h2>
                            <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-muted-foreground">
                                {productImport.summary.processed ?? 0} produtos
                                processados
                                <span className="px-2">·</span>
                                {productImport.summary.failed ?? 0} pendências
                                registradas
                            </p>
                            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                                {productImport.status ===
                                    'completed_with_errors' && (
                                    <Button
                                        type="button"
                                        onClick={retry}
                                        className="min-h-12 rounded-[2px] bg-[#ff4d3d] text-[#18181f] hover:bg-[#ff4d3d]"
                                    >
                                        Tentar pendências novamente
                                        <RefreshCw className="size-4" />
                                    </Button>
                                )}
                                <Button
                                    asChild
                                    className={cn(
                                        'min-h-12 rounded-[2px]',
                                        productImport.status === 'completed'
                                            ? 'bg-[#ff4d3d] text-[#18181f] hover:bg-[#ff4d3d]'
                                            : 'bg-[#18181f] text-white hover:bg-[#18181f]',
                                    )}
                                >
                                    <Link
                                        href={manufacturer.products.index().url}
                                    >
                                        Ver produtos
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    variant="outline"
                                    className="min-h-12 rounded-[2px]"
                                >
                                    <Link
                                        href={
                                            manufacturer.productImports.create()
                                                .url
                                        }
                                    >
                                        Trazer outra coleção
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </section>
                )}

                {!isPolling && productImport.status === 'failed' && (
                    <section className="grid min-h-[28rem] place-items-center border-b border-border py-16 text-center">
                        <div className="max-w-xl">
                            <AlertTriangle className="mx-auto size-10 text-[#b42318]" />
                            <h2 className="mt-6 font-zouth-display text-3xl font-semibold tracking-[-0.04em]">
                                Não conseguimos ler esta coleção.
                            </h2>
                            <p className="mt-4 text-sm leading-6 text-muted-foreground">
                                {productImport.error_message ||
                                    productImport.errors[0] ||
                                    'Revise o arquivo e tente novamente.'}
                            </p>
                            <Button
                                asChild
                                className="mt-7 min-h-12 rounded-[2px]"
                            >
                                <Link
                                    href={
                                        manufacturer.productImports.create().url
                                    }
                                >
                                    Enviar outro arquivo
                                </Link>
                            </Button>
                        </div>
                    </section>
                )}
            </main>
        </AppLayout>
    );
}
