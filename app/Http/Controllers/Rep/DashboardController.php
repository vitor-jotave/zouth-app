<?php

namespace App\Http\Controllers\Rep;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Display the sales rep dashboard.
     */
    public function __invoke(): Response
    {
        return Inertia::render('rep/dashboard');
    }
}
