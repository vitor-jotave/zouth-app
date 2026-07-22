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
        onboardingUrl: string;
    };
    seo: {
        pageTitle: string;
        description: string;
        canonicalUrl: string;
        shareImageUrl: string;
        shareImageWidth: number;
        shareImageHeight: number;
        ogTitle: string;
        ogDescription: string;
        structuredData: Record<string, unknown>;
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
                <title>{seo.pageTitle}</title>
                <meta
                    head-key="description"
                    name="description"
                    content={seo.description}
                />
                <meta
                    head-key="robots"
                    name="robots"
                    content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
                />
                <meta
                    head-key="og-title"
                    property="og:title"
                    content={seo.ogTitle}
                />
                <meta
                    head-key="og-description"
                    property="og:description"
                    content={seo.ogDescription}
                />
                <meta
                    head-key="og-image"
                    property="og:image"
                    content={seo.shareImageUrl}
                />
                <meta
                    head-key="og-image-width"
                    property="og:image:width"
                    content={String(seo.shareImageWidth)}
                />
                <meta
                    head-key="og-image-height"
                    property="og:image:height"
                    content={String(seo.shareImageHeight)}
                />
                <meta
                    head-key="og-image-alt"
                    property="og:image:alt"
                    content="Coleção de moda infantil apresentada pela Zouth"
                />
                <meta
                    head-key="og-url"
                    property="og:url"
                    content={seo.canonicalUrl}
                />
                <meta head-key="og-type" property="og:type" content="website" />
                <meta
                    head-key="og-locale"
                    property="og:locale"
                    content="pt_BR"
                />
                <meta
                    head-key="og-site-name"
                    property="og:site_name"
                    content="ZOUTH"
                />
                <meta
                    head-key="twitter-card"
                    name="twitter:card"
                    content="summary_large_image"
                />
                <meta
                    head-key="twitter-title"
                    name="twitter:title"
                    content={seo.ogTitle}
                />
                <meta
                    head-key="twitter-description"
                    name="twitter:description"
                    content={seo.ogDescription}
                />
                <meta
                    head-key="twitter-image"
                    name="twitter:image"
                    content={seo.shareImageUrl}
                />
                <link
                    head-key="canonical"
                    rel="canonical"
                    href={seo.canonicalUrl}
                />
                <link
                    head-key="landing-hero-preload"
                    rel="preload"
                    as="image"
                    href="/brand/zouth/landing/collection-in-motion.webp"
                    type="image/webp"
                />
                <link
                    head-key="sora-preload"
                    rel="preload"
                    as="font"
                    href="/brand/zouth/assets/sora-variable.ttf"
                    type="font/ttf"
                    crossOrigin="anonymous"
                />
                <link
                    head-key="manrope-preload"
                    rel="preload"
                    as="font"
                    href="/brand/zouth/assets/manrope-variable.ttf"
                    type="font/ttf"
                    crossOrigin="anonymous"
                />
                <script
                    head-key="organization-schema"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(seo.structuredData),
                    }}
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
                    salesContactUrl={commercial.onboardingUrl}
                />

                <main id="landing-content" ref={rootRef} tabIndex={-1}>
                    <Hero
                        salesContactUrl={commercial.onboardingUrl}
                        demoCatalogUrl={commercial.demoCatalogUrl}
                    />
                    <ProblemSection />
                    <SolutionSection />
                    <HowItWorksSection />
                    <BenefitsSection />
                    <OperationSection />
                    <AudienceSection />
                    <FinalCtaSection
                        salesContactUrl={commercial.onboardingUrl}
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
