import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    Download,
    FileArchive,
    FileSpreadsheet,
    ShieldCheck,
    Sparkles,
    Upload,
} from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { AppPageHeader } from '@/components/app-page-header';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import manufacturer from '@/routes/manufacturer';
import type { BreadcrumbItem } from '@/types';
import type { ProductImport } from './types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Visão geral', href: dashboard().url },
    { title: 'Produtos', href: manufacturer.products.index().url },
    { title: 'Importações', href: manufacturer.productImports.index().url },
    { title: 'Trazer coleção', href: manufacturer.productImports.create().url },
];

function FileDrop({
    title,
    description,
    accept,
    file,
    onFile,
    optional = false,
}: {
    title: string;
    description: string;
    accept: string;
    file: File | null;
    onFile: (file: File | null) => void;
    optional?: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);

    return (
        <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                onFile(event.dataTransfer.files[0] ?? null);
            }}
            className={cn(
                'group relative grid min-h-52 w-full place-items-center border border-dashed px-6 py-8 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]',
                dragging || file
                    ? 'border-[#ff4d3d] bg-[#ff4d3d]/5'
                    : 'border-[#b8b3a9] hover:border-[#18181f] hover:bg-[#efebe4]/60',
            )}
        >
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="sr-only"
                onChange={(event) => onFile(event.target.files?.[0] ?? null)}
            />
            <span>
                <span className="mx-auto grid size-12 place-items-center border border-border bg-background">
                    {file ? (
                        <FileSpreadsheet className="size-5 text-[#ff4d3d]" />
                    ) : (
                        <Upload className="size-5" />
                    )}
                </span>
                <span className="mt-5 block font-zouth-display text-xl font-semibold tracking-[-0.025em]">
                    {file ? file.name : title}
                </span>
                <span className="mx-auto mt-2 block max-w-md text-sm leading-6 text-muted-foreground">
                    {file
                        ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Clique para trocar`
                        : description}
                </span>
                {optional && !file && (
                    <span className="mt-4 inline-block text-[0.65rem] font-bold tracking-[0.18em] text-[#98968d] uppercase">
                        Opcional
                    </span>
                )}
            </span>
        </button>
    );
}

export default function CreateProductImport({
    recent_imports,
}: {
    recent_imports: ProductImport[];
}) {
    const form = useForm<{ spreadsheet: File | null; images: File | null }>({
        spreadsheet: null,
        images: null,
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(manufacturer.productImports.store().url, {
            forceFormData: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Trazer coleção" />

            <main className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col px-5 py-8 sm:px-7 md:px-9 lg:pb-14 xl:px-12 2xl:px-14">
                <Link
                    href={manufacturer.productImports.index().url}
                    className="mb-7 inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ff4d3d]"
                >
                    <ArrowLeft className="size-4" />
                    Voltar às importações
                </Link>

                <AppPageHeader
                    eyebrow="Comece pelo que você já tem"
                    title={
                        <>
                            Traga sua coleção
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description="Não refaça no braço o que já vive no seu ERP. Envie a planilha, mostre onde está cada informação e confira antes de qualquer mudança."
                    aside={
                        <Button
                            asChild
                            variant="outline"
                            className="min-h-12 rounded-[2px] border-[#18181f] bg-transparent hover:bg-[#e7e3dc]"
                        >
                            <a
                                href={
                                    manufacturer.productImports.template().url
                                }
                                download
                            >
                                <Download className="size-4" />
                                Baixar modelo Zouth
                            </a>
                        </Button>
                    }
                />

                <div className="mt-10 grid gap-10 xl:grid-cols-[minmax(0,1fr)_330px] xl:gap-14">
                    <form onSubmit={submit} className="min-w-0">
                        <div className="flex items-baseline justify-between gap-4 border-b border-border pb-4">
                            <div>
                                <p className="text-[0.68rem] font-bold tracking-[0.22em] text-[#ff4d3d] uppercase">
                                    01 · Arquivos
                                </p>
                                <h2 className="mt-2 font-zouth-display text-2xl font-semibold tracking-[-0.035em]">
                                    A coleção chega por aqui
                                </h2>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                XLSX ou CSV
                            </span>
                        </div>

                        <div className="mt-6 grid gap-5 lg:grid-cols-2">
                            <FileDrop
                                title="Planilha de produtos"
                                description="Arraste o arquivo exportado do ERP ou escolha no computador. Até 20 MB."
                                accept=".xlsx,.csv"
                                file={form.data.spreadsheet}
                                onFile={(file) =>
                                    form.setData('spreadsheet', file)
                                }
                            />
                            <FileDrop
                                title="Pacote de fotografias"
                                description="Um ZIP com arquivos nomeados pelo SKU. Até 200 MB."
                                accept=".zip,application/zip"
                                file={form.data.images}
                                onFile={(file) => form.setData('images', file)}
                                optional
                            />
                        </div>

                        <InputError
                            message={form.errors.spreadsheet}
                            className="mt-3"
                        />
                        <InputError
                            message={form.errors.images}
                            className="mt-3"
                        />

                        {form.progress && (
                            <div className="mt-6" aria-live="polite">
                                <div className="mb-2 flex justify-between text-xs font-semibold">
                                    <span>Recebendo coleção</span>
                                    <span>{form.progress.percentage}%</span>
                                </div>
                                <div className="h-1 overflow-hidden bg-[#d8d4cc]">
                                    <div
                                        className="h-full bg-[#ff4d3d] transition-[width]"
                                        style={{
                                            width: `${form.progress.percentage}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                            <p className="max-w-lg text-xs leading-5 text-muted-foreground">
                                Nada entra no catálogo agora. A próxima etapa é
                                relacionar e revisar as informações.
                            </p>
                            <Button
                                type="submit"
                                disabled={
                                    !form.data.spreadsheet || form.processing
                                }
                                className="min-h-12 rounded-[2px] bg-[#ff4d3d] px-6 text-[#18181f] hover:bg-[#ff4d3d]"
                            >
                                {form.processing
                                    ? 'Recebendo…'
                                    : 'Ler minha coleção'}
                                <ArrowRight className="size-4" />
                            </Button>
                        </div>
                    </form>

                    <aside className="min-w-0 border-t border-border pt-6 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-8">
                        <p className="text-[0.68rem] font-bold tracking-[0.2em] uppercase">
                            O que a Zouth preserva
                        </p>
                        <div className="mt-5 grid gap-6">
                            {[
                                {
                                    icon: ShieldCheck,
                                    title: 'Sem apagamentos silenciosos',
                                    text: 'Células vazias e peças ausentes não zeram nem removem o que já existe.',
                                },
                                {
                                    icon: Sparkles,
                                    title: 'Novos cadastros sob revisão',
                                    text: 'Categorias, cores e tamanhos novos aparecem para confirmação.',
                                },
                                {
                                    icon: FileArchive,
                                    title: 'Fotografias pelo SKU',
                                    text: 'ACON-001.jpg e ACON-001_02.jpg encontram a peça certa.',
                                },
                            ].map((item) => (
                                <div
                                    key={item.title}
                                    className="grid grid-cols-[28px_1fr] gap-3"
                                >
                                    <item.icon className="mt-0.5 size-5 text-[#ff4d3d]" />
                                    <div>
                                        <h3 className="font-zouth-display text-sm font-semibold">
                                            {item.title}
                                        </h3>
                                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                            {item.text}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {recent_imports.length > 0 && (
                            <div className="mt-9 border-t border-border pt-6">
                                <p className="text-[0.68rem] font-bold tracking-[0.18em] uppercase">
                                    Envios recentes
                                </p>
                                <div className="mt-4 grid gap-3">
                                    {recent_imports.map((item) => (
                                        <Link
                                            key={item.id}
                                            href={
                                                manufacturer.productImports.show(
                                                    item.id,
                                                ).url
                                            }
                                            className="group flex items-center justify-between gap-3 border-b border-border py-3 text-sm"
                                        >
                                            <span className="min-w-0 truncate">
                                                {item.source_name}
                                            </span>
                                            <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-1" />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            </main>
        </AppLayout>
    );
}
