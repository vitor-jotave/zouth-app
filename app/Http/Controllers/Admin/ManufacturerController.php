<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreManufacturerRequest;
use App\Http\Requests\UpdateManufacturerRequest;
use App\Mail\PlanSelectionInvite;
use App\Models\Manufacturer;
use App\Models\User;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
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
                    'cnpj' => $manufacturer->cnpj,
                    'phone' => $manufacturer->phone,
                    'logo_url' => $manufacturer->logo_path ? Storage::url($manufacturer->logo_path) : null,
                    'zip_code' => $manufacturer->zip_code,
                    'state' => $manufacturer->state,
                    'city' => $manufacturer->city,
                    'neighborhood' => $manufacturer->neighborhood,
                    'street' => $manufacturer->street,
                    'address_number' => $manufacturer->address_number,
                    'complement' => $manufacturer->complement,
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

        $manufacturer = null;
        $owner = null;

        DB::transaction(function () use ($validated, $request, &$manufacturer, &$owner) {
            $logoPath = $request->hasFile('logo')
                ? $request->file('logo')->store('manufacturer-logos')
                : null;

            $manufacturer = Manufacturer::create([
                'name' => $validated['manufacturer_name'],
                'slug' => $validated['slug'],
                'cnpj' => preg_replace('/\D/', '', $validated['cnpj']),
                'phone' => $validated['phone'],
                'logo_path' => $logoPath,
                'zip_code' => $validated['zip_code'] ?? null,
                'state' => $validated['state'] ?? null,
                'city' => $validated['city'] ?? null,
                'neighborhood' => $validated['neighborhood'] ?? null,
                'street' => $validated['street'] ?? null,
                'address_number' => $validated['address_number'] ?? null,
                'complement' => $validated['complement'] ?? null,
                'is_active' => true,
            ]);

            $owner = User::create([
                'name' => $validated['owner_name'],
                'email' => $validated['owner_email'],
                'password' => Hash::make($validated['owner_temporary_password'] ?? Str::random(32)),
                'user_type' => 'manufacturer_user',
                'current_manufacturer_id' => $manufacturer->id,
            ]);

            $manufacturer->users()->attach($owner->id, [
                'role' => 'owner',
                'status' => 'active',
            ]);

            Password::sendResetLink(['email' => $owner->email]);
        });

        $planSelectionUrl = URL::temporarySignedRoute(
            'plan-selection.show',
            now()->addDays(3),
            ['manufacturer' => $manufacturer->id],
        );

        Mail::to($owner->email)->send(new PlanSelectionInvite($manufacturer, $owner->name, $planSelectionUrl));

        return redirect()->route('admin.manufacturers.index')
            ->with('status', 'Fabricante criado com sucesso. Links de acesso e seleção de plano enviados ao responsável.')
            ->with('plan_selection_url', $planSelectionUrl);
    }

    /**
     * Update the manufacturer's information.
     */
    public function update(UpdateManufacturerRequest $request, Manufacturer $manufacturer): RedirectResponse
    {
        $validated = $request->validated();

        $logoPath = $manufacturer->logo_path;

        if ($request->boolean('remove_logo') && $logoPath) {
            Storage::delete($logoPath);
            $logoPath = null;
        } elseif ($request->hasFile('logo')) {
            if ($logoPath) {
                Storage::delete($logoPath);
            }

            $logoPath = $request->file('logo')->store('manufacturer-logos');
        }

        $manufacturer->update([
            'name' => $validated['name'],
            'cnpj' => preg_replace('/\D/', '', $validated['cnpj']),
            'phone' => $validated['phone'],
            'logo_path' => $logoPath,
            'zip_code' => $validated['zip_code'] ?? null,
            'state' => $validated['state'] ?? null,
            'city' => $validated['city'] ?? null,
            'neighborhood' => $validated['neighborhood'] ?? null,
            'street' => $validated['street'] ?? null,
            'address_number' => $validated['address_number'] ?? null,
            'complement' => $validated['complement'] ?? null,
        ]);

        return redirect()->route('admin.manufacturers.index')
            ->with('status', 'Fabricante atualizado com sucesso.');
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

        if (! $manufacturer->is_active) {
            User::where('current_manufacturer_id', $manufacturer->id)
                ->update(['current_manufacturer_id' => null]);
        }

        $status = $manufacturer->is_active ? 'ativado' : 'desativado';

        return redirect()->route('admin.manufacturers.index')
            ->with('status', "Fabricante {$status} com sucesso.");
    }
}
