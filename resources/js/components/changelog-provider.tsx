import {
    createContext,
    useCallback,
    useContext,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    changelog,
    changelogKindLabels,
    formatChangelogDate,
} from '@/lib/changelog';

const ChangelogContext = createContext<() => void>(() => {});

export function ChangelogContent() {
    return (
        <>
            <DialogHeader className="shrink-0 border-b border-zouth-stone px-6 py-7 text-left sm:px-9 dark:border-white/15">
                <p className="mb-2 text-[0.65rem] font-bold tracking-[0.2em] text-zouth-coral uppercase">
                    A Zouth em movimento
                </p>
                <DialogTitle className="font-zouth-display text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
                    Changelog<span className="text-zouth-coral">.</span>
                </DialogTitle>
                <DialogDescription className="max-w-lg font-zouth-body text-sm leading-6 text-zouth-warm-gray">
                    Novidades, melhorias e correções para o seu dia a dia.
                </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 overflow-y-auto overscroll-contain px-6 py-7 [scrollbar-color:#77736c_transparent] [scrollbar-width:thin] sm:px-9">
                {[...changelog]
                    .sort((left, right) => right.date.localeCompare(left.date))
                    .map((release) => (
                        <section
                            key={release.id}
                            aria-labelledby={`${release.id}-title`}
                            className="pb-4"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zouth-stone pb-5 dark:border-white/15">
                                <time
                                    dateTime={release.date}
                                    className="text-xs font-semibold tracking-wide"
                                >
                                    {formatChangelogDate(release.date)}
                                </time>
                                <span className="text-xs text-zouth-warm-gray">
                                    {release.updates.length} atualizações
                                </span>
                            </div>
                            <h2
                                id={`${release.id}-title`}
                                className="mt-6 font-zouth-display text-2xl font-semibold tracking-[-0.035em]"
                            >
                                {release.title}
                            </h2>
                            <p className="mt-3 text-sm leading-6 text-zouth-warm-gray">
                                {release.summary}
                            </p>
                            <ol className="mt-7 divide-y divide-zouth-stone dark:divide-white/15">
                                {release.updates.map((update) => (
                                    <li
                                        key={update.title}
                                        className="py-5 first:pt-0"
                                    >
                                        <p className="mb-2 text-[0.6rem] font-bold tracking-[0.16em] text-zouth-coral uppercase">
                                            {changelogKindLabels[update.kind]}
                                        </p>
                                        <h3 className="font-zouth-display text-base leading-6 font-semibold tracking-[-0.025em]">
                                            {update.title}
                                        </h3>
                                        <p className="mt-2 text-sm leading-6 text-zouth-warm-gray">
                                            {update.description}
                                        </p>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    ))}
            </div>
        </>
    );
}

export function ChangelogProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const returnFocus = useRef<HTMLElement | null>(null);
    const show = useCallback(() => {
        const active = document.activeElement as HTMLElement | null;
        const triggerId = active
            ?.closest('[role="menu"]')
            ?.getAttribute('aria-labelledby');
        returnFocus.current = triggerId
            ? document.getElementById(triggerId)
            : active;
        requestAnimationFrame(() => setOpen(true));
    }, []);

    return (
        <ChangelogContext.Provider value={show}>
            {children}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    className="flex h-[min(88dvh,860px)] flex-col gap-0 overflow-hidden rounded-[2px] border-zouth-stone bg-zouth-ivory p-0 font-zouth-body text-zouth-charcoal motion-reduce:animate-none sm:max-w-3xl dark:border-white/15 dark:bg-zouth-charcoal dark:text-zouth-ivory [&>button]:top-3 [&>button]:right-3 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center"
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        returnFocus.current?.focus();
                    }}
                >
                    <ChangelogContent />
                </DialogContent>
            </Dialog>
        </ChangelogContext.Provider>
    );
}

export function useChangelog() {
    return useContext(ChangelogContext);
}
