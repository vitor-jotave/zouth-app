export type User = {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    user_type: 'superadmin' | 'manufacturer_user' | 'sales_rep';
    [key: string]: unknown;
};

export type ManufacturerAccess = {
    role: 'owner' | 'staff';
    is_owner: boolean;
    capabilities: string[];
};

export type Auth = {
    user: User;
    dashboard_url: string | null;
    access: ManufacturerAccess | null;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
