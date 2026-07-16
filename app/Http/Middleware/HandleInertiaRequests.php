<?php

namespace App\Http\Middleware;

use App\Enums\UserType;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
                'dashboard_url' => $this->dashboardUrl($request),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash' => [
                'limit_exceeded' => fn () => $request->session()->get('limit_exceeded'),
                'upgrade_success' => fn () => $request->session()->get('upgrade_success'),
                'downgrade_violations' => fn () => $request->session()->get('downgrade_violations'),
                'plan_selection_url' => fn () => $request->session()->get('plan_selection_url'),
            ],
        ];
    }

    private function dashboardUrl(Request $request): ?string
    {
        return match ($request->user()?->user_type) {
            UserType::Superadmin => route('admin.dashboard', absolute: false),
            UserType::ManufacturerUser => route('dashboard', absolute: false),
            UserType::SalesRep => route('rep.dashboard', absolute: false),
            default => null,
        };
    }
}
