<?php

namespace App\Http\Controllers\Manufacturer;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateWhatsappInstanceRequest;
use App\Models\WhatsappInstance;
use App\Services\EvolutionApiService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WhatsappInstanceController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        protected EvolutionApiService $evolution
    ) {}

    /**
     * Show the WhatsApp setup page.
     */
    public function setup(Request $request): Response
    {
        $manufacturer = $request->user()->currentManufacturer;

        $instance = $manufacturer->whatsappInstances()->first();

        return Inertia::render('manufacturer/atendimento/setup', [
            'instance' => $instance ? [
                'id' => $instance->id,
                'instance_name' => $instance->instance_name,
                'status' => $instance->status->value,
                'phone_number' => $instance->phone_number,
                'profile_name' => $instance->profile_name,
                'profile_picture_url' => $instance->profile_picture_url,
            ] : null,
        ]);
    }

    /**
     * Create a new WhatsApp instance and return the QR code.
     */
    public function store(CreateWhatsappInstanceRequest $request): RedirectResponse
    {
        $manufacturer = $request->user()->currentManufacturer;

        // Limit: one instance per manufacturer for MVP
        if ($manufacturer->whatsappInstances()->exists()) {
            return redirect()->back()->with('error', 'Você já possui uma instância do WhatsApp configurada.');
        }

        $instanceName = $request->validated('instance_name');

        $response = $this->evolution->createInstance(
            $instanceName,
            config('evolution.webhook_url').'/webhooks/evolution/'.$instanceName,
        );

        if (! $response->successful()) {
            return redirect()->back()->with('error', 'Erro ao criar instância no servidor do WhatsApp. Tente novamente.');
        }

        $data = $response->json();

        $manufacturer->whatsappInstances()->create([
            'instance_name' => $instanceName,
            'instance_id' => $data['instance']['instanceId'] ?? null,
            'status' => 'connecting',
        ]);

        return redirect()->back()->with('status', 'Instância criada. Escaneie o QR Code com seu WhatsApp.');
    }

    /**
     * Get the QR code for an instance (JSON endpoint for polling).
     */
    public function qrCode(WhatsappInstance $instance): JsonResponse
    {
        $this->authorize('view', $instance);

        $response = $this->evolution->connectInstance($instance->instance_name);

        if (! $response->successful()) {
            return response()->json(['error' => 'Não foi possível gerar o QR Code.'], 422);
        }

        $data = $response->json();

        return response()->json([
            'base64' => $data['base64'] ?? null,
            'code' => $data['code'] ?? null,
            'status' => $instance->fresh()->status->value,
        ]);
    }

    /**
     * Poll the connection status of an instance (JSON endpoint).
     */
    public function status(WhatsappInstance $instance): JsonResponse
    {
        $this->authorize('view', $instance);

        $response = $this->evolution->connectionState($instance->instance_name);

        if ($response->successful()) {
            $state = $response->json('instance.state') ?? $response->json('state');

            if ($state === 'open') {
                // Fetch profile info when connected
                $profileResponse = $this->evolution->fetchInstance($instance->instance_name);
                $profileData = $profileResponse->json();

                $instanceData = is_array($profileData) && isset($profileData[0])
                    ? $profileData[0]
                    : ($profileData['instance'] ?? []);

                $instance->update([
                    'status' => 'connected',
                    'phone_number' => $instanceData['owner'] ?? $instance->phone_number,
                    'profile_name' => $instanceData['profileName'] ?? $instance->profile_name,
                    'profile_picture_url' => $instanceData['profilePictureUrl'] ?? $instance->profile_picture_url,
                ]);
            } elseif (in_array($state, ['close', 'refused'])) {
                $instance->update(['status' => 'disconnected']);
            }
        }

        $instance->refresh();

        return response()->json([
            'status' => $instance->status->value,
            'phone_number' => $instance->phone_number,
            'profile_name' => $instance->profile_name,
            'profile_picture_url' => $instance->profile_picture_url,
        ]);
    }

    /**
     * Delete/disconnect a WhatsApp instance.
     */
    public function destroy(WhatsappInstance $instance): RedirectResponse
    {
        $this->authorize('delete', $instance);

        // Try to logout/delete on Evolution API (ignore failures)
        $this->evolution->logoutInstance($instance->instance_name);
        $this->evolution->deleteInstance($instance->instance_name);

        $instance->delete();

        return redirect()->back()->with('status', 'Instância do WhatsApp removida com sucesso.');
    }
}
