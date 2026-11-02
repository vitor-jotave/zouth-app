import type { FormDataType } from '@inertiajs/core';
import { router, useForm, useRemember } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { restoreDraft, serializeDraft } from '@/lib/draft-files';

export const DRAFT_EPOCH_KEY = 'zouth:discarded-draft-generation';

export function discardPageDraftHistory(): void {
    router.remember(`${Date.now()}-${Math.random()}`, DRAFT_EPOCH_KEY);
}

function useDraftKey(key: string): string {
    const [epoch] = useState(
        () => router.restore<string>(DRAFT_EPOCH_KEY) ?? 'initial',
    );
    return `zouth:draft:${key}:${epoch}`;
}

export function useDraftForm<T extends FormDataType<T>>(key: string, data: T) {
    const historyKey = useDraftKey(key);
    const form = useForm<T>(data);
    const [remembered, setRemembered] = useRemember<unknown>(
        null,
        `${historyKey}:data`,
    );
    const initialDraft = useRef(remembered);
    const [ready, setReady] = useState(false);
    const { setData } = form;

    useEffect(() => {
        if (
            initialDraft.current !== null &&
            initialDraft.current !== undefined
        ) {
            setData(restoreDraft(initialDraft.current) as T);
            initialDraft.current = null;
        }
        setReady(true);
    }, [setData]);

    useEffect(() => {
        if (ready) setRemembered(serializeDraft(form.data));
    }, [form.data, ready, setRemembered]);

    return form;
}

export function useDraftState<T>(key: string, initial: T) {
    return useRemember<T>(initial, useDraftKey(key));
}
