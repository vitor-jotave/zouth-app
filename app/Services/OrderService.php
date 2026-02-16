<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderService
{
    /**
     * @param  array{
     *     manufacturer_id: int,
     *     customer_name: string,
     *     customer_phone?: string|null,
     *     customer_email?: string|null,
     *     customer_notes?: string|null,
     *     tracking_ref?: string|null,
     *     sales_rep_id?: int|null,
     *     utm_source?: string|null,
     *     utm_medium?: string|null,
     *     utm_campaign?: string|null,
     *     utm_content?: string|null,
     *     utm_term?: string|null,
     *     items: array<int, array{product_id: int, quantity: int, size?: string|null, color?: string|null}>
     * }  $data
     */
    public function createPublicOrder(array $data): Order
    {
        return DB::transaction(function () use ($data) {
            $order = Order::create([
                'manufacturer_id' => $data['manufacturer_id'],
                'sales_rep_id' => $data['sales_rep_id'] ?? null,
                'public_token' => Str::random(48),
                'status' => OrderStatus::New,
                'customer_name' => $data['customer_name'],
                'customer_phone' => $data['customer_phone'] ?? null,
                'customer_email' => $data['customer_email'] ?? null,
                'customer_notes' => $data['customer_notes'] ?? null,
                'tracking_ref' => $data['tracking_ref'] ?? null,
                'utm_source' => $data['utm_source'] ?? null,
                'utm_medium' => $data['utm_medium'] ?? null,
                'utm_campaign' => $data['utm_campaign'] ?? null,
                'utm_content' => $data['utm_content'] ?? null,
                'utm_term' => $data['utm_term'] ?? null,
            ]);

            $productIds = collect($data['items'])->pluck('product_id')->unique();
            $products = Product::whereIn('id', $productIds)
                ->where('manufacturer_id', $data['manufacturer_id'])
                ->get()
                ->keyBy('id');

            foreach ($data['items'] as $item) {
                $product = $products->get($item['product_id']);

                if (! $product) {
                    continue;
                }

                $order->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'product_sku' => $product->sku,
                    'unit_price' => $product->price_cents !== null
                        ? $product->price_cents / 100
                        : null,
                    'quantity' => $item['quantity'],
                    'size' => $item['size'] ?? null,
                    'color' => $item['color'] ?? null,
                ]);
            }

            $order->statusHistory()->create([
                'from_status' => OrderStatus::New->value,
                'to_status' => OrderStatus::New->value,
                'changed_by_user_id' => null,
                'created_at' => now(),
            ]);

            return $order->load('items');
        });
    }

    public function updateStatus(Order $order, OrderStatus $newStatus, ?int $userId = null): Order
    {
        $oldStatus = $order->status;

        $order->update(['status' => $newStatus]);

        $order->statusHistory()->create([
            'from_status' => $oldStatus->value,
            'to_status' => $newStatus->value,
            'changed_by_user_id' => $userId,
            'created_at' => now(),
        ]);

        return $order->refresh();
    }
}
