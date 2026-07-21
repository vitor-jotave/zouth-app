import { Link } from '@inertiajs/react';
import { ArrowUp, ArrowUpRight } from 'lucide-react';

import { dashboard, login } from '@/routes';
import { lgpd, privacy, terms } from '@/routes/legal';

type LandingFooterProps = {
    isAuthenticated: boolean;
    dashboardUrl: string | null;
    salesContactUrl: string;
};

export function LandingFooter({
    isAuthenticated,
    dashboardUrl,
    salesContactUrl,
}: LandingFooterProps) {
    const accountHref = isAuthenticated
        ? (dashboardUrl ?? dashboard())
        : login();

    return (
        <footer className="zl-footer">
            <div className="zl-shell">
                <div className="zl-footer__top">
                    <div>
                        <img
                            src="/brand/zouth/assets/logo-duotone-dark.png"
                            alt="Zouth"
                            width="713"
                            height="124"
                        />
                        <p>Zouth. Sua coleção em movimento.</p>
                    </div>
                    <a className="zl-footer__back" href="#top">
                        Voltar ao topo
                        <ArrowUp aria-hidden="true" size={18} />
                    </a>
                </div>

                <div className="zl-footer__links">
                    <nav aria-label="Links da landing page">
                        <a href="#a-mudanca">A mudança</a>
                        <a href="#como-funciona">Como funciona</a>
                        <a href="#beneficios">Benefícios</a>
                        <a href="#faq">Dúvidas</a>
                    </nav>
                    <nav aria-label="Links institucionais">
                        <Link href={accountHref}>
                            {isAuthenticated ? 'Área do cliente' : 'Entrar'}
                        </Link>
                        <a href={salesContactUrl}>
                            Falar com a Zouth
                            <ArrowUpRight aria-hidden="true" size={15} />
                        </a>
                        <Link href={terms()}>Termos</Link>
                        <Link href={privacy()}>Privacidade</Link>
                        <Link href={lgpd()}>LGPD</Link>
                    </nav>
                </div>

                <div className="zl-footer__bottom">
                    <p>© {new Date().getFullYear()} Zouth.</p>
                    <p>Da coleção ao interesse.</p>
                </div>
            </div>
        </footer>
    );
}
