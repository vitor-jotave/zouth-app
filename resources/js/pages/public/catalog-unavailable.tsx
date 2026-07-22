import { Head } from '@inertiajs/react';
import { Clock3 } from 'lucide-react';
import '../onboarding/onboarding.css';

export default function CatalogUnavailable({
    manufacturer,
}: {
    manufacturer: { name: string };
}) {
    return (
        <main className="zo-catalog-offline">
            <Head title={`${manufacturer.name} — coleção indisponível`} />
            <img src="/brand/zouth/assets/logo-duotone-dark.png" alt="Zouth" />
            <section>
                <Clock3 />
                <p>COLEÇÃO TEMPORARIAMENTE INDISPONÍVEL</p>
                <h1>
                    {manufacturer.name}
                    <span>.</span>
                </h1>
                <p>
                    Esta coleção está passando por uma breve pausa. Volte em
                    outro momento ou fale diretamente com a marca.
                </p>
            </section>
            <footer>Zouth. Sua coleção em movimento.</footer>
        </main>
    );
}
