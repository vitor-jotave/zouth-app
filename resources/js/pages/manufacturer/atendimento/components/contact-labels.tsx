import { router, useForm } from '@inertiajs/react';
import { Plus, Tags } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import atendimento from '@/routes/manufacturer/atendimento';

export type ContactLabel = { id: number; name: string; color: string };

export function ContactLabelChips({ labels }: { labels: ContactLabel[] }) {
    return (
        <ul
            aria-label="Etiquetas do contato"
            className="flex min-w-0 flex-wrap gap-1.5"
        >
            {labels.map((label) => (
                <li
                    key={label.id}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-sm border border-white/14 bg-white/5 px-2 py-1 text-xs font-semibold text-zouth-ivory"
                >
                    <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: label.color }}
                        aria-hidden="true"
                    />
                    <span className="break-all">{label.name}</span>
                </li>
            ))}
        </ul>
    );
}

export function ContactLabelEditor({
    labels,
    contact,
    compact = false,
    chat = false,
}: {
    labels: ContactLabel[];
    contact?: { id: number; name: string; labels: ContactLabel[] };
    compact?: boolean;
    chat?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [changing, setChanging] = useState(false);
    const [assignmentError, setAssignmentError] = useState('');
    const form = useForm({ name: '', color: '#ff4d3d' });
    const only = chat ? ['contact_labels', 'active_contact_labels'] : [];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    type="button"
                    aria-label={
                        contact ? 'Etiquetas do contato' : 'Nova etiqueta'
                    }
                    className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-sm border border-white/15 bg-[#18181f] px-3 text-sm leading-tight font-semibold text-zouth-ivory hover:border-zouth-coral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zouth-coral"
                >
                    {contact ? (
                        <Tags className="size-4 shrink-0" aria-hidden="true" />
                    ) : (
                        <Plus className="size-4 shrink-0" aria-hidden="true" />
                    )}
                    <span className={compact ? 'hidden sm:inline' : undefined}>
                        {contact ? 'Etiquetas' : 'Nova etiqueta'}
                    </span>
                    {compact && contact && contact.labels.length > 0 && (
                        <span className="text-xs text-zouth-warm-gray">
                            {contact.labels.length}
                        </span>
                    )}
                </button>
            </DialogTrigger>
            <DialogContent
                data-theme="dark"
                className="max-h-[85svh] overflow-y-auto border-white/15 bg-[#18181f] text-zouth-ivory sm:max-w-lg"
            >
                <DialogHeader>
                    <DialogTitle>
                        {contact ? 'Etiquetas do contato' : 'Nova etiqueta'}
                    </DialogTitle>
                    <DialogDescription className="text-zouth-warm-gray">
                        {contact
                            ? contact.name
                            : 'Crie uma etiqueta que sua equipe possa usar nos contatos.'}
                    </DialogDescription>
                </DialogHeader>
                {contact && (
                    <fieldset
                        className="grid gap-1"
                        disabled={changing || form.processing}
                    >
                        <legend className="mb-2 text-sm font-semibold">
                            Etiquetas disponíveis
                        </legend>
                        {labels.length === 0 && (
                            <p className="text-sm text-zouth-warm-gray">
                                Crie sua primeira etiqueta abaixo.
                            </p>
                        )}
                        {labels.map((label) => (
                            <label
                                key={label.id}
                                className="flex min-h-10 cursor-pointer items-center gap-3 border-b border-white/10 py-2 text-sm"
                            >
                                <input
                                    type="checkbox"
                                    className="size-4 shrink-0 accent-zouth-coral"
                                    checked={contact.labels.some(
                                        (assigned) => assigned.id === label.id,
                                    )}
                                    onChange={(event) => {
                                        setChanging(true);
                                        setAssignmentError('');
                                        router.put(
                                            atendimento.contacts.labels.update({
                                                conversation: contact.id,
                                                label: label.id,
                                            }),
                                            {
                                                assigned:
                                                    event.currentTarget.checked,
                                            },
                                            {
                                                preserveScroll: true,
                                                only,
                                                onError: () =>
                                                    setAssignmentError(
                                                        'Não foi possível atualizar a etiqueta. Tente novamente.',
                                                    ),
                                                onFinish: () =>
                                                    setChanging(false),
                                            },
                                        );
                                    }}
                                />
                                <span
                                    className="size-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: label.color }}
                                    aria-hidden="true"
                                />
                                <span className="break-all">{label.name}</span>
                            </label>
                        ))}
                        {assignmentError && (
                            <p
                                role="alert"
                                className="text-sm text-zouth-coral"
                            >
                                {assignmentError}
                            </p>
                        )}
                    </fieldset>
                )}
                <form
                    className="grid gap-3 border-t border-white/12 pt-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.post(atendimento.contacts.labels.store().url, {
                            preserveScroll: true,
                            only,
                            onSuccess: () => {
                                form.reset();
                                if (!contact) setOpen(false);
                            },
                        });
                    }}
                >
                    <div className="flex min-w-0 items-end gap-3">
                        <label className="grid min-w-0 flex-1 gap-2 text-sm font-semibold">
                            Nome
                            <Input
                                value={form.data.name}
                                onChange={(e) =>
                                    form.setData('name', e.currentTarget.value)
                                }
                                required
                                maxLength={40}
                                className="min-h-11 bg-[#101014] text-zouth-ivory"
                            />
                        </label>
                        <label className="grid gap-2 text-sm font-semibold">
                            Cor
                            <input
                                type="color"
                                className="h-11 w-14 cursor-pointer rounded-sm border border-white/15 bg-[#101014] p-1"
                                value={form.data.color}
                                onChange={(e) =>
                                    form.setData('color', e.currentTarget.value)
                                }
                            />
                        </label>
                    </div>
                    <InputError
                        message={form.errors.name || form.errors.color}
                    />
                    <Button
                        type="submit"
                        disabled={form.processing || changing}
                        className="min-h-11 w-fit bg-zouth-coral text-[#18181f] hover:bg-[#f23c2e]"
                    >
                        Criar etiqueta
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
