import { useCallback, useEffect, useRef, useState } from 'react';
import {
    cloneEditorSnapshot,
    createEditorHistory,
    equalEditorSnapshots,
    flushEditorHistory,
    recordEditorHistory,
    redoEditorHistory,
    undoEditorHistory,
} from '@/lib/editor-history';
import type { EditorHistory } from '@/lib/editor-history';

interface EditorHistoryOptions<T> {
    value: T;
    onChange: (value: T) => void;
    enabled?: boolean;
    limit?: number;
    coalesceMs?: number;
}

export function useEditorHistory<T>({
    value,
    onChange,
    enabled = true,
    limit = 50,
    coalesceMs = 400,
}: EditorHistoryOptions<T>) {
    const [history, setHistory] = useState(() =>
        createEditorHistory(value, limit),
    );
    const historyRef = useRef(history);
    const discreteNextChange = useRef(false);

    const applyHistory = useCallback((next: EditorHistory<T>) => {
        if (next === historyRef.current) return;
        historyRef.current = next;
        setHistory(next);
    }, []);

    useEffect(() => {
        if (!enabled) {
            if (
                historyRef.current.past.length ||
                historyRef.current.future.length ||
                !equalEditorSnapshots(historyRef.current.present, value)
            ) {
                applyHistory(createEditorHistory(value, limit));
            }
            discreteNextChange.current = false;
            return;
        }

        const next = recordEditorHistory(historyRef.current, value, {
            coalesceMs,
            coalesce: !discreteNextChange.current,
        });
        if (next !== historyRef.current) discreteNextChange.current = false;
        applyHistory(next);
    }, [value, enabled, limit, coalesceMs, applyHistory]);

    const undo = useCallback(() => {
        if (!enabled) return;
        const current = recordEditorHistory(historyRef.current, value, {
            coalesceMs,
            coalesce: !discreteNextChange.current,
        });
        const next = undoEditorHistory(current);
        discreteNextChange.current = false;
        applyHistory(next);
        if (next !== current) onChange(cloneEditorSnapshot(next.present));
    }, [value, enabled, coalesceMs, onChange, applyHistory]);

    const redo = useCallback(() => {
        if (!enabled) return;
        const current = recordEditorHistory(historyRef.current, value, {
            coalesceMs,
            coalesce: !discreteNextChange.current,
        });
        const next = redoEditorHistory(current);
        discreteNextChange.current = false;
        applyHistory(next);
        if (next !== current) onChange(cloneEditorSnapshot(next.present));
    }, [value, enabled, coalesceMs, onChange, applyHistory]);

    const reset = useCallback(
        (baseline: T = value) => {
            discreteNextChange.current = false;
            applyHistory(createEditorHistory(baseline, limit));
        },
        [value, limit, applyHistory],
    );

    const flush = useCallback(() => {
        if (!enabled) return;
        applyHistory(
            flushEditorHistory(
                recordEditorHistory(historyRef.current, value, { coalesceMs }),
            ),
        );
        discreteNextChange.current = true;
    }, [value, enabled, coalesceMs, applyHistory]);

    return {
        canUndo: enabled && history.past.length > 0,
        canRedo: enabled && history.future.length > 0,
        undo,
        redo,
        reset,
        flush,
    };
}
