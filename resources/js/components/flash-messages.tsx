import { usePage } from '@inertiajs/react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { SharedData } from '@/types';

export function FlashMessages() {
    const { flash } = usePage<SharedData>().props;

    if (!flash?.status && !flash?.error) {
        return null;
    }

    return (
        <div
            className="grid gap-3 px-4 pt-4 md:px-6"
            aria-live="polite"
            aria-atomic="true"
        >
            {flash.status && (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                    <CheckCircle2 />
                    <AlertTitle>Concluído</AlertTitle>
                    <AlertDescription className="text-emerald-800 dark:text-emerald-200">
                        {flash.status}
                    </AlertDescription>
                </Alert>
            )}

            {flash.error && (
                <Alert
                    variant="destructive"
                    className="border-destructive/40 bg-destructive/10"
                >
                    <AlertCircle />
                    <AlertTitle>Ação não concluída</AlertTitle>
                    <AlertDescription className="text-destructive">
                        {flash.error}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
