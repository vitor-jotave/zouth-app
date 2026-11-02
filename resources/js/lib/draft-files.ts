const files = new Map<string, Blob>();
const fileKeys = new WeakMap<Blob, string>();

export function serializeDraft(value: unknown): unknown {
    if (typeof Blob !== 'undefined' && value instanceof Blob) {
        let key = fileKeys.get(value);
        if (!key) {
            key =
                globalThis.crypto?.randomUUID?.() ??
                `${Date.now()}-${Math.random()}`;
            fileKeys.set(value, key);
        }
        files.set(key, value);
        return { __zouthDraftFile: key };
    }
    if (Array.isArray(value)) return value.map(serializeDraft);
    if (value && typeof value === 'object' && !(value instanceof Date)) {
        return Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [
                key,
                serializeDraft(entry),
            ]),
        );
    }
    return value;
}

export function restoreDraft(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(restoreDraft);
    if (value && typeof value === 'object' && !(value instanceof Date)) {
        const entries = Object.entries(value);
        if (
            entries.length === 1 &&
            entries[0][0] === '__zouthDraftFile' &&
            typeof entries[0][1] === 'string'
        ) {
            return files.get(entries[0][1]) ?? null;
        }
        return Object.fromEntries(
            entries.map(([key, entry]) => [key, restoreDraft(entry)]),
        );
    }
    return value;
}
