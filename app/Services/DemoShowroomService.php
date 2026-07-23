<?php

namespace App\Services;

use App\Enums\ManufacturerCapability;
use App\Enums\OrderStatus;
use App\Enums\UserType;
use App\Enums\WhatsappInstanceStatus;
use App\Enums\WhatsappMessageStatus;
use App\Models\CatalogSetting;
use App\Models\CatalogVisit;
use App\Models\Customer;
use App\Models\Manufacturer;
use App\Models\ManufacturerAffiliation;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\RepresentativeInvitation;
use App\Models\SalesRepresentativeProfile;
use App\Models\User;
use App\Models\VariationType;
use App\Models\WhatsappAutomation;
use App\Models\WhatsappConversation;
use App\Models\WhatsappFunnel;
use App\Models\WhatsappInstance;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class DemoShowroomService
{
    public function __construct(
        private readonly ProductImageOptimizer $imageOptimizer,
        private readonly ProductImageStorage $productImageStorage,
        private readonly CatalogCoverImageStorage $coverImageStorage,
    ) {}

    /**
     * @return array{manufacturer: Manufacturer, user: User, password: string}
     */
    public function create(string $email): array
    {
        $plan = Plan::query()
            ->where('is_active', true)
            ->orderByDesc('sort_order')
            ->orderByDesc('id')
            ->first();

        if (! $plan) {
            throw new RuntimeException('Cadastre ao menos um plano ativo antes de criar o showroom.');
        }

        $password = Str::random(8).'!'.random_int(100000, 999999).'Aa';
        $oldMedia = ['product_ids' => [], 'cover_path' => null, 'cover_thumbnail_path' => null];
        $newMedia = ['product_ids' => [], 'manufacturer_id' => null];

        try {
            $result = DB::transaction(function () use ($email, $password, $plan, &$oldMedia, &$newMedia): array {
                $existing = Manufacturer::query()
                    ->where('is_demo', true)
                    ->with(['catalogSetting', 'products:id,manufacturer_id', 'users:id', 'affiliations.user:id'])
                    ->lockForUpdate()
                    ->first();

                if ($existing) {
                    $oldMedia = [
                        'product_ids' => $existing->products->pluck('id')->all(),
                        'cover_path' => $existing->catalogSetting?->cover_image_path,
                        'cover_thumbnail_path' => $existing->catalogSetting?->cover_thumbnail_path,
                    ];

                    $demoUserIds = $existing->users
                        ->pluck('id')
                        ->merge($existing->affiliations->pluck('user.id'))
                        ->filter()
                        ->unique()
                        ->values();

                    $existing->delete();
                    User::query()->whereIn('id', $demoUserIds)->delete();
                }

                $manufacturer = $this->createManufacturer($plan);
                $newMedia['manufacturer_id'] = $manufacturer->id;
                $owner = $this->createTeam($manufacturer, $email, $password);
                $catalog = $this->createCatalog($manufacturer);
                $products = $this->createProducts($manufacturer, $newMedia['product_ids']);
                $this->createCombos($manufacturer, $products);
                $this->createOrderRules($manufacturer);
                $customers = $this->createCustomers($manufacturer);
                $representatives = $this->createRepresentatives($manufacturer, $owner);
                $this->createOrders($manufacturer, $owner, $customers, $products, $representatives);
                $this->createCatalogVisits($manufacturer, $catalog);
                $this->createAtendimento($manufacturer, $products);

                return [
                    'manufacturer' => $manufacturer->fresh(),
                    'user' => $owner->fresh(),
                    'password' => $password,
                ];
            }, 3);
        } catch (Throwable $exception) {
            $this->deleteProductDirectories($newMedia['product_ids']);

            if ($newMedia['manufacturer_id']) {
                Storage::disk((string) config('filesystems.catalog_media_disk', 'public'))
                    ->deleteDirectory('manufacturers/'.$newMedia['manufacturer_id']);
            }

            throw $exception;
        }

        $this->deleteProductDirectories($oldMedia['product_ids']);
        $this->coverImageStorage->delete(
            $oldMedia['cover_path'],
            $oldMedia['cover_thumbnail_path'],
        );

        return $result;
    }

    private function createManufacturer(Plan $plan): Manufacturer
    {
        $now = now();

        return Manufacturer::create([
            'name' => 'Brisa Mini',
            'slug' => 'brisa-mini-showroom-'.Str::lower((string) Str::ulid()),
            'is_demo' => true,
            'is_active' => true,
            'current_plan_id' => $plan->id,
            'onboarding_started_at' => $now,
            'onboarding_account_created_at' => $now,
            'onboarding_preview_viewed_at' => $now,
            'onboarding_email_confirmed_at' => $now,
            'onboarding_completed_at' => $now,
            'onboarding_context' => ['source' => 'superadmin_showroom', 'journey' => 'catalog_and_whatsapp'],
            'cnpj' => $this->generateUniqueCnpj(),
            'phone' => '(11) 99999-2026',
            'zip_code' => '01415-001',
            'state' => 'SP',
            'city' => 'São Paulo',
            'neighborhood' => 'Jardins',
            'street' => 'Alameda Brisa',
            'address_number' => '120',
            'complement' => 'Ateliê 4',
        ]);
    }

    private function generateUniqueCnpj(): string
    {
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $digits = [];

            for ($index = 0; $index < 8; $index++) {
                $digits[] = random_int(0, 9);
            }

            $digits = [...$digits, 0, 0, 0, 1];
            $digits[] = $this->calculateCnpjDigit($digits, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
            $digits[] = $this->calculateCnpjDigit($digits, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
            $cnpj = implode('', $digits);

            if (Manufacturer::query()->where('cnpj', $cnpj)->doesntExist()) {
                return $cnpj;
            }
        }

        throw new RuntimeException('Não foi possível gerar um CNPJ exclusivo para o showroom.');
    }

    /**
     * @param  array<int, int>  $digits
     * @param  array<int, int>  $weights
     */
    private function calculateCnpjDigit(array $digits, array $weights): int
    {
        $sum = 0;

        foreach ($weights as $index => $weight) {
            $sum += $digits[$index] * $weight;
        }

        $remainder = $sum % 11;

        return $remainder < 2 ? 0 : 11 - $remainder;
    }

    private function createTeam(Manufacturer $manufacturer, string $email, string $password): User
    {
        $owner = User::create([
            'name' => 'Marina Andrade',
            'email' => Str::lower($email),
            'password' => $password,
            'email_verified_at' => now(),
            'user_type' => UserType::ManufacturerUser,
            'current_manufacturer_id' => $manufacturer->id,
        ]);

        $manufacturer->users()->attach($owner->id, [
            'role' => 'owner',
            'status' => 'active',
            'capabilities' => null,
        ]);
        $manufacturer->update(['primary_owner_user_id' => $owner->id]);

        $staff = User::create([
            'name' => 'Bia — Comercial',
            'email' => 'comercial+'.$manufacturer->id.'@showroom.zouth.app',
            'password' => Str::random(32),
            'email_verified_at' => now(),
            'user_type' => UserType::ManufacturerUser,
            'current_manufacturer_id' => $manufacturer->id,
        ]);

        $manufacturer->users()->attach($staff->id, [
            'role' => 'staff',
            'status' => 'active',
            'capabilities' => ManufacturerCapability::suggestedForStaff(),
        ]);

        return $owner;
    }

    private function createCatalog(Manufacturer $manufacturer): CatalogSetting
    {
        $cover = $this->coverImageStorage->optimizeAndStore(
            $manufacturer,
            $this->assetContents('cover-brisa.jpg'),
        );

        return $manufacturer->catalogSetting()->create([
            'brand_name' => 'Brisa Mini',
            'show_brand_name' => true,
            'show_logo' => false,
            'hide_prices' => false,
            'tagline' => 'Entre dias leves.',
            'description' => 'Formas suaves, matérias naturais e uma coleção feita para acompanhar cada descoberta.',
            'cover_image_path' => $cover['path'],
            'cover_thumbnail_path' => $cover['thumbnail_path'],
            'cover_image_focal_x' => 66,
            'cover_image_focal_y' => 48,
            'primary_color' => '#B96549',
            'secondary_color' => '#20242A',
            'accent_color' => '#D8B85B',
            'background_color' => '#F3EEE6',
            'font_family' => 'manrope',
            'heading_font_family' => 'fraunces',
            'body_font_family' => 'manrope',
            'public_link_active' => true,
            'layout_preset' => 'minimal',
            'layout_density' => 'comfortable',
            'card_style' => 'soft',
            'background_mode' => 'solid',
            'sections' => [
                [
                    'type' => 'hero',
                    'enabled' => true,
                    'props' => [
                        'show_logo' => false,
                        'eyebrow' => 'VERÃO 2026',
                        'headline' => 'Entre dias leves.',
                        'subtitle' => 'Uma coleção para vitrines que valorizam o tempo da infância.',
                        'cta_text' => 'Conheça a coleção',
                        'show_cta' => true,
                        'show_product_count' => false,
                        'align' => 'left',
                    ],
                ],
                [
                    'type' => 'collections',
                    'enabled' => true,
                    'props' => [
                        'title' => 'Capítulos da coleção',
                        'display' => 'tabs',
                        'show_counts' => false,
                        'max_items' => 7,
                    ],
                ],
                [
                    'type' => 'product_grid',
                    'enabled' => true,
                    'props' => [
                        'title' => 'A coleção completa',
                        'columns_mobile' => 1,
                        'columns_tablet' => 2,
                        'columns_desktop' => 3,
                        'presentation' => 'editorial',
                        'show_price' => true,
                        'show_sku' => true,
                        'show_stock' => false,
                        'show_variations' => true,
                        'show_action' => true,
                        'show_badges' => false,
                        'sort' => 'manual',
                    ],
                ],
            ],
        ]);
    }

    /**
     * @param  array<int, int>  $storedProductIds
     * @return array<string, Product>
     */
    private function createProducts(Manufacturer $manufacturer, array &$storedProductIds): array
    {
        $categoryNames = collect(DemoShowroomData::products())
            ->pluck('category')
            ->unique()
            ->values();
        $categories = $categoryNames->mapWithKeys(function (string $name) use ($manufacturer): array {
            $category = ProductCategory::create([
                'manufacturer_id' => $manufacturer->id,
                'name' => $name,
                'slug' => Str::slug($name),
            ]);

            return [$name => $category];
        });

        $colorType = VariationType::create([
            'manufacturer_id' => $manufacturer->id,
            'name' => 'Cor',
            'is_color_type' => true,
            'display_order' => 0,
        ]);
        foreach (DemoShowroomData::colors() as $name => $hex) {
            $colorType->values()->create([
                'value' => $name,
                'hex' => $hex,
                'display_order' => $colorType->values()->count(),
            ]);
        }

        $sizeType = VariationType::create([
            'manufacturer_id' => $manufacturer->id,
            'name' => 'Tamanho',
            'is_color_type' => false,
            'display_order' => 1,
        ]);
        foreach (['P', 'M', 'G', '2', '4', '6', '8', '10', 'Único'] as $index => $size) {
            $sizeType->values()->create([
                'value' => $size,
                'display_order' => $index,
            ]);
        }

        $optimizedImages = [];
        $products = [];

        foreach (DemoShowroomData::products() as $index => $item) {
            $product = Product::create([
                'manufacturer_id' => $manufacturer->id,
                'product_category_id' => $categories[$item['category']]->id,
                'product_type' => 'normal',
                'name' => $item['name'],
                'sku' => $item['sku'],
                'description' => $item['description'],
                'base_quantity' => 0,
                'is_active' => true,
                'sort_order' => $index,
                'price_cents' => $item['price_cents'],
            ]);
            $storedProductIds[] = $product->id;
            $product->productVariations()->createMany([
                ['variation_type_id' => $colorType->id],
                ['variation_type_id' => $sizeType->id],
            ]);

            foreach ($item['colors'] as $colorIndex => $color) {
                foreach ($item['sizes'] as $sizeIndex => $size) {
                    $product->variantStocks()->create([
                        'variation_key' => ['Cor' => $color, 'Tamanho' => $size],
                        'quantity' => 5 + (($index + $colorIndex + $sizeIndex) % 8),
                        'price_cents' => null,
                        'sku_variant' => $this->variantSku($item['sku'], $color, $size),
                    ]);
                }
            }

            if (! isset($optimizedImages[$item['image']])) {
                $optimizedImages[$item['image']] = $this->imageOptimizer->optimize(
                    $this->assetContents($item['image']),
                );
            }

            $product->media()->create([
                'type' => 'image',
                'sort_order' => 0,
                ...$this->productImageStorage->storeOptimized(
                    $product,
                    $optimizedImages[$item['image']],
                ),
            ]);
            $products[$item['sku']] = $product;
        }

        return $products;
    }

    /**
     * @param  array<string, Product>  $products
     */
    private function createCombos(Manufacturer $manufacturer, array $products): void
    {
        $category = ProductCategory::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->where('slug', 'conjuntos')
            ->firstOrFail();

        $combos = [
            [
                'name' => 'Combo Brisa Azul',
                'sku' => 'COMBO-001',
                'price_cents' => 22990,
                'description' => 'Vestido e cardigã coordenados para uma vitrine delicada e completa.',
                'components' => ['BRI-001' => 1, 'BRI-009' => 1],
            ],
            [
                'name' => 'Combo Passeio Leve',
                'sku' => 'COMBO-002',
                'price_cents' => 17490,
                'description' => 'Camisa e bermuda em uma composição pronta para os dias de sol.',
                'components' => ['BRI-005' => 1, 'BRI-006' => 1],
            ],
            [
                'name' => 'Kit Primeiro Sol',
                'sku' => 'COMBO-003',
                'price_cents' => 19990,
                'description' => 'Três essenciais coordenados para a primeira vitrine do bebê.',
                'components' => ['BRI-008' => 1, 'BRI-009' => 1, 'BRI-010' => 1],
            ],
        ];

        foreach ($combos as $index => $item) {
            $combo = Product::create([
                'manufacturer_id' => $manufacturer->id,
                'product_category_id' => $category->id,
                'product_type' => 'combo',
                'name' => $item['name'],
                'sku' => $item['sku'],
                'description' => $item['description'],
                'base_quantity' => 0,
                'is_active' => true,
                'sort_order' => 20 + $index,
                'price_cents' => $item['price_cents'],
            ]);

            foreach ($item['components'] as $sku => $quantity) {
                $combo->comboItems()->create([
                    'component_product_id' => $products[$sku]->id,
                    'component_variant_stock_id' => null,
                    'variation_key' => null,
                    'quantity' => $quantity,
                ]);
            }
        }
    }

    private function createOrderRules(Manufacturer $manufacturer): void
    {
        $rules = [
            [
                'name' => 'Pedido mínimo de atacado',
                'description' => 'Protege o valor mínimo para entrada em produção.',
                'conditions' => [['metric' => 'subtotal_cents', 'operator' => 'lte', 'value' => 149999, 'max_value' => null, 'scope_type' => null, 'scope_ids' => []]],
                'action' => ['type' => 'block_checkout', 'value' => null],
                'public_message' => 'O pedido mínimo é de R$ 1.500.',
            ],
            [
                'name' => '5% para vitrines a partir de R$ 2.500',
                'description' => 'Incentivo para ampliar a primeira seleção.',
                'conditions' => [['metric' => 'subtotal_cents', 'operator' => 'gte', 'value' => 250000, 'max_value' => null, 'scope_type' => null, 'scope_ids' => []]],
                'action' => ['type' => 'percentage_discount', 'value' => 500],
                'public_message' => 'Você liberou 5% de desconto nesta seleção.',
            ],
            [
                'name' => '8% para seleções acima de R$ 4.000',
                'description' => 'Melhor condição para uma vitrine completa.',
                'conditions' => [['metric' => 'subtotal_cents', 'operator' => 'gte', 'value' => 400000, 'max_value' => null, 'scope_type' => null, 'scope_ids' => []]],
                'action' => ['type' => 'percentage_discount', 'value' => 800],
                'public_message' => 'Sua seleção ganhou nossa melhor condição: 8% de desconto.',
            ],
            [
                'name' => 'Variedade mínima',
                'description' => 'Garante uma apresentação mais completa da coleção.',
                'conditions' => [['metric' => 'distinct_products', 'operator' => 'lte', 'value' => 2, 'max_value' => null, 'scope_type' => null, 'scope_ids' => []]],
                'action' => ['type' => 'block_checkout', 'value' => null],
                'public_message' => 'Escolha ao menos 3 modelos diferentes para concluir.',
            ],
        ];

        foreach ($rules as $index => $rule) {
            $manufacturer->orderRules()->create([
                ...$rule,
                'is_active' => true,
                'match_mode' => 'all',
                'sort_order' => $index,
            ]);
        }
    }

    /**
     * @return array<int, Customer>
     */
    private function createCustomers(Manufacturer $manufacturer): array
    {
        return collect(DemoShowroomData::customers())
            ->map(function (array $item, int $index) use ($manufacturer): Customer {
                return Customer::create([
                    'manufacturer_id' => $manufacturer->id,
                    'name' => $item['name'],
                    'phone' => $item['phone'],
                    'email' => $item['email'],
                    'customer_document_type' => 'cnpj',
                    'customer_document' => str_pad((string) (10000000000000 + $index * 137), 14, '0', STR_PAD_LEFT),
                    'zip_code' => '01001000',
                    'state' => $item['state'],
                    'city' => $item['city'],
                    'neighborhood' => 'Centro',
                    'street' => 'Rua da Vitrine',
                    'address_number' => (string) (80 + $index * 17),
                    'address_complement' => $index % 2 === 0 ? 'Loja térrea' : null,
                    'address_reference' => null,
                ]);
            })
            ->all();
    }

    /**
     * @return array<int, User>
     */
    private function createRepresentatives(Manufacturer $manufacturer, User $owner): array
    {
        $profiles = [
            ['name' => 'Renata Campos', 'city' => 'Campinas', 'state' => 'SP', 'territory' => 'Interior de São Paulo', 'phone' => '(19) 99870-1142'],
            ['name' => 'Lucas Viana', 'city' => 'Belo Horizonte', 'state' => 'MG', 'territory' => 'Minas Gerais', 'phone' => '(31) 99138-6204'],
        ];
        $representatives = [];

        foreach ($profiles as $index => $profile) {
            $user = User::create([
                'name' => $profile['name'],
                'email' => 'representante'.($index + 1).'+'.$manufacturer->id.'@showroom.zouth.app',
                'password' => Str::random(32),
                'email_verified_at' => now(),
                'user_type' => UserType::SalesRep,
            ]);
            SalesRepresentativeProfile::create([
                'user_id' => $user->id,
                'whatsapp' => $profile['phone'],
                'city' => $profile['city'],
                'state' => $profile['state'],
                'territory' => $profile['territory'],
                'presentation' => 'Atendimento próximo a multimarcas infantis e curadoria de coleções coordenadas.',
            ]);
            ManufacturerAffiliation::create([
                'manufacturer_id' => $manufacturer->id,
                'user_id' => $user->id,
                'status' => 'active',
                'source' => $index === 0 ? 'invitation' : 'request',
                'application_note' => 'Quero levar a coleção Brisa para lojistas que valorizam produto autoral.',
                'requested_at' => now()->subDays(45 - $index * 9),
                'approved_at' => now()->subDays(42 - $index * 9),
                'decided_by_user_id' => $owner->id,
            ]);
            $representatives[] = $user;
        }

        $candidate = User::create([
            'name' => 'Carolina Nunes',
            'email' => 'candidata+'.$manufacturer->id.'@showroom.zouth.app',
            'password' => Str::random(32),
            'email_verified_at' => now(),
            'user_type' => UserType::SalesRep,
        ]);
        SalesRepresentativeProfile::create([
            'user_id' => $candidate->id,
            'whatsapp' => '(21) 99771-3384',
            'city' => 'Niterói',
            'state' => 'RJ',
            'territory' => 'Rio de Janeiro e Região dos Lagos',
            'presentation' => 'Represento marcas infantis autorais há seis anos e tenho uma carteira ativa de multimarcas.',
        ]);
        ManufacturerAffiliation::create([
            'manufacturer_id' => $manufacturer->id,
            'user_id' => $candidate->id,
            'status' => 'pending',
            'source' => 'request',
            'application_note' => 'Conheci a coleção pela vitrine e gostaria de representar a marca no Rio de Janeiro.',
            'requested_at' => now()->subDays(2),
        ]);

        RepresentativeInvitation::create([
            'manufacturer_id' => $manufacturer->id,
            'invited_by_user_id' => $owner->id,
            'name' => 'Rafael Monteiro',
            'email' => 'rafael@representacoesmonteiro.com.br',
            'email_normalized' => 'rafael@representacoesmonteiro.com.br',
            'whatsapp' => '(41) 99910-2750',
            'personal_message' => 'Rafael, queremos apresentar a Brisa às lojas do Paraná com o seu olhar comercial.',
            'token_hash' => hash('sha256', Str::random(64)),
            'status' => 'pending',
            'expires_at' => now()->addDays(7),
            'last_sent_at' => now()->subDay(),
            'send_count' => 1,
        ]);

        return $representatives;
    }

    /**
     * @param  array<int, Customer>  $customers
     * @param  array<string, Product>  $products
     * @param  array<int, User>  $representatives
     */
    private function createOrders(
        Manufacturer $manufacturer,
        User $owner,
        array $customers,
        array $products,
        array $representatives,
    ): void {
        $statuses = [
            OrderStatus::New,
            OrderStatus::Confirmed,
            OrderStatus::Preparing,
            OrderStatus::Shipped,
            OrderStatus::Delivered,
            OrderStatus::Delivered,
            OrderStatus::Preparing,
            OrderStatus::Confirmed,
            OrderStatus::Cancelled,
            OrderStatus::Delivered,
            OrderStatus::Shipped,
            OrderStatus::Delivered,
        ];
        $daysAgo = [1, 2, 4, 6, 8, 11, 14, 18, 24, 34, 48, 67];
        $productList = array_values($products);

        foreach ($statuses as $index => $status) {
            $customer = $customers[$index % count($customers)];
            $createdAt = CarbonImmutable::now()->subDays($daysAgo[$index])->setTime(10 + ($index % 7), 15);
            $selectedProducts = [
                $productList[$index % count($productList)],
                $productList[($index + 4) % count($productList)],
                $productList[($index + 9) % count($productList)],
            ];
            $quantities = [4 + ($index % 4), 3 + ($index % 3), 2 + ($index % 5)];
            $subtotalCents = collect($selectedProducts)
                ->values()
                ->map(fn (Product $product, int $productIndex): int => $product->price_cents * $quantities[$productIndex])
                ->sum();
            $discountRate = $subtotalCents >= 400000 ? 800 : ($subtotalCents >= 250000 ? 500 : 0);
            $discountCents = (int) round($subtotalCents * ($discountRate / 10000));

            $order = Order::create([
                'manufacturer_id' => $manufacturer->id,
                'customer_id' => $customer->id,
                'sales_rep_id' => $index % 3 === 0 ? $representatives[$index % count($representatives)]->id : null,
                'public_token' => Str::random(48),
                'status' => $status,
                'subtotal_cents' => $subtotalCents,
                'discount_cents' => $discountCents,
                'total_cents' => $subtotalCents - $discountCents,
                'applied_order_rules' => $discountRate > 0 ? [[
                    'name' => $discountRate === 800 ? '8% para seleções acima de R$ 4.000' : '5% para vitrines a partir de R$ 2.500',
                    'discount_cents' => $discountCents,
                ]] : [],
                'customer_name' => $customer->name,
                'customer_phone' => $customer->phone,
                'customer_email' => $customer->email,
                'customer_document_type' => $customer->customer_document_type,
                'customer_document' => $customer->customer_document,
                'customer_zip_code' => $customer->zip_code,
                'customer_state' => $customer->state,
                'customer_city' => $customer->city,
                'customer_neighborhood' => $customer->neighborhood,
                'customer_street' => $customer->street,
                'customer_address_number' => $customer->address_number,
                'customer_address_complement' => $customer->address_complement,
                'customer_notes' => $index % 4 === 0 ? 'Prefere receber a coleção em uma única remessa.' : null,
                'internal_notes' => $index % 3 === 0 ? 'Cliente com bom histórico de recompra.' : null,
                'tracking_ref' => in_array($status, [OrderStatus::Shipped, OrderStatus::Delivered], true) ? 'BRISA'.str_pad((string) ($index + 1), 5, '0', STR_PAD_LEFT) : null,
                'utm_source' => $index % 2 === 0 ? 'instagram' : 'representante',
                'utm_medium' => $index % 2 === 0 ? 'social' : 'referral',
                'utm_campaign' => 'colecao-brisa-2026',
                'inventory_reserved_at' => $status !== OrderStatus::Cancelled ? $createdAt : null,
                'inventory_released_at' => $status === OrderStatus::Cancelled ? $createdAt->addDay() : null,
            ]);
            $order->forceFill(['created_at' => $createdAt, 'updated_at' => $createdAt->addHours(2)])->saveQuietly();

            foreach ($selectedProducts as $productIndex => $product) {
                $stock = $product->variantStocks()->orderBy('id')->skip(($index + $productIndex) % 2)->first();
                $order->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'product_sku' => $product->sku,
                    'unit_price' => $product->price_cents / 100,
                    'quantity' => $quantities[$productIndex],
                    'size' => $stock?->variation_key['Tamanho'] ?? null,
                    'color' => $stock?->variation_key['Cor'] ?? null,
                    'product_variant_stock_id' => $stock?->id,
                    'selected_variations' => $stock?->variation_key,
                ]);
            }

            $this->createStatusHistory($order, $owner, $createdAt, $status);
        }
    }

    private function createStatusHistory(
        Order $order,
        User $owner,
        CarbonImmutable $createdAt,
        OrderStatus $finalStatus,
    ): void {
        $path = match ($finalStatus) {
            OrderStatus::New => [OrderStatus::New],
            OrderStatus::Confirmed => [OrderStatus::New, OrderStatus::Confirmed],
            OrderStatus::Preparing => [OrderStatus::New, OrderStatus::Confirmed, OrderStatus::Preparing],
            OrderStatus::Shipped => [OrderStatus::New, OrderStatus::Confirmed, OrderStatus::Preparing, OrderStatus::Shipped],
            OrderStatus::Delivered => [OrderStatus::New, OrderStatus::Confirmed, OrderStatus::Preparing, OrderStatus::Shipped, OrderStatus::Delivered],
            OrderStatus::Cancelled => [OrderStatus::New, OrderStatus::Cancelled],
        };

        foreach ($path as $index => $status) {
            OrderStatusHistory::create([
                'order_id' => $order->id,
                'from_status' => $index === 0 ? OrderStatus::New : $path[$index - 1],
                'to_status' => $status,
                'changed_by_user_id' => $index === 0 ? null : $owner->id,
                'created_at' => $createdAt->addHours($index * 8),
            ]);
        }
    }

    private function createCatalogVisits(Manufacturer $manufacturer, CatalogSetting $catalog): void
    {
        $sources = [
            ['source' => 'instagram', 'medium' => 'social'],
            ['source' => 'whatsapp', 'medium' => 'referral'],
            ['source' => 'representante', 'medium' => 'referral'],
            ['source' => 'direto', 'medium' => null],
        ];

        for ($index = 0; $index < 180; $index++) {
            $source = $sources[$index % count($sources)];
            $visitedAt = CarbonImmutable::now()
                ->subDays($index % 75)
                ->subMinutes(($index * 37) % 1440);

            CatalogVisit::create([
                'catalog_setting_id' => $catalog->id,
                'manufacturer_id' => $manufacturer->id,
                'public_token' => $catalog->public_token,
                'ip_address' => '198.51.100.'.(($index % 200) + 1),
                'user_agent' => $index % 3 === 0 ? 'Mozilla/5.0 (iPhone; Mobile)' : 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
                'referer' => $source['source'] === 'direto' ? null : 'https://example.com/brisa',
                'utm_source' => $source['source'],
                'utm_medium' => $source['medium'],
                'utm_campaign' => 'colecao-brisa-2026',
                'visited_at' => $visitedAt,
            ]);
        }
    }

    /**
     * @param  array<string, Product>  $products
     */
    private function createAtendimento(Manufacturer $manufacturer, array $products): void
    {
        $instance = WhatsappInstance::create([
            'manufacturer_id' => $manufacturer->id,
            'instance_name' => 'showroom-brisa-'.$manufacturer->id,
            'instance_id' => (string) Str::uuid(),
            'status' => WhatsappInstanceStatus::Connected,
            'phone_number' => '5511999992026',
            'profile_name' => 'Brisa Mini',
            'profile_picture_url' => null,
        ]);

        foreach (DemoShowroomData::quickReplies() as $reply) {
            $manufacturer->whatsappQuickReplies()->create([
                ...$reply,
                'is_active' => true,
            ]);
        }

        $funnels = [];
        foreach (DemoShowroomData::funnels() as $funnelIndex => $definition) {
            $funnel = WhatsappFunnel::create([
                'manufacturer_id' => $manufacturer->id,
                'name' => $definition['name'],
                'code' => $definition['code'],
                'is_active' => true,
                'sort_order' => $funnelIndex,
            ]);

            foreach ($definition['steps'] as $stepIndex => $step) {
                $payload = $step['payload'];

                if ($step['type'] === 'product') {
                    $payload['product_id'] = $products[$payload['product_sku']]->id;
                    unset($payload['product_sku']);
                }

                $funnel->steps()->create([
                    'type' => $step['type'],
                    'sort_order' => $stepIndex + 1,
                    'payload' => $payload,
                ]);
            }

            $funnels[$definition['code']] = $funnel;
        }

        foreach (DemoShowroomData::automations() as $automation) {
            $definition = WhatsappAutomation::starterDefinition(
                $funnels[$automation['funnel_code']]->id,
            );
            $conditionIndex = collect($definition['nodes'])->search(
                fn (array $node): bool => $node['movement'] === 'message_contains',
            );
            $definition['nodes'][$conditionIndex]['data']['keywords'] = $automation['keywords'];
            $definition['nodes'][$conditionIndex]['data']['summary'] = 'Mensagem contém '.implode(', ', $automation['keywords']);

            WhatsappAutomation::create([
                'manufacturer_id' => $manufacturer->id,
                'name' => $automation['name'],
                'is_active' => $automation['active'],
                'definition' => $definition,
                'last_activated_at' => $automation['active'] ? now()->subDays(3) : null,
            ]);
        }

        $this->createConversations($instance, $products);
    }

    /**
     * @param  array<string, Product>  $products
     */
    private function createConversations(WhatsappInstance $instance, array $products): void
    {
        $conversations = [
            ['name' => 'Ana · Casa Pitanga', 'phone' => '5511991023481', 'unread' => 2, 'messages' => [
                [false, 'Oi, vi o Vestido Brisa no catálogo. Vocês têm grade do 2 ao 8?'],
                [true, 'Oi, Ana! Temos sim — e você pode montar a grade livremente. Vou te mostrar a peça.'],
                [true, null, 'image', 'BRI-001'],
                [false, 'Perfeito. Quero combinar com o cardigã também.'],
            ]],
            ['name' => 'Paula · Vila Miúda', 'phone' => '5531998221054', 'unread' => 0, 'messages' => [
                [false, 'Qual é o prazo para o primeiro pedido?'],
                [true, 'Nosso prazo atual é de 20 a 25 dias úteis após a confirmação.'],
                [false, 'Ótimo, vou fechar minha seleção hoje.'],
            ]],
            ['name' => 'Caio · Broto Concept', 'phone' => '5551995413390', 'unread' => 1, 'messages' => [
                [false, 'Vocês atendem o Rio Grande do Sul com representante?'],
                [true, 'Atendemos sim. Posso conectar você com quem acompanha a sua região.'],
            ]],
            ['name' => 'Luiza · Pé de Nuvem', 'phone' => '5548991724408', 'unread' => 0, 'messages' => [
                [true, 'Luiza, sua seleção ficou linda. Separei também o Kit Primeiro Sol como sugestão.'],
                [false, 'Amei! Pode incluir duas grades.'],
            ]],
        ];

        foreach ($conversations as $conversationIndex => $item) {
            $conversation = WhatsappConversation::create([
                'whatsapp_instance_id' => $instance->id,
                'remote_jid' => $item['phone'].'@s.whatsapp.net',
                'is_group' => false,
                'contact_name' => $item['name'],
                'contact_phone' => $item['phone'],
                'contact_picture_url' => null,
                'last_message_body' => collect($item['messages'])->last()[1] ?: 'Imagem',
                'last_message_from_me' => (bool) collect($item['messages'])->last()[0],
                'last_message_at' => now()->subMinutes(12 + $conversationIndex * 39),
                'unread_count' => $item['unread'],
            ]);

            foreach ($item['messages'] as $messageIndex => $message) {
                $fromMe = $message[0];
                $mediaType = $message[2] ?? null;
                $product = isset($message[3]) ? $products[$message[3]] : null;
                $productMedia = $product?->media()->first();

                $conversation->messages()->create([
                    'message_id' => (string) Str::uuid(),
                    'from_me' => $fromMe,
                    'sender_jid' => $fromMe ? null : $item['phone'].'@s.whatsapp.net',
                    'body' => $message[1],
                    'media_type' => $mediaType,
                    'media_url' => $productMedia ? Storage::disk('s3')->url($productMedia->path) : null,
                    'media_mimetype' => $productMedia ? 'image/jpeg' : null,
                    'media_file_name' => $productMedia ? Str::slug($product->name).'.jpg' : null,
                    'status' => $fromMe ? WhatsappMessageStatus::Read : WhatsappMessageStatus::Delivered,
                    'message_timestamp' => now()->subMinutes(30 + $conversationIndex * 45 - $messageIndex * 4),
                ]);
            }
        }
    }

    /**
     * @param  array<int, int>  $productIds
     */
    private function deleteProductDirectories(array $productIds): void
    {
        foreach ($productIds as $productId) {
            Storage::disk('s3')->deleteDirectory('products/'.$productId);
        }
    }

    private function assetContents(string $fileName): string
    {
        $path = database_path('seeders/assets/demo-showroom/'.$fileName);
        $contents = is_file($path) ? file_get_contents($path) : false;

        if (! is_string($contents)) {
            throw new RuntimeException('Asset do showroom não encontrado: '.$fileName);
        }

        return $contents;
    }

    private function variantSku(string $productSku, string $color, string $size): string
    {
        $colorCode = Str::upper(Str::substr(Str::ascii(str_replace(' ', '', $color)), 0, 3));
        $sizeCode = Str::upper(Str::ascii($size));

        return $productSku.'-'.$colorCode.'-'.$sizeCode;
    }
}
