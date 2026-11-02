import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import ReactDOMServer from 'react-dom/server';
import { ChangelogProvider } from '@/components/changelog-provider';
import { UnsavedChangesProvider } from '@/components/unsaved-changes-provider';

const appName = 'ZOUTH';

createServer((page) =>
    createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        title: (title) => (title ? `${title} - ${appName}` : appName),
        resolve: (name) =>
            resolvePageComponent(
                `./pages/${name}.tsx`,
                import.meta.glob('./pages/**/*.tsx'),
            ),
        setup: ({ App, props }) => {
            return (
                <UnsavedChangesProvider>
                    <ChangelogProvider>
                        <App {...props} />
                    </ChangelogProvider>
                </UnsavedChangesProvider>
            );
        },
    }),
);
