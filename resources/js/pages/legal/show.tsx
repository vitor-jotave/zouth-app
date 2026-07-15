import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { home } from '@/routes';

type LegalSection = {
    title: string;
    paragraphs: string[];
};

type LegalDocument = {
    title: string;
    introduction: string;
    effectiveDate: string;
    sections: LegalSection[];
};

type LegalPageProps = {
    document: LegalDocument;
    privacyEmail: string;
};

export default function LegalPage({ document, privacyEmail }: LegalPageProps) {
    return (
        <>
            <Head title={document.title} />

            <main className="min-h-screen bg-white text-slate-900">
                <header className="border-b border-slate-200">
                    <div className="mx-auto flex max-w-4xl items-center justify-between gap-6 px-6 py-5">
                        <Link
                            href={home()}
                            className="flex items-center gap-2 font-bold"
                        >
                            <span className="flex size-8 items-center justify-center rounded-md bg-[#c1554c] text-white">
                                Z
                            </span>
                            Zouth App
                        </Link>
                        <Link
                            href={home()}
                            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
                        >
                            <ArrowLeft className="size-4" />
                            Voltar
                        </Link>
                    </div>
                </header>

                <article className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
                    <div className="border-b border-slate-200 pb-10">
                        <p className="mb-3 text-sm font-semibold text-[#a84741]">
                            Vigente desde {document.effectiveDate}
                        </p>
                        <h1 className="text-3xl font-bold sm:text-4xl">
                            {document.title}
                        </h1>
                        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
                            {document.introduction}
                        </p>
                    </div>

                    <div className="divide-y divide-slate-200">
                        {document.sections.map((section) => (
                            <section key={section.title} className="py-9">
                                <h2 className="text-xl font-bold">
                                    {section.title}
                                </h2>
                                <div className="mt-4 space-y-4 text-base leading-7 text-slate-600">
                                    {section.paragraphs.map((paragraph) => (
                                        <p key={paragraph}>{paragraph}</p>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>

                    <section className="border-t border-slate-200 pt-9">
                        <h2 className="text-xl font-bold">Contato</h2>
                        <p className="mt-4 text-base leading-7 text-slate-600">
                            Para dúvidas de privacidade ou exercício de
                            direitos, escreva para{' '}
                            <a
                                href={`mailto:${privacyEmail}`}
                                className="font-semibold text-[#a84741] underline underline-offset-4"
                            >
                                {privacyEmail}
                            </a>
                            .
                        </p>
                    </section>
                </article>
            </main>
        </>
    );
}
