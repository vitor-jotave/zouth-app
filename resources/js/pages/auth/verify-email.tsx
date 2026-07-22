import { Form, Head, Link } from '@inertiajs/react';
import { ArrowRight, Check, LogOut, Mail } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { send } from '@/routes/verification';
import '../onboarding/onboarding.css';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <main className="zo-verify">
            <Head title="Confirme seu e-mail" />
            <section className="zo-verify__visual">
                <img
                    className="zo-verify__logo"
                    src="/brand/zouth/assets/logo-duotone-light.png"
                    alt="Zouth"
                />
                <img
                    className="zo-verify__photo"
                    src="/brand/zouth/landing/collection-in-motion.webp"
                    alt="Coleção infantil em uma composição editorial."
                />
                <div className="zo-verify__veil" />
                <div className="zo-verify__copy">
                    <p>SUA PRIMEIRA VITRINE</p>
                    <h1>
                        Ela já começou a ganhar presença<span>.</span>
                    </h1>
                </div>
            </section>
            <section className="zo-verify__panel">
                <div className="zo-verify__mark">
                    <Mail />
                </div>
                <p className="zo-eyebrow">CONFIRMAR E CONTINUAR</p>
                <h2>
                    Procure a Zouth no seu e-mail<span>.</span>
                </h2>
                <p className="zo-lead">
                    Confirme seu endereço para trazer a coleção, publicar sua
                    vitrine e entrar na Zouth.
                </p>
                {status === 'verification-link-sent' && (
                    <div className="zo-verify__status">
                        <Check /> Um novo link acabou de ser enviado.
                    </div>
                )}
                <Form {...send.form()}>
                    {({ processing }) => (
                        <button className="zo-primary" disabled={processing}>
                            {processing ? <Spinner /> : null} Reenviar e-mail de
                            confirmação <ArrowRight />
                        </button>
                    )}
                </Form>
                <Link
                    className="zo-verify__logout"
                    href={logout()}
                    method="post"
                    as="button"
                >
                    <LogOut /> Sair e usar outro e-mail
                </Link>
                <p className="zo-microcopy">
                    Sua vitrine e os sete dias de teste já estão preservados.
                </p>
            </section>
        </main>
    );
}
