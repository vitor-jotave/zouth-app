import { router, usePage } from '@inertiajs/react';
import { ArrowUp, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { upgrade } from '@/actions/App/Http/Controllers/Manufacturer/BillingController';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { LimitExceededPayload, SharedData } from '@/types';

const limitLabels: Record<string, string> = {
    products: 'produtos cadastrados',
    users: 'usuários',
    reps: 'representantes',
    orders_this_month: 'pedidos neste mês',
    files_gb: 'armazenamento de arquivos (GB)',
    data_mb: 'armazenamento de dados (MB)',
};

function getLimitLabel(limitType: string): string {
    return limitLabels[limitType] ?? limitType.replace(/_/g, ' ');
}

export function PlanLimitExceededModal() {
    const { flash } = usePage<SharedData>().props;
    const limitExceeded = flash?.limit_exceeded;
    const upgradeSuccess = flash?.upgrade_success;

    const [open, setOpen] = useState(false);
    const [upgraded, setUpgraded] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [payload, setPayload] = useState<LimitExceededPayload | null>(null);

    useEffect(() => {
        if (limitExceeded) {
            setPayload(limitExceeded);
            setUpgraded(false);
            setOpen(true);
        }
    }, [limitExceeded]);

    useEffect(() => {
        if (upgradeSuccess) {
            setUpgraded(true);
        }
    }, [upgradeSuccess]);

    function handleUpgrade() {
        if (!payload?.next_plan) {
            return;
        }

        setProcessing(true);

        router.post(
            upgrade.url(),
            { plan_id: payload.next_plan.id },
            {
                onSuccess: () => {
                    setUpgraded(true);
                    setProcessing(false);
                },
                onError: () => {
                    setProcessing(false);
                },
            },
        );
    }

    function handleClose() {
        setOpen(false);
        setUpgraded(false);
        setPayload(null);
    }

    if (!open || !payload) {
        return null;
    }

    const { limit_type, current_plan, next_plan } = payload;
    const limitLabel = getLimitLabel(limit_type);

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
            <DialogContent className="sm:max-w-md">
                {upgraded ? (
                    <>
                        <DialogHeader>
                            <div className="mb-2 flex justify-center">
                                <CheckCircle2 className="size-12 text-green-500" />
                            </div>
                            <DialogTitle className="text-center">Upgrade realizado!</DialogTitle>
                            <DialogDescription className="text-center">
                                Agora você está no plano <strong>{flash?.upgrade_success?.plan_name}</strong>.
                                Pode continuar com a ação.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="sm:justify-center">
                            <Button onClick={handleClose}>Continuar</Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <div className="mb-2 flex justify-center">
                                <ArrowUp className="bg-primary/10 text-primary size-12 rounded-full p-2" />
                            </div>
                            <DialogTitle className="text-center">Limite atingido</DialogTitle>
                            <DialogDescription className="text-center">
                                Você atingiu o limite de <strong>{limitLabel}</strong>
                                {current_plan ? (
                                    <>
                                        {' '}do plano <strong>{current_plan.name}</strong>
                                    </>
                                ) : null}
                                .
                            </DialogDescription>
                        </DialogHeader>

                        {next_plan ? (
                            <div className="rounded-lg border border-border bg-muted/40 p-4 text-center">
                                <p className="text-sm text-muted-foreground">Próximo plano</p>
                                <p className="mt-1 text-lg font-semibold">{next_plan.name}</p>
                                {next_plan.formatted_price && (
                                    <p className="text-sm text-muted-foreground">
                                        {next_plan.formatted_price}/mês
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="text-center text-sm text-muted-foreground">
                                Você já está no plano máximo disponível.
                            </p>
                        )}

                        <DialogFooter className="flex-col gap-2 sm:flex-row">
                            <Button variant="outline" onClick={handleClose} disabled={processing}>
                                Cancelar
                            </Button>
                            {next_plan ? (
                                next_plan.has_stripe ? (
                                    <Button onClick={handleUpgrade} disabled={processing}>
                                        {processing ? 'Atualizando...' : `Fazer upgrade para ${next_plan.name}`}
                                    </Button>
                                ) : (
                                    <Button disabled title="Entre em contato para fazer upgrade">
                                        Entre em contato
                                    </Button>
                                )
                            ) : null}
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
