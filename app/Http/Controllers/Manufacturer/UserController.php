<?php

namespace App\Http\Controllers\Manufacturer;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\TenantManager;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected TenantManager $tenantManager
    ) {}

    public function index(): Response
    {
        $manufacturer = $this->tenantManager->get();

        $users = $manufacturer->users()
            ->withPivot('role', 'status')
            ->orderBy('name')
            ->get()
            ->map(fn ($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->pivot->role,
                'status' => $user->pivot->status,
                'created_at' => $user->created_at->format('d/m/Y'),
            ]);

        return Inertia::render('manufacturer/users/index', [
            'users' => $users,
            'manufacturer' => [
                'id' => $manufacturer->id,
                'name' => $manufacturer->name,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();

        // Only owners can create users
        $this->authorize('manageTeam', $manufacturer);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'role' => ['required', Rule::in(['owner', 'staff'])],
        ]);

        // Create user
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make(Str::random(32)), // Temporary password
            'user_type' => 'manufacturer_user',
            'current_manufacturer_id' => $manufacturer->id,
        ]);

        // Attach to manufacturer
        $manufacturer->users()->attach($user->id, [
            'role' => $validated['role'],
            'status' => 'active',
        ]);

        // Send password reset email
        Password::sendResetLink(['email' => $user->email]);

        return redirect()->back()->with('success', 'Usuário criado com sucesso. Email de definição de senha enviado.');
    }

    public function updateStatus(User $user, Request $request): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();

        // Only owners can manage team
        $this->authorize('manageTeam', $manufacturer);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['active', 'blocked'])],
        ]);

        // Verify user belongs to current manufacturer
        $pivot = $manufacturer->users()->wherePivot('user_id', $user->id)->first();

        if (! $pivot) {
            abort(404);
        }

        // Update pivot status
        $manufacturer->users()->updateExistingPivot($user->id, [
            'status' => $validated['status'],
        ]);

        return redirect()->back()->with('success', 'Status do usuário atualizado.');
    }

    public function updateRole(User $user, Request $request): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();

        // Only owners can manage team
        $this->authorize('manageTeam', $manufacturer);

        $validated = $request->validate([
            'role' => ['required', Rule::in(['owner', 'staff'])],
        ]);

        // Verify user belongs to current manufacturer
        $pivot = $manufacturer->users()->wherePivot('user_id', $user->id)->first();

        if (! $pivot) {
            abort(404);
        }

        // Update pivot role
        $manufacturer->users()->updateExistingPivot($user->id, [
            'role' => $validated['role'],
        ]);

        return redirect()->back()->with('success', 'Função do usuário atualizada.');
    }
}
