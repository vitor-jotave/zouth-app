<?php

namespace App\Http\Controllers\Manufacturer;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Http\Resources\OrderResource;
use App\Models\Customer;
use App\Models\Order;
use App\Services\TenantManager;
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

        $customers = Customer::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->select('customers.*')
            ->withCount('orders')
            ->selectSub(
                Order::query()
                    ->selectRaw('max(created_at)')
                    ->whereColumn('orders.customer_id', 'customers.id'),
                'last_order_at'
            )
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
            })
            ->orderByDesc('last_order_at')
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('manufacturer/customers/index', [
            'customers' => CustomerResource::collection($customers),
            'filters' => [
                'search' => $request->search ?? '',
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

        $customer->loadCount('orders');
        $customer->last_order_at = $customer->orders()->max('created_at');

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
}
