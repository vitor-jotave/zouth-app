<?php

namespace App\Services;

use App\Models\Manufacturer;

class TenantManager
{
    protected ?Manufacturer $currentTenant = null;

    /**
     * Set the current tenant.
     */
    public function set(?Manufacturer $manufacturer): void
    {
        $this->currentTenant = $manufacturer;
    }

    /**
     * Get the current tenant.
     */
    public function get(): ?Manufacturer
    {
        return $this->currentTenant;
    }

    /**
     * Clear the current tenant.
     */
    public function clear(): void
    {
        $this->currentTenant = null;
    }

    /**
     * Check if a tenant is currently set.
     */
    public function hasTenant(): bool
    {
        return $this->currentTenant !== null;
    }
}
