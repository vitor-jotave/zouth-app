import { Form, Head, Link } from '@inertiajs/react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { index as onboarding } from '@/routes/onboarding';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};

export default function Login({
    status,
    canResetPassword,
    canRegister,
}: Props) {
    return (
        <AuthLayout
            title="Seja bem-vindo à Zouth!"
            description="Insira seu e-mail e senha abaixo para entrar"
        >
            <Head title="Entrar" />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-6">
                            <div className="grid gap-2">
                                <Label htmlFor="email">
                                    Endereço de e-mail
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    tabIndex={1}
                                    autoComplete="email"
                                    placeholder="email@zouth.app"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Senha</Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="ml-auto text-sm"
                                            tabIndex={5}
                                        >
                                            Esqueceu a senha?
                                        </TextLink>
                                    )}
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Senha"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center space-x-3">
                                <Checkbox
                                    id="remember"
                                    name="remember"
                                    tabIndex={3}
                                />
                                <Label htmlFor="remember">
                                    Manter conectado
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="mt-4 w-full"
                                tabIndex={4}
                                disabled={processing}
                                data-test="login-button"
                            >
                                {processing && <Spinner />}
                                Entrar
                            </Button>
                        </div>

                        <div className="grid gap-3 border-t border-black/10 pt-5">
                            <p className="text-center text-sm text-muted-foreground">
                                Ainda não tem acesso? Escolha como quer começar.
                            </p>
                            <div
                                className={
                                    canRegister
                                        ? 'grid gap-2 sm:grid-cols-2'
                                        : 'grid gap-2'
                                }
                            >
                                <Link
                                    href={onboarding()}
                                    tabIndex={5}
                                    className="group flex min-h-20 flex-col justify-between border border-[#ff4d3d] bg-[#ff4d3d] p-4 text-left text-[#17171d] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff4d3d]"
                                >
                                    <span className="font-semibold">
                                        Criar minha marca
                                    </span>
                                    <span className="text-xs opacity-75">
                                        7 dias grátis · sem cartão
                                    </span>
                                </Link>
                                {canRegister && (
                                    <Link
                                        href={register()}
                                        tabIndex={6}
                                        className="group flex min-h-20 flex-col justify-between border border-black/15 p-4 text-left transition-colors duration-200 hover:border-black/40 hover:bg-black/3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                                    >
                                        <span className="font-semibold">
                                            Sou representante
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            Encontrar e representar coleções
                                        </span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </Form>

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
        </AuthLayout>
    );
}
