import { Form, Head, Link, router } from '@inertiajs/react';
import { ArrowRight, Check, Clock3, LogIn, ShieldCheck } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordRequirements from '@/components/password-requirements';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login, logout } from '@/routes';
import { privacy, terms } from '@/routes/legal';
import representativeInvitations from '@/routes/representative-invitations';

interface Props {
    invitation: {
        name: string;
        email: string;
        personal_message: string | null;
        status: 'pending' | 'accepted' | 'cancelled' | 'expired';
        expires_at: string;
    };
    manufacturer: {
        name: string;
        logo_url: string | null;
    };
    invited_by: string;
    account: {
        exists: boolean;
        authenticated: boolean;
        matches: boolean;
    };
    token: string;
}

function formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(new Date(value));
}

export default function RepresentativeInvitationShow({
    invitation,
    manufacturer,
    invited_by: invitedBy,
    account,
    token,
}: Props) {
    const isUnavailable = invitation.status !== 'pending';

    return (
        <div className="min-h-screen bg-[#e7e3dc] text-[#18181f]">
            <Head title={`Convite de ${manufacturer.name}`} />

            <main className="mx-auto grid w-full max-w-[1500px] md:pt-[5rem] lg:min-h-[calc(100vh-5rem)] lg:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)]">
                <section className="flex flex-col justify-between border-b border-[#cac4ba] bg-[#f6f4f0] px-6 py-12 sm:px-10 lg:border-r lg:border-b-0 lg:px-16 lg:py-16 xl:px-24">
                    <div>
                        <Link href="/" aria-label="Zouth — início">
                            <img
                                src="/brand/zouth/assets/logo-duotone-dark.png"
                                alt="Zouth"
                                className="mb-8 h-auto w-40"
                            />
                        </Link>
                        <p className="text-[0.68rem] font-bold tracking-[0.24em] text-[#ff4d3d] uppercase">
                            Convite de Representante
                        </p>
                        <h1 className="mt-7 max-w-2xl font-zouth-display text-[clamp(3.2rem,5vw,6.6rem)] leading-[0.88] font-semibold tracking-[-0.065em]">
                            {manufacturer.name}
                            <br />
                            quer você como representante
                            <span className="text-[#ff4d3d]">.</span>
                        </h1>
                        <p className="mt-8 max-w-xl text-base leading-7 text-[#5f5d57] sm:text-lg">
                            {invitedBy} acredita que seu olhar comercial combina
                            com a marca e abriu esta parceria para você.
                        </p>
                    </div>

                    <div className="mt-14 grid gap-5 border-t border-[#cac4ba] pt-7 sm:grid-cols-3">
                        {[
                            [
                                '01',
                                'Apresente',
                                'Leve o catálogo aos lojistas certos.',
                            ],
                            [
                                '02',
                                'Acompanhe',
                                'Veja pedidos atribuídos ao seu trabalho.',
                            ],
                            [
                                '03',
                                'Movimente',
                                'Conecte a coleção a novas vitrines.',
                            ],
                        ].map(([number, title, text]) => (
                            <div
                                key={number}
                                className="border-l border-[#cac4ba] pl-4 first:border-[#ff4d3d]"
                            >
                                <p className="text-[0.62rem] font-bold tracking-[0.16em] text-[#8c8880] uppercase">
                                    {number}
                                </p>
                                <p className="mt-3 font-zouth-display text-lg font-semibold tracking-[-0.02em]">
                                    {title}
                                </p>
                                <p className="mt-1 text-sm leading-5 text-[#5f5d57]">
                                    {text}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="flex items-center bg-[#18181f] px-6 py-12 text-[#f6f4f0] sm:px-10 lg:px-14 xl:px-20">
                    <div className="w-full">
                        <div className="flex items-center gap-4 border-b border-white/15 pb-7">
                            {manufacturer.logo_url ? (
                                <img
                                    src={manufacturer.logo_url}
                                    alt={manufacturer.name}
                                    className="size-16 object-contain"
                                />
                            ) : (
                                <span className="flex size-16 items-center justify-center border border-white/20 font-zouth-display text-xl font-semibold">
                                    {manufacturer.name
                                        .slice(0, 2)
                                        .toUpperCase()}
                                </span>
                            )}
                            <div>
                                <p className="text-[0.62rem] font-bold tracking-[0.18em] text-[#ff4d3d] uppercase">
                                    Convite para
                                </p>
                                <p className="mt-1 text-lg font-semibold">
                                    {invitation.name}
                                </p>
                                <p className="text-sm text-white/55">
                                    {invitation.email}
                                </p>
                            </div>
                        </div>

                        {invitation.personal_message && (
                            <blockquote className="mt-7 border-l-2 border-[#ff4d3d] pl-5 text-base leading-7 text-white/75">
                                “{invitation.personal_message}”
                            </blockquote>
                        )}

                        {isUnavailable ? (
                            <div className="mt-9 border border-white/15 p-6">
                                {invitation.status === 'accepted' ? (
                                    <Check className="size-6 text-[#73b89f]" />
                                ) : (
                                    <Clock3 className="size-6 text-[#ff4d3d]" />
                                )}
                                <h2 className="mt-5 font-zouth-display text-2xl font-semibold tracking-[-0.035em]">
                                    {invitation.status === 'accepted'
                                        ? 'Convite já aceito.'
                                        : 'Este convite não está mais disponível.'}
                                </h2>
                                <p className="mt-3 text-sm leading-6 text-white/60">
                                    {invitation.status === 'accepted'
                                        ? 'Entre na sua conta para continuar movimentando esta coleção.'
                                        : 'Peça ao fabricante um novo envio para retomar a parceria.'}
                                </p>
                                {invitation.status === 'accepted' && (
                                    <Button
                                        asChild
                                        className="mt-6 min-h-12 w-full rounded-[2px] bg-[#ff4d3d] text-[#18181f] shadow-none"
                                    >
                                        <Link href={login()}>
                                            Entrar na Zouth
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        ) : account.exists && !account.authenticated ? (
                            <div className="mt-9">
                                <LogIn className="size-6 text-[#ff4d3d]" />
                                <h2 className="mt-5 font-zouth-display text-3xl font-semibold tracking-[-0.04em]">
                                    Sua conta já conhece este caminho.
                                </h2>
                                <p className="mt-3 text-sm leading-6 text-white/60">
                                    Entre com {invitation.email} e volte para
                                    aceitar o convite.
                                </p>
                                <Button
                                    asChild
                                    className="mt-7 min-h-12 w-full rounded-[2px] bg-[#ff4d3d] text-[#18181f] shadow-none hover:bg-[#f23c2e]"
                                >
                                    <Link href={login()}>
                                        Entrar para aceitar{' '}
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
                            </div>
                        ) : account.authenticated && !account.matches ? (
                            <div className="mt-9">
                                <ShieldCheck className="size-6 text-[#ff4d3d]" />
                                <h2 className="mt-5 font-zouth-display text-3xl font-semibold tracking-[-0.04em]">
                                    Este convite pertence a outra conta.
                                </h2>
                                <p className="mt-3 text-sm leading-6 text-white/60">
                                    Saia e entre com {invitation.email} para
                                    continuar com segurança.
                                </p>
                                <Button
                                    type="button"
                                    onClick={() => router.post(logout().url)}
                                    className="mt-7 min-h-12 w-full rounded-[2px] bg-[#ff4d3d] text-[#18181f] shadow-none hover:bg-[#f23c2e]"
                                >
                                    Trocar de conta
                                </Button>
                            </div>
                        ) : (
                            <Form
                                {...representativeInvitations.accept.form(
                                    token,
                                )}
                                resetOnSuccess={[
                                    'password',
                                    'password_confirmation',
                                ]}
                                disableWhileProcessing
                                className="mt-8 space-y-5"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        {!account.exists && (
                                            <>
                                                <div className="grid gap-2">
                                                    <Label
                                                        htmlFor="name"
                                                        className="text-white/80"
                                                    >
                                                        Seu nome
                                                    </Label>
                                                    <Input
                                                        id="name"
                                                        name="name"
                                                        defaultValue={
                                                            invitation.name
                                                        }
                                                        autoComplete="name"
                                                        required
                                                        className="min-h-12 rounded-[2px] border-white/20 bg-white/5 text-white shadow-none placeholder:text-white/35"
                                                    />
                                                    <InputError
                                                        message={errors.name}
                                                        className="text-[#ff8d83]"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label
                                                        htmlFor="password"
                                                        className="text-white/80"
                                                    >
                                                        Crie uma senha
                                                    </Label>
                                                    <Input
                                                        id="password"
                                                        name="password"
                                                        type="password"
                                                        autoComplete="new-password"
                                                        required
                                                        aria-describedby="invitation-password-requirements"
                                                        className="min-h-12 rounded-[2px] border-white/20 bg-white/5 text-white shadow-none"
                                                    />
                                                    <PasswordRequirements
                                                        id="invitation-password-requirements"
                                                        className="text-white/50"
                                                    />
                                                    <InputError
                                                        message={
                                                            errors.password
                                                        }
                                                        className="text-[#ff8d83]"
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label
                                                        htmlFor="password_confirmation"
                                                        className="text-white/80"
                                                    >
                                                        Confirme a senha
                                                    </Label>
                                                    <Input
                                                        id="password_confirmation"
                                                        name="password_confirmation"
                                                        type="password"
                                                        autoComplete="new-password"
                                                        required
                                                        className="min-h-12 rounded-[2px] border-white/20 bg-white/5 text-white shadow-none"
                                                    />
                                                </div>
                                                <div className="flex items-start gap-3">
                                                    <Checkbox
                                                        id="terms"
                                                        name="terms"
                                                        value="1"
                                                        required
                                                        className="mt-0.5 border-white/30 data-[state=checked]:border-[#ff4d3d] data-[state=checked]:bg-[#ff4d3d]"
                                                    />
                                                    <Label
                                                        htmlFor="terms"
                                                        className="text-sm leading-5 font-normal text-white/60"
                                                    >
                                                        Li e aceito os{' '}
                                                        <Link
                                                            href={terms()}
                                                            target="_blank"
                                                            className="text-white underline decoration-[#ff4d3d] underline-offset-4"
                                                        >
                                                            Termos de Uso
                                                        </Link>{' '}
                                                        e a{' '}
                                                        <Link
                                                            href={privacy()}
                                                            target="_blank"
                                                            className="text-white underline decoration-[#ff4d3d] underline-offset-4"
                                                        >
                                                            Política de
                                                            Privacidade
                                                        </Link>
                                                        .
                                                    </Label>
                                                </div>
                                                <InputError
                                                    message={errors.terms}
                                                    className="text-[#ff8d83]"
                                                />
                                            </>
                                        )}

                                        <InputError
                                            message={errors.invitation}
                                            className="text-[#ff8d83]"
                                        />
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                            className="min-h-13 w-full rounded-[2px] bg-[#ff4d3d] text-[#18181f] shadow-none hover:bg-[#f23c2e]"
                                        >
                                            {processing ? (
                                                <Spinner />
                                            ) : (
                                                <Check className="size-4" />
                                            )}
                                            Aceitar convite
                                        </Button>
                                    </>
                                )}
                            </Form>
                        )}

                        <p className="mt-7 flex items-center gap-2 text-xs text-white/45">
                            <Clock3 className="size-3.5" /> Válido até{' '}
                            {formatDate(invitation.expires_at)}
                        </p>
                    </div>
                </section>
            </main>
        </div>
    );
}
