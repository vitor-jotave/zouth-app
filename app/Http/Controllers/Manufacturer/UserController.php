<?php

namespace App\Http\Controllers\Manufacturer;

use App\Enums\ManufacturerCapability;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreManufacturerUserRequest;
use App\Http\Requests\TransferManufacturerOwnershipRequest;
use App\Http\Requests\UpdateManufacturerUserAccessRequest;
use App\Http\Requests\UpdateManufacturerUserStatusRequest;
use App\Models\Manufacturer;
use App\Models\User;
use App\Notifications\TeamInvitationNotification;
use App\Services\PlanLimitService;
use App\Services\TenantManager;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected TenantManager $tenantManager,
        protected PlanLimitService $limitService
    ) {}

    public function index(): Response
    {
        $manufacturer = $this->tenantManager->get();
        $this->authorize('manageTeam', $manufacturer);

        $users = $manufacturer->users()
            ->orderBy('name')
            ->get()
            ->map(function (User $user) use ($manufacturer): array {
                $capabilities = $user->pivot->role === 'owner'
                    ? ManufacturerCapability::values()
                    : ($user->pivot->capabilities ?? ManufacturerCapability::values());

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->pivot->role,
                    'status' => $user->pivot->status,
                    'capabilities' => array_values($capabilities),
                    'created_at' => $user->pivot->created_at->format('d/m/Y'),
                    'is_current_user' => $user->is(request()->user()),
                    'is_primary_owner' => $manufacturer->isPrimaryOwner($user),
                ];
            });

        $activeUsers = $users->where('status', 'active');

        return Inertia::render('manufacturer/users/index', [
            'users' => $users,
            'manufacturer' => [
                'id' => $manufacturer->id,
                'name' => $manufacturer->name,
                'primary_owner_user_id' => $manufacturer->primary_owner_user_id,
                'current_user_is_primary_owner' => $manufacturer->isPrimaryOwner(request()->user()),
            ],
            'metrics' => [
                'total' => $users->count(),
                'owners' => $activeUsers->where('role', 'owner')->count(),
                'staff' => $activeUsers->where('role', 'staff')->count(),
                'blocked' => $users->where('status', 'blocked')->count(),
            ],
            'capabilityOptions' => ManufacturerCapability::options(),
            'suggestedStaffCapabilities' => ManufacturerCapability::suggestedForStaff(),
        ]);
    }

    public function store(StoreManufacturerUserRequest $request): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();
        $this->authorize('manageTeam', $manufacturer);

        if (! $this->limitService->canCreateUser($manufacturer)) {
            return redirect()->back()
                ->withErrors(['limit' => 'Você atingiu o limite de usuários do seu plano.'])
                ->with('limit_exceeded', $this->limitService->limitExceededPayload($manufacturer, 'users'));
        }

        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make(Str::random(32)), // Temporary password
            'user_type' => 'manufacturer_user',
            'current_manufacturer_id' => $manufacturer->id,
        ]);

        $manufacturer->users()->attach($user->id, [
            'role' => $validated['role'],
            'status' => 'active',
            'capabilities' => $validated['role'] === 'staff'
                ? $validated['capabilities']
                : null,
        ]);

        $token = Password::broker()->createToken($user);
        $user->notify(new TeamInvitationNotification(
            $token,
            $manufacturer,
            $request->user(),
            $validated['role'],
        ));

        return redirect()->back()->with('success', 'Pessoa convidada. O e-mail para criar a senha foi enviado.');
    }

    public function updateStatus(User $user, UpdateManufacturerUserStatusRequest $request): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();
        $this->authorize('manageTeam', $manufacturer);
        $pivot = $manufacturer->users()->wherePivot('user_id', $user->id)->first();

        if (! $pivot) {
            abort(404);
        }

        if ($request->user()->is($user)) {
            return redirect()->back()->withErrors([
                'status' => 'Você não pode bloquear o próprio acesso.',
            ]);
        }

        $validated = $request->validated();

        if ($validated['status'] === 'blocked' && $manufacturer->isPrimaryOwner($user)) {
            return redirect()->back()->withErrors([
                'status' => 'O proprietário principal não pode ser bloqueado. Transfira a propriedade primeiro.',
            ]);
        }

        if ($validated['status'] === 'blocked' && $pivot->pivot->role === 'owner') {
            $activeOwnerCount = $manufacturer->users()
                ->wherePivot('role', 'owner')
                ->wherePivot('status', 'active')
                ->count();

            if ($activeOwnerCount <= 1) {
                return redirect()->back()->withErrors([
                    'status' => 'A fabricante precisa manter ao menos um proprietário ativo.',
                ]);
            }
        }

        $manufacturer->users()->updateExistingPivot($user->id, [
            'status' => $validated['status'],
        ]);

        return redirect()->back()->with('success', 'Status do acesso atualizado.');
    }

    public function updateRole(User $user, UpdateManufacturerUserAccessRequest $request): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();
        $this->authorize('manageTeam', $manufacturer);
        $pivot = $manufacturer->users()->wherePivot('user_id', $user->id)->first();

        if (! $pivot) {
            abort(404);
        }

        $validated = $request->validated();

        if ($validated['role'] !== 'owner' && $manufacturer->isPrimaryOwner($user)) {
            return redirect()->back()->withErrors([
                'role' => 'O proprietário principal não pode virar colaborador. Transfira a propriedade primeiro.',
            ]);
        }

        if ($request->user()->is($user) && $validated['role'] !== 'owner') {
            return redirect()->back()->withErrors([
                'role' => 'Você não pode remover a própria função de proprietário.',
            ]);
        }

        if ($pivot->pivot->role === 'owner' && $validated['role'] === 'staff') {
            $activeOwnerCount = $manufacturer->users()
                ->wherePivot('role', 'owner')
                ->wherePivot('status', 'active')
                ->count();

            if ($activeOwnerCount <= 1) {
                return redirect()->back()->withErrors([
                    'role' => 'A fabricante precisa manter ao menos um proprietário ativo.',
                ]);
            }
        }

        $manufacturer->users()->updateExistingPivot($user->id, [
            'role' => $validated['role'],
            'capabilities' => $validated['role'] === 'staff'
                ? $validated['capabilities']
                : null,
        ]);

        return redirect()->back()->with('success', 'Acesso da pessoa atualizado.');
    }

    public function transferOwnership(User $user, TransferManufacturerOwnershipRequest $request): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();
        $this->authorize('manageTeam', $manufacturer);

        if (! $manufacturer->isPrimaryOwner($request->user())) {
            abort(403, 'Somente o proprietário principal pode transferir a propriedade.');
        }

        $targetMembership = $manufacturer->users()
            ->wherePivot('user_id', $user->id)
            ->first();

        if (! $targetMembership) {
            abort(404);
        }

        if ($request->user()->is($user)) {
            return redirect()->back()->withErrors([
                'ownership' => 'Escolha outro proprietário para receber a propriedade.',
            ]);
        }

        if ($targetMembership->pivot->role !== 'owner' || $targetMembership->pivot->status !== 'active') {
            return redirect()->back()->withErrors([
                'ownership' => 'A propriedade só pode ser transferida para outro proprietário ativo.',
            ]);
        }

        DB::transaction(function () use ($manufacturer, $request, $user): void {
            $lockedManufacturer = Manufacturer::query()
                ->lockForUpdate()
                ->findOrFail($manufacturer->id);

            if (! $lockedManufacturer->isPrimaryOwner($request->user())) {
                abort(403, 'A propriedade da conta já foi transferida.');
            }

            $lockedManufacturer->update([
                'primary_owner_user_id' => $user->id,
            ]);
        });

        return redirect()->back()->with('success', $user->name.' agora é o proprietário principal da fabricante.');
    }
}
