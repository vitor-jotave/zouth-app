export interface QuickReply {
    id: number;
    shortcut: string;
    title: string;
    body: string;
    is_active: boolean;
    updated_at?: string | null;
}
