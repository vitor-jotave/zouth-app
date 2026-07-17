import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';
import ZouthLogo from './zouth-logo';
import ZouthLogoPicker from './zouth-logo-picker';

export default function AppLogo() {
    const { auth } = usePage<SharedData>().props;

    if (auth.user.user_type !== 'manufacturer_user') {
        return <ZouthLogo />;
    }

    return <ZouthLogoPicker />;
}
