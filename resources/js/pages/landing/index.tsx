import { Head, usePage } from '@inertiajs/react';
import { useRef } from 'react';

import type { SharedData } from '@/types';

import { FaqSection } from './components/faq';
import { Hero } from './components/hero';
import { LandingFooter } from './components/landing-footer';
import { LandingHeader } from './components/landing-header';
import {
    AudienceSection,
    BenefitsSection,
    FinalCtaSection,
    HowItWorksSection,
    OperationSection,
    ProblemSection,
    SolutionSection,
} from './components/sections';
import './landing.css';
import { useLandingMotion, useScrollProgress } from './use-landing-motion';

type LandingPageProps = SharedData & {
    canRegister: boolean;
    commercial: {
        salesContactUrl: string;
        demoCatalogUrl: string | null;
    };
    seo: {
        canonicalUrl: string;
        shareImageUrl: string;
    };
};

export default function LandingPage() {
    const { auth, commercial, seo } = usePage<LandingPageProps>().props;
    const rootRef = useRef<HTMLElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);

    useLandingMotion(rootRef);
    useScrollProgress(progressRef);

    return (
        <>
            <Head>
                <title>Sua coleção vale mais do que um PDF</title>
                <meta
                    head-key="description"
                    name="description"
                    content="A Zouth é o catálogo comercial vivo para fabricantes de moda infantil apresentarem coleções, conectarem representantes e acompanharem o movimento de cada divulgação."
                />
                <meta
                    head-key="og:title"
                    property="og:title"
                    content="Zouth — Sua coleção em movimento"
                />
                <meta
                    head-key="og:description"
                    property="og:description"
                    content="Da marca ao lojista, sem perder a força com que a coleção nasceu."
                />
                <meta
                    head-key="og:image"
                    property="og:image"
                    content={seo.shareImageUrl}
                />
                <meta
                    head-key="og:url"
                    property="og:url"
                    content={seo.canonicalUrl}
                />
                <meta head-key="og:type" property="og:type" content="website" />
                <meta name="theme-color" content="#F6F4F0" />
                <link rel="canonical" href={seo.canonicalUrl} />
                <link
                    rel="preload"
                    as="image"
                    href="/brand/zouth/landing/collection-in-motion.webp"
                    type="image/webp"
                />
                <link
                    rel="preload"
                    as="font"
                    href="/brand/zouth/assets/sora-variable.ttf"
                    type="font/ttf"
                    crossOrigin="anonymous"
                />
                <link
                    rel="preload"
                    as="font"
                    href="/brand/zouth/assets/manrope-variable.ttf"
                    type="font/ttf"
                    crossOrigin="anonymous"
                />
            </Head>

            <a className="zl-skip-link" href="#landing-content">
                Ir para o conteúdo
            </a>

            <div className="zl-progress" aria-hidden="true">
                <div ref={progressRef} />
            </div>

            <div className="zouth-landing">
                <LandingHeader
                    isAuthenticated={Boolean(auth.user)}
                    dashboardUrl={auth.dashboard_url}
                    salesContactUrl={commercial.salesContactUrl}
                />

                <main id="landing-content" ref={rootRef} tabIndex={-1}>
                    <Hero
                        salesContactUrl={commercial.salesContactUrl}
                        demoCatalogUrl={commercial.demoCatalogUrl}
                    />
                    <ProblemSection />
                    <SolutionSection />
                    <HowItWorksSection />
                    <BenefitsSection />
                    <OperationSection />
                    <AudienceSection />
                    <FinalCtaSection
                        salesContactUrl={commercial.salesContactUrl}
                        demoCatalogUrl={commercial.demoCatalogUrl}
                    />
                    <FaqSection />
                </main>

                <LandingFooter
                    isAuthenticated={Boolean(auth.user)}
                    dashboardUrl={auth.dashboard_url}
                    salesContactUrl={commercial.salesContactUrl}
                />
            </div>
        </>
    );
}
