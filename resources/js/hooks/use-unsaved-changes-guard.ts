import { router } from '@inertiajs/react';
import { useEffect } from 'react';

const DEFAULT_MESSAGE =
    'Você tem alterações não salvas. Se sair agora, será necessário preencher esses campos novamente. Deseja sair mesmo assim?';

export function useUnsavedChangesGuard(
    hasUnsavedChanges: boolean,
    message: string = DEFAULT_MESSAGE,
): void {
    useEffect(() => {
        const removeBeforeListener = router.on('before', (event) => {
            if (!hasUnsavedChanges || event.detail.visit.method !== 'get') {
                return;
            }

            return window.confirm(message);
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
    }, [hasUnsavedChanges, message]);
}
