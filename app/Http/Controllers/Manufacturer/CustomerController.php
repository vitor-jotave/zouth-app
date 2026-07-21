<?php

namespace App\Http\Controllers\Manufacturer;

use App\Enums\OrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Http\Resources\OrderResource;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\TenantManager;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function __construct(private TenantManager $tenantManager) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Customer::class);

        $manufacturer = $this->tenantManager->get();
        $attentionSince = now()->subDays(60);
        $relationship = in_array($request->string('relationship')->toString(), ['recent', 'repeat', 'attention'], true)
            ? $request->string('relationship')->toString()
            : 'all';

        $customersQuery = $this->portfolioQuery($manufacturer->id)
            ->when($request->search, function ($query, string $search) {
                $documentSearch = preg_replace('/\D/', '', $search);

                $query->where(function ($q) use ($search, $documentSearch) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");

                    if ($documentSearch !== '') {
                        $q->orWhere('customer_document', 'like', "%{$documentSearch}%");
                    }
                });
            });

        $this->applyRelationshipFilter($customersQuery, $relationship, $attentionSince);

        $customers = $customersQuery
            ->orderByDesc('last_order_at')
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        $customerBaseQuery = Customer::query()
            ->where('manufacturer_id', $manufacturer->id);

        $attentionCustomer = $this->portfolioQuery($manufacturer->id)
            ->whereHas('orders', fn (Builder $query) => $this->commercialOrders($query))
            ->whereDoesntHave('orders', function (Builder $query) use ($attentionSince) {
                $this->commercialOrders($query);
                $query->where('created_at', '>=', $attentionSince);
            })
            ->orderBy('last_order_at')
            ->first();

        return Inertia::render('manufacturer/customers/index', [
            'customers' => CustomerResource::collection($customers),
            'attention_customer' => $attentionCustomer
                ? (new CustomerResource($attentionCustomer))->resolve($request)
                : null,
            'customer_summary' => [
                'total_customers' => (clone $customerBaseQuery)->count(),
                'buyers' => (clone $customerBaseQuery)
                    ->whereHas('orders', fn (Builder $query) => $this->commercialOrders($query))
                    ->count(),
                'recurring' => (clone $customerBaseQuery)
                    ->whereHas('orders', fn (Builder $query) => $this->commercialOrders($query), '>=', 2)
                    ->count(),
                'attention' => (clone $customerBaseQuery)
                    ->whereDoesntHave('orders', function (Builder $query) use ($attentionSince) {
                        $this->commercialOrders($query);
                        $query->where('created_at', '>=', $attentionSince);
                    })
                    ->count(),
            ],
            'filters' => [
                'search' => $request->search ?? '',
                'relationship' => $relationship,
            ],
        ]);
    }

    public function store(StoreCustomerRequest $request): RedirectResponse
    {
        $customer = Customer::create([
            ...$request->validated(),
            'manufacturer_id' => $request->user()->current_manufacturer_id,
        ]);

        return redirect()
            ->route('manufacturer.customers.show', $customer)
            ->with('success', 'Cliente criado com sucesso.');
    }

    public function show(Request $request, Customer $customer): Response
    {
        $this->authorize('view', $customer);

        $customer = $this->portfolioQuery($customer->manufacturer_id)
            ->findOrFail($customer->id);

        $orders = $customer->orders()
            ->with(['items', 'salesRep'])
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('manufacturer/customers/show', [
            'customer' => (new CustomerResource($customer))->resolve($request),
            'orders' => OrderResource::collection($orders),
        ]);
    }

    public function update(UpdateCustomerRequest $request, Customer $customer): RedirectResponse
    {
        $customer->update($request->validated());

        return redirect()
            ->back()
            ->with('success', 'Cliente atualizado com sucesso.');
    }

    private function portfolioQuery(int $manufacturerId): Builder
    {
        return Customer::query()
            ->where('manufacturer_id', $manufacturerId)
            ->select('customers.*')
            ->withCount([
                'orders',
                'orders as commercial_orders_count' => fn (Builder $query) => $this->commercialOrders($query),
            ])
            ->selectSub(
                Order::query()
                    ->selectRaw('max(created_at)')
                    ->whereColumn('orders.customer_id', 'customers.id')
                    ->where('status', '!=', OrderStatus::Cancelled->value),
                'last_order_at'
            )
            ->selectSub(
                OrderItem::query()
                    ->join('orders', 'orders.id', '=', 'order_items.order_id')
                    ->selectRaw('coalesce(sum(coalesce(order_items.unit_price, 0) * order_items.quantity), 0)')
                    ->whereColumn('orders.customer_id', 'customers.id')
                    ->where('orders.status', '!=', OrderStatus::Cancelled->value),
                'total_spent'
            );
    }

    private function commercialOrders(Builder $query): void
    {
        $query->where('status', '!=', OrderStatus::Cancelled->value);
    }

    private function applyRelationshipFilter(Builder $query, string $relationship, CarbonInterface $attentionSince): void
    {
        if ($relationship === 'recent') {
            $query->whereHas('orders', function (Builder $orders) use ($attentionSince) {
                $this->commercialOrders($orders);
                $orders->where('created_at', '>=', $attentionSince);
            });

            return;
        }

        if ($relationship === 'repeat') {
            $query->whereHas('orders', fn (Builder $orders) => $this->commercialOrders($orders), '>=', 2);

            return;
        }

        if ($relationship === 'attention') {
            $query->whereDoesntHave('orders', function (Builder $orders) use ($attentionSince) {
                $this->commercialOrders($orders);
                $orders->where('created_at', '>=', $attentionSince);
            });
        }
    }
}
