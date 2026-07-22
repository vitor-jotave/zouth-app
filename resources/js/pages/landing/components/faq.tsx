import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';

import { faqs } from '../content';

export function FaqSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section
            className="zl-section zl-faq"
            id="faq"
            aria-labelledby="faq-title"
        >
            <div className="zl-shell zl-faq__grid">
                <div className="zl-faq__heading">
                    <h2 id="faq-title" data-reveal>
                        Respondendo algumas perguntas que você pode ter...
                    </h2>
                </div>

                <div className="zl-faq__list">
                    {faqs.map((item, index) => {
                        const isOpen = openIndex === index;
                        const panelId = `faq-panel-${index}`;
                        const buttonId = `faq-button-${index}`;

                        return (
                            <article
                                className={`zl-faq__item ${isOpen ? 'is-open' : ''}`}
                                key={item.question}
                                data-reveal
                            >
                                <h3>
                                    <button
                                        id={buttonId}
                                        type="button"
                                        aria-expanded={isOpen}
                                        aria-controls={panelId}
                                        onClick={() =>
                                            setOpenIndex(isOpen ? null : index)
                                        }
                                    >
                                        <span>{item.question}</span>
                                        {isOpen ? (
                                            <Minus
                                                aria-hidden="true"
                                                size={22}
                                            />
                                        ) : (
                                            <Plus
                                                aria-hidden="true"
                                                size={22}
                                            />
                                        )}
                                    </button>
                                </h3>
                                <div
                                    className="zl-faq__answer"
                                    id={panelId}
                                    role="region"
                                    aria-labelledby={buttonId}
                                    hidden={!isOpen}
                                >
                                    <p>{item.answer}</p>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
