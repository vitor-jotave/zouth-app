import { Head, Link, usePage } from '@inertiajs/react';
import {
    ChevronRight,
    Smartphone,
    Zap,
    FileWarning,
    CheckCircle2,
    Users,
    Layers,
    Menu,
    X,
    Plus,
    Minus,
    Layout,
    MousePointer2,
    Printer,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { dashboard, login, register } from '@/routes';
import { lgpd, privacy, terms } from '@/routes/legal';
import type { SharedData } from '@/types';

type CommercialLinks = {
    salesContactUrl: string;
    demoCatalogUrl: string | null;
};

const Navbar = ({
    auth,
    canRegister = true,
    salesContactUrl,
}: {
    auth: SharedData['auth'];
    canRegister?: boolean;
    salesContactUrl: string;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav
            className={`fixed z-50 w-full transition-all duration-300 ${scrolled ? 'bg-white py-3 shadow-sm' : 'bg-transparent py-5'}`}
        >
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c1554c]">
                        <span className="text-xl font-bold text-white">Z</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900">
                        Zouth <span className="text-[#c1554c]">Suíte</span>
                    </span>
                </div>

                <div className="hidden items-center gap-8 md:flex">
                    <a
                        href="#solucao"
                        className="text-sm font-medium text-slate-600 transition-colors hover:text-[#c1554c]"
                    >
                        Solução
                    </a>
                    <a
                        href="#personas"
                        className="text-sm font-medium text-slate-600 transition-colors hover:text-[#c1554c]"
                    >
                        Para quem?
                    </a>
                    <a
                        href="#beneficios"
                        className="text-sm font-medium text-slate-600 transition-colors hover:text-[#c1554c]"
                    >
                        Benefícios
                    </a>
                    <a
                        href="#faq"
                        className="text-sm font-medium text-slate-600 transition-colors hover:text-[#c1554c]"
                    >
                        FAQ
                    </a>
                </div>

                <div className="hidden items-center gap-4 md:flex">
                    {auth.user ? (
                        <Link
                            href={auth.dashboard_url ?? dashboard()}
                            className="rounded-full bg-[#c1554c] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#a84741] hover:shadow-lg"
                        >
                            Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link
                                href={login()}
                                className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                            >
                                Entrar
                            </Link>
                            {canRegister && (
                                <Link
                                    href={register()}
                                    className="text-sm font-semibold text-slate-700 hover:text-slate-900"
                                >
                                    Sou representante
                                </Link>
                            )}
                            <a
                                href={salesContactUrl}
                                className="rounded-full bg-[#c1554c] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#a84741] hover:shadow-lg"
                            >
                                Solicitar demonstração
                            </a>
                        </>
                    )}
                </div>

                <button
                    type="button"
                    className="md:hidden"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
                    aria-expanded={isOpen}
                    aria-controls="mobile-navigation"
                >
                    {isOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div
                    id="mobile-navigation"
                    className="absolute flex w-full flex-col gap-4 border-t border-slate-100 bg-white p-6 shadow-xl md:hidden"
                >
                    <a
                        href="#solucao"
                        className="font-medium text-slate-700"
                        onClick={() => setIsOpen(false)}
                    >
                        Solução
                    </a>
                    <a
                        href="#personas"
                        className="font-medium text-slate-700"
                        onClick={() => setIsOpen(false)}
                    >
                        Para quem?
                    </a>
                    <a
                        href="#beneficios"
                        className="font-medium text-slate-700"
                        onClick={() => setIsOpen(false)}
                    >
                        Benefícios
                    </a>
                    {auth.user ? (
                        <Link
                            href={auth.dashboard_url ?? dashboard()}
                            className="rounded-xl bg-[#c1554c] py-3 text-center font-semibold text-white"
                        >
                            Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link
                                href={login()}
                                className="py-3 text-center font-semibold text-slate-700"
                            >
                                Entrar
                            </Link>
                            {canRegister && (
                                <Link
                                    href={register()}
                                    className="rounded-xl bg-[#c1554c] py-3 text-center font-semibold text-white"
                                >
                                    Cadastro de representante
                                </Link>
                            )}
                            <a
                                href={salesContactUrl}
                                className="rounded-xl bg-[#c1554c] py-3 text-center font-semibold text-white"
                            >
                                Solicitar demonstração
                            </a>
                        </>
                    )}
                </div>
            )}
        </nav>
    );
};

const Hero = ({ commercial }: { commercial: CommercialLinks }) => {
    return (
        <section className="relative overflow-hidden pt-32 pb-20 md:pt-48 md:pb-32">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 -z-10 h-full w-1/2 rounded-bl-[100px] bg-slate-50 opacity-50" />
            <div className="absolute top-40 left-10 -z-10 h-64 w-64 rounded-full bg-[#fce8e6] opacity-30 blur-3xl" />

            <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 md:grid-cols-2">
                <div>
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#fef5f4] px-4 py-1.5 text-xs font-bold tracking-wider text-[#a84741] uppercase">
                        <Zap size={14} /> Foco em Atacado Infantil
                    </div>
                    <h1 className="mb-6 text-4xl leading-tight font-extrabold text-slate-900 md:text-6xl">
                        Substitua seus{' '}
                        <span className="text-[#c1554c]">PDFs</span> por um
                        Showroom Digital Premium.
                    </h1>
                    <p className="mb-10 max-w-lg text-lg leading-relaxed text-slate-600 md:text-xl">
                        Zouth Suíte é o catálogo digital vivo e rastreável feito
                        para fabricantes e representantes de moda infantil.
                        Menos caos de versões, mais pedidos fechados.
                    </p>
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <a
                            href={
                                commercial.demoCatalogUrl ||
                                commercial.salesContactUrl
                            }
                            className="flex items-center justify-center gap-2 rounded-full bg-[#c1554c] px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:translate-y-[-2px] hover:bg-[#a84741]"
                        >
                            {commercial.demoCatalogUrl
                                ? 'Ver catálogo demonstrativo'
                                : 'Solicitar demonstração'}{' '}
                            <ChevronRight size={20} />
                        </a>
                        <a
                            href={commercial.salesContactUrl}
                            className="rounded-full border border-slate-200 bg-white px-8 py-4 text-center text-lg font-bold text-slate-700 transition-all hover:border-[#c1554c]"
                        >
                            Falar com o comercial
                        </a>
                    </div>
                    <div className="mt-8 flex items-center gap-4 text-sm font-medium text-slate-500">
                        <span className="flex items-center gap-1">
                            <CheckCircle2
                                size={16}
                                className="text-green-500"
                            />{' '}
                            Multi-tenant
                        </span>
                        <span className="flex items-center gap-1">
                            <CheckCircle2
                                size={16}
                                className="text-green-500"
                            />{' '}
                            Links Rastreáveis
                        </span>
                    </div>
                </div>

                <div className="relative">
                    <div className="relative z-10 rounded-3xl border border-slate-100 bg-white p-4 shadow-2xl">
                        <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-50">
                            {/* Mockup do App */}
                            <div className="absolute inset-0 p-6">
                                <div className="mb-6 flex items-center justify-between">
                                    <div className="h-6 w-1/2 animate-pulse rounded bg-slate-200" />
                                    <div className="h-10 w-10 rounded-full bg-[#fce8e6]" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="aspect-square rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                                        <div className="mb-2 h-2/3 w-full rounded-lg bg-[#fef5f4]" />
                                        <div className="mb-1 h-2 w-full rounded bg-slate-100" />
                                        <div className="h-2 w-2/3 rounded bg-slate-100" />
                                    </div>
                                    <div className="aspect-square rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
                                        <div className="mb-2 h-2/3 w-full rounded-lg bg-[#fef5f4]" />
                                        <div className="mb-1 h-2 w-full rounded bg-slate-100" />
                                        <div className="h-2 w-2/3 rounded bg-slate-100" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Sombra de fundo */}
                    <div className="absolute -bottom-6 -left-6 -z-10 h-full w-full rounded-3xl bg-[#c1554c]/5" />
                </div>
            </div>
        </section>
    );
};

const Problem = () => {
    return (
        <section
            className="relative overflow-hidden bg-slate-900 py-24 text-white"
            id="solucao"
        >
            <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 md:grid-cols-2">
                <div>
                    <h2 className="mb-6 text-3xl font-bold md:text-4xl">
                        O "caos do PDF" está matando suas vendas no atacado.
                    </h2>
                    <p className="mb-8 text-lg leading-relaxed text-slate-400">
                        Arquivos pesados que travam no 4G, lojistas perdidos em
                        versões desatualizadas e representantes vendendo itens
                        sem grade ou com preços errados.
                        <strong>
                            {' '}
                            Se sua vitrine é um PDF improvisado, você está
                            perdendo lucro.
                        </strong>
                    </p>

                    <div className="space-y-6">
                        {[
                            'Catálogo_2024_final_v3.pdf circulando no mercado.',
                            "Lojistas reclamando que 'aquele modelo não existe'.",
                            'Reps carregando pastas pesadas e desorganizadas.',
                            'Zero rastreio: você não sabe quem abre seus materiais.',
                            'Custos altíssimos com impressão e retrabalho.',
                        ].map((text, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <FileWarning
                                    className="shrink-0 text-red-400"
                                    size={20}
                                />
                                <span className="font-medium text-slate-300">
                                    {text}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-700 bg-slate-800/50 p-8 backdrop-blur-sm">
                    <div className="mb-8 flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#c1554c]/20 text-[#d88a85]">
                            <Zap size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">
                                Zouth resolve isso
                            </h3>
                            <p className="text-sm text-slate-400">
                                Um catálogo vivo, sempre atualizado.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="group flex cursor-default items-center justify-between rounded-xl border border-slate-700 bg-slate-800 p-4 transition-all hover:border-[#c1554c]">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                <span className="text-sm font-semibold">
                                    Atualização em Tempo Real
                                </span>
                            </div>
                            <CheckCircle2
                                size={18}
                                className="text-green-500"
                            />
                        </div>
                        <div className="group flex cursor-default items-center justify-between rounded-xl border border-slate-700 bg-slate-800 p-4 transition-all hover:border-[#c1554c]">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                <span className="text-sm font-semibold">
                                    Links Rastreáveis por Rep
                                </span>
                            </div>
                            <CheckCircle2
                                size={18}
                                className="text-green-500"
                            />
                        </div>
                        <div className="group flex cursor-default items-center justify-between rounded-xl border border-slate-700 bg-slate-800 p-4 transition-all hover:border-[#c1554c]">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                                <span className="text-sm font-semibold">
                                    Navegação Mobile Premium
                                </span>
                            </div>
                            <CheckCircle2
                                size={18}
                                className="text-green-500"
                            />
                        </div>
                    </div>

                    <p className="mt-8 text-center font-bold text-[#d88a85] italic">
                        "Transforme sua vitrine em um motor de vendas."
                    </p>
                </div>
            </div>
        </section>
    );
};

const FeatureCard = ({
    icon: Icon,
    title,
    description,
}: {
    icon: LucideIcon;
    title: string;
    description: string;
}) => (
    <div className="group rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition-all hover:translate-y-[-5px] hover:shadow-xl">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fef5f4] text-[#c1554c] transition-all group-hover:bg-[#c1554c] group-hover:text-white">
            <Icon size={28} />
        </div>
        <h3 className="mb-4 text-xl font-bold text-slate-900">{title}</h3>
        <p className="text-sm leading-relaxed text-slate-600">{description}</p>
    </div>
);

const Features = () => {
    return (
        <section className="bg-white py-24" id="beneficios">
            <div className="mx-auto max-w-7xl px-6">
                <div className="mx-auto mb-20 max-w-2xl text-center">
                    <span className="mb-4 block text-xs font-bold tracking-widest text-[#c1554c] uppercase">
                        Recursos
                    </span>
                    <h2 className="mb-6 text-3xl font-extrabold text-slate-900 md:text-5xl">
                        O Showroom Digital que sua coleção infantil merece.
                    </h2>
                    <p className="text-slate-600">
                        Construído especificamente para a dinâmica de
                        fabricantes e lojistas de moda e enxoval.
                    </p>
                </div>

                <div className="grid gap-8 md:grid-cols-3">
                    <FeatureCard
                        icon={Layers}
                        title="Gestão Multi-tenant"
                        description="Um só ecossistema para organizar catálogos de múltiplos fabricantes, com acesso dedicado para reps globais e lojistas."
                    />
                    <FeatureCard
                        icon={MousePointer2}
                        title="Links Rastreáveis"
                        description="Registre acessos ao catálogo e identifique a origem de links compartilhados por representantes."
                    />
                    <FeatureCard
                        icon={Smartphone}
                        title="Mobile-First Nativo"
                        description="O lojista navega no celular com a mesma facilidade de um e-commerce premium, sem precisar instalar nada."
                    />
                    <FeatureCard
                        icon={Printer}
                        title="Fim dos Custos de Impressão"
                        description="Atualize fotos, preços e grade em minutos e economize milhares de reais em reimpressões desnecessárias."
                    />
                    <FeatureCard
                        icon={Users}
                        title="Controle de Representantes"
                        description="Gerencie vínculos de representantes e acompanhe os pedidos associados a cada operação."
                    />
                    <FeatureCard
                        icon={Layout}
                        title="Personalização Visual"
                        description="Layouts pensados para encantar: fundos, logos e storytelling de coleção alinhados com a estética infantil premium."
                    />
                </div>
            </div>
        </section>
    );
};

const PersonaBenefits = () => {
    const [activePersona, setActivePersona] = useState(0);

    const personas = [
        {
            title: 'Para Fabricantes',
            icon: <Layers size={20} />,
            points: [
                'Atualização instantânea de mix e preços',
                'Visibilidade sobre vínculos e pedidos dos representantes',
                'Redução de retrabalho com notas de crédito e erros',
                'Percepção de marca profissional e moderna',
            ],
            color: 'bg-[#c1554c]',
        },
        {
            title: 'Para Representantes',
            icon: <Users size={20} />,
            points: [
                'Catálogo leve que abre instantaneamente no 4G',
                'Links personalizados para saber quem abriu',
                'Filtros por categoria e variações cadastradas',
                'Apresentação mais fluida e consultiva',
            ],
            color: 'bg-teal-600',
        },
        {
            title: 'Para Lojistas',
            icon: <Smartphone size={20} />,
            points: [
                'Navegação rápida sem baixar arquivos pesados',
                'Informações claras de grade, preço e estoque',
                'Segurança de estar vendo a coleção atualizada',
                'Experiência de compra próxima de um showroom físico',
            ],
            color: 'bg-blue-600',
        },
    ];

    return (
        <section className="bg-slate-50 py-24" id="personas">
            <div className="mx-auto max-w-7xl px-6">
                <div className="flex flex-col gap-12 md:flex-row">
                    <div className="md:w-1/3">
                        <h2 className="mb-8 text-3xl font-bold text-slate-900">
                            Benefícios para todos os elos da venda.
                        </h2>
                        <div className="space-y-4">
                            {personas.map((p, i) => (
                                <button
                                    key={i}
                                    onClick={() => setActivePersona(i)}
                                    className={`flex w-full items-center gap-4 rounded-2xl p-4 text-left font-bold transition-all ${
                                        activePersona === i
                                            ? `${p.color} text-white shadow-lg`
                                            : 'bg-white text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    <span
                                        className={`rounded-lg p-2 ${activePersona === i ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}
                                    >
                                        {p.icon}
                                    </span>
                                    {p.title}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="md:w-2/3">
                        <div className="flex min-h-[400px] flex-col justify-center rounded-[40px] border border-slate-100 bg-white p-8 shadow-xl md:p-12">
                            <div
                                className={`mb-8 flex h-16 w-16 items-center justify-center rounded-2xl text-white ${personas[activePersona].color}`}
                            >
                                {personas[activePersona].icon}
                            </div>
                            <h3 className="mb-10 text-3xl font-bold text-slate-900">
                                {personas[activePersona].title}
                            </h3>
                            <div className="grid gap-6 md:grid-cols-2">
                                {personas[activePersona].points.map(
                                    (point, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-3"
                                        >
                                            <CheckCircle2
                                                className="shrink-0 text-green-500"
                                                size={24}
                                            />
                                            <span className="text-lg font-medium text-slate-700">
                                                {point}
                                            </span>
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

const Comparison = () => {
    const tableData = [
        {
            feature: 'Atualização de Preços',
            pdf: 'Gerar novo arquivo e reenviar',
            zouth: 'Instantânea para todos os links',
        },
        {
            feature: 'Origem dos Acessos',
            pdf: 'Inexistente',
            zouth: 'Registro de visita e origem do link',
        },
        {
            feature: 'Navegação Mobile',
            pdf: 'Zoom cansativo e rolagem infinita',
            zouth: 'Nativo, fluido e intuitivo',
        },
        {
            feature: 'Controle de Versão',
            pdf: 'Caótico (várias versões circulando)',
            zouth: 'Fonte única da verdade',
        },
        {
            feature: 'Custo por Coleção',
            pdf: 'Impressão + Horas de Design',
            zouth: 'Assinatura SaaS fixa e previsível',
        },
    ];

    return (
        <section className="bg-white py-24">
            <div className="mx-auto max-w-7xl px-6">
                <h2 className="mb-16 text-center text-3xl font-bold">
                    PDF Tradicional vs. Zouth Suíte
                </h2>
                <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-sm">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="p-6 text-xs font-bold text-slate-500 uppercase">
                                    Funcionalidade
                                </th>
                                <th className="p-6 font-bold text-slate-900">
                                    Catálogo em PDF
                                </th>
                                <th className="bg-[#fef5f4]/50 p-6 font-bold text-[#c1554c]">
                                    Zouth Suíte
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tableData.map((row, i) => (
                                <tr
                                    key={i}
                                    className="transition-colors hover:bg-slate-50"
                                >
                                    <td className="p-6 text-sm font-bold text-slate-700">
                                        {row.feature}
                                    </td>
                                    <td className="p-6 text-sm text-slate-500">
                                        {row.pdf}
                                    </td>
                                    <td className="bg-[#fef5f4]/20 p-6 text-sm font-semibold text-slate-900">
                                        {row.zouth}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
};

const FAQItem = ({
    question,
    answer,
}: {
    question: string;
    answer: string;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-slate-100 py-6 last:border-0">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between text-left text-lg font-bold text-slate-800 transition-colors hover:text-[#c1554c]"
            >
                {question}
                {isOpen ? (
                    <Minus size={20} className="text-[#c1554c]" />
                ) : (
                    <Plus size={20} className="text-slate-400" />
                )}
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ${isOpen ? 'mt-4 max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <p className="leading-relaxed text-slate-600">{answer}</p>
            </div>
        </div>
    );
};

const FAQ = () => {
    return (
        <section className="bg-slate-50 py-24" id="faq">
            <div className="mx-auto max-w-3xl px-6">
                <div className="mb-16 text-center">
                    <h2 className="text-3xl font-bold text-slate-900">
                        Dúvidas Frequentes
                    </h2>
                    <p className="mt-4 text-slate-500">
                        Tudo o que você precisa saber sobre o Zouth Suíte.
                    </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                    <FAQItem
                        question="Meus lojistas precisam instalar algum aplicativo?"
                        answer="Não! O catálogo é acessado diretamente pelo navegador via link. É tão simples quanto abrir um site, mas com a experiência de um app premium."
                    />
                    <FAQItem
                        question="Como funciona o rastreamento?"
                        answer="O catálogo registra visitas e parâmetros de origem do link. Isso permite acompanhar acessos associados às divulgações sem prometer identificação quando o visitante não se apresenta."
                    />
                    <FAQItem
                        question="É difícil cadastrar os produtos?"
                        answer="O cadastro é feito pelo painel com produtos, imagens, preços, estoque e variações. No onboarding assistido, o suporte orienta a configuração inicial."
                    />
                    <FAQItem
                        question="Já tenho um e-commerce B2B, o Zouth substitui ele?"
                        answer="O Zouth funciona como um showroom premium focado em desejo e apresentação de coleção. Ele complementa seu B2B, servindo como a 'vitrine de entrada' que encanta o lojista antes do fechamento."
                    />
                </div>
            </div>
        </section>
    );
};

const CTASection = ({ salesContactUrl }: { salesContactUrl: string }) => {
    return (
        <section className="relative overflow-hidden bg-white py-24">
            <div className="mx-auto max-w-7xl px-6">
                <div className="relative overflow-hidden rounded-[50px] bg-slate-900 p-12 text-center md:p-24">
                    {/* Circulos decorativos */}
                    <div className="absolute top-0 right-0 h-96 w-96 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#c1554c]/10" />
                    <div className="absolute bottom-0 left-0 h-64 w-64 -translate-x-1/2 translate-y-1/2 rounded-full bg-[#c1554c]/10" />

                    <div className="relative z-10 mx-auto max-w-2xl">
                        <h2 className="mb-8 text-4xl font-bold text-white md:text-5xl">
                            Pronto para transformar sua vitrine digital?
                        </h2>
                        <p className="mb-12 text-lg text-[#fce8e6]">
                            Dê adeus ao caos dos PDFs e comece a vender com um
                            catálogo que acompanha o ritmo da sua coleção.
                        </p>
                        <div className="flex flex-col justify-center gap-4 sm:flex-row">
                            <a
                                href={salesContactUrl}
                                className="rounded-full bg-[#c1554c] px-10 py-5 text-xl font-bold text-white shadow-xl transition-all hover:scale-105 hover:bg-[#a84741]"
                            >
                                Solicitar demonstração
                            </a>
                            <a
                                href={salesContactUrl}
                                className="rounded-full border border-white/20 bg-white/10 px-10 py-5 text-xl font-bold text-white transition-all hover:bg-white/20"
                            >
                                Falar com o comercial
                            </a>
                        </div>
                        <p className="mt-8 text-sm font-medium text-slate-400">
                            Agende uma demonstração de 15 minutos e veja na
                            prática.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

const Footer = ({ salesContactUrl }: { salesContactUrl: string }) => {
    return (
        <footer className="border-t border-slate-100 bg-white pt-20 pb-10">
            <div className="mx-auto mb-20 grid max-w-7xl gap-12 px-6 md:grid-cols-4">
                <div className="col-span-1">
                    <div className="mb-6 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#c1554c]">
                            <span className="text-xl font-bold text-white">
                                Z
                            </span>
                        </div>
                        <span className="text-xl font-bold tracking-tight text-slate-900">
                            Zouth <span className="text-[#c1554c]">Suíte</span>
                        </span>
                    </div>
                    <p className="mb-6 text-sm leading-relaxed text-slate-500">
                        A solução definitiva para catálogos digitais no atacado
                        infantil. Modernidade, controle e performance para sua
                        marca.
                    </p>
                    <a
                        href={salesContactUrl}
                        className="text-sm font-semibold text-[#a84741] hover:underline"
                    >
                        Falar com o comercial
                    </a>
                </div>

                <div>
                    <h4 className="mb-6 font-bold text-slate-900">Produto</h4>
                    <ul className="space-y-4 text-sm font-medium text-slate-500">
                        <li>
                            <a
                                href="#beneficios"
                                className="transition-colors hover:text-[#c1554c]"
                            >
                                Funcionalidades
                            </a>
                        </li>
                        <li>
                            <a
                                href="#solucao"
                                className="transition-colors hover:text-[#c1554c]"
                            >
                                Showroom Digital
                            </a>
                        </li>
                        <li>
                            <a
                                href={salesContactUrl}
                                className="transition-colors hover:text-[#c1554c]"
                            >
                                Planos
                            </a>
                        </li>
                    </ul>
                </div>

                <div>
                    <h4 className="mb-6 font-bold text-slate-900">Para Quem</h4>
                    <ul className="space-y-4 text-sm font-medium text-slate-500">
                        <li>
                            <a
                                href="#personas"
                                className="transition-colors hover:text-[#c1554c]"
                            >
                                Fabricantes
                            </a>
                        </li>
                        <li>
                            <a
                                href="#personas"
                                className="transition-colors hover:text-[#c1554c]"
                            >
                                Representantes
                            </a>
                        </li>
                        <li>
                            <a
                                href="#personas"
                                className="transition-colors hover:text-[#c1554c]"
                            >
                                Lojistas Multimarcas
                            </a>
                        </li>
                    </ul>
                </div>

                <div>
                    <h4 className="mb-6 font-bold text-slate-900">Empresa</h4>
                    <ul className="space-y-4 text-sm font-medium text-slate-500">
                        <li>
                            <a
                                href={salesContactUrl}
                                className="transition-colors hover:text-[#c1554c]"
                            >
                                Suporte e contato
                            </a>
                        </li>
                        <li>
                            <Link
                                href={lgpd()}
                                className="transition-colors hover:text-[#c1554c]"
                            >
                                LGPD
                            </Link>
                        </li>
                    </ul>
                </div>
            </div>

            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 border-t border-slate-50 px-6 pt-10 md:flex-row">
                <p className="text-xs font-medium text-slate-400">
                    © 2026 Zouth. Todos os direitos reservados.
                </p>
                <div className="flex gap-8 text-xs font-bold tracking-widest text-slate-400 uppercase">
                    <Link href={terms()} className="hover:text-slate-600">
                        Termos
                    </Link>
                    <Link href={privacy()} className="hover:text-slate-600">
                        Privacidade
                    </Link>
                </div>
            </div>
        </footer>
    );
};

export default function App({
    canRegister = true,
    commercial,
}: {
    canRegister?: boolean;
    commercial: CommercialLinks;
}) {
    const { auth } = usePage<SharedData>().props;

    return (
        <>
            <Head title="Zouth Suíte - Catálogo Digital para Atacado Infantil" />
            <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-[#fce8e6] selection:text-[#c1554c]">
                <Navbar
                    auth={auth}
                    canRegister={canRegister}
                    salesContactUrl={commercial.salesContactUrl}
                />
                <Hero commercial={commercial} />
                <Problem />
                <Features />
                <PersonaBenefits />
                <Comparison />
                <FAQ />
                <CTASection salesContactUrl={commercial.salesContactUrl} />
                <Footer salesContactUrl={commercial.salesContactUrl} />
            </div>
        </>
    );
}
