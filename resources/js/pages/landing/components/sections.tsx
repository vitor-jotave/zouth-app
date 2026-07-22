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
                        na hora mais importante, a de apresentar e vender, o seu
                        cliente recebe um catálogo de meses atrás.
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
                    <p className="zl-eyebrow" data-reveal>
                        Quem Somos
                    </p>
                    <h2 id="solution-title" data-reveal>
                        O catálogo vivo para marcas de moda infantil que vendem
                        no atacado.
                    </h2>
                    <p className="zl-solution__lead" data-reveal>
                        A Zouth foi desenhada para a rotina de fabricantes de
                        moda infantil que precisam manter a coleção atualizada e
                        em circulação constante.
                    </p>
                    <p data-reveal>
                        Atualize uma vez. Todos os seus clientes e vendedores
                        vêem a mudança na hora.
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
                        O que muda pra você?
                    </p>
                    <h2 id="benefits-title" data-reveal>
                        Você terá seu catálogo na internet, sempre atual.
                    </h2>
                    <p data-reveal>
                        Nós sabemos que você já tem muitas ferramentas. Nosso
                        objetivo é fazer cada visualização carregar o mesmo
                        cuidado da coleção em PDF, isso resulta em{' '}
                        <strong>venda</strong>.
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
                    Já tem esse processo definido?
                </p>
                <div>
                    <h2 id="operation-title" data-reveal>
                        Não queremos competir com sua operação.
                        <span>Queremos fazer parte dela.</span>
                    </h2>
                    <p data-reveal>
                        Você continua com o processo de pedido, ERP e
                        faturamento que já usa hoje. Entramos antes disso: no
                        momento em que a sua coleção precisa ser vista, desejada
                        e escolhida.
                    </p>
                    <p className="zl-operation__statement" data-reveal>
                        Somos o que faz a venda acontecer, não o sistema de
                        gestão.
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
                    <p className="zl-eyebrow" data-reveal>
                        Vivendo esse mercado percebemos...
                    </p>
                    <h2 id="audience-title" data-reveal>
                        O seu catálogo impacta diretamente a forma como os
                        lojistas te vêem.
                    </h2>
                    <p className="zl-audience__intro" data-reveal>
                        Por isso fizemos uma experiência desenhada desde o
                        início para que você tenha um fluxo do início ao fim da
                        venda, coleções, representantes comerciais, atendimento
                        via whatsapp e suporte aos lojistas multimarcas.
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
                    <h2 id="final-cta-title" data-reveal>
                        Crie sua conta agora, é grátis.
                    </h2>
                    <p data-reveal>
                        Veja como a Zouth pode colocar sua operação em
                        movimento, fazendo seu catálogo brilhar e criando{' '}
                        <strong>melhores oportunidades de venda</strong>.
                    </p>
                    <div className="zl-final-cta__actions" data-reveal>
                        <a className="zl-button" href={salesContactUrl}>
                            Começar minha vitrine
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
                                7 dias grátis · sem cartão
                                <ArrowUpRight aria-hidden="true" size={18} />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
