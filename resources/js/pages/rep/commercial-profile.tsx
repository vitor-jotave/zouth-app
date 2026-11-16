import { Form, Head, Link } from '@inertiajs/react';
import { AppPageHeader } from '@/components/app-page-header';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import { edit } from '@/routes/profile';
import rep from '@/routes/rep';

const fields = [
    { name: 'whatsapp', label: 'WhatsApp profissional', type: 'tel', max: 30 },
    { name: 'city', label: 'Cidade', type: 'text', max: 120 },
    { name: 'state', label: 'UF', type: 'text', max: 2 },
    {
        name: 'territory',
        label: 'Território de atuação',
        type: 'text',
        max: 255,
    },
] as const;
type CommercialProfile = Record<
    (typeof fields)[number]['name'] | 'presentation',
    string
>;

export default function CommercialProfile({
    profile,
}: {
    profile: CommercialProfile | null;
}) {
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Meu perfil', href: rep.commercialProfile.edit().url },
            ]}
        >
            <Head title="Meu perfil" />
            <div className="mx-auto w-full max-w-[1720px] px-5 py-8 sm:px-7 md:px-9 xl:px-12 2xl:px-14">
                <AppPageHeader
                    eyebrow="Conta do representante"
                    title={
                        <>
                            Meu perfil<span className="text-[#ff4d3d]">.</span>
                        </>
                    }
                    description="Mantenha seus dados comerciais atualizados para se apresentar às marcas."
                />
                <div className="mt-7 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
                    <Form
                        action={rep.commercialProfile.update()}
                        className="grid gap-5 border border-border bg-background p-5 sm:p-7"
                        setDefaultsOnSuccess
                    >
                        {({ errors, processing, recentlySuccessful }) => (
                            <>
                                <h2 className="font-zouth-display text-xl font-semibold">
                                    Perfil comercial
                                </h2>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    {fields.map(
                                        ({ name, label, type, max }) => (
                                            <div
                                                key={name}
                                                className="grid gap-2"
                                            >
                                                <label
                                                    htmlFor={name}
                                                    className="text-sm font-semibold"
                                                >
                                                    {label}
                                                </label>
                                                <Input
                                                    id={name}
                                                    name={name}
                                                    type={type}
                                                    maxLength={max}
                                                    defaultValue={
                                                        profile?.[name] ?? ''
                                                    }
                                                    required
                                                    aria-invalid={Boolean(
                                                        errors[name],
                                                    )}
                                                    aria-describedby={
                                                        errors[name]
                                                            ? `${name}-error`
                                                            : undefined
                                                    }
                                                />
                                                <InputError
                                                    id={`${name}-error`}
                                                    message={errors[name]}
                                                />
                                            </div>
                                        ),
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <label
                                        htmlFor="presentation"
                                        className="text-sm font-semibold"
                                    >
                                        Apresentação comercial
                                    </label>
                                    <Textarea
                                        id="presentation"
                                        name="presentation"
                                        defaultValue={
                                            profile?.presentation ?? ''
                                        }
                                        required
                                        minLength={30}
                                        maxLength={2000}
                                        rows={5}
                                        aria-invalid={Boolean(
                                            errors.presentation,
                                        )}
                                        aria-describedby={
                                            errors.presentation
                                                ? 'presentation-error'
                                                : 'presentation-help'
                                        }
                                    />
                                    <p
                                        id="presentation-help"
                                        className="text-xs text-muted-foreground"
                                    >
                                        Conte como você trabalha e que tipo de
                                        lojista costuma atender. Mínimo de 30
                                        caracteres.
                                    </p>
                                    <InputError
                                        id="presentation-error"
                                        message={errors.presentation}
                                    />
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <Button type="submit" disabled={processing}>
                                        {processing
                                            ? 'Salvando…'
                                            : 'Salvar perfil'}
                                    </Button>
                                    <span role="status" className="text-sm">
                                        {recentlySuccessful
                                            ? 'Perfil atualizado.'
                                            : ''}
                                    </span>
                                </div>
                            </>
                        )}
                    </Form>
                    <section className="border border-border bg-background p-5">
                        <h2 className="font-zouth-display text-lg font-semibold">
                            Conta e segurança
                        </h2>
                        <p className="my-3 text-sm text-muted-foreground">
                            Gerencie seu nome, e-mail, senha e autenticação em
                            duas etapas.
                        </p>
                        <Button asChild variant="outline">
                            <Link href={edit()}>Abrir configurações</Link>
                        </Button>
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
