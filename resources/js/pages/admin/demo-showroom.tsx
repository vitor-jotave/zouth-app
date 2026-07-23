import { Head, useForm, usePage } from '@inertiajs/react';
import {
    ArrowUpRight,
    Check,
    Copy,
    ExternalLink,
    Layers3,
    LoaderCircle,
    MessageSquareText,
    PackageOpen,
    RefreshCcw,
    ShieldCheck,
    ShoppingBag,
    Sparkles,
    UsersRound,
    Workflow,
} from 'lucide-react';
import { useState } from 'react';
import { store } from '@/actions/App/Http/Controllers/Admin/DemoShowroomController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import admin from '@/routes/admin';
import type { BreadcrumbItem, SharedData } from '@/types';

type ShowroomCounts = {
    products: number;
    combos: number;
    categories: number;
    variations: number;
    order_rules: number;
    orders: number;
    customers: number;
    representatives: number;
    funnels: number;
    automations: number;
    quick_replies: number;
    catalog_visits: number;
};

type Showroom = {
    id: number;
    name: string;
    email: string;
    plan_name: string | null;
    created_at: string;
    catalog_url: string | null;
    counts: ShowroomCounts;
};

type Props = {
    showroom: Showroom | null;
    has_active_plan: boolean;
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Administração', href: admin.dashboard().url },
    { title: 'Showroom demo', href: admin.demoShowroom.show().url },
];

const chapters = [
    {
        icon: PackageOpen,
        title: 'Coleção viva',
        description:
            '20 peças, 3 combos, categorias, cores, tamanhos e estoque.',
    },
    {
        icon: Layers3,
        title: 'Catálogo premium',
        description: 'Direção editorial, capa própria e coleção publicada.',
    },
    {
        icon: ShoppingBag,
        title: 'Operação comercial',
        description: 'Pedidos em cada etapa, regras, clientes e indicadores.',
    },
    {
        icon: UsersRound,
        title: 'Rede de venda',
        description: 'Representantes ativos, uma solicitação e um convite.',
    },
    {
        icon: MessageSquareText,
        title: 'Conversas reais',
        description: 'Chat preenchido, canal conectado e respostas rápidas.',
    },
    {
        icon: Workflow,
        title: 'Atendimento em movimento',
        description: '3 funis e 3 automações prontas para demonstrar.',
    },
];

const countLabels: Array<[keyof ShowroomCounts, string]> = [
    ['products', 'peças'],
    ['combos', 'combos'],
    ['orders', 'pedidos'],
    ['customers', 'clientes'],
    ['representatives', 'representantes'],
    ['funnels', 'funis'],
    ['automations', 'automações'],
    ['catalog_visits', 'visitas'],
];

export default function DemoShowroom({ showroom, has_active_plan }: Props) {
    const page = usePage<SharedData>();
    const credentials = page.props.flash?.demo_credentials;
    const [dialogOpen, setDialogOpen] = useState(false);
    const [copied, setCopied] = useState<'email' | 'password' | null>(null);
    const form = useForm({
        email: showroom?.email ?? 'showroom@zouth.app',
    });
    const createdLabel = showroom?.created_at
        ? new Intl.DateTimeFormat('pt-BR', {
              dateStyle: 'medium',
              timeStyle: 'short',
          }).format(new Date(showroom.created_at))
        : null;

    const copy = async (value: string, field: 'email' | 'password') => {
        await navigator.clipboard.writeText(value);
        setCopied(field);
        window.setTimeout(() => setCopied(null), 1800);
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        form.post(store.url(), {
            preserveScroll: true,
            onSuccess: () => setDialogOpen(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Showroom demo" />
            <main className="min-h-full bg-[#f2efe8] text-[#17171c]">
                <section className="border-b border-[#17171c]/14 px-5 py-10 md:px-10 md:py-14 xl:px-16">
                    <div className="mx-auto max-w-[1500px]">
                        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-end">
                            <div>
                                <p className="mb-5 flex items-center gap-3 font-sans text-[0.68rem] font-semibold tracking-[0.28em] text-[#ff4d3d] uppercase">
                                    <Sparkles
                                        className="size-4"
                                        aria-hidden="true"
                                    />
                                    Apresentação comercial
                                </p>
                                <h1 className="max-w-4xl font-sans text-[clamp(3.2rem,7vw,7.5rem)] leading-[0.88] font-semibold tracking-[-0.075em]">
                                    Uma marca pronta para entrar em cena
                                    <span className="text-[#ff4d3d]">.</span>
                                </h1>
                                <p className="mt-7 max-w-2xl text-base leading-7 text-[#67645f] md:text-lg">
                                    A Brisa Mini nasce preenchida de ponta a
                                    ponta para que a conversa comece pelo valor
                                    da Zouth — nunca por uma tela vazia.
                                </p>
                            </div>

                            <div className="border-l-2 border-[#ff4d3d] pl-6">
                                <p className="text-xs font-semibold tracking-[0.2em] uppercase">
                                    {showroom
                                        ? 'Showroom disponível'
                                        : 'Primeira montagem'}
                                </p>
                                <p className="mt-3 text-sm leading-6 text-[#77736d]">
                                    {showroom
                                        ? `Criado em ${createdLabel}. Reconstruir troca todo o conteúdo e gera uma nova senha.`
                                        : 'A montagem cria a conta, a coleção, o histórico comercial e o Atendimento em um único movimento.'}
                                </p>
                                <Button
                                    type="button"
                                    disabled={!has_active_plan}
                                    onClick={() => setDialogOpen(true)}
                                    className="mt-6 h-14 w-full rounded-none bg-[#ff4d3d] px-6 text-[#17171c] hover:bg-[#f13c2e]"
                                >
                                    {showroom ? (
                                        <RefreshCcw
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    ) : (
                                        <Sparkles
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    )}
                                    {showroom
                                        ? 'Reconstruir showroom'
                                        : 'Montar showroom'}
                                </Button>
                                {!has_active_plan && (
                                    <p className="mt-3 text-xs leading-5 text-[#b42318]">
                                        Ative ao menos um plano antes de montar
                                        o showroom.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="px-5 py-10 md:px-10 xl:px-16">
                    <div className="mx-auto max-w-[1500px]">
                        {credentials && (
                            <div className="mb-10 grid gap-6 border border-[#17171c] bg-[#17171c] p-6 text-[#f7f3ed] md:grid-cols-[1fr_auto] md:items-center md:p-8">
                                <div>
                                    <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-[#ff4d3d] uppercase">
                                        <ShieldCheck
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                        Copie agora
                                    </p>
                                    <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em]">
                                        A senha aparece somente desta vez.
                                    </h2>
                                    <p className="mt-2 text-sm text-[#aaa69f]">
                                        Guarde as credenciais no local usado
                                        pela equipe comercial.
                                    </p>
                                </div>
                                <div className="grid min-w-0 gap-2 sm:min-w-[390px]">
                                    {(['email', 'password'] as const).map(
                                        (field) => (
                                            <button
                                                key={field}
                                                type="button"
                                                onClick={() =>
                                                    copy(
                                                        credentials[field],
                                                        field,
                                                    )
                                                }
                                                className="flex min-w-0 items-center justify-between gap-4 border border-white/16 px-4 py-3 text-left transition hover:border-[#ff4d3d]"
                                            >
                                                <span className="min-w-0">
                                                    <span className="block text-[0.6rem] tracking-[0.18em] text-[#8e8a84] uppercase">
                                                        {field === 'email'
                                                            ? 'E-mail'
                                                            : 'Senha'}
                                                    </span>
                                                    <span className="block truncate font-mono text-sm">
                                                        {credentials[field]}
                                                    </span>
                                                </span>
                                                {copied === field ? (
                                                    <Check className="size-4 shrink-0 text-[#ff4d3d]" />
                                                ) : (
                                                    <Copy className="size-4 shrink-0" />
                                                )}
                                            </button>
                                        ),
                                    )}
                                </div>
                            </div>
                        )}

                        {showroom && (
                            <div className="mb-10 border-y border-[#17171c]/16 py-6">
                                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <p className="text-xs font-semibold tracking-[0.2em] text-[#ff4d3d] uppercase">
                                            {showroom.plan_name ??
                                                'Plano de demonstração'}
                                        </p>
                                        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
                                            {showroom.name}
                                        </h2>
                                        <p className="mt-1 text-sm text-[#77736d]">
                                            {showroom.email}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-3">
                                        <Button
                                            asChild
                                            variant="outline"
                                            className="h-11 rounded-none border-[#17171c]/25 bg-transparent"
                                        >
                                            <a
                                                href="/login"
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Abrir login
                                                <ArrowUpRight className="size-4" />
                                            </a>
                                        </Button>
                                        {showroom.catalog_url && (
                                            <Button
                                                asChild
                                                className="h-11 rounded-none bg-[#17171c] text-white hover:bg-[#303037]"
                                            >
                                                <a
                                                    href={showroom.catalog_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Abrir catálogo
                                                    <ExternalLink className="size-4" />
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-7 grid grid-cols-2 gap-px bg-[#17171c]/14 sm:grid-cols-4 xl:grid-cols-8">
                                    {countLabels.map(([key, label]) => (
                                        <div
                                            key={key}
                                            className="bg-[#f2efe8] px-4 py-5"
                                        >
                                            <p className="text-2xl font-semibold tracking-[-0.04em]">
                                                {showroom.counts[key]}
                                            </p>
                                            <p className="mt-1 text-[0.65rem] tracking-[0.14em] text-[#77736d] uppercase">
                                                {label}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid border-t border-[#17171c]/16 md:grid-cols-2 xl:grid-cols-3">
                            {chapters.map((chapter, index) => {
                                const Icon = chapter.icon;

                                return (
                                    <article
                                        key={chapter.title}
                                        className="group border-r border-b border-[#17171c]/16 px-1 py-8 pr-8 md:px-8 md:first:pl-0 xl:min-h-52"
                                    >
                                        <div className="flex items-start justify-between gap-5">
                                            <Icon
                                                className="size-6 text-[#ff4d3d]"
                                                strokeWidth={1.7}
                                            />
                                            <span className="font-mono text-[0.65rem] text-[#99948c]">
                                                0{index + 1}
                                            </span>
                                        </div>
                                        <h3 className="mt-10 text-xl font-semibold tracking-[-0.035em]">
                                            {chapter.title}
                                        </h3>
                                        <p className="mt-2 max-w-sm text-sm leading-6 text-[#77736d]">
                                            {chapter.description}
                                        </p>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>
            </main>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="rounded-none border-[#17171c] bg-[#f7f3ed] sm:max-w-xl">
                    <form onSubmit={submit}>
                        <DialogHeader>
                            <p className="text-xs font-semibold tracking-[0.2em] text-[#ff4d3d] uppercase">
                                {showroom
                                    ? 'Nova montagem'
                                    : 'Showroom Brisa Mini'}
                            </p>
                            <DialogTitle className="pt-2 text-3xl font-semibold tracking-[-0.05em]">
                                {showroom
                                    ? 'Reconstruir do zero.'
                                    : 'Preparar a apresentação.'}
                            </DialogTitle>
                            <DialogDescription className="pt-2 leading-6">
                                {showroom
                                    ? 'Todo o conteúdo do showroom atual será substituído. Contas reais e demais fabricantes não serão tocados.'
                                    : 'A Zouth criará a conta e preencherá cada área com uma história comercial coerente.'}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="my-7 space-y-2">
                            <Label htmlFor="showroom-email">
                                E-mail de acesso
                            </Label>
                            <Input
                                id="showroom-email"
                                type="email"
                                autoComplete="off"
                                value={form.data.email}
                                onChange={(event) =>
                                    form.setData('email', event.target.value)
                                }
                                className="h-13 rounded-none border-[#17171c]/30 bg-white shadow-none"
                            />
                            <InputError message={form.errors.email} />
                            <p className="text-xs leading-5 text-[#77736d]">
                                Uma senha forte será gerada e exibida uma única
                                vez após a montagem.
                            </p>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={form.processing}
                                onClick={() => setDialogOpen(false)}
                                className="h-12 rounded-none border-[#17171c]/25 bg-transparent"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={form.processing}
                                className="h-12 rounded-none bg-[#ff4d3d] px-6 text-[#17171c] hover:bg-[#f13c2e]"
                            >
                                {form.processing ? (
                                    <LoaderCircle className="size-4 animate-spin" />
                                ) : (
                                    <Sparkles className="size-4" />
                                )}
                                {form.processing
                                    ? 'Montando coleção...'
                                    : showroom
                                      ? 'Reconstruir agora'
                                      : 'Montar showroom'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
