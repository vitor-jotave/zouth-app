import { Link } from '@inertiajs/react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { dashboard, login } from '@/routes';

type LandingHeaderProps = {
    isAuthenticated: boolean;
    dashboardUrl: string | null;
    salesContactUrl: string;
};

const navigation = [
    { label: 'A mudança', href: '#a-mudanca' },
    { label: 'Como funciona', href: '#como-funciona' },
    { label: 'Benefícios', href: '#beneficios' },
    { label: 'Dúvidas', href: '#faq' },
];

export function LandingHeader({
    isAuthenticated,
    dashboardUrl,
    salesContactUrl,
}: LandingHeaderProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isOverDarkSurface, setIsOverDarkSurface] = useState(false);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let animationFrame = 0;

        const updateHeader = () => {
            const probeY = 38;
            const darkSurfaces = Array.from(
                document.querySelectorAll<HTMLElement>(
                    '[data-header-theme="dark"]',
                ),
            );

            setIsScrolled(window.scrollY > 24);
            setIsOverDarkSurface(
                darkSurfaces.some((surface) => {
                    const bounds = surface.getBoundingClientRect();

                    return bounds.top <= probeY && bounds.bottom >= probeY;
                }),
            );
        };

        const handleViewportChange = () => {
            cancelAnimationFrame(animationFrame);
            animationFrame = requestAnimationFrame(updateHeader);
        };

        updateHeader();
        window.addEventListener('scroll', handleViewportChange, {
            passive: true,
        });
        window.addEventListener('resize', handleViewportChange);

        return () => {
            cancelAnimationFrame(animationFrame);
            window.removeEventListener('scroll', handleViewportChange);
            window.removeEventListener('resize', handleViewportChange);
        };
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const originalOverflow = document.body.style.overflow;
        const previousFocus = document.activeElement as HTMLElement | null;
        const menuButton = menuButtonRef.current;
        const backgroundElements = Array.from(
            document.querySelectorAll<HTMLElement>(
                '.zouth-landing main, .zouth-landing > footer',
            ),
        );
        const previousBackgroundStates = backgroundElements.map((element) => ({
            ariaHidden: element.getAttribute('aria-hidden'),
            inert: element.inert,
        }));
        const backgroundFocusableElements = backgroundElements.flatMap(
            (element) =>
                Array.from(
                    element.querySelectorAll<HTMLElement>(
                        'a[href], button, input, select, textarea, [tabindex]',
                    ),
                ),
        );
        const previousTabIndexes = backgroundFocusableElements.map((element) =>
            element.getAttribute('tabindex'),
        );
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };
        const handleFocusTrap = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') {
                return;
            }

            const focusableElements = Array.from(
                mobileMenuRef.current?.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ) ?? [],
            );
            const firstElement = focusableElements.at(0);
            const lastElement = focusableElements.at(-1);

            if (!firstElement || !lastElement) {
                return;
            }

            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (
                !event.shiftKey &&
                document.activeElement === lastElement
            ) {
                event.preventDefault();
                firstElement.focus();
            }
        };

        document.body.style.overflow = 'hidden';
        backgroundElements.forEach((element) => {
            element.inert = true;
            element.setAttribute('inert', '');
            element.setAttribute('aria-hidden', 'true');
        });
        backgroundFocusableElements.forEach((element) => {
            element.setAttribute('tabindex', '-1');
        });
        document.addEventListener('keydown', handleEscape);
        document.addEventListener('keydown', handleFocusTrap);

        const focusTimer = window.setTimeout(() => {
            mobileMenuRef.current
                ?.querySelector<HTMLElement>('a[href]')
                ?.focus();
        }, 280);

        return () => {
            window.clearTimeout(focusTimer);
            document.body.style.overflow = originalOverflow;
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('keydown', handleFocusTrap);
            backgroundElements.forEach((element, index) => {
                const previousState = previousBackgroundStates[index];

                element.inert = previousState?.inert ?? false;

                if (previousState?.inert) {
                    element.setAttribute('inert', '');
                } else {
                    element.removeAttribute('inert');
                }

                if (previousState?.ariaHidden === null) {
                    element.removeAttribute('aria-hidden');
                } else if (previousState?.ariaHidden !== undefined) {
                    element.setAttribute(
                        'aria-hidden',
                        previousState.ariaHidden,
                    );
                }
            });
            backgroundFocusableElements.forEach((element, index) => {
                const previousTabIndex = previousTabIndexes[index];

                if (previousTabIndex === null) {
                    element.removeAttribute('tabindex');
                } else if (previousTabIndex !== undefined) {
                    element.setAttribute('tabindex', previousTabIndex);
                }
            });
            (previousFocus ?? menuButton)?.focus();
        };
    }, [isOpen]);

    const accountHref = isAuthenticated
        ? (dashboardUrl ?? dashboard())
        : login();
    const usesDarkTheme = isOpen || isOverDarkSurface;

    return (
        <header
            className={`zl-header ${isScrolled ? 'is-scrolled' : ''} ${usesDarkTheme ? 'is-dark' : ''}`}
            data-testid="landing-header"
        >
            <div className="zl-header__inner">
                <a
                    className="zl-brand"
                    href="#top"
                    aria-label="Zouth — voltar ao início"
                >
                    <img
                        src={
                            usesDarkTheme
                                ? '/brand/zouth/assets/logo-duotone-light.png'
                                : '/brand/zouth/assets/logo-duotone-dark.png'
                        }
                        alt="Zouth"
                        width="713"
                        height="124"
                    />
                </a>

                <nav
                    className="zl-header__nav"
                    aria-label="Navegação principal"
                >
                    {navigation.map((item) => (
                        <a key={item.href} href={item.href}>
                            {item.label}
                        </a>
                    ))}
                </nav>

                <div className="zl-header__actions">
                    <Link className="zl-account-link" href={accountHref}>
                        {isAuthenticated ? 'Área do cliente' : 'Entrar'}
                    </Link>
                    <a
                        className="zl-button zl-button--small"
                        href={salesContactUrl}
                    >
                        Começar grátis
                        <ArrowUpRight
                            aria-hidden="true"
                            size={17}
                            strokeWidth={1.8}
                        />
                    </a>
                </div>

                <button
                    ref={menuButtonRef}
                    className="zl-menu-button"
                    type="button"
                    aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
                    aria-expanded={isOpen}
                    aria-controls="landing-mobile-menu"
                    onClick={() => setIsOpen((current) => !current)}
                >
                    {isOpen ? (
                        <X aria-hidden="true" size={24} strokeWidth={1.7} />
                    ) : (
                        <Menu aria-hidden="true" size={24} strokeWidth={1.7} />
                    )}
                </button>
            </div>

            <div
                ref={mobileMenuRef}
                className={`zl-mobile-menu ${isOpen ? 'is-open' : ''}`}
                id="landing-mobile-menu"
                role="dialog"
                aria-modal={isOpen}
                aria-label="Menu principal"
                aria-hidden={!isOpen}
            >
                <nav aria-label="Navegação móvel">
                    {navigation.map((item, index) => (
                        <a
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                        >
                            <span>0{index + 1}</span>
                            {item.label}
                        </a>
                    ))}
                </nav>

                <div className="zl-mobile-menu__footer">
                    <Link href={accountHref} onClick={() => setIsOpen(false)}>
                        {isAuthenticated
                            ? 'Ir para minha área'
                            : 'Entrar na Zouth'}
                    </Link>
                    <a href={salesContactUrl} onClick={() => setIsOpen(false)}>
                        Começar grátis · sem cartão
                        <ArrowUpRight aria-hidden="true" size={19} />
                    </a>
                </div>
            </div>
        </header>
    );
}
