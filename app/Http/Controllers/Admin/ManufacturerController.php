<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreManufacturerRequest;
use App\Models\Manufacturer;
use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ManufacturerController extends Controller
{
    use AuthorizesRequests;
    /**
     * Display a listing of manufacturers.
     */
    public function index(): Response
    {
        $this->authorize('viewAny', Manufacturer::class);

        $manufacturers = Manufacturer::withCount(['users'])
            ->with(['users' => function ($query) {
                $query->wherePivot('role', 'owner')
                    ->wherePivot('status', 'active');
            }])
            ->latest()
            ->get()
            ->map(function ($manufacturer) {
                return [
                    'id' => $manufacturer->id,
                    'name' => $manufacturer->name,
                    'slug' => $manufacturer->slug,
                    'is_active' => $manufacturer->is_active,
                    'users_count' => $manufacturer->users_count,
                    'owner' => $manufacturer->users->first()?->only(['id', 'name', 'email']),
                    'created_at' => $manufacturer->created_at->toDateTimeString(),
                ];
            });

        return Inertia::render('admin/manufacturers/index', [
            'manufacturers' => $manufacturers,
        ]);
    }

    /**
     * Store a newly created manufacturer.
     */
    public function store(StoreManufacturerRequest $request): RedirectResponse
    {
        $validated = $request->validated();

        DB::transaction(function () use ($validated) {
            // Create manufacturer
            $manufacturer = Manufacturer::create([
                'name' => $validated['manufacturer_name'],
                'slug' => $validated['slug'],
                'is_active' => true,
            ]);

            // Create owner user
            $owner = User::create([
                'name' => $validated['owner_name'],
                'email' => $validated['owner_email'],
                'password' => Hash::make(Str::random(32)), // Temporary password
                'user_type' => 'manufacturer_user',
                'current_manufacturer_id' => $manufacturer->id,
            ]);

            // Attach owner to manufacturer with owner role
            $manufacturer->users()->attach($owner->id, [
                'role' => 'owner',
                'status' => 'active',
            ]);

            // Send password reset link
            Password::sendResetLink(['email' => $owner->email]);
        });

        return redirect()->route('admin.manufacturers.index')
            ->with('status', 'Manufacturer created successfully. Password reset link sent to owner.');
    }

    /**
     * Toggle manufacturer active status.
     */
    public function toggle(Manufacturer $manufacturer): RedirectResponse
    {
        $this->authorize('toggleActive', $manufacturer);

        $manufacturer->update([
            'is_active' => ! $manufacturer->is_active,
        ]);

        // Optionally clear current_manufacturer_id for users when deactivating
        if (! $manufacturer->is_active) {
            User::where('current_manufacturer_id', $manufacturer->id)
                ->update(['current_manufacturer_id' => null]);
        }

        $status = $manufacturer->is_active ? 'activated' : 'deactivated';

        return redirect()->route('admin.manufacturers.index')
            ->with('status', "Manufacturer {$status} successfully.");
    }
}
