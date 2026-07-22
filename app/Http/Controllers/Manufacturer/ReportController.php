<?php

namespace App\Http\Controllers\Manufacturer;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReportIndexRequest;
use App\Services\ReportAnalyticsService;
use App\Services\TenantManager;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function __construct(
        private TenantManager $tenantManager,
        private ReportAnalyticsService $analytics,
    ) {}

    public function __invoke(ReportIndexRequest $request): Response
    {
        $manufacturer = $this->tenantManager->get();
        $period = $this->analytics->resolvePeriod(
            $request->string('period')->toString() ?: '30_days',
            $request->validated('start'),
            $request->validated('end'),
        );

        return Inertia::render('manufacturer/reports/index', [
            'manufacturer' => [
                'name' => $manufacturer->name,
            ],
            'report' => $this->analytics->build($manufacturer, $period),
        ]);
    }
}
