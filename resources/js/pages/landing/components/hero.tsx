import { ArrowDown, ArrowUpRight } from 'lucide-react';

type HeroProps = {
    salesContactUrl: string;
    demoCatalogUrl: string | null;
};

const movingWords = [
    'Coleção',
    'Presença',
    'Representantes',
    'Lojistas',
    'Interesse',
];

export function Hero({ salesContactUrl, demoCatalogUrl }: HeroProps) {
    return (
        <>
            <section className="zl-hero" id="top" aria-labelledby="hero-title">
                <div className="zl-shell zl-hero__grid">
                    <div className="zl-hero__content">
                        <p className="zl-eyebrow zl-hero__eyebrow">
                            Catálogo digital para fabricantes de moda infantil
                        </p>

                        <h1 id="hero-title">
                            Sua coleção vale mais
                            <span>
                                do que um <em>PDF.</em>
                            </span>
                        </h1>

                        <p className="zl-hero__lead">
                            A Zouth coloca sua coleção em movimento, da marca ao
                            lojista, sem perder a tração comercial.
                        </p>

                        <div className="zl-hero__actions">
                            <a className="zl-button" href={salesContactUrl}>
                                Colocar minha coleção em movimento
                                <ArrowUpRight
                                    aria-hidden="true"
                                    size={20}
                                    strokeWidth={1.8}
                                />
                            </a>
                            {demoCatalogUrl ? (
                                <a
                                    className="zl-editorial-link"
                                    href={demoCatalogUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Ver um catálogo em ação
                                    <ArrowUpRight
                                        aria-hidden="true"
                                        size={18}
                                        strokeWidth={1.7}
                                    />
                                </a>
                            ) : (
                                <a
                                    className="zl-editorial-link"
                                    href="#a-mudanca"
                                >
                                    Entender a mudança
                                    <ArrowDown
                                        aria-hidden="true"
                                        size={18}
                                        strokeWidth={1.7}
                                    />
                                </a>
                            )}
                        </div>

                        <p className="zl-hero__microcopy">
                            <span>7 dias grátis</span>
                            <i aria-hidden="true">·</i>
                            <span>sem cartão</span>
                        </p>
                    </div>

                    <figure className="zl-hero__figure" data-parallax>
                        <div className="zl-hero__image-frame">
                            <img
                                src="/brand/zouth/landing/collection-in-motion.webp"
                                alt="Duas crianças caminham em um cenário editorial coral e marfim usando peças de moda infantil."
                                width="1536"
                                height="1024"
                                decoding="async"
                                fetchPriority="high"
                            />
                        </div>
                        <figcaption>
                            <span>Catálogo em movimento</span>Sua coleção merece
                            ser vista.
                        </figcaption>
                    </figure>
                </div>

                <a
                    className="zl-scroll-cue"
                    href="#a-mudanca"
                    aria-label="Ir para a próxima seção"
                >
                    <span>Descobrir</span>
                    <ArrowDown aria-hidden="true" size={17} />
                </a>
            </section>

            <div className="zl-marquee" aria-hidden="true">
                <div className="zl-marquee__track" data-ribbon-track>
                    {[0, 1].map((group) => (
                        <div className="zl-marquee__group" key={group}>
                            {movingWords.map((word) => (
                                <span key={`${group}-${word}`}>
                                    {word}
                                    <i aria-hidden="true" />
                                </span>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
