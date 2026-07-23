import { Head, Link, router, usePage, useRemember } from '@inertiajs/react';
import gsap from 'gsap';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    FileSpreadsheet,
    ImagePlus,
    LogOut,
    PackagePlus,
    Sparkles,
} from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
    complete,
    preview,
    progress,
    store,
} from '@/actions/App/Http/Controllers/OnboardingController';
import PasswordRequirements from '@/components/password-requirements';
import { logout } from '@/routes';
import { privacy, terms } from '@/routes/legal';
import './onboarding.css';

type SellingMethod =
    | 'pdf_whatsapp'
    | 'representatives'
    | 'direct_retailers'
    | 'mixed';

type OnboardingProps = {
    stage: number;
    incompatibleAccount: { type: string; label: string } | null;
    manufacturer: {
        name: string;
        trial_ends_at: string | null;
        onboarding_context: { selling_method?: SellingMethod };
        email_verified: boolean;
    } | null;
    catalogPreview: {
        brand_name: string;
        accent_color: string;
        logo_url: string | null;
    } | null;
    session: {
        current_step: number;
        context: { brand_name?: string; selling_method?: SellingMethod };
    };
    errors: Record<string, string>;
};

const sellingMethods: Array<{
    value: SellingMethod;
    title: string;
    description: string;
}> = [
    {
        value: 'pdf_whatsapp',
        title: 'PDF e WhatsApp',
        description: 'A coleção circula em arquivos e conversas.',
    },
    {
        value: 'representatives',
        title: 'Representantes',
        description: 'Uma rede apresenta a coleção em diferentes praças.',
    },
    {
        value: 'direct_retailers',
        title: 'Direto para lojistas',
        description: 'A marca conversa e vende sem intermediários.',
    },
    {
        value: 'mixed',
        title: 'Um pouco de cada',
        description: 'A operação combina esses caminhos comerciais.',
    },
];

const palettes = ['#FF4D3D', '#5A2A4F', '#2E705A', '#D69C2F', '#24486B'];

function fieldError(errors: Record<string, string>, key: string) {
    return errors[key] ? <p className="zo-field-error">{errors[key]}</p> : null;
}

export default function OnboardingIndex() {
    const props = usePage<OnboardingProps>().props;
    const [stage, setStage] = useState(props.stage);
    const [brandName, setBrandName] = useRemember(
        props.manufacturer?.name ?? props.session.context.brand_name ?? '',
        'zouth-onboarding-brand',
    );
    const [sellingMethod, setSellingMethod] = useRemember<SellingMethod | ''>(
        props.manufacturer?.onboarding_context.selling_method ??
            props.session.context.selling_method ??
            '',
        'zouth-onboarding-method',
    );
    const [owner, setOwner] = useRemember(
        { name: '', email: '' },
        'zouth-onboarding-owner',
    );
    const [password, setPassword] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [accentColor, setAccentColor] = useState(
        props.catalogPreview?.accent_color ?? '#FF4D3D',
    );
    const [logo, setLogo] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState(
        props.catalogPreview?.logo_url ?? '',
    );
    const [processing, setProcessing] = useState(false);
    const rootRef = useRef<HTMLElement>(null);
    const stageRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setStage(props.stage);
    }, [props.stage]);

    useEffect(() => {
        const root = rootRef.current;

        if (
            !root ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            return;
        }

        const context = gsap.context(() => {
            const timeline = gsap.timeline({
                defaults: { ease: 'power3.out' },
            });
            timeline
                .from('.zo-cover__rule', {
                    scaleX: 0,
                    transformOrigin: 'left',
                    duration: 0.8,
                })
                .from(
                    '.zo-cover__image',
                    { clipPath: 'inset(100% 0 0 0)', duration: 1.05 },
                    0.08,
                )
                .from(
                    '.zo-cover__shape',
                    { xPercent: -110, duration: 0.9 },
                    0.16,
                )
                .from(
                    '.zo-cover__copy > *',
                    { y: 34, opacity: 0, stagger: 0.09, duration: 0.7 },
                    0.28,
                )
                .from('.zo-rail', { x: 54, opacity: 0, duration: 0.85 }, 0.36);
        }, root);

        return () => context.revert();
    }, []);

    useEffect(() => {
        const target = stageRef.current;

        if (
            !target ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ) {
            return;
        }

        gsap.fromTo(
            target.children,
            { y: 18, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                stagger: 0.055,
                duration: 0.48,
                ease: 'power3.out',
            },
        );
    }, [stage]);

    useEffect(() => {
        if (!logo) {
            return;
        }

        const url = URL.createObjectURL(logo);
        setLogoPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [logo]);

    const visibleBrandName =
        brandName.trim() || props.catalogPreview?.brand_name || 'Sua marca';

    const goTo = (nextStage: number) => {
        if (nextStage > stage) {
            router.post(
                progress.url(),
                {
                    step: Math.min(nextStage, 3),
                    brand_name: brandName,
                    selling_method: sellingMethod || null,
                },
                {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => setStage(nextStage),
                },
            );
            return;
        }

        setStage(nextStage);
    };

    const createAccount = (event: FormEvent) => {
        event.preventDefault();
        setProcessing(true);
        router.post(
            store.url(),
            {
                brand_name: brandName,
                selling_method: sellingMethod,
                name: owner.name,
                email: owner.email,
                password,
                password_confirmation: password,
                terms: termsAccepted,
                accent_color: accentColor,
            },
            {
                preserveState: 'errors',
                onFinish: () => setProcessing(false),
            },
        );
    };

    const submitPreview = (event: FormEvent) => {
        event.preventDefault();
        setProcessing(true);
        router.post(
            preview.url(),
            { accent_color: accentColor, logo },
            { forceFormData: true, onFinish: () => setProcessing(false) },
        );
    };

    return (
        <main
            className="zo-onboarding"
            ref={rootRef}
            style={{ '--zo-accent': accentColor } as React.CSSProperties}
        >
            <Head title="Coloque sua coleção em movimento" />

            <section
                className="zo-cover"
                aria-label="Prévia da primeira vitrine"
            >
                <div className="zo-cover__topline">
                    <img
                        src="/brand/zouth/assets/logo-duotone-dark.png"
                        alt="Zouth"
                    />
                    <span>Primeira vitrine / 2026</span>
                </div>
                <div className="zo-cover__rule" aria-hidden="true" />
                <div className="zo-cover__image-wrap">
                    <img
                        className="zo-cover__image"
                        src="/brand/zouth/landing/collection-in-motion.webp"
                        alt="Crianças usando uma coleção de moda infantil em uma cena editorial."
                    />
                    <div className="zo-cover__shape" aria-hidden="true" />
                </div>
                <div className="zo-cover__copy">
                    <p>Uma coleção pronta para circular</p>
                    <h1>
                        {visibleBrandName}
                        <span>.</span>
                    </h1>
                    <div className="zo-cover__caption">
                        <span>Da criação ao desejo.</span>
                        <span>Da marca ao lojista.</span>
                    </div>
                </div>
                <div className="zo-cover__folio">01 — SUA MARCA PRIMEIRO</div>
            </section>

            <aside className="zo-rail">
                <header className="zo-rail__header">
                    <Link href="/" aria-label="Voltar para a página inicial">
                        <img
                            src="/brand/zouth/assets/logo-duotone-dark.png"
                            alt="Zouth"
                        />
                    </Link>
                    <span>{Math.min(stage, 5)} / 5</span>
                </header>

                <div
                    className="zo-progress"
                    aria-label={`Etapa ${Math.min(stage, 5)} de 5`}
                >
                    <i style={{ width: `${Math.min(stage, 5) * 20}%` }} />
                </div>

                <div className="zo-stage" ref={stageRef}>
                    {props.incompatibleAccount ? (
                        <IncompatibleAccount
                            label={props.incompatibleAccount.label}
                        />
                    ) : stage === 1 ? (
                        <>
                            <p className="zo-eyebrow">SUA MARCA PRIMEIRO</p>
                            <h2>
                                Como ela se chama<span>?</span>
                            </h2>
                            <p className="zo-lead">
                                Dê um nome à primeira página. Ela já começa a
                                ganhar forma ao lado.
                            </p>
                            <label className="zo-field">
                                <span>Nome da marca</span>
                                <input
                                    autoFocus
                                    value={brandName}
                                    onChange={(event) =>
                                        setBrandName(event.target.value)
                                    }
                                    placeholder="Ex.: Zouth"
                                    maxLength={120}
                                />
                            </label>
                            {fieldError(props.errors, 'brand_name')}
                            <button
                                className="zo-primary"
                                type="button"
                                disabled={brandName.trim().length < 2}
                                onClick={() => goTo(2)}
                            >
                                Ver minha marca ganhar movimento{' '}
                                <ArrowRight aria-hidden="true" />
                            </button>
                        </>
                    ) : stage === 2 ? (
                        <>
                            <button
                                className="zo-back"
                                type="button"
                                onClick={() => goTo(1)}
                            >
                                <ArrowLeft /> Voltar
                            </button>
                            <p className="zo-eyebrow">O QUE PRECISA MUDAR</p>
                            <h2>
                                Como sua coleção circula hoje<span>?</span>
                            </h2>
                            <div
                                className="zo-options"
                                role="radiogroup"
                                aria-label="Como a coleção circula hoje"
                            >
                                {sellingMethods.map((method) => (
                                    <button
                                        className={
                                            sellingMethod === method.value
                                                ? 'is-selected'
                                                : ''
                                        }
                                        type="button"
                                        role="radio"
                                        aria-checked={
                                            sellingMethod === method.value
                                        }
                                        key={method.value}
                                        onClick={() =>
                                            setSellingMethod(method.value)
                                        }
                                    >
                                        <span>{method.title}</span>
                                        <small>{method.description}</small>
                                        <i>
                                            {sellingMethod === method.value ? (
                                                <Check />
                                            ) : null}
                                        </i>
                                    </button>
                                ))}
                            </div>
                            {fieldError(props.errors, 'selling_method')}
                            <button
                                className="zo-primary"
                                type="button"
                                disabled={!sellingMethod}
                                onClick={() => goTo(3)}
                            >
                                Continuar <ArrowRight aria-hidden="true" />
                            </button>
                        </>
                    ) : stage === 3 ? (
                        <form onSubmit={createAccount}>
                            <button
                                className="zo-back"
                                type="button"
                                onClick={() => goTo(2)}
                            >
                                <ArrowLeft /> Voltar
                            </button>
                            <p className="zo-eyebrow">
                                QUEM COLOCA A COLEÇÃO EM MOVIMENTO
                            </p>
                            <h2>
                                Agora, você<span>.</span>
                            </h2>
                            <p className="zo-lead">
                                Crie o acesso de quem vai conduzir{' '}
                                {visibleBrandName} na Zouth.
                            </p>
                            <label className="zo-field">
                                <span>Seu nome</span>
                                <input
                                    value={owner.name}
                                    onChange={(event) =>
                                        setOwner({
                                            ...owner,
                                            name: event.target.value,
                                        })
                                    }
                                    autoComplete="name"
                                />
                            </label>
                            {fieldError(props.errors, 'name')}
                            <label className="zo-field">
                                <span>E-mail profissional</span>
                                <input
                                    type="email"
                                    value={owner.email}
                                    onChange={(event) =>
                                        setOwner({
                                            ...owner,
                                            email: event.target.value,
                                        })
                                    }
                                    autoComplete="email"
                                />
                            </label>
                            {fieldError(props.errors, 'email')}
                            <label className="zo-field">
                                <span>Crie uma senha</span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(event.target.value)
                                    }
                                    autoComplete="new-password"
                                    aria-describedby="onboarding-password-requirements"
                                />
                            </label>
                            <PasswordRequirements
                                id="onboarding-password-requirements"
                                className="text-[#77726d]"
                            />
                            {fieldError(props.errors, 'password')}
                            <label className="zo-check">
                                <input
                                    type="checkbox"
                                    checked={termsAccepted}
                                    onChange={(event) =>
                                        setTermsAccepted(event.target.checked)
                                    }
                                />
                                <span>
                                    Li e aceito os{' '}
                                    <Link href={terms()}>Termos</Link> e a{' '}
                                    <Link href={privacy()}>
                                        Política de Privacidade
                                    </Link>
                                    .
                                </span>
                            </label>
                            {fieldError(props.errors, 'terms')}
                            {fieldError(props.errors, 'plan')}
                            <button
                                className="zo-primary"
                                disabled={processing}
                            >
                                {processing
                                    ? 'Criando sua vitrine…'
                                    : 'Criar minha vitrine e iniciar 7 dias grátis'}{' '}
                                <ArrowRight aria-hidden="true" />
                            </button>
                            <p className="zo-microcopy">
                                <Sparkles aria-hidden="true" /> Sem cartão. Você
                                escolhe um plano somente se quiser continuar.
                            </p>
                        </form>
                    ) : stage === 4 ? (
                        <form onSubmit={submitPreview}>
                            <p className="zo-eyebrow">A PRIMEIRA VITRINE</p>
                            <h2>
                                Agora ela tem presença<span>.</span>
                            </h2>
                            <p className="zo-lead">
                                Um detalhe da sua identidade transforma esta
                                capa em uma apresentação da sua marca.
                            </p>
                            <label className="zo-upload">
                                {logoPreview ? (
                                    <img
                                        src={logoPreview}
                                        alt="Prévia do logotipo da marca"
                                    />
                                ) : (
                                    <ImagePlus aria-hidden="true" />
                                )}
                                <span>
                                    {logoPreview
                                        ? 'Trocar logotipo'
                                        : 'Adicionar logotipo'}
                                    <small>PNG, JPG ou WebP · até 2 MB</small>
                                </span>
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={(event) =>
                                        setLogo(event.target.files?.[0] ?? null)
                                    }
                                />
                            </label>
                            <fieldset className="zo-palettes">
                                <legend>Cor que conduz a coleção</legend>
                                <div>
                                    {palettes.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            aria-label={`Usar cor ${color}`}
                                            aria-pressed={accentColor === color}
                                            style={{ backgroundColor: color }}
                                            onClick={() =>
                                                setAccentColor(color)
                                            }
                                        />
                                    ))}
                                </div>
                            </fieldset>
                            {fieldError(props.errors, 'logo')}
                            <button
                                className="zo-primary"
                                disabled={processing}
                            >
                                {processing
                                    ? 'Preparando…'
                                    : 'Confirmar e continuar'}{' '}
                                <ArrowRight aria-hidden="true" />
                            </button>
                            <p className="zo-microcopy">
                                As imagens desta capa são apenas uma
                                demonstração. Nenhum produto fictício será
                                criado.
                            </p>
                        </form>
                    ) : (
                        <FinalStep
                            emailVerified={
                                props.manufacturer?.email_verified ?? false
                            }
                            email={owner.email}
                            processing={processing}
                            onComplete={(nextStep) => {
                                setProcessing(true);
                                router.post(
                                    complete.url(),
                                    { next_step: nextStep },
                                    { onFinish: () => setProcessing(false) },
                                );
                            }}
                        />
                    )}
                </div>

                <footer className="zo-rail__footer">
                    <span>7 dias grátis · sem cartão</span>
                    {stage > 3 ? (
                        <Link href={logout()} method="post" as="button">
                            <LogOut /> Sair
                        </Link>
                    ) : (
                        <span>Seus dados ficam protegidos.</span>
                    )}
                </footer>
            </aside>
        </main>
    );
}

function IncompatibleAccount({ label }: { label: string }) {
    return (
        <>
            <p className="zo-eyebrow">UMA CONTA, UM PAPEL CLARO</p>
            <h2>
                Você está como {label}
                <span>.</span>
            </h2>
            <p className="zo-lead">
                Para abrir uma fabricante, saia desta conta e comece novamente
                com outro e-mail.
            </p>
            <Link
                className="zo-primary"
                href={logout()}
                method="post"
                as="button"
            >
                Sair e começar minha marca <ArrowRight />
            </Link>
        </>
    );
}

function FinalStep({
    emailVerified,
    email,
    processing,
    onComplete,
}: {
    emailVerified: boolean;
    email: string;
    processing: boolean;
    onComplete: (next: 'import' | 'product') => void;
}) {
    if (!emailVerified) {
        return (
            <>
                <p className="zo-eyebrow">CONFIRMAR E CONTINUAR</p>
                <h2>
                    Procure a Zouth no seu e-mail<span>.</span>
                </h2>
                <p className="zo-lead">
                    Enviamos um link de confirmação
                    {email ? ` para ${email}` : ''}. Depois dele, sua coleção
                    estará pronta para receber as primeiras peças.
                </p>
                <div className="zo-email-mark">
                    <Check aria-hidden="true" />
                    <span>
                        Sua vitrine está preservada
                        <small>
                            Você pode fechar esta página e voltar pelo e-mail.
                        </small>
                    </span>
                </div>
            </>
        );
    }

    return (
        <>
            <p className="zo-eyebrow">A PRIMEIRA CONQUISTA</p>
            <h2>
                Sua marca já tem uma vitrine<span>.</span>
            </h2>
            <p className="zo-lead">
                Agora escolha o caminho mais confortável para colocar a coleção
                real em movimento.
            </p>
            <div className="zo-next-actions">
                <button
                    type="button"
                    disabled={processing}
                    onClick={() => onComplete('import')}
                >
                    <FileSpreadsheet />
                    <span>
                        Trazer minha coleção por planilha
                        <small>
                            O jeito mais rápido para quem já usa um ERP.
                        </small>
                    </span>
                    <ArrowRight />
                </button>
                <button
                    type="button"
                    disabled={processing}
                    onClick={() => onComplete('product')}
                >
                    <PackagePlus />
                    <span>
                        Cadastrar minha primeira peça
                        <small>
                            Comece com um produto e veja como ele aparece.
                        </small>
                    </span>
                    <ArrowRight />
                </button>
            </div>
        </>
    );
}
