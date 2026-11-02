type StatusMovement = {
    id: number;
    to_status: string;
    created_at: string;
};

export function orderStatusTimeline<T extends StatusMovement>(
    history: T[],
): T[] {
    return [...history].sort((left, right) => {
        const timeDifference =
            Date.parse(left.created_at) - Date.parse(right.created_at);
        return timeDifference || left.id - right.id;
    });
}

export function isCurrentStatusMovement<T extends StatusMovement>(
    entry: T,
    history: T[],
    status: string,
): boolean {
    return entry.id === history.at(-1)?.id && entry.to_status === status;
}
