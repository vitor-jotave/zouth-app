<?php

use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\ManufacturerController;
use App\Http\Controllers\Admin\PlanController;
use App\Http\Controllers\CatalogSettingsController;
use App\Http\Controllers\EvolutionWebhookController;
use App\Http\Controllers\Health\ReadinessController;
use App\Http\Controllers\LegalController;
use App\Http\Controllers\Manufacturer\BillingController;
use App\Http\Controllers\Manufacturer\CustomerController as ManufacturerCustomerController;
use App\Http\Controllers\Manufacturer\DashboardController as ManufacturerDashboardController;
use App\Http\Controllers\Manufacturer\OrderController as ManufacturerOrderController;
use App\Http\Controllers\Manufacturer\OrderRuleController;
use App\Http\Controllers\Manufacturer\ProductComboController;
use App\Http\Controllers\Manufacturer\ProductImportController;
use App\Http\Controllers\Manufacturer\ReportController;
use App\Http\Controllers\Manufacturer\RepresentativeController;
use App\Http\Controllers\Manufacturer\RepresentativeInvitationController;
use App\Http\Controllers\Manufacturer\UserController as ManufacturerUserController;
use App\Http\Controllers\Manufacturer\WhatsappAutomationController;
use App\Http\Controllers\Manufacturer\WhatsappChatController;
use App\Http\Controllers\Manufacturer\WhatsappFunnelController;
use App\Http\Controllers\Manufacturer\WhatsappInstanceController;
use App\Http\Controllers\Manufacturer\WhatsappQuickReplyController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\PlanSelectionController;
use App\Http\Controllers\ProductCategoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductMediaController;
use App\Http\Controllers\PublicCatalogController;
use App\Http\Controllers\PublicOrderController;
use App\Http\Controllers\Rep\DashboardController as RepDashboardController;
use App\Http\Controllers\Rep\ManufacturerController as RepManufacturerController;
use App\Http\Controllers\Rep\OrderController as RepOrderController;
use App\Http\Controllers\RepresentativeInvitationAcceptanceController;
use App\Http\Controllers\RobotsController;
use App\Http\Controllers\SitemapController;
use App\Http\Controllers\VariationTypeController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    $demoCatalogUrl = config('commercial.demo_catalog_url');
    $demoCatalogScheme = is_string($demoCatalogUrl)
        ? parse_url($demoCatalogUrl, PHP_URL_SCHEME)
        : null;
    $hasSafeDemoCatalogUrl = filled($demoCatalogUrl)
        && filter_var($demoCatalogUrl, FILTER_VALIDATE_URL)
        && in_array($demoCatalogScheme, ['http', 'https'], true);
    $canonicalUrl = url('/');
    $shareImageUrl = url('/brand/zouth/landing/collection-in-motion.webp');
    $pageDescription = config('commercial.seo.home_description');

    return Inertia::render('landing/index', [
        'canRegister' => Features::enabled(Features::registration()),
        'commercial' => [
            'salesContactUrl' => config('commercial.sales_contact_url'),
            'demoCatalogUrl' => $hasSafeDemoCatalogUrl ? $demoCatalogUrl : null,
            'onboardingUrl' => route('onboarding.index', absolute: false),
        ],
        'seo' => [
            'pageTitle' => config('commercial.seo.home_title'),
            'description' => $pageDescription,
            'canonicalUrl' => $canonicalUrl,
            'shareImageUrl' => $shareImageUrl,
            'shareImageWidth' => 1536,
            'shareImageHeight' => 1024,
            'ogTitle' => config('commercial.seo.home_og_title'),
            'ogDescription' => config('commercial.seo.home_og_description'),
            'structuredData' => [
                '@context' => 'https://schema.org',
                '@type' => 'Organization',
                '@id' => $canonicalUrl.'#organization',
                'name' => 'ZOUTH',
                'alternateName' => 'Zouth',
                'url' => $canonicalUrl,
                'logo' => url('/brand/zouth/favicon/web-app-manifest-512x512.png'),
                'email' => 'comercial@zouth.app',
                'description' => $pageDescription,
            ],
        ],
    ]);
})->name('home');

Route::get('robots.txt', RobotsController::class)->name('robots');
Route::get('sitemap.xml', SitemapController::class)->name('sitemap');

Route::controller(OnboardingController::class)
    ->prefix('comece')
    ->name('onboarding.')
    ->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('progress', 'progress')->middleware('throttle:60,1')->name('progress');
        Route::post('account', 'store')->middleware('throttle:5,1')->name('store');
        Route::post('preview', 'preview')->middleware(['auth', 'throttle:10,1'])->name('preview');
        Route::post('complete', 'complete')->middleware(['auth', 'verified', 'throttle:10,1'])->name('complete');
    });

Route::get('health/live', fn () => response()->json(['status' => 'ok']))
    ->name('health.live');
Route::get('health/ready', ReadinessController::class)
    ->name('health.ready');

Route::controller(LegalController::class)->prefix('legal')->name('legal.')->group(function () {
    Route::get('termos', 'terms')->name('terms');
    Route::get('privacidade', 'privacy')->name('privacy');
    Route::get('lgpd', 'lgpd')->name('lgpd');
});

Route::get('catalog/{token}', [PublicCatalogController::class, 'show'])
    ->middleware('throttle:60,1')
    ->name('public.catalog.show');

// Public order routes
Route::post('catalog/{catalogSetting:public_token}/orders', [PublicOrderController::class, 'store'])
    ->middleware('throttle:10,1')
    ->name('public.order.store');
Route::get('o/{publicToken}', [PublicOrderController::class, 'show'])
    ->middleware('throttle:60,1')
    ->name('public.order.show');

Route::post('webhooks/evolution/{instanceName}', [EvolutionWebhookController::class, 'handle'])
    ->middleware('throttle:evolution-webhook')
    ->name('webhooks.evolution');

Route::controller(RepresentativeInvitationAcceptanceController::class)
    ->prefix('representative-invitations')
    ->name('representative-invitations.')
    ->where(['token' => '[A-Za-z0-9]{64}'])
    ->group(function () {
        Route::get('{token}', 'show')->name('show');
        Route::post('{token}', 'accept')->middleware('throttle:10,1')->name('accept');
    });

// Public plan selection routes (secured via signed URLs)
Route::controller(PlanSelectionController::class)
    ->prefix('plan-selection')
    ->name('plan-selection.')
    ->group(function () {
        Route::get('{manufacturer}', 'show')->name('show');
        Route::get('{manufacturer}/checkout/{plan}', 'checkout')->name('checkout');
        Route::get('{manufacturer}/checkout/{plan}/success', 'checkoutSuccess')->name('checkout.success');
    });

// Manufacturer User Routes (tenant via session)
Route::middleware(['auth', 'verified', 'manufacturer.tenant', 'manufacturer.entitled'])->group(function () {
    Route::get('dashboard', ManufacturerDashboardController::class)->name('dashboard');

    Route::get('manufacturer/account-paused', [OnboardingController::class, 'paused'])
        ->name('manufacturer.account-paused');

    Route::controller(ManufacturerUserController::class)->prefix('users')->name('users.')->middleware('manufacturer.owner')->group(function () {
        Route::get('/', 'index')->name('index');
        Route::post('/', 'store')->name('store');
        Route::post('{user}/status', 'updateStatus')->name('update-status');
        Route::post('{user}/role', 'updateRole')->name('update-role');
        Route::post('{user}/transfer-ownership', 'transferOwnership')
            ->middleware('throttle:6,1')
            ->name('transfer-ownership');
    });

    Route::prefix('affiliations')->name('affiliations.')->middleware('manufacturer.capability:affiliations.manage')->group(function () {
        Route::redirect('/', '/manufacturer/representatives')->name('index');
        Route::post('{affiliation}/approve', [RepresentativeController::class, 'approve'])->name('approve');
        Route::post('{affiliation}/reject', [RepresentativeController::class, 'reject'])->name('reject');
        Route::post('{affiliation}/revoke', [RepresentativeController::class, 'revoke'])->name('revoke');
    });

    Route::prefix('manufacturer')->name('manufacturer.')->group(function () {
        Route::get('reports', ReportController::class)
            ->middleware('manufacturer.capability:reports.view')
            ->name('reports.index');

        Route::controller(RepresentativeController::class)
            ->prefix('representatives')
            ->name('representatives.')
            ->middleware('manufacturer.capability:affiliations.manage')
            ->group(function () {
                Route::get('/', 'index')->name('index');
                Route::post('{affiliation}/approve', 'approve')->name('approve');
                Route::post('{affiliation}/reject', 'reject')->name('reject');
                Route::post('{affiliation}/revoke', 'revoke')->name('revoke');

                Route::post('invitations', [RepresentativeInvitationController::class, 'store'])->name('invitations.store');
                Route::post('invitations/{invitation}/resend', [RepresentativeInvitationController::class, 'resend'])->name('invitations.resend');
                Route::delete('invitations/{invitation}', [RepresentativeInvitationController::class, 'cancel'])->name('invitations.cancel');
            });

        Route::controller(CatalogSettingsController::class)
            ->prefix('catalog-settings')
            ->name('catalog-settings.')
            ->middleware('manufacturer.capability:catalog.manage')
            ->group(function () {
                Route::get('/', 'index')->name('index');
                Route::put('/', 'update')->name('update');
                Route::post('logo', 'uploadLogo')->name('logo');
                Route::delete('logo', 'destroyLogo')->name('logo.destroy');
                Route::post('background', 'uploadBackground')->name('background');
                Route::delete('background', 'destroyBackground')->name('background.destroy');
                Route::post('cover', 'uploadCover')->name('cover');
                Route::delete('cover', 'destroyCover')->name('cover.destroy');
                Route::post('rotate-link', 'rotateLink')->name('rotate-link');
                Route::post('reset-defaults', 'resetDefaults')->name('reset-defaults');
            });

        Route::controller(ProductCategoryController::class)->prefix('categories')->name('categories.')->middleware('manufacturer.capability:collection.manage')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::put('{category}', 'update')->name('update');
            Route::delete('{category}', 'destroy')->name('destroy');
        });

        Route::controller(VariationTypeController::class)->prefix('variation-types')->name('variation-types.')->middleware('manufacturer.capability:collection.manage')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::put('{variation_type}', 'update')->name('update');
            Route::delete('{variation_type}', 'destroy')->name('destroy');
        });

        Route::controller(ProductController::class)->prefix('products')->name('products.')->middleware('manufacturer.capability:collection.manage')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('create', 'create')->name('create');
            Route::post('/', 'store')->name('store');
            Route::get('combos/create', [ProductComboController::class, 'create'])->name('combos.create');
            Route::post('combos', [ProductComboController::class, 'store'])->name('combos.store');
            Route::get('{product}/combo/edit', [ProductComboController::class, 'edit'])->name('combos.edit');
            Route::put('{product}/combo', [ProductComboController::class, 'update'])->name('combos.update');
            Route::get('{product}/edit', 'edit')->name('edit');
            Route::put('{product}', 'update')->name('update');
            Route::delete('{product}', 'destroy')->name('destroy');
        });

        Route::controller(ProductImportController::class)
            ->prefix('product-imports')
            ->name('product-imports.')
            ->middleware('manufacturer.capability:collection.manage')
            ->group(function () {
                Route::get('/', 'index')->name('index');
                Route::get('create', 'create')->name('create');
                Route::post('/', 'store')->name('store');
                Route::get('template', 'template')->name('template');
                Route::get('{productImport}', 'show')->name('show');
                Route::put('{productImport}/mapping', 'updateMapping')->name('mapping.update');
                Route::post('{productImport}/confirm', 'confirm')->name('confirm');
                Route::post('{productImport}/retry', 'retry')->name('retry');
                Route::post('{productImport}/cancel', 'cancel')->name('cancel');
                Route::get('{productImport}/errors', 'errors')->name('errors');
                Route::delete('{productImport}', 'destroy')->name('destroy');
            });

        Route::scopeBindings()->controller(ProductMediaController::class)
            ->prefix('products/{product}/media')
            ->name('products.media.')
            ->middleware('manufacturer.capability:collection.manage')
            ->group(function () {
                Route::post('/', 'store')->name('store');
                Route::put('order', 'reorder')->name('order');
                Route::delete('{media}', 'destroy')->name('destroy');
            });

        Route::controller(ManufacturerOrderController::class)->prefix('orders')->name('orders.')->middleware('manufacturer.capability:orders.manage')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::get('{order}', 'show')->name('show');
            Route::post('{order}/status', 'updateStatus')->name('update-status');
            Route::put('{order}/notes', 'updateNotes')->name('update-notes');
        });

        Route::controller(OrderRuleController::class)->prefix('order-rules')->name('order-rules.')->middleware('manufacturer.capability:orders.manage')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::put('{orderRule}', 'update')->name('update');
            Route::post('{orderRule}/toggle', 'toggle')->name('toggle');
            Route::post('{orderRule}/duplicate', 'duplicate')->name('duplicate');
            Route::delete('{orderRule}', 'destroy')->name('destroy');
        });

        Route::controller(ManufacturerCustomerController::class)->prefix('customers')->name('customers.')->middleware('manufacturer.capability:customers.manage')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->name('store');
            Route::get('{customer}', 'show')->name('show');
            Route::put('{customer}', 'update')->name('update');
        });

        Route::prefix('atendimento')->name('atendimento.')->middleware('manufacturer.capability:whatsapp.manage')->group(function () {
            Route::get('canais', [WhatsappInstanceController::class, 'setup'])->name('channels');
            Route::get('setup', [WhatsappInstanceController::class, 'setup'])->name('setup');
            Route::post('instances', [WhatsappInstanceController::class, 'store'])->name('instances.store');
            Route::get('instances/{instance}/qr', [WhatsappInstanceController::class, 'qrCode'])->name('instances.qr');
            Route::get('instances/{instance}/status', [WhatsappInstanceController::class, 'status'])->name('instances.status');
            Route::delete('instances/{instance}', [WhatsappInstanceController::class, 'destroy'])->name('instances.destroy');

            Route::get('/', [WhatsappChatController::class, 'index'])->name('index');
            Route::get('products', [WhatsappChatController::class, 'products'])->name('products');
            Route::get('conversations/list', [WhatsappChatController::class, 'conversationsList'])->name('conversations.list');
            Route::get('conversations/{conversation}/messages', [WhatsappChatController::class, 'messages'])->name('conversations.messages');
            Route::post('conversations/{conversation}/messages', [WhatsappChatController::class, 'sendMessage'])->name('conversations.send');
            Route::get('messages/{message}/media', [WhatsappChatController::class, 'media'])->name('messages.media');
            Route::post('messages/{message}/reaction', [WhatsappChatController::class, 'react'])->name('messages.reaction');
            Route::post('conversations/{conversation}/products/pdf', [WhatsappChatController::class, 'sendProductsPdf'])->name('conversations.products.pdf');
            Route::post('conversations/{conversation}/products/{product}', [WhatsappChatController::class, 'sendProduct'])->name('conversations.products.send');
            Route::post('conversations/{conversation}/funnels/{funnel}/runs', [WhatsappFunnelController::class, 'startRun'])->name('conversations.funnels.runs.store');
            Route::get('funnel-runs/{run}', [WhatsappFunnelController::class, 'showRun'])->name('funnel-runs.show');

            Route::controller(WhatsappAutomationController::class)->prefix('automacoes')->name('automations.')->group(function () {
                Route::get('/', 'index')->name('index');
                Route::post('/', 'store')->name('store');
                Route::get('{automation}/edit', 'edit')->name('edit');
                Route::put('{automation}', 'update')->name('update');
            });

            Route::controller(WhatsappQuickReplyController::class)->prefix('mensagens-rapidas')->name('quick-replies.')->group(function () {
                Route::get('/', 'index')->name('index');
                Route::post('/', 'store')->name('store');
                Route::put('{quickReply}', 'update')->name('update');
                Route::delete('{quickReply}', 'destroy')->name('destroy');
            });

            Route::controller(WhatsappFunnelController::class)->prefix('funis')->name('funis.')->group(function () {
                Route::get('/', 'index')->name('index');
                Route::post('/', 'store')->name('store');
                Route::put('order', 'order')->name('order');
                Route::get('{funnel}/steps/{step}/audio', 'audio')->name('steps.audio');
                Route::get('{funnel}/edit', 'edit')->name('edit');
                Route::put('{funnel}', 'update')->name('update');
                Route::post('{funnel}/toggle', 'toggle')->name('toggle');
            });
        });

        Route::controller(BillingController::class)->prefix('billing')->name('billing.')->middleware('manufacturer.owner')->group(function () {
            Route::get('/', 'index')->name('index');
            Route::put('details', 'updateDetails')->name('details.update');
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
        Route::put('{manufacturer}', 'update')->name('update');
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
