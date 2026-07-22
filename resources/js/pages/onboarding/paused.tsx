import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Check, LockKeyhole } from 'lucide-react';
import { checkout } from '@/actions/App/Http/Controllers/Manufacturer/BillingController';
import './onboarding.css';

type Props = {
    manufacturer: { name: string; trial_ended_at: string | null };
    plans: Array<{
        id: number;
        name: string;
        description: string | null;
        formatted_price: string;
        has_stripe: boolean;
    }>;
};

export default function PausedAccount({ manufacturer, plans }: Props) {
    return (
        <main className="zo-paused">
            <Head title="Sua coleção está preservada" />
            <header>
                <img
                    src="/brand/zouth/assets/logo-duotone-dark.png"
                    alt="Zouth"
                />
                <span>Conta pausada</span>
            </header>
            <section className="zo-paused__hero">
                <p className="zo-eyebrow">SEU TRABALHO ESTÁ PRESERVADO</p>
                <h1>
                    A coleção parou<span>.</span>
                    <br />
                    Nada foi perdido.
                </h1>
                <p>
                    Produtos, imagens, clientes e configurações de{' '}
                    {manufacturer.name} continuam exatamente onde você deixou.
                    Escolha um plano para recolocar a vitrine em circulação.
                </p>
                <div>
                    <span>
                        <LockKeyhole /> Catálogo temporariamente indisponível
                    </span>
                    <span>
                        <Check /> Todos os dados preservados
                    </span>
                </div>
            </section>
            <section className="zo-paused__plans" aria-label="Planos da Zouth">
                {plans.map((plan, index) => (
                    <article
                        key={plan.id}
                        className={index === 0 ? 'is-featured' : ''}
                    >
                        <span>0{index + 1}</span>
                        <h2>
                            {plan.name}
                            <i>.</i>
                        </h2>
                        <p>{plan.description}</p>
                        <strong>
                            {plan.formatted_price}
                            <small>/mês</small>
                        </strong>
                        {plan.has_stripe ? (
                            <Link href={checkout(plan.id)}>
                                <span>Retomar com {plan.name}</span>
                                <ArrowRight />
                            </Link>
                        ) : (
                            <button disabled>Em preparação</button>
                        )}
                    </article>
                ))}
            </section>
        </main>
    );
}
