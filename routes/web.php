<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\ManufacturerController;
use App\Http\Controllers\Admin\PlanController;
use App\Http\Controllers\AffiliationController;
use App\Http\Controllers\CatalogSettingsController;
use App\Http\Controllers\Manufacturer\BillingController;
use App\Http\Controllers\Manufacturer\OrderController as ManufacturerOrderController;
use App\Http\Controllers\Manufacturer\UserController as ManufacturerUserController;
use App\Http\Controllers\ProductCategoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductMediaController;
use App\Http\Controllers\PublicCatalogController;
use App\Http\Controllers\PublicOrderController;
use App\Http\Controllers\Rep\DashboardController as RepDashboardController;
use App\Http\Controllers\Rep\ManufacturerController as RepManufacturerController;
use App\Http\Controllers\Rep\OrderController as RepOrderController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('homepage', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('catalog/{token}', [PublicCatalogController::class, 'show'])->name('public.catalog.show');

// Public order routes
Route::post('catalog/{catalogSetting:public_token}/orders', [PublicOrderController::class, 'store'])
    ->name('public.order.store');
Route::get('o/{publicToken}', [PublicOrderController::class, 'show'])
    ->name('public.order.show');

// Manufacturer User Routes (tenant via session)
Route::middleware(['auth', 'verified', 'manufacturer.tenant'])->group(function () {
    Route::get('dashboard', function () {
        return Inertia::render('dashboard');
    })->name('dashboard');

    Route::controller(ManufacturerUserController::class)->prefix('users')->name('users.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::post('{user}/status', 'updateStatus')->name('update-status');
        Route::post('{user}/role', 'updateRole')->name('update-role');
    });

    Route::controller(AffiliationController::class)->prefix('affiliations')->name('affiliations.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('{affiliation}/approve', 'approve')->name('approve');
        Route::post('{affiliation}/reject', 'reject')->name('reject');
        Route::post('{affiliation}/revoke', 'revoke')->name('revoke');
    });

    Route::prefix('manufacturer')->name('manufacturer.')->group(function () {
        Route::controller(CatalogSettingsController::class)
            ->prefix('catalog-settings')
            ->name('catalog-settings.')
            ->group(function () {
                Route::get('/', 'index')->name('index');
                Route::put('/', 'update')->name('update');
                Route::post('logo', 'uploadLogo')->name('logo');
                Route::delete('logo', 'destroyLogo')->name('logo.destroy');
                Route::post('background', 'uploadBackground')->name('background');
                Route::delete('background', 'destroyBackground')->name('background.destroy');
                Route::post('rotate-link', 'rotateLink')->name('rotate-link');
                Route::post('reset-defaults', 'resetDefaults')->name('reset-defaults');
            });

        Route::controller(ProductCategoryController::class)->prefix('categories')->name('categories.')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::put('{category}', 'update')->name('update');
            Route::delete('{category}', 'destroy')->name('destroy');
        });

        Route::controller(ProductController::class)->prefix('products')->name('products.')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('create', 'create')->name('create');
            Route::post('/', 'store')->name('store');
            Route::get('{product}/edit', 'edit')->name('edit');
            Route::put('{product}', 'update')->name('update');
            Route::delete('{product}', 'destroy')->name('destroy');
        });

        Route::scopeBindings()->controller(ProductMediaController::class)
            ->prefix('products/{product}/media')
            ->name('products.media.')
            ->group(function () {
                Route::post('/', 'store')->name('store');
                Route::put('order', 'reorder')->name('order');
                Route::delete('{media}', 'destroy')->name('destroy');
            });

        Route::controller(ManufacturerOrderController::class)->prefix('orders')->name('orders.')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('{order}', 'show')->name('show');
            Route::post('{order}/status', 'updateStatus')->name('update-status');
            Route::put('{order}/notes', 'updateNotes')->name('update-notes');
        });

        Route::controller(BillingController::class)->prefix('billing')->name('billing.')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('checkout/{plan}', 'checkout')->name('checkout');
            Route::get('checkout/{plan}/success', 'checkoutSuccess')->name('checkout.success');
            Route::post('swap', 'swap')->name('swap');
            Route::post('upgrade', 'upgrade')->name('upgrade');
            Route::post('cancel', 'cancel')->name('cancel');
            Route::post('resume', 'resume')->name('resume');
            Route::get('portal', 'portal')->name('portal');
        });
    });
});

// Superadmin Routes
Route::middleware(['auth', 'verified', 'superadmin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('dashboard', AdminDashboardController::class)->name('dashboard');

    Route::controller(ManufacturerController::class)->prefix('manufacturers')->name('manufacturers.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::post('{manufacturer}/toggle', 'toggle')->name('toggle');
    });

    Route::controller(PlanController::class)->prefix('plans')->name('plans.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::get('create', 'create')->name('create');
        Route::post('/', 'store')->name('store');
        Route::get('{plan}/edit', 'edit')->name('edit');
        Route::put('{plan}', 'update')->name('update');
        Route::post('{plan}/toggle', 'toggle')->name('toggle');
    });
});

// Sales Rep Routes
Route::middleware(['auth', 'verified', 'sales.rep'])->prefix('rep')->name('rep.')->group(function () {
    Route::get('dashboard', RepDashboardController::class)->name('dashboard');

    Route::controller(RepManufacturerController::class)->prefix('manufacturers')->name('manufacturers.')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('{manufacturer}/affiliate', 'affiliate')->name('affiliate');
    });

    Route::get('m/{manufacturer:slug}/catalog', [RepManufacturerController::class, 'catalog'])->name('catalog');

    Route::get('orders', [RepOrderController::class, 'index'])->name('orders.index');
});

require __DIR__.'/settings.php';
