import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { ChangelogProvider } from '@/components/changelog-provider';
import { UnsavedChangesProvider } from '@/components/unsaved-changes-provider';
import '../css/app.css';

const appName = 'ZOUTH';

createInertiaApp({
    title: (title) => (title ? `${title} - ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            import.meta.glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        const application = (
            <StrictMode>
                <UnsavedChangesProvider>
                    <ChangelogProvider>
                        <App {...props} />
                    </ChangelogProvider>
                </UnsavedChangesProvider>
            </StrictMode>
        );

        if (el.hasChildNodes()) {
            hydrateRoot(el, application);

            return;
        }

        createRoot(el).render(application);
    },
    progress: {
        color: '#4B5563',
    },
});
