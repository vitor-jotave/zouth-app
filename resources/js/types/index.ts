export type * from './auth';
export type * from './navigation';
export type * from './ui';

import type { Auth } from './auth';

export type LimitExceededPayload = {
    limit_type: string;
    current_plan: { id: number; name: string } | null;
    next_plan: {
        id: number;
        name: string;
        formatted_price: string;
        has_stripe: boolean;
    } | null;
};

export type DowngradeViolation = {
    limit_type: string;
    current: number;
    limit: number;
};

export type SharedData = {
    name: string;
    auth: Auth;
    sidebarOpen: boolean;
    flash?: {
        limit_exceeded?: LimitExceededPayload | null;
        upgrade_success?: { plan_name: string } | null;
        downgrade_violations?: DowngradeViolation[] | null;
        plan_selection_url?: string | null;
    };
    [key: string]: unknown;
};
