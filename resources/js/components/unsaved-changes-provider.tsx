import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
} from 'react';
import type { ReactNode } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const DiscardContext = createContext<(dirty: boolean) => Promise<boolean>>(
    async (dirty) => !dirty,
);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const pending = useRef<((value: boolean) => void) | null>(null);
    const confirmDiscard = useCallback((dirty: boolean): Promise<boolean> => {
        if (!dirty) {
            return Promise.resolve(true);
        }
        if (pending.current) {
            return Promise.resolve(false);
        }
        setOpen(true);
        return new Promise((resolve) => {
            pending.current = resolve;
        });
    }, []);
    const resolve = (discard: boolean) => {
        pending.current?.(discard);
        pending.current = null;
        setOpen(false);
    };
    return (
        <DiscardContext.Provider value={confirmDiscard}>
            {children}
            <AlertDialog
                open={open}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) resolve(false);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Você tem alterações não salvas.
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Continue editando para manter seu preenchimento. Se
                            descartar, as alterações feitas agora serão
                            perdidas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => resolve(false)}>
                            Continuar editando
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={() => resolve(true)}>
                            Descartar alterações
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DiscardContext.Provider>
    );
}

export function useConfirmDiscardChanges() {
    return useContext(DiscardContext);
}
