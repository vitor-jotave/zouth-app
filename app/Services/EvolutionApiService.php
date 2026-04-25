<?php

namespace App\Services;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class EvolutionApiService
{
    protected string $baseUrl;

    protected string $apiKey;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('evolution.url'), '/');
        $this->apiKey = config('evolution.api_key');
    }

    /**
     * Create a base HTTP client with auth headers.
     */
    protected function client(): PendingRequest
    {
        return Http::baseUrl($this->baseUrl)
            ->withHeaders([
                'apikey' => $this->apiKey,
            ])
            ->acceptJson()
            ->timeout(30);
    }

    /**
     * Create a new WhatsApp instance on Evolution API.
     */
    public function createInstance(string $instanceName, string $webhookUrl): Response
    {
        return $this->client()->post('/instance/create', [
            'instanceName' => $instanceName,
            'integration' => 'WHATSAPP-BAILEYS',
            'qrcode' => true,
            'webhook' => [
                'url' => $webhookUrl,
                'byEvents' => false,
                'base64' => false,
                'headers' => [
                    'apikey' => $this->apiKey,
                ],
                'events' => [
                    'MESSAGES_UPSERT',
                    'MESSAGES_UPDATE',
                    'CONNECTION_UPDATE',
                ],
            ],
        ]);
    }

    /**
     * Connect the instance (generates QR code).
     */
    public function connectInstance(string $instanceName): Response
    {
        return $this->client()->get("/instance/connect/{$instanceName}");
    }

    /**
     * Get the connection state of an instance.
     */
    public function connectionState(string $instanceName): Response
    {
        return $this->client()->get("/instance/connectionState/{$instanceName}");
    }

    /**
     * Delete an instance from Evolution API.
     */
    public function deleteInstance(string $instanceName): Response
    {
        return $this->client()->delete("/instance/delete/{$instanceName}");
    }

    /**
     * Disconnect (logout) an instance.
     */
    public function logoutInstance(string $instanceName): Response
    {
        return $this->client()->delete("/instance/logout/{$instanceName}");
    }

    /**
     * Send a text message.
     */
    public function sendText(string $instanceName, string $remoteJid, string $text): Response
    {
        return $this->client()->post("/message/sendText/{$instanceName}", [
            'number' => $remoteJid,
            'text' => $text,
        ]);
    }

    /**
     * Fetch chats (conversations) from an instance.
     */
    public function fetchChats(string $instanceName): Response
    {
        return $this->client()->post("/chat/findChats/{$instanceName}");
    }

    /**
     * Fetch messages for a specific chat.
     *
     * @param  array<string, mixed>  $where
     */
    public function fetchMessages(string $instanceName, array $where = []): Response
    {
        return $this->client()->post("/chat/findMessages/{$instanceName}", [
            'where' => $where,
        ]);
    }

    /**
     * Fetch contacts from an instance.
     */
    public function fetchContacts(string $instanceName): Response
    {
        return $this->client()->post("/chat/findContacts/{$instanceName}");
    }

    /**
     * Get the instance info/profile.
     */
    public function fetchInstance(string $instanceName): Response
    {
        return $this->client()->get('/instance/fetchInstances', [
            'instanceName' => $instanceName,
        ]);
    }

    /**
     * Update the webhook configuration for an instance.
     */
    public function setWebhook(string $instanceName, string $webhookUrl): Response
    {
        return $this->client()->post("/webhook/set/{$instanceName}", [
            'url' => $webhookUrl,
            'enabled' => true,
            'events' => [
                'MESSAGES_UPSERT',
                'MESSAGES_UPDATE',
                'CONNECTION_UPDATE',
            ],
            'webhookByEvents' => false,
            'webhookBase64' => false,
            'headers' => [
                'apikey' => $this->apiKey,
            ],
        ]);
    }
}
