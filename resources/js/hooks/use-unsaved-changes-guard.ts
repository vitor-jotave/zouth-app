import { router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { useConfirmDiscardChanges } from '@/components/unsaved-changes-provider';
import { discardPageDraftHistory } from '@/hooks/use-draft-history';

const DEFAULT_MESSAGE =
    'Você tem alterações não salvas. Se sair agora, será necessário preencher esses campos novamente. Deseja sair mesmo assim?';

export function useUnsavedChangesGuard(
    hasUnsavedChanges: boolean,
    message: string = DEFAULT_MESSAGE,
): void {
    const confirmDiscard = useConfirmDiscardChanges();
    const allowNextVisit = useRef(false);
    useEffect(() => {
        const removeBeforeListener = router.on('before', (event) => {
            if (event.detail.visit.prefetch) {
                return;
            }

            if (allowNextVisit.current) {
                allowNextVisit.current = false;
                return;
            }
            if (!hasUnsavedChanges || event.detail.visit.method !== 'get') {
                return;
            }

            event.preventDefault();
            const visit = event.detail.visit;
            void confirmDiscard(true).then((discard) => {
                if (discard) {
                    discardPageDraftHistory();
                    allowNextVisit.current = true;
                    router.visit(visit.url, visit);
                }
            });
        });

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!hasUnsavedChanges) {
                return;
            }

            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            removeBeforeListener();
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges, message, confirmDiscard]);
}
