import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowRight, Check, PackageOpen, Search, Send, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import InputError from '@/components/input-error';
import { RepresentativeShareLink } from '@/components/representative-share-link';
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
    cover_url: string | null;
    affiliation_status: AffiliationStatus;
    affiliation_id: number | null;
    share_url: string | null;
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
    { value: 'all', label: 'Explorar' },
    { value: 'mine', label: 'Minhas parcerias' },
];

function statusFor(status: AffiliationStatus): {
    label: string;
    tone: StatusLabelTone;
} {
    return {
        none: { label: 'Nova conexão', tone: 'neutral' },
        pending: { label: 'Em análise', tone: 'coral' },
        active: { label: 'Parceria ativa', tone: 'mineral' },
        rejected: { label: 'Solicitação não aprovada', tone: 'muted' },
        revoked: { label: 'Parceria encerrada', tone: 'muted' },
    }[status] as { label: string; tone: StatusLabelTone };
}

function BrandMark({ manufacturer }: { manufacturer: Manufacturer }) {
    return manufacturer.logo_url ? (
        <span className="flex size-11 shrink-0 items-center justify-center border border-border bg-white p-1.5">
            <img
                src={manufacturer.logo_url}
                alt=""
                className="max-h-full max-w-full object-contain"
            />
        </span>
    ) : (
        <span
            className="flex size-11 shrink-0 items-center justify-center bg-[#18181f] font-zouth-display text-sm font-semibold text-white"
            aria-hidden="true"
        >
            {manufacturer.name.slice(0, 2).toUpperCase()}
        </span>
    );
}

const collectionIllustrations = [
    '/brand/zouth/assets/photo-rack.png',
    '/brand/zouth/landing/collection-craft.webp',
    '/brand/zouth/landing/collection-in-motion.webp',
];

function CollectionCover({
    url,
    illustration,
}: {
    url: string | null;
    illustration: string;
}) {
    const [failed, setFailed] = useState(false);
    const isIllustration = !url || failed;

    return (
        <div className="relative aspect-[3/2] overflow-hidden border-b border-border bg-[#e7e3dc]">
            <img
                src={isIllustration ? illustration : url}
                alt=""
                loading="lazy"
                decoding="async"
                onError={isIllustration ? undefined : () => setFailed(true)}
                className={cn(
                    'size-full object-cover',
                    isIllustration && 'object-[center_43%]',
                )}
            />
            {isIllustration && (
                <span className="absolute right-2 bottom-2 bg-[#18181f] px-2 py-1 text-[0.65rem] font-semibold text-white">
                    Imagem ilustrativa
                </span>
            )}
        </div>
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

    useEffect(
        () => () => {
            if (searchTimer.current !== null)
                window.clearTimeout(searchTimer.current);
        },
        [],
    );

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
        <AppLayout
            breadcrumbs={[
                { title: 'Vitrine', href: rep.manufacturers.index().url },
            ]}
        >
            <Head title="Vitrine" />
            <div className="mx-auto w-full max-w-[1560px] min-w-0 px-4 py-7 sm:px-7 sm:py-8 xl:px-10 xl:py-9">
                <header>
                    <p className="text-[0.66rem] font-bold tracking-[0.24em] text-[#cf3428] uppercase">
                        Representação comercial
                    </p>
                    <h1 className="mt-3 font-zouth-display text-[clamp(2.7rem,4.5vw,4.35rem)] leading-none font-semibold tracking-[-0.06em]">
                        Vitrine<span className="text-[#ff4d3d]">.</span>
                    </h1>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                        Encontre a próxima coleção da sua carteira.
                    </p>
                </header>

                <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] lg:items-end lg:border-b lg:border-border">
                    <nav
                        aria-label="Seções da Vitrine"
                        className="grid min-w-0 grid-cols-2 border-b border-border sm:flex lg:border-b-0"
                    >
                        {segments.map((segment) => {
                            const current =
                                (filters.status === 'mine' ? 'mine' : 'all') ===
                                segment.value;
                            return (
                                <Link
                                    key={segment.value}
                                    href={rep.manufacturers.index({
                                        query: {
                                            status:
                                                segment.value === 'mine'
                                                    ? 'mine'
                                                    : undefined,
                                            search: search || undefined,
                                        },
                                    })}
                                    preserveState
                                    replace
                                    aria-current={current ? 'page' : undefined}
                                    onClick={() => {
                                        if (searchTimer.current !== null)
                                            window.clearTimeout(
                                                searchTimer.current,
                                            );
                                    }}
                                    className={cn(
                                        'flex min-h-12 min-w-0 items-center justify-center border-b-2 px-2 py-2 text-center text-sm font-semibold sm:px-4',
                                        current
                                            ? 'border-[#ff4d3d] text-foreground'
                                            : 'border-transparent text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {segment.label}
                                </Link>
                            );
                        })}
                    </nav>
                    <div className="relative min-w-0 lg:mb-2">
                        <Search
                            aria-hidden="true"
                            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                            value={search}
                            onChange={(event) =>
                                updateSearch(event.target.value)
                            }
                            placeholder="Buscar marca ou coleção"
                            aria-label="Buscar marca ou coleção"
                            className="min-h-11 rounded-[2px] border-border bg-background pr-10 pl-10 shadow-none"
                        />
                        {search && (
                            <button
                                type="button"
                                aria-label="Limpar busca"
                                onClick={() => updateSearch('')}
                                className="absolute inset-y-0 right-0 grid w-11 place-items-center"
                            >
                                <X aria-hidden="true" className="size-4" />
                            </button>
                        )}
                    </div>
                </div>

                {manufacturers.data.length ? (
                    <section
                        aria-label="Coleções da Vitrine"
                        className="mt-6 grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 xl:gap-6"
                    >
                        {manufacturers.data.map((manufacturer, index) => {
                            const state = manufacturer.affiliation_status;
                            const status = statusFor(state);
                            const location =
                                [manufacturer.city, manufacturer.state]
                                    .filter(Boolean)
                                    .join(' · ') || 'Brasil';
                            return (
                                <article
                                    key={manufacturer.id}
                                    className="flex min-w-0 flex-col overflow-hidden rounded-[2px] border border-border bg-background"
                                >
                                    <CollectionCover
                                        key={
                                            manufacturer.cover_url ??
                                            'illustration'
                                        }
                                        url={manufacturer.cover_url}
                                        illustration={
                                            collectionIllustrations[
                                                index %
                                                    collectionIllustrations.length
                                            ]
                                        }
                                    />
                                    <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <BrandMark
                                                manufacturer={manufacturer}
                                            />
                                            <div className="min-w-0">
                                                <h2 className="font-zouth-display text-lg leading-tight font-semibold tracking-[-0.035em] break-words">
                                                    {manufacturer.name}
                                                </h2>
                                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    {location} ·{' '}
                                                    {
                                                        manufacturer.products_count
                                                    }{' '}
                                                    {manufacturer.products_count ===
                                                    1
                                                        ? 'peça'
                                                        : 'peças'}
                                                </p>
                                            </div>
                                        </div>
                                        {manufacturer.tagline && (
                                            <p className="mt-3 line-clamp-2 text-sm leading-5 text-muted-foreground">
                                                {manufacturer.tagline}
                                            </p>
                                        )}
                                        {state !== 'none' && (
                                            <div className="mt-3">
                                                <StatusLabel tone={status.tone}>
                                                    {status.label}
                                                </StatusLabel>
                                            </div>
                                        )}
                                        <div className="mt-auto pt-4">
                                            {state === 'active' &&
                                            !manufacturer.share_url ? (
                                                <p className="flex min-h-11 items-center justify-center bg-[#e7e3dc]/55 px-2 text-center text-sm font-semibold text-muted-foreground">
                                                    Catálogo indisponível
                                                </p>
                                            ) : state === 'active' ? (
                                                <div
                                                    className={cn(
                                                        'grid gap-2',
                                                        manufacturer.share_url &&
                                                            'grid-cols-2',
                                                    )}
                                                >
                                                    {manufacturer.share_url && (
                                                        <RepresentativeShareLink
                                                            url={
                                                                manufacturer.share_url
                                                            }
                                                            compact
                                                        />
                                                    )}
                                                    <Button
                                                        asChild
                                                        className="min-h-11 rounded-[2px] bg-[#18181f] px-2 text-white shadow-none hover:bg-[#303039]"
                                                    >
                                                        <Link
                                                            href={rep.catalog(
                                                                manufacturer.slug,
                                                            )}
                                                        >
                                                            Ver coleção{' '}
                                                            <ArrowRight
                                                                aria-hidden="true"
                                                                className="size-4"
                                                            />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            ) : state === 'none' ||
                                              state === 'rejected' ? (
                                                <Button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedManufacturer(
                                                            manufacturer,
                                                        )
                                                    }
                                                    className="min-h-11 w-full rounded-[2px] bg-[#ff4d3d] text-[#18181f] shadow-none hover:bg-[#f23c2e]"
                                                >
                                                    {state === 'rejected'
                                                        ? 'Enviar nova apresentação'
                                                        : 'Solicitar parceria'}{' '}
                                                    <ArrowRight
                                                        aria-hidden="true"
                                                        className="size-4"
                                                    />
                                                </Button>
                                            ) : (
                                                <p className="flex min-h-11 items-center justify-center gap-2 bg-[#e7e3dc]/55 px-2 text-center text-sm font-semibold text-muted-foreground">
                                                    {state === 'pending' ? (
                                                        <>
                                                            <Check
                                                                aria-hidden="true"
                                                                className="size-4"
                                                            />{' '}
                                                            Apresentação enviada
                                                        </>
                                                    ) : (
                                                        'Sem parceria ativa'
                                                    )}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </section>
                ) : (
                    <div className="mt-6 grid min-h-64 place-items-center border border-dashed border-border px-6 text-center">
                        <div>
                            <PackageOpen
                                aria-hidden="true"
                                className="mx-auto size-8 text-muted-foreground"
                            />
                            <h2 className="mt-4 font-zouth-display text-xl font-semibold tracking-[-0.035em]">
                                {!search && filters.status === 'mine'
                                    ? 'Você ainda não tem parcerias.'
                                    : 'Nenhuma coleção encontrada.'}
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {!search && filters.status === 'mine'
                                    ? 'Explore a Vitrine e encontre sua primeira coleção.'
                                    : 'Tente buscar por outro nome.'}
                            </p>
                            {!search && filters.status === 'mine' && (
                                <Button
                                    asChild
                                    variant="outline"
                                    className="mt-4"
                                >
                                    <Link href={rep.manufacturers.index()}>
                                        Explorar Vitrine
                                    </Link>
                                </Button>
                            )}
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
