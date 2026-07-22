import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    MapPin,
    PackageOpen,
    Search,
    Send,
    X,
} from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { AppPageHeader } from '@/components/app-page-header';
import InputError from '@/components/input-error';
import { StatusLabel, type StatusLabelTone } from '@/components/status-label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import rep from '@/routes/rep';

type AffiliationStatus = 'none' | 'pending' | 'active' | 'rejected' | 'revoked';

interface Manufacturer {
    id: number;
    name: string;
    slug: string;
    users_count: number;
    products_count: number;
    city: string | null;
    state: string | null;
    tagline: string | null;
    logo_url: string | null;
    affiliation_status: AffiliationStatus;
    affiliation_id: number | null;
}

interface Profile {
    whatsapp: string | null;
    city: string | null;
    state: string | null;
    territory: string | null;
    presentation: string | null;
}

interface Props {
    manufacturers: { data: Manufacturer[] };
    filters: { search?: string; status: string; sort: string };
    profile: Profile | null;
}

const segments = [
    { value: 'all', label: 'Todas as marcas' },
    { value: 'available', label: 'Para conhecer' },
    { value: 'pending', label: 'Em análise' },
    { value: 'active', label: 'Minha rede' },
];

function statusFor(status: AffiliationStatus): {
    label: string;
    tone: StatusLabelTone;
} {
    return {
        none: { label: 'Nova conexão', tone: 'neutral' },
        pending: { label: 'Em análise', tone: 'coral' },
        active: { label: 'Na sua rede', tone: 'mineral' },
        rejected: { label: 'Nova apresentação', tone: 'muted' },
        revoked: { label: 'Relação encerrada', tone: 'muted' },
    }[status] as { label: string; tone: StatusLabelTone };
}

function BrandMark({ manufacturer }: { manufacturer: Manufacturer }) {
    return manufacturer.logo_url ? (
        <span className="flex size-16 items-center justify-center bg-white p-2 sm:size-20">
            <img
                src={manufacturer.logo_url}
                alt=""
                className="max-h-full max-w-full object-contain"
            />
        </span>
    ) : (
        <span className="flex size-16 items-center justify-center bg-[#18181f] font-zouth-display text-xl font-semibold text-white sm:size-20">
            {manufacturer.name.slice(0, 2).toUpperCase()}
        </span>
    );
}

function ApplicationSheet({
    manufacturer,
    profile,
    onClose,
}: {
    manufacturer: Manufacturer | null;
    profile: Profile | null;
    onClose: () => void;
}) {
    const form = useForm({
        whatsapp: profile?.whatsapp ?? '',
        city: profile?.city ?? '',
        state: profile?.state ?? '',
        territory: profile?.territory ?? '',
        presentation: profile?.presentation ?? '',
        application_note: '',
    });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!manufacturer) return;
        form.submit(rep.manufacturers.affiliate(manufacturer.id), {
            preserveScroll: true,
            onSuccess: onClose,
        });
    };

    return (
        <Sheet
            open={manufacturer !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            <SheetContent className="w-full gap-0 overflow-hidden border-l border-[#18181f] bg-[#f6f4f0] p-0 shadow-none sm:max-w-[42rem]">
                <SheetHeader className="border-b border-border px-7 py-9 sm:px-10">
                    <p className="text-[0.68rem] font-bold tracking-[0.24em] text-[#ff4d3d] uppercase">
                        Apresentação comercial
                    </p>
                    <SheetTitle className="mt-4 font-zouth-display text-4xl leading-none font-semibold tracking-[-0.05em]">
                        {manufacturer?.name}
                        <span className="text-[#ff4d3d]">.</span>
                    </SheetTitle>
                    <SheetDescription className="mt-4 max-w-lg text-sm leading-6">
                        O fabricante recebe seu território, experiência e uma
                        mensagem pensada especialmente para esta coleção.
                    </SheetDescription>
                </SheetHeader>
                <form
                    onSubmit={submit}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="grid flex-1 gap-6 overflow-y-auto px-7 py-8 sm:grid-cols-2 sm:px-10">
                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="application-whatsapp">
                                WhatsApp comercial
                            </Label>
                            <Input
                                id="application-whatsapp"
                                value={form.data.whatsapp}
                                onChange={(event) =>
                                    form.setData('whatsapp', event.target.value)
                                }
                                className="min-h-12 rounded-[2px] bg-white shadow-none"
                            />
                            <InputError message={form.errors.whatsapp} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="application-city">Cidade</Label>
                            <Input
                                id="application-city"
                                value={form.data.city}
                                onChange={(event) =>
                                    form.setData('city', event.target.value)
                                }
                                className="min-h-12 rounded-[2px] bg-white shadow-none"
                            />
                            <InputError message={form.errors.city} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="application-state">UF</Label>
                            <Input
                                id="application-state"
                                value={form.data.state}
                                onChange={(event) =>
                                    form.setData(
                                        'state',
                                        event.target.value
                                            .toUpperCase()
                                            .slice(0, 2),
                                    )
                                }
                                maxLength={2}
                                className="min-h-12 rounded-[2px] bg-white shadow-none"
                            />
                            <InputError message={form.errors.state} />
                        </div>
                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="application-territory">
                                Território de atuação
                            </Label>
                            <Input
                                id="application-territory"
                                value={form.data.territory}
                                onChange={(event) =>
                                    form.setData(
                                        'territory',
                                        event.target.value,
                                    )
                                }
                                placeholder="Ex.: Campinas, Jundiaí e região"
                                className="min-h-12 rounded-[2px] bg-white shadow-none"
                            />
                            <InputError message={form.errors.territory} />
                        </div>
                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="application-presentation">
                                Seu perfil comercial
                            </Label>
                            <Textarea
                                id="application-presentation"
                                value={form.data.presentation}
                                onChange={(event) =>
                                    form.setData(
                                        'presentation',
                                        event.target.value,
                                    )
                                }
                                placeholder="Conte sobre sua carteira, experiência e modo de trabalho."
                                className="min-h-28 rounded-[2px] bg-white shadow-none"
                            />
                            <InputError message={form.errors.presentation} />
                        </div>
                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="application-note">
                                Por que esta coleção?
                            </Label>
                            <Textarea
                                id="application-note"
                                value={form.data.application_note}
                                onChange={(event) =>
                                    form.setData(
                                        'application_note',
                                        event.target.value,
                                    )
                                }
                                placeholder="Uma mensagem curta e específica para o fabricante."
                                className="min-h-28 rounded-[2px] bg-white shadow-none"
                            />
                            <InputError
                                message={form.errors.application_note}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 border-t border-border px-7 py-5 sm:px-10">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="min-h-12 rounded-[2px] shadow-none"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.processing}
                            className="min-h-12 rounded-[2px] bg-[#ff4d3d] text-[#18181f] shadow-none hover:bg-[#f23c2e]"
                        >
                            {form.processing ? (
                                <Spinner />
                            ) : (
                                <Send className="size-4" />
                            )}
                            Enviar apresentação
                        </Button>
                    </div>
                </form>
            </SheetContent>
        </Sheet>
    );
}

export default function ManufacturersIndex({
    manufacturers,
    filters,
    profile,
}: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selectedManufacturer, setSelectedManufacturer] =
        useState<Manufacturer | null>(null);
    const searchTimer = useRef<number | null>(null);

    const updateSearch = (value: string) => {
        setSearch(value);
        if (searchTimer.current) window.clearTimeout(searchTimer.current);
        searchTimer.current = window.setTimeout(() => {
            router.get(
                rep.manufacturers.index().url,
                {
                    search: value || undefined,
                    status:
                        filters.status === 'all' ? undefined : filters.status,
                },
                { preserveState: true, replace: true },
            );
        }, 280);
    };

    return (
        <AppLayout>
            <Head title="Marcas para representar" />
            <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-5 py-8 sm:px-8 lg:px-12 lg:pb-14">
                <AppPageHeader
                    eyebrow="Sua rede"
                    title={
                        <>
                            Coleções para movimentar
                            <span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description="Conheça marcas, escolha as coleções que combinam com sua carteira e apresente seu território."
                    aside={
                        <div className="border-l-2 border-[#ff4d3d] pl-5 text-sm leading-6 text-foreground">
                            Uma boa representação começa com contexto. Sua
                            apresentação comercial fica salva para os próximos
                            encontros.
                        </div>
                    }
                />

                <div className="mt-8 flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
                    <nav className="flex overflow-x-auto">
                        {segments.map((segment) => (
                            <Link
                                key={segment.value}
                                href={
                                    rep.manufacturers.index({
                                        query: {
                                            status:
                                                segment.value === 'all'
                                                    ? undefined
                                                    : segment.value,
                                            search: search || undefined,
                                        },
                                    }).url
                                }
                                preserveState
                                replace
                                className={cn(
                                    'relative min-h-11 px-4 text-sm font-semibold whitespace-nowrap',
                                    filters.status === segment.value ||
                                        (filters.status === 'all' &&
                                            segment.value === 'all')
                                        ? 'text-foreground after:absolute after:inset-x-4 after:bottom-[-17px] after:h-[3px] after:bg-[#ff4d3d]'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {segment.label}
                            </Link>
                        ))}
                    </nav>
                    <div className="relative w-full lg:w-80">
                        <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={search}
                            onChange={(event) =>
                                updateSearch(event.target.value)
                            }
                            placeholder="Buscar marca ou coleção"
                            className="min-h-11 rounded-[2px] bg-white pr-10 pl-10 shadow-none"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => updateSearch('')}
                                className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center"
                            >
                                <X className="size-4" />
                            </button>
                        )}
                    </div>
                </div>

                {manufacturers.data.length > 0 ? (
                    <section className="mt-3">
                        {manufacturers.data.map((manufacturer, index) => {
                            const status = statusFor(
                                manufacturer.affiliation_status,
                            );
                            const canApply = ['none', 'rejected'].includes(
                                manufacturer.affiliation_status,
                            );
                            return (
                                <article
                                    key={manufacturer.id}
                                    className="grid gap-6 border-b border-border py-7 sm:grid-cols-[2rem_5rem_minmax(180px,1.25fr)_minmax(120px,0.72fr)_minmax(130px,0.75fr)_auto] sm:items-center sm:gap-5"
                                >
                                    <span className="hidden text-xs font-semibold text-muted-foreground sm:block">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <BrandMark manufacturer={manufacturer} />
                                    <div className="min-w-0">
                                        <h2 className="font-zouth-display text-xl font-semibold tracking-[-0.035em]">
                                            {manufacturer.name}
                                        </h2>
                                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                                            {manufacturer.tagline ||
                                                'Uma coleção aberta a novas relações comerciais.'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[0.62rem] font-bold tracking-[0.15em] text-muted-foreground uppercase">
                                            Praça
                                        </p>
                                        <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold">
                                            <MapPin className="size-3.5" />
                                            {[
                                                manufacturer.city,
                                                manufacturer.state,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ') || 'Brasil'}
                                        </p>
                                    </div>
                                    <div>
                                        <StatusLabel tone={status.tone}>
                                            {status.label}
                                        </StatusLabel>
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            {manufacturer.products_count} peças
                                            no portfólio
                                        </p>
                                    </div>
                                    <div className="flex justify-end">
                                        {manufacturer.affiliation_status ===
                                        'active' ? (
                                            <Button
                                                asChild
                                                className="min-h-11 rounded-[2px] bg-[#18181f] text-white shadow-none"
                                            >
                                                <Link
                                                    href={rep.catalog(
                                                        manufacturer.slug,
                                                    )}
                                                >
                                                    Abrir coleção{' '}
                                                    <ArrowRight className="size-4" />
                                                </Link>
                                            </Button>
                                        ) : canApply ? (
                                            <Button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedManufacturer(
                                                        manufacturer,
                                                    )
                                                }
                                                className="min-h-11 rounded-[2px] bg-[#ff4d3d] text-[#18181f] shadow-none hover:bg-[#f23c2e]"
                                            >
                                                Apresentar-se{' '}
                                                <ArrowRight className="size-4" />
                                            </Button>
                                        ) : (
                                            <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                                <Check className="size-4" />{' '}
                                                Apresentação enviada
                                            </span>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                ) : (
                    <div className="mt-8 grid min-h-80 place-items-center border border-dashed border-border bg-white/35 px-6 text-center">
                        <div>
                            <PackageOpen className="mx-auto size-8 text-muted-foreground" />
                            <h2 className="mt-5 font-zouth-display text-2xl font-semibold tracking-[-0.035em]">
                                Nenhuma coleção encontrada.
                            </h2>
                            <p className="mt-3 text-sm text-muted-foreground">
                                Ajuste a busca para encontrar novas marcas.
                            </p>
                        </div>
                    </div>
                )}

                <ApplicationSheet
                    key={selectedManufacturer?.id ?? 'empty'}
                    manufacturer={selectedManufacturer}
                    profile={profile}
                    onClose={() => setSelectedManufacturer(null)}
                />
            </div>
        </AppLayout>
    );
}
