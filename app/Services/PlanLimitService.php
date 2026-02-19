<?php

namespace App\Services;

use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\Plan;
use App\Models\ProductMedia;
use Carbon\CarbonImmutable;

class PlanLimitService
{
    /**
     * Get the active plan for a manufacturer, or null if none.
     */
    public function activePlan(Manufacturer $manufacturer): ?Plan
    {
        return $manufacturer->currentPlan;
    }

    /**
     * Find the next plan tier above the manufacturer's current plan.
     *
     * @return array{current: Plan|null, next: Plan|null}
     */
    public function planTierInfo(Manufacturer $manufacturer): array
    {
        $current = $this->activePlan($manufacturer);

        $next = Plan::where('is_active', true)
            ->when($current, fn ($q) => $q->where('sort_order', '>', $current->sort_order))
            ->orderBy('sort_order')
            ->first();

        return ['current' => $current, 'next' => $next];
    }

    /**
     * Build the flash payload for a limit-exceeded response.
     *
     * @return array<string, mixed>
     */
    public function limitExceededPayload(Manufacturer $manufacturer, string $limitType): array
    {
        ['current' => $current, 'next' => $next] = $this->planTierInfo($manufacturer);

        return [
            'limit_type' => $limitType,
            'current_plan' => $current ? [
                'id' => $current->id,
                'name' => $current->name,
            ] : null,
            'next_plan' => $next ? [
                'id' => $next->id,
                'name' => $next->name,
                'formatted_price' => $next->formatted_price,
                'has_stripe' => $next->stripe_price_id !== null,
            ] : null,
        ];
    }

    /**
     * Check if the manufacturer can create a new product.
     */
    public function canCreateProduct(Manufacturer $manufacturer): bool
    {
        $plan = $this->activePlan($manufacturer);

        if (! $plan) {
            return false;
        }

        if ($plan->isUnlimited('max_products')) {
            return true;
        }

        return $manufacturer->products()->count() < $plan->max_products;
    }

    /**
     * Check if the manufacturer can add a new sales rep (affiliation).
     */
    public function canCreateRep(Manufacturer $manufacturer): bool
    {
        $plan = $this->activePlan($manufacturer);

        if (! $plan) {
            return false;
        }

        if ($plan->isUnlimited('max_reps')) {
            return true;
        }

        $activeReps = ManufacturerAffiliation::where('manufacturer_id', $manufacturer->id)
            ->where('status', 'active')
            ->count();

        return $activeReps < $plan->max_reps;
    }

    /**
     * Check if the manufacturer can add a new user.
     */
    public function canCreateUser(Manufacturer $manufacturer): bool
    {
        $plan = $this->activePlan($manufacturer);

        if (! $plan) {
            return false;
        }

        if ($plan->isUnlimited('max_users')) {
            return true;
        }

        $activeUsers = $manufacturer->users()
            ->wherePivot('status', 'active')
            ->count();

        return $activeUsers < $plan->max_users;
    }

    /**
     * Check if the manufacturer can receive a new order this month.
     */
    public function canCreateOrder(Manufacturer $manufacturer): bool
    {
        $plan = $this->activePlan($manufacturer);

        if (! $plan) {
            return false;
        }

        if ($plan->isUnlimited('max_orders_per_month')) {
            return true;
        }

        $startOfMonth = CarbonImmutable::now()->startOfMonth();

        $ordersThisMonth = $manufacturer->orders()
            ->where('created_at', '>=', $startOfMonth)
            ->count();

        return $ordersThisMonth < $plan->max_orders_per_month;
    }

    /**
     * Returns the list of limits that would be violated if the manufacturer
     * switched to the given plan. An empty array means the change is safe.
     *
     * @return list<array{limit_type: string, current: int, limit: int}>
     */
    public function violatedLimitsForPlan(Manufacturer $manufacturer, Plan $targetPlan): array
    {
        $startOfMonth = CarbonImmutable::now()->startOfMonth();

        $productCount = $manufacturer->products()->count();
        $userCount = $manufacturer->users()->wherePivot('status', 'active')->count();
        $repCount = ManufacturerAffiliation::where('manufacturer_id', $manufacturer->id)
            ->where('status', 'active')
            ->count();
        $ordersThisMonth = $manufacturer->orders()
            ->where('created_at', '>=', $startOfMonth)
            ->count();

        $violations = [];

        if (! $targetPlan->isUnlimited('max_products') && $productCount > $targetPlan->max_products) {
            $violations[] = ['limit_type' => 'products', 'current' => $productCount, 'limit' => $targetPlan->max_products];
        }

        if (! $targetPlan->isUnlimited('max_users') && $userCount > $targetPlan->max_users) {
            $violations[] = ['limit_type' => 'users', 'current' => $userCount, 'limit' => $targetPlan->max_users];
        }

        if (! $targetPlan->isUnlimited('max_reps') && $repCount > $targetPlan->max_reps) {
            $violations[] = ['limit_type' => 'reps', 'current' => $repCount, 'limit' => $targetPlan->max_reps];
        }

        if (! $targetPlan->isUnlimited('max_orders_per_month') && $ordersThisMonth > $targetPlan->max_orders_per_month) {
            $violations[] = ['limit_type' => 'orders_this_month', 'current' => $ordersThisMonth, 'limit' => $targetPlan->max_orders_per_month];
        }

        $fileBytesUsed = $this->currentFilesUsageBytes($manufacturer);
        $fileLimitBytes = $targetPlan->isUnlimited('max_files_gb') ? null : ($targetPlan->max_files_gb * 1_073_741_824);

        if ($fileLimitBytes !== null && $fileBytesUsed > $fileLimitBytes) {
            $violations[] = [
                'limit_type' => 'files_gb',
                'current' => (int) round($fileBytesUsed / 1_073_741_824 * 100) / 100,
                'limit' => $targetPlan->max_files_gb,
            ];
        }

        $dataMbUsed = $this->currentDataUsageMb($manufacturer);

        if (! $targetPlan->isUnlimited('max_data_mb') && $dataMbUsed > $targetPlan->max_data_mb) {
            $violations[] = [
                'limit_type' => 'data_mb',
                'current' => (int) ceil($dataMbUsed),
                'limit' => $targetPlan->max_data_mb,
            ];
        }

        return $violations;
    }

    /**
     * Check if the manufacturer can import CSV.
     */
    public function canImportCsv(Manufacturer $manufacturer): bool
    {
        $plan = $this->activePlan($manufacturer);

        if (! $plan) {
            return false;
        }

        return $plan->allow_csv_import;
    }

    /**
     * Total bytes used by all media files uploaded by a manufacturer.
     */
    public function currentFilesUsageBytes(Manufacturer $manufacturer): int
    {
        return (int) ProductMedia::whereHas(
            'product',
            fn ($q) => $q->where('manufacturer_id', $manufacturer->id)
        )->sum('file_size_bytes');
    }

    /**
     * Check if the manufacturer can upload a new file of the given size.
     */
    public function canUploadFile(Manufacturer $manufacturer, int $fileSizeBytes): bool
    {
        $plan = $this->activePlan($manufacturer);

        if (! $plan) {
            return false;
        }

        if ($plan->isUnlimited('max_files_gb')) {
            return true;
        }

        $limitBytes = $plan->max_files_gb * 1_073_741_824;

        return ($this->currentFilesUsageBytes($manufacturer) + $fileSizeBytes) <= $limitBytes;
    }

    /**
     * Estimated structured-data footprint in MB based on row counts.
     */
    public function currentDataUsageMb(Manufacturer $manufacturer): float
    {
        $productCount = $manufacturer->products()->count();
        $orderCount = $manufacturer->orders()->count();
        $repCount = ManufacturerAffiliation::where('manufacturer_id', $manufacturer->id)->count();
        $userCount = $manufacturer->users()->count();
        $categoryCount = $manufacturer->productCategories()->count();

        $totalBytes =
            ($productCount * 2_048) +
            ($orderCount * 3_072) +
            ($repCount * 512) +
            ($userCount * 512) +
            ($categoryCount * 307);

        return round($totalBytes / 1_048_576, 3);
    }

    /**
     * Check if the manufacturer is within their structured-data quota.
     */
    public function canStoreData(Manufacturer $manufacturer): bool
    {
        $plan = $this->activePlan($manufacturer);

        if (! $plan) {
            return false;
        }

        if ($plan->isUnlimited('max_data_mb')) {
            return true;
        }

        return $this->currentDataUsageMb($manufacturer) < $plan->max_data_mb;
    }

    /**
     * Get current usage summary for a manufacturer.
     *
     * @return array<string, array{current: int, limit: int|null, percentage: int|null}>
     */
    public function usage(Manufacturer $manufacturer): array
    {
        $plan = $this->activePlan($manufacturer);

        if (! $plan) {
            return [];
        }

        $startOfMonth = CarbonImmutable::now()->startOfMonth();

        $productCount = $manufacturer->products()->count();
        $userCount = $manufacturer->users()->wherePivot('status', 'active')->count();
        $repCount = ManufacturerAffiliation::where('manufacturer_id', $manufacturer->id)
            ->where('status', 'active')
            ->count();

        $ordersThisMonth = $manufacturer->orders()
            ->where('created_at', '>=', $startOfMonth)
            ->count();

        return [
            'products' => $this->buildUsageItem($productCount, $plan->max_products),
            'users' => $this->buildUsageItem($userCount, $plan->max_users),
            'reps' => $this->buildUsageItem($repCount, $plan->max_reps),
            'orders_this_month' => $this->buildUsageItem($ordersThisMonth, $plan->max_orders_per_month),
            'files_gb' => $this->buildUsageItemFloat(
                round($this->currentFilesUsageBytes($manufacturer) / 1_073_741_824, 3),
                $plan->max_files_gb
            ),
            'data_mb' => $this->buildUsageItemFloat(
                $this->currentDataUsageMb($manufacturer),
                $plan->max_data_mb
            ),
        ];
    }

    /**
     * Build a usage item array.
     *
     * @return array{current: int, limit: int|null, percentage: int|null}
     */
    private function buildUsageItem(int $current, ?int $limit): array
    {
        return [
            'current' => $current,
            'limit' => $limit,
            'percentage' => $limit ? (int) round(($current / $limit) * 100) : null,
        ];
    }

    /**
     * Build a usage item for float values (GB, MB).
     *
     * @return array{current: float, limit: int|null, percentage: int|null}
     */
    private function buildUsageItemFloat(float $current, ?int $limit): array
    {
        return [
            'current' => $current,
            'limit' => $limit,
            'percentage' => ($limit && $limit > 0) ? (int) round(($current / $limit) * 100) : null,
        ];
    }
}
