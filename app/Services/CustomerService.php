<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Order;

class CustomerService
{
    /**
     * @param  array{
     *     manufacturer_id: int,
     *     customer_name: string,
     *     customer_phone?: string|null,
     *     customer_email?: string|null,
     *     customer_document_type: string,
     *     customer_document: string,
     *     customer_zip_code?: string|null,
     *     customer_state?: string|null,
     *     customer_city?: string|null,
     *     customer_neighborhood?: string|null,
     *     customer_street?: string|null,
     *     customer_address_number?: string|null,
     *     customer_address_complement?: string|null,
     *     customer_address_reference?: string|null
     * }  $data
     */
    public function upsertFromOrderData(array $data): Customer
    {
        return Customer::updateOrCreate(
            [
                'manufacturer_id' => $data['manufacturer_id'],
                'customer_document_type' => $data['customer_document_type'],
                'customer_document' => $data['customer_document'],
            ],
            [
                'name' => $data['customer_name'],
                'phone' => $data['customer_phone'] ?? null,
                'email' => $data['customer_email'] ?? null,
                'zip_code' => $data['customer_zip_code'] ?? null,
                'state' => $data['customer_state'] ?? null,
                'city' => $data['customer_city'] ?? null,
                'neighborhood' => $data['customer_neighborhood'] ?? null,
                'street' => $data['customer_street'] ?? null,
                'address_number' => $data['customer_address_number'] ?? null,
                'address_complement' => $data['customer_address_complement'] ?? null,
                'address_reference' => $data['customer_address_reference'] ?? null,
            ],
        );
    }

    public function backfillOrdersWithoutCustomers(): void
    {
        Order::query()
            ->whereNull('customer_id')
            ->whereNotNull('customer_document_type')
            ->whereNotNull('customer_document')
            ->orderBy('id')
            ->chunkById(100, function ($orders) {
                foreach ($orders as $order) {
                    $documentType = strtolower((string) $order->customer_document_type);
                    $document = preg_replace('/\D/', '', (string) $order->customer_document);

                    if (! in_array($documentType, ['cpf', 'cnpj'], true) || $document === '') {
                        continue;
                    }

                    $customer = $this->upsertFromOrderData([
                        'manufacturer_id' => $order->manufacturer_id,
                        'customer_name' => $order->customer_name,
                        'customer_phone' => $order->customer_phone,
                        'customer_email' => $order->customer_email,
                        'customer_document_type' => $documentType,
                        'customer_document' => $document,
                        'customer_zip_code' => $order->customer_zip_code,
                        'customer_state' => $order->customer_state,
                        'customer_city' => $order->customer_city,
                        'customer_neighborhood' => $order->customer_neighborhood,
                        'customer_street' => $order->customer_street,
                        'customer_address_number' => $order->customer_address_number,
                        'customer_address_complement' => $order->customer_address_complement,
                        'customer_address_reference' => $order->customer_address_reference,
                    ]);

                    $order->update(['customer_id' => $customer->id]);
                }
            });
    }
}
