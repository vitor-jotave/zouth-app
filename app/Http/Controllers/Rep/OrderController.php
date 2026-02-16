<?php

namespace App\Http\Controllers\Rep;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class OrderController extends Controller
{
    public function index(Request $request): Response
    {
        $orders = Order::where('sales_rep_id', $request->user()->id)
            ->with(['items', 'manufacturer'])
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('rep/orders/index', [
            'orders' => OrderResource::collection($orders),
        ]);
    }
}
