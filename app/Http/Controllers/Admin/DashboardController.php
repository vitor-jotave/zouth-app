<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Manufacturer;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the admin dashboard.
     */
    public function __invoke(): Response
    {
        $stats = [
            'active_manufacturers' => Manufacturer::where('is_active', true)->count(),
            'total_manufacturers' => Manufacturer::count(),
        ];

        return Inertia::render('admin/dashboard', [
            'stats' => $stats,
        ]);
    }
}
