export interface EditorHistory<T> {
    readonly past: readonly T[];
    readonly present: T;
    readonly future: readonly T[];
    readonly limit: number;
    readonly lastChangeAt: number | null;
}

export interface EditorHistoryRecordOptions {
    now?: number;
    coalesceMs?: number;
    coalesce?: boolean;
}

export function cloneEditorSnapshot<T>(value: T): T {
    if (typeof Blob !== 'undefined' && value instanceof Blob) return value;
    if (value instanceof Date) return new Date(value.getTime()) as T;
    if (Array.isArray(value)) return value.map(cloneEditorSnapshot) as T;
    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [
                key,
                cloneEditorSnapshot(entry),
            ]),
        ) as T;
    }
    return value;
}

export function equalEditorSnapshots(left: unknown, right: unknown): boolean {
    if (Object.is(left, right)) return true;
    if (
        left === null ||
        right === null ||
        typeof left !== 'object' ||
        typeof right !== 'object'
    ) {
        return false;
    }
    if (
        typeof Blob !== 'undefined' &&
        (left instanceof Blob || right instanceof Blob)
    ) {
        return false;
    }
    if (left instanceof Date || right instanceof Date) {
        return (
            left instanceof Date &&
            right instanceof Date &&
            left.getTime() === right.getTime()
        );
    }
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    const leftEntries = Object.entries(left);
    const rightEntries = Object.entries(right);
    return (
        leftEntries.length === rightEntries.length &&
        leftEntries.every(
            ([key, value]) =>
                Object.prototype.hasOwnProperty.call(right, key) &&
                equalEditorSnapshots(
                    value,
                    (right as Record<string, unknown>)[key],
                ),
        )
    );
}

export function createEditorHistory<T>(value: T, limit = 50): EditorHistory<T> {
    return {
        past: [],
        present: cloneEditorSnapshot(value),
        future: [],
        limit: Math.max(1, Number.isFinite(limit) ? Math.floor(limit) : 50),
        lastChangeAt: null,
    };
}

export function recordEditorHistory<T>(
    history: EditorHistory<T>,
    value: T,
    {
        now = Date.now(),
        coalesceMs = 400,
        coalesce = true,
    }: EditorHistoryRecordOptions = {},
): EditorHistory<T> {
    if (equalEditorSnapshots(history.present, value)) return history;

    const joinsPreviousChange =
        coalesce &&
        history.lastChangeAt !== null &&
        now >= history.lastChangeAt &&
        now - history.lastChangeAt < coalesceMs &&
        history.past.length > 0;
    const past = joinsPreviousChange
        ? history.past
        : [...history.past, history.present].slice(-history.limit);

    if (
        joinsPreviousChange &&
        equalEditorSnapshots(past[past.length - 1], value)
    ) {
        return {
            ...history,
            past: past.slice(0, -1),
            present: cloneEditorSnapshot(value),
            future: [],
            lastChangeAt: null,
        };
    }

    return {
        ...history,
        past,
        present: cloneEditorSnapshot(value),
        future: [],
        lastChangeAt: coalesce ? now : null,
    };
}

export function flushEditorHistory<T>(
    history: EditorHistory<T>,
): EditorHistory<T> {
    return history.lastChangeAt === null
        ? history
        : { ...history, lastChangeAt: null };
}

export function undoEditorHistory<T>(
    history: EditorHistory<T>,
): EditorHistory<T> {
    if (history.past.length === 0) return history;
    return {
        ...history,
        past: history.past.slice(0, -1),
        present: history.past[history.past.length - 1],
        future: [history.present, ...history.future].slice(0, history.limit),
        lastChangeAt: null,
    };
}

export function redoEditorHistory<T>(
    history: EditorHistory<T>,
): EditorHistory<T> {
    if (history.future.length === 0) return history;
    return {
        ...history,
        past: [...history.past, history.present].slice(-history.limit),
        present: history.future[0],
        future: history.future.slice(1),
        lastChangeAt: null,
    };
}
