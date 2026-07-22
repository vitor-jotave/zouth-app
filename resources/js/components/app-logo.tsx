import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';
import AppLogoIcon from './app-logo-icon';
import ZouthLogo from './zouth-logo';
import ZouthLogoPicker from './zouth-logo-picker';

export default function AppLogo() {
    const { auth } = usePage<SharedData>().props;

    if (auth.user.user_type !== 'manufacturer_user') {
        return (
            <div className="flex min-w-0 items-center">
                <ZouthLogo
                    tone="light"
                    className="group-data-[collapsible=icon]:hidden"
                />
                <AppLogoIcon
                    tone="light"
                    className="hidden size-6 group-data-[collapsible=icon]:block"
                />
            </div>
        );
    }

    return <ZouthLogoPicker />;
}
