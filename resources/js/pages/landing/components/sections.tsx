import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';

import {
    audienceSignals,
    benefits,
    journeySteps,
    painPoints,
} from '../content';

export function ProblemSection() {
    return (
        <section
            className="zl-section zl-problem"
            id="a-mudanca"
            aria-labelledby="problem-title"
            data-header-theme="dark"
        >
            <div className="zl-shell">
                <div className="zl-section-heading zl-section-heading--light">
                    <p className="zl-index" data-reveal>
                        01 — A dor que o mercado conhece
                    </p>
                    <p className="zl-eyebrow" data-reveal>
                        Isso te parece familiar?
                    </p>
                    <h2 id="problem-title" data-reveal>
                        Sua coleção foi criada pra ser desejada.
                        <span>
                            Não pra virar um arquivo perdido no WhatsApp.
                        </span>
                    </h2>
                    <p className="zl-section-heading__intro" data-reveal>
                        Você investiu tempo, dinheiro e cuidado em cada peça. E,
                        na hora mais importante — a de apresentar e vender —
                        tudo isso perde força no caminho.
                    </p>
                </div>

                <ol className="zl-pain-list">
                    {painPoints.map((painPoint, index) => (
                        <li key={painPoint} data-reveal>
                            <span>0{index + 1}</span>
                            <p>{painPoint}</p>
                        </li>
                    ))}
                </ol>

                <div className="zl-problem__closing" data-reveal>
                    <ArrowDownRight
                        aria-hidden="true"
                        size={42}
                        strokeWidth={1.2}
                    />
                    <p>
                        O problema nunca foi a sua coleção.
                        <strong>
                            Foi o jeito como ela chega até quem compra.
                        </strong>
                    </p>
                </div>
            </div>
        </section>
    );
}

export function SolutionSection() {
    return (
        <section
            className="zl-section zl-solution"
            aria-labelledby="solution-title"
        >
            <div className="zl-shell zl-solution__grid">
                <figure className="zl-solution__visual" data-reveal>
                    <div className="zl-solution__image-wrap">
                        <img
                            src="/brand/zouth/landing/collection-craft.webp"
                            alt="Mãos organizam roupas infantis, tecidos e amostras sobre uma mesa de criação."
                            width="1536"
                            height="1024"
                            loading="lazy"
                            decoding="async"
                        />
                    </div>
                    <figcaption>
                        <span>Da criação</span>
                        <ArrowRight aria-hidden="true" size={18} />
                        <span>à apresentação</span>
                    </figcaption>
                </figure>

                <div className="zl-solution__content">
                    <p className="zl-index" data-reveal>
                        02 — A virada
                    </p>
                    <p className="zl-eyebrow" data-reveal>
                        Apresentando a Zouth
                    </p>
                    <h2 id="solution-title" data-reveal>
                        O catálogo vivo para marcas de moda infantil que vendem
                        no atacado.
                    </h2>
                    <p className="zl-solution__lead" data-reveal>
                        A Zouth mantém a força da sua coleção em cada
                        apresentação — e permite acompanhar quando ela começa a
                        circular.
                    </p>
                    <p data-reveal>
                        Atualize uma vez. Toda a sua rede comercial vê a mudança
                        na hora.
                    </p>

                    <div
                        className="zl-flow"
                        aria-label="Fluxo comercial da Zouth"
                        data-reveal
                    >
                        <span>Marca</span>
                        <i aria-hidden="true" />
                        <span>Representante</span>
                        <i aria-hidden="true" />
                        <span>Lojista</span>
                    </div>

                    <a
                        className="zl-editorial-link"
                        href="#como-funciona"
                        data-reveal
                    >
                        Ver como funciona
                        <ArrowDownRight aria-hidden="true" size={18} />
                    </a>
                </div>
            </div>
        </section>
    );
}

export function HowItWorksSection() {
    return (
        <section
            className="zl-section zl-journey"
            id="como-funciona"
            aria-labelledby="journey-title"
        >
            <div className="zl-shell">
                <div className="zl-section-heading zl-section-heading--compact">
                    <p className="zl-index" data-reveal>
                        03 — Como funciona
                    </p>
                    <h2 id="journey-title" data-reveal>
                        Simples pra você.
                        <span>Poderoso pra quem vende.</span>
                    </h2>
                </div>

                <ol className="zl-journey__list">
                    {journeySteps.map((step) => (
                        <li key={step.number} data-reveal>
                            <span className="zl-journey__number">
                                {step.number}
                            </span>
                            <div>
                                <p className="zl-eyebrow">{step.eyebrow}</p>
                                <h3>{step.title}</h3>
                            </div>
                            <p>{step.description}</p>
                            <ArrowDownRight
                                aria-hidden="true"
                                size={28}
                                strokeWidth={1.3}
                            />
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}

export function BenefitsSection() {
    return (
        <section
            className="zl-section zl-benefits"
            id="beneficios"
            aria-labelledby="benefits-title"
        >
            <div className="zl-shell">
                <div className="zl-benefits__heading">
                    <p className="zl-index" data-reveal>
                        04 — O que muda
                    </p>
                    <h2 id="benefits-title" data-reveal>
                        Tudo o que sua coleção precisa pra circular com força.
                    </h2>
                    <p data-reveal>
                        Não é sobre ter mais uma ferramenta. É sobre fazer cada
                        apresentação carregar o mesmo cuidado da coleção
                        original.
                    </p>
                </div>

                <div className="zl-benefits__grid">
                    {benefits.map((benefit) => (
                        <article
                            className={`zl-benefit zl-benefit--${benefit.tone}`}
                            key={benefit.number}
                            data-reveal
                        >
                            <span>{benefit.number}</span>
                            <h3>{benefit.title}</h3>
                            <p>{benefit.description}</p>
                            <ArrowDownRight
                                aria-hidden="true"
                                size={23}
                                strokeWidth={1.4}
                            />
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

export function OperationSection() {
    return (
        <section className="zl-operation" aria-labelledby="operation-title">
            <div className="zl-shell zl-operation__grid">
                <p className="zl-index" data-reveal>
                    05 — Antes do pedido
                </p>
                <div>
                    <h2 id="operation-title" data-reveal>
                        A Zouth não compete com sua operação.
                        <span>Ela prepara o terreno pra ela.</span>
                    </h2>
                    <p data-reveal>
                        Você continua com o processo de pedido, ERP e
                        faturamento que já usa hoje. A Zouth entra antes disso:
                        no momento em que a coleção precisa ser vista, desejada
                        e escolhida.
                    </p>
                    <p className="zl-operation__statement" data-reveal>
                        É o passo que faz a venda começar — não o sistema que a
                        fecha.
                    </p>
                </div>
            </div>
        </section>
    );
}

export function AudienceSection() {
    return (
        <section
            className="zl-section zl-audience"
            aria-labelledby="audience-title"
        >
            <div className="zl-shell zl-audience__grid">
                <figure data-reveal>
                    <img
                        src="/brand/zouth/landing/commercial-conversation.webp"
                        alt="Representante e lojista analisam uma coleção de moda infantil em um showroom."
                        width="972"
                        height="1619"
                        loading="lazy"
                        decoding="async"
                    />
                    <figcaption>Da marca para o mercado.</figcaption>
                </figure>

                <div className="zl-audience__content">
                    <p className="zl-index" data-reveal>
                        06 — Feita para este mercado
                    </p>
                    <p className="zl-eyebrow" data-reveal>
                        Quem vive este mercado percebe
                    </p>
                    <h2 id="audience-title" data-reveal>
                        A Zouth entende o caminho de uma coleção infantil no
                        atacado.
                    </h2>
                    <p className="zl-audience__intro" data-reveal>
                        Uma experiência desenhada desde o início para quem cria
                        coleções, conduz representantes e chega a lojistas
                        multimarcas. Porque conhecer esse caminho muda tudo —
                        inclusive o jeito de apresentar.
                    </p>

                    <div className="zl-audience__signals">
                        {audienceSignals.map((signal) => (
                            <article key={signal.title} data-reveal>
                                <h3>{signal.title}</h3>
                                <p>{signal.description}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

type FinalCtaSectionProps = {
    salesContactUrl: string;
    demoCatalogUrl: string | null;
};

export function FinalCtaSection({
    salesContactUrl,
    demoCatalogUrl,
}: FinalCtaSectionProps) {
    return (
        <section
            className="zl-final-cta"
            aria-labelledby="final-cta-title"
            data-header-theme="dark"
        >
            <div className="zl-shell">
                <img
                    className="zl-final-cta__logo"
                    src="/brand/zouth/assets/logo-duotone-light.png"
                    alt="Zouth"
                    width="713"
                    height="124"
                    data-reveal
                />
                <div className="zl-final-cta__content">
                    <p className="zl-index" data-reveal>
                        07 — Próxima coleção
                    </p>
                    <h2 id="final-cta-title" data-reveal>
                        Sua próxima coleção não precisa perder força no caminho.
                    </h2>
                    <p data-reveal>
                        Comece a apresentar sua coleção com a Zouth — e
                        acompanhe o movimento dela antes mesmo do primeiro
                        pedido chegar.
                    </p>
                    <div className="zl-final-cta__actions" data-reveal>
                        <a className="zl-button" href={salesContactUrl}>
                            Quero ver minha coleção em movimento
                            <ArrowUpRight aria-hidden="true" size={20} />
                        </a>
                        {demoCatalogUrl ? (
                            <a
                                className="zl-editorial-link zl-editorial-link--light"
                                href={demoCatalogUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Abrir catálogo de demonstração
                                <ArrowUpRight aria-hidden="true" size={18} />
                            </a>
                        ) : (
                            <a
                                className="zl-editorial-link zl-editorial-link--light"
                                href={salesContactUrl}
                            >
                                Falar com o time Zouth
                                <ArrowUpRight aria-hidden="true" size={18} />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
