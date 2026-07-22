import { type RefObject, useEffect } from 'react';

export function useLandingMotion(rootRef: RefObject<HTMLElement | null>) {
    useEffect(() => {
        const root = rootRef.current;

        if (!root) {
            return;
        }

        const prefersReducedMotion = window.matchMedia(
            '(prefers-reduced-motion: reduce)',
        ).matches;

        if (prefersReducedMotion) {
            return;
        }

        let cancelled = false;
        let revert: (() => void) | undefined;

        void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
            ([gsapModule, scrollTriggerModule]) => {
                if (cancelled) {
                    return;
                }

                const gsap = gsapModule.gsap;
                const { ScrollTrigger } = scrollTriggerModule;

                gsap.registerPlugin(ScrollTrigger);

                const context = gsap.context(() => {
                    const revealItems =
                        gsap.utils.toArray<HTMLElement>('[data-reveal]');

                    revealItems.forEach((element) => {
                        gsap.fromTo(
                            element,
                            {
                                y: 36,
                            },
                            {
                                y: 0,
                                duration: 0.68,
                                ease: 'power4.out',
                                clearProps: 'transform',
                                scrollTrigger: {
                                    trigger: element,
                                    start: 'top 94%',
                                    once: true,
                                },
                            },
                        );
                    });

                    const parallaxItems =
                        gsap.utils.toArray<HTMLElement>('[data-parallax]');

                    parallaxItems.forEach((element) => {
                        gsap.to(element, {
                            yPercent: -5,
                            ease: 'none',
                            scrollTrigger: {
                                trigger: element,
                                start: 'top bottom',
                                end: 'bottom top',
                                scrub: 0.8,
                            },
                        });
                    });

                    const ribbonTrack = root.querySelector<HTMLElement>(
                        '[data-ribbon-track]',
                    );

                    if (ribbonTrack) {
                        gsap.fromTo(
                            ribbonTrack,
                            { xPercent: -2 },
                            {
                                xPercent: -14,
                                ease: 'none',
                                scrollTrigger: {
                                    trigger: ribbonTrack,
                                    start: 'top bottom',
                                    end: 'bottom top',
                                    scrub: 0.9,
                                },
                            },
                        );
                    }
                }, root);

                revert = () => context.revert();
            },
        );

        return () => {
            cancelled = true;
            revert?.();
        };
    }, [rootRef]);
}

export function useScrollProgress(
    progressRef: RefObject<HTMLDivElement | null>,
) {
    useEffect(() => {
        let animationFrame = 0;

        const updateProgress = () => {
            const progress = progressRef.current;

            if (!progress) {
                return;
            }

            const scrollableHeight =
                document.documentElement.scrollHeight - window.innerHeight;
            const ratio =
                scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;

            progress.style.transform = `scaleX(${Math.min(Math.max(ratio, 0), 1)})`;
        };

        const handleScroll = () => {
            cancelAnimationFrame(animationFrame);
            animationFrame = requestAnimationFrame(updateProgress);
        };

        updateProgress();
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll);

        return () => {
            cancelAnimationFrame(animationFrame);
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [progressRef]);
}
