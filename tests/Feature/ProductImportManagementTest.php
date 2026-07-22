<?php

use App\Enums\ProductImportStatus;
use App\Enums\UserType;
use App\Jobs\ProcessProductImport;
use App\Models\Manufacturer;
use App\Models\Plan;
use App\Models\Product;
use App\Models\ProductImport;
use App\Models\ProductImportMapping;
use App\Models\ProductImportRow;
use App\Models\ProductMedia;
use App\Models\ProductVariantStock;
use App\Models\User;
use App\Services\ProductImportTemplateService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('local');
    Storage::fake('s3');
    $plan = Plan::factory()->premium()->create();
    $this->manufacturer = Manufacturer::factory()->create([
        'is_active' => true,
        'current_plan_id' => $plan->id,
    ]);
    $this->owner = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($this->owner->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);
    $this->actingAs($this->owner);
});

function uploadProductImport(string $csv, ?UploadedFile $images = null): ProductImport
{
    $payload = [
        'spreadsheet' => UploadedFile::fake()->createWithContent('colecao.csv', $csv),
    ];

    if ($images) {
        $payload['images'] = $images;
    }

    test()->post(route('manufacturer.product-imports.store'), $payload)->assertRedirect();

    return ProductImport::query()->latest('id')->firstOrFail();
}

function productImageArchive(string $fileName, string $contents): UploadedFile
{
    $path = tempnam(sys_get_temp_dir(), 'zouth-images-').'.zip';
    $archive = new ZipArchive;
    $archive->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE);
    $archive->addFromString($fileName, $contents);
    $archive->close();

    return new UploadedFile($path, 'imagens.zip', 'application/zip', null, true);
}

function mapProductImport(ProductImport $productImport, array $mapping): ProductImport
{
    test()->put(route('manufacturer.product-imports.mapping.update', $productImport), [
        'mapping' => $mapping,
        'mapping_name' => 'ERP da fábrica',
    ])->assertRedirect(route('manufacturer.product-imports.show', $productImport));

    return $productImport->refresh();
}

function confirmProductImport(ProductImport $productImport, bool $acceptTaxonomies = false): ProductImport
{
    test()->post(route('manufacturer.product-imports.confirm', $productImport), [
        'preview_signature' => $productImport->preview_signature,
        'accept_new_taxonomies' => $acceptTaxonomies,
    ])->assertRedirect(route('manufacturer.product-imports.show', $productImport));

    return $productImport->refresh();
}

it('shows the import journey and downloads a tenant-aware template', function () {
    $this->get(route('manufacturer.product-imports.index'))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page->component('manufacturer/product-imports/index'));

    $this->get(route('manufacturer.product-imports.create'))
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page->component('manufacturer/product-imports/create'));

    $this->get(route('manufacturer.product-imports.template'))
        ->assertSuccessful()
        ->assertDownload('modelo-zouth-'.str($this->manufacturer->name)->slug().'.xlsx');

    expect(app(ProductImportTemplateService::class)->make($this->manufacturer)->getSheetNames())
        ->toBe(['Como preencher', 'Produtos', 'Exemplo', 'Referências da marca']);
});

it('accepts a CSV even when the browser sends a generic content type', function () {
    $path = tempnam(sys_get_temp_dir(), 'zouth-import-csv-');
    file_put_contents($path, "SKU;Nome;Estoque\nMIME-001;Body Nuvem;2");
    $spreadsheet = new UploadedFile(
        $path,
        'colecao.csv',
        'application/octet-stream',
        null,
        true,
    );

    $this->post(route('manufacturer.product-imports.store'), [
        'spreadsheet' => $spreadsheet,
    ])->assertRedirect();

    expect(ProductImport::query()->latest('id')->firstOrFail()->source_extension)->toBe('csv');
});

it('imports a simple product and confirms new catalog references', function () {
    $productImport = uploadProductImport(implode("\n", [
        'Código;Produto;Preço;Saldo;Categoria;Ativo',
        'CAM-001;Camiseta Solar;129,90;12;Camisetas;Sim',
    ]));

    expect($productImport->status)->toBe(ProductImportStatus::Mapping)
        ->and($productImport->headers)->toContain('Código', 'Produto');

    $productImport = mapProductImport($productImport, [
        'sku' => 'Código',
        'name' => 'Produto',
        'price' => 'Preço',
        'stock' => 'Saldo',
        'category' => 'Categoria',
        'is_active' => 'Ativo',
    ]);

    expect($productImport->status)->toBe(ProductImportStatus::Ready)
        ->and($productImport->summary['create'])->toBe(1)
        ->and($productImport->summary['new_taxonomies'])->toBe(1)
        ->and(ProductImportMapping::where('manufacturer_id', $this->manufacturer->id)->count())->toBe(1);

    $productImport = confirmProductImport($productImport, true);

    expect($productImport->status)->toBe(ProductImportStatus::Completed);
    $this->assertDatabaseHas('products', [
        'manufacturer_id' => $this->manufacturer->id,
        'sku' => 'CAM-001',
        'name' => 'Camiseta Solar',
        'base_quantity' => 12,
        'price_cents' => 12990,
        'is_active' => true,
    ]);
    $this->assertDatabaseHas('product_categories', [
        'manufacturer_id' => $this->manufacturer->id,
        'name' => 'Camisetas',
    ]);
});

it('recognizes a saved ERP format on the next collection', function () {
    $firstImport = uploadProductImport("Código;Produto;Saldo\nA-001;Body A;2");
    mapProductImport($firstImport, [
        'sku' => 'Código',
        'name' => 'Produto',
        'stock' => 'Saldo',
    ]);

    $secondImport = uploadProductImport("Código;Produto;Saldo\nB-001;Body B;3");

    expect($secondImport->status)->toBe(ProductImportStatus::Ready)
        ->and($secondImport->mapping)->toMatchArray([
            'sku' => 'Código',
            'name' => 'Produto',
            'stock' => 'Saldo',
        ]);
});

it('creates a complete color and size matrix without importing a combo', function () {
    $productImport = uploadProductImport(implode("\n", [
        'SKU;Nome;Tipo 1;Valor 1;Tipo 2;Valor 2;SKU opção;Saldo opção',
        'MAC-010;Macacão Brisa;Cor;Verde;Tamanho;P;MAC-010-V-P;3',
        'MAC-010;Macacão Brisa;Cor;Verde;Tamanho;M;MAC-010-V-M;4',
        'MAC-010;Macacão Brisa;Cor;Azul;Tamanho;P;MAC-010-A-P;5',
        'MAC-010;Macacão Brisa;Cor;Azul;Tamanho;M;MAC-010-A-M;6',
    ]));
    $productImport = mapProductImport($productImport, [
        'sku' => 'SKU',
        'name' => 'Nome',
        'variation_type_1' => 'Tipo 1',
        'variation_value_1' => 'Valor 1',
        'variation_type_2' => 'Tipo 2',
        'variation_value_2' => 'Valor 2',
        'variant_sku' => 'SKU opção',
        'variant_stock' => 'Saldo opção',
    ]);

    expect($productImport->status)->toBe(ProductImportStatus::Ready)
        ->and($productImport->summary['new_taxonomies'])->toBe(6);

    confirmProductImport($productImport, true);
    $product = Product::query()->where('sku', 'MAC-010')->firstOrFail();

    expect($product->product_type)->toBe('product')
        ->and($product->productVariations)->toHaveCount(2)
        ->and($product->variantStocks)->toHaveCount(4)
        ->and($product->variantStocks->sum('quantity'))->toBe(18);
});

it('updates only mapped non-empty fields and preserves absent products', function () {
    $product = Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create([
        'sku' => 'BODY-001',
        'name' => 'Body Clássico',
        'description' => 'Descrição que deve permanecer.',
        'base_quantity' => 7,
        'price_cents' => 8990,
    ]);
    $untouched = Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create([
        'sku' => 'BODY-002',
        'base_quantity' => 11,
    ]);
    $productImport = uploadProductImport("Código;Novo saldo;Nome\nBODY-001;23;");
    $productImport = mapProductImport($productImport, [
        'sku' => 'Código',
        'stock' => 'Novo saldo',
        'name' => 'Nome',
    ]);

    expect($productImport->status)->toBe(ProductImportStatus::Ready);
    confirmProductImport($productImport);

    expect($product->refresh())
        ->name->toBe('Body Clássico')
        ->description->toBe('Descrição que deve permanecer.')
        ->price_cents->toBe(8990)
        ->base_quantity->toBe(23)
        ->and($untouched->refresh()->base_quantity)->toBe(11);
});

it('matches optimized ZIP photographs to the main product SKU', function () {
    $image = UploadedFile::fake()->image('source.jpg', 900, 1200)->getContent();
    $productImport = uploadProductImport(
        "SKU;Nome;Estoque\nFOTO-001;Vestido Aurora;5",
        productImageArchive('FOTO-001_02.jpg', $image),
    );
    $productImport = mapProductImport($productImport, [
        'sku' => 'SKU',
        'name' => 'Nome',
        'stock' => 'Estoque',
    ]);

    expect($productImport->status)->toBe(ProductImportStatus::Ready)
        ->and($productImport->summary['images'])->toBe(1);

    confirmProductImport($productImport);
    $media = ProductMedia::query()->sole();

    expect($media->product->sku)->toBe('FOTO-001')
        ->and($media->width)->toBeLessThanOrEqual(2000)
        ->and($media->thumbnail_size_bytes)->toBeGreaterThan(0);
    Storage::disk('s3')->assertExists([$media->path, $media->thumbnail_path]);
});

it('rejects private image URLs before confirmation', function () {
    $productImport = uploadProductImport("SKU;Nome;Estoque;Imagem\nSAFE-001;Body Seguro;3;http://127.0.0.1/private.jpg");
    $productImport = mapProductImport($productImport, [
        'sku' => 'SKU',
        'name' => 'Nome',
        'stock' => 'Estoque',
        'image_url_1' => 'Imagem',
    ]);

    expect($productImport->status)->toBe(ProductImportStatus::Mapping)
        ->and($productImport->errors[0])->toContain('Endereços internos');
});

it('rejects unsafe paths inside image archives', function () {
    $image = UploadedFile::fake()->image('source.jpg', 100, 100)->getContent();
    $productImport = uploadProductImport(
        "SKU;Nome;Estoque\nZIP-001;Body Seguro;3",
        productImageArchive('../ZIP-001.jpg', $image),
    );
    $productImport = mapProductImport($productImport, [
        'sku' => 'SKU',
        'name' => 'Nome',
        'stock' => 'Estoque',
    ]);

    expect($productImport->status)->toBe(ProductImportStatus::Mapping)
        ->and($productImport->errors[0])->toContain('caminho de arquivo inseguro');
});

it('blocks incomplete matrices before anything reaches the catalog', function () {
    $productImport = uploadProductImport(implode("\n", [
        'SKU;Nome;Tipo 1;Valor 1;Tipo 2;Valor 2;Saldo',
        'M-001;Macacão;Cor;Verde;Tamanho;P;2',
        'M-001;Macacão;Cor;Verde;Tamanho;M;2',
        'M-001;Macacão;Cor;Azul;Tamanho;P;2',
    ]));
    $productImport = mapProductImport($productImport, [
        'sku' => 'SKU',
        'name' => 'Nome',
        'variation_type_1' => 'Tipo 1',
        'variation_value_1' => 'Valor 1',
        'variation_type_2' => 'Tipo 2',
        'variation_value_2' => 'Valor 2',
        'variant_stock' => 'Saldo',
    ]);

    expect($productImport->status)->toBe(ProductImportStatus::Mapping)
        ->and($productImport->summary['errors'])->toBeGreaterThan(0);

    $this->post(route('manufacturer.product-imports.confirm', $productImport), [
        'preview_signature' => $productImport->preview_signature,
        'accept_new_taxonomies' => true,
    ])->assertSessionHasErrors('import');

    $this->assertDatabaseMissing('products', ['sku' => 'M-001']);
});

it('keeps imports isolated between manufacturers', function () {
    $productImport = ProductImport::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->owner->id,
    ]);
    $otherManufacturer = Manufacturer::factory()->create(['is_active' => true]);
    $otherOwner = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $otherManufacturer->id,
    ]);
    $otherManufacturer->users()->attach($otherOwner->id, [
        'role' => 'owner',
        'status' => 'active',
    ]);

    $this->actingAs($otherOwner)
        ->get(route('manufacturer.product-imports.show', $productImport))
        ->assertForbidden();
});

it('requires collection access and keeps removed imports only in the audit history', function () {
    $staff = User::factory()->create([
        'user_type' => UserType::ManufacturerUser,
        'current_manufacturer_id' => $this->manufacturer->id,
    ]);
    $this->manufacturer->users()->attach($staff->id, [
        'role' => 'staff',
        'status' => 'active',
        'capabilities' => [],
    ]);

    $this->actingAs($staff)
        ->get(route('manufacturer.product-imports.index'))
        ->assertForbidden();

    $productImport = ProductImport::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->owner->id,
        'status' => ProductImportStatus::Cancelled,
    ]);
    $this->actingAs($this->owner)
        ->delete(route('manufacturer.product-imports.destroy', $productImport))
        ->assertRedirect(route('manufacturer.product-imports.index'));

    $this->assertSoftDeleted('product_imports', ['id' => $productImport->id]);
});

it('respects the product allowance before confirmation', function () {
    $plan = Plan::factory()->create(['max_products' => 1]);
    $this->manufacturer->update(['current_plan_id' => $plan->id]);
    Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create();
    $productImport = uploadProductImport("SKU;Nome;Estoque\nNOVO-001;Nova peça;4");
    $productImport = mapProductImport($productImport, [
        'sku' => 'SKU',
        'name' => 'Nome',
        'stock' => 'Estoque',
    ]);

    expect($productImport->status)->toBe(ProductImportStatus::Mapping)
        ->and($productImport->errors[0])->toContain('plano atual');
});

it('blocks an option SKU already used by another product', function () {
    $existingProduct = Product::factory()->forManufacturer($this->manufacturer)->withoutCategory()->create([
        'sku' => 'EXISTING-001',
    ]);
    ProductVariantStock::factory()->for($existingProduct)->create([
        'sku_variant' => 'OPTION-USED',
    ]);
    $productImport = uploadProductImport(implode("\n", [
        'SKU;Nome;Tipo;Valor;SKU opção;Saldo',
        'NEW-001;Body novo;Tamanho;P;OPTION-USED;3',
    ]));
    $productImport = mapProductImport($productImport, [
        'sku' => 'SKU',
        'name' => 'Nome',
        'variation_type_1' => 'Tipo',
        'variation_value_1' => 'Valor',
        'variant_sku' => 'SKU opção',
        'variant_stock' => 'Saldo',
    ]);

    expect($productImport->status)->toBe(ProductImportStatus::Mapping)
        ->and($productImport->rows()->firstOrFail()->errors[0])->toContain('já pertence ao produto EXISTING-001');
});

it('retries only pending products after an unexpected partial failure', function () {
    Queue::fake();
    $productImport = ProductImport::factory()->ready()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->owner->id,
        'status' => ProductImportStatus::CompletedWithErrors,
        'summary' => [
            'products' => 2,
            'processed' => 1,
            'failed' => 1,
        ],
        'completed_at' => now(),
    ]);
    ProductImportRow::factory()->create([
        'product_import_id' => $productImport->id,
        'product_sku' => 'DONE-001',
        'processed_at' => now(),
    ]);
    ProductImportRow::factory()->create([
        'product_import_id' => $productImport->id,
        'product_sku' => 'PENDING-001',
        'processed_at' => null,
    ]);

    $this->post(route('manufacturer.product-imports.retry', $productImport))
        ->assertRedirect(route('manufacturer.product-imports.show', $productImport));

    expect($productImport->refresh()->status)->toBe(ProductImportStatus::Processing)
        ->and($productImport->completed_at)->toBeNull();
    Queue::assertPushed(ProcessProductImport::class, fn (ProcessProductImport $job): bool => $job->productImport->is($productImport));
});

it('purges private files after thirty days while preserving a soft-deleted audit record', function () {
    Storage::disk('local')->put('product-imports/expired/source.csv', 'SKU;Nome');
    Storage::disk('local')->put('product-imports/expired/images.zip', 'zip');
    $productImport = ProductImport::factory()->create([
        'manufacturer_id' => $this->manufacturer->id,
        'user_id' => $this->owner->id,
        'status' => ProductImportStatus::Cancelled,
        'source_path' => 'product-imports/expired/source.csv',
        'image_archive_path' => 'product-imports/expired/images.zip',
        'expires_at' => now()->subMinute(),
    ]);
    $productImport->delete();

    $this->artisan('app:purge-expired-product-import-files')->assertSuccessful();

    Storage::disk('local')->assertMissing([
        'product-imports/expired/source.csv',
        'product-imports/expired/images.zip',
    ]);
    $historicalImport = ProductImport::withTrashed()->findOrFail($productImport->id);

    expect($historicalImport->trashed())->toBeTrue()
        ->and($historicalImport->options['files_purged_at'])->not->toBeNull()
        ->and($historicalImport->image_archive_path)->toBeNull();
});
