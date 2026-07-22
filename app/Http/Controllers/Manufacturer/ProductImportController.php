<?php

namespace App\Http\Controllers\Manufacturer;

use App\Enums\ProductImportStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\ConfirmProductImportRequest;
use App\Http\Requests\StoreProductImportRequest;
use App\Http\Requests\UpdateProductImportMappingRequest;
use App\Http\Resources\ProductImportResource;
use App\Jobs\ProcessProductImport;
use App\Jobs\ValidateProductImport;
use App\Models\ProductImport;
use App\Models\ProductImportMapping;
use App\Services\ProductImportPreviewService;
use App\Services\ProductImportReader;
use App\Services\ProductImportTemplateService;
use App\Services\TenantManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class ProductImportController extends Controller
{
    public function __construct(
        private readonly TenantManager $tenantManager,
        private readonly ProductImportReader $reader,
        private readonly ProductImportPreviewService $preview,
        private readonly ProductImportTemplateService $template,
    ) {}

    public function index(): Response
    {
        $this->authorize('viewAny', ProductImport::class);
        $manufacturer = $this->tenantManager->get();
        abort_unless($manufacturer, 403);
        $imports = ProductImport::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->latest()
            ->paginate(12);

        return Inertia::render('manufacturer/product-imports/index', [
            'imports' => ProductImportResource::collection($imports),
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', ProductImport::class);
        $manufacturer = $this->tenantManager->get();
        abort_unless($manufacturer, 403);

        return Inertia::render('manufacturer/product-imports/create', [
            'recent_imports' => ProductImportResource::collection(
                ProductImport::query()
                    ->where('manufacturer_id', $manufacturer->id)
                    ->latest()
                    ->limit(3)
                    ->get(),
            )->resolve(),
        ]);
    }

    public function store(StoreProductImportRequest $request): RedirectResponse
    {
        $manufacturer = $this->tenantManager->get();
        abort_unless($manufacturer, 403);
        $spreadsheet = $request->file('spreadsheet');
        $directory = 'product-imports/'.$manufacturer->id.'/'.Str::uuid();
        $extension = Str::lower($spreadsheet->getClientOriginalExtension());
        $sourcePath = $spreadsheet->storeAs($directory, 'source.'.$extension, 'local');

        if (! is_string($sourcePath)) {
            return back()->withErrors(['spreadsheet' => 'Não foi possível guardar a planilha.']);
        }

        $archivePath = null;

        if ($request->hasFile('images')) {
            $archivePath = $request->file('images')->storeAs($directory, 'images.zip', 'local');

            if (! is_string($archivePath)) {
                Storage::disk('local')->deleteDirectory($directory);

                return back()->withErrors(['images' => 'Não foi possível guardar o pacote de fotografias.']);
            }
        }

        try {
            $source = $this->reader->read(Storage::disk('local')->path($sourcePath), $extension);
        } catch (Throwable $exception) {
            Storage::disk('local')->deleteDirectory($directory);

            return back()->withErrors(['spreadsheet' => $exception->getMessage()]);
        }

        $savedMapping = ProductImportMapping::query()
            ->where('manufacturer_id', $manufacturer->id)
            ->where('header_signature', $source['signature'])
            ->first();
        $mapping = $savedMapping?->mapping ?? $this->reader->suggestMapping($source['headers']);
        $productImport = ProductImport::create([
            'manufacturer_id' => $manufacturer->id,
            'user_id' => $request->user()->id,
            'status' => ProductImportStatus::Mapping,
            'source_name' => $spreadsheet->getClientOriginalName(),
            'source_path' => $sourcePath,
            'source_extension' => $extension,
            'image_archive_path' => is_string($archivePath) ? $archivePath : null,
            'header_signature' => $source['signature'],
            'headers' => $source['headers'],
            'mapping' => $mapping,
            'progress' => 5,
            'expires_at' => now()->addDays(30),
        ]);

        if ($savedMapping && isset($mapping['sku'])) {
            $savedMapping->update(['last_used_at' => now()]);
            ValidateProductImport::dispatch($productImport);
        }

        return redirect()
            ->route('manufacturer.product-imports.show', $productImport)
            ->with('success', $savedMapping
                ? 'Reconhecemos este formato e já começamos a conferir a coleção.'
                : 'Planilha recebida. Agora relacione as colunas.');
    }

    public function show(ProductImport $productImport): Response
    {
        $this->authorize('view', $productImport);
        $productImport->load([
            'rows' => fn ($query) => $query->orderByRaw("CASE WHEN action = 'error' THEN 0 ELSE 1 END")->orderBy('row_number')->limit(400),
        ]);

        return Inertia::render('manufacturer/product-imports/show', [
            'product_import' => (new ProductImportResource($productImport))->resolve(),
            'mapping_fields' => $this->mappingFields(),
        ]);
    }

    public function updateMapping(
        UpdateProductImportMappingRequest $request,
        ProductImport $productImport,
    ): RedirectResponse {
        $mapping = array_filter(
            $request->validated('mapping'),
            fn (mixed $value): bool => is_string($value) && $value !== '',
        );
        $productImport->update([
            'status' => ProductImportStatus::Validating,
            'mapping' => $mapping,
            'summary' => null,
            'errors' => null,
            'preview_signature' => null,
            'progress' => 10,
        ]);
        ProductImportMapping::updateOrCreate(
            [
                'manufacturer_id' => $productImport->manufacturer_id,
                'header_signature' => $productImport->header_signature,
            ],
            [
                'user_id' => $request->user()->id,
                'name' => $request->validated('mapping_name') ?: 'Formato de '.$productImport->source_name,
                'headers' => $productImport->headers,
                'mapping' => $mapping,
                'last_used_at' => now(),
            ],
        );
        ValidateProductImport::dispatch($productImport);

        return redirect()
            ->route('manufacturer.product-imports.show', $productImport)
            ->with('success', 'Estamos conferindo cada peça da planilha.');
    }

    public function confirm(
        ConfirmProductImportRequest $request,
        ProductImport $productImport,
    ): RedirectResponse {
        if ($productImport->status !== ProductImportStatus::Ready) {
            return back()->withErrors(['import' => 'Esta coleção ainda não está pronta para ser importada.']);
        }

        $previousSignature = $productImport->preview_signature;
        $productImport = $this->preview->validate($productImport);

        if ($productImport->status !== ProductImportStatus::Ready || $productImport->preview_signature !== $previousSignature) {
            return back()->withErrors(['import' => 'A coleção mudou desde a última conferência. Revise a prévia atualizada antes de continuar.']);
        }

        $newTaxonomies = (int) data_get($productImport->summary, 'new_taxonomies', 0);

        if ($newTaxonomies > 0 && ! $request->boolean('accept_new_taxonomies')) {
            return back()->withErrors(['accept_new_taxonomies' => 'Confirme a criação dos novos cadastros destacados na prévia.']);
        }

        $hasAnotherRunningImport = ProductImport::query()
            ->where('manufacturer_id', $productImport->manufacturer_id)
            ->where('id', '!=', $productImport->id)
            ->where('status', ProductImportStatus::Processing)
            ->exists();

        if ($hasAnotherRunningImport) {
            return back()->withErrors(['import' => 'Outra coleção já está entrando no catálogo. Aguarde a conclusão.']);
        }

        $productImport->update([
            'status' => ProductImportStatus::Processing,
            'confirmed_at' => now(),
            'progress' => 40,
        ]);
        ProcessProductImport::dispatch($productImport);

        return redirect()
            ->route('manufacturer.product-imports.show', $productImport)
            ->with('success', 'Sua coleção começou a entrar no catálogo.');
    }

    public function cancel(ProductImport $productImport): RedirectResponse
    {
        $this->authorize('delete', $productImport);

        if ($productImport->status === ProductImportStatus::Processing) {
            return back()->withErrors(['import' => 'Uma importação em andamento não pode ser cancelada.']);
        }

        $productImport->update([
            'status' => ProductImportStatus::Cancelled,
            'progress' => 0,
        ]);

        return redirect()
            ->route('manufacturer.product-imports.index')
            ->with('success', 'Importação cancelada. Seus produtos não foram alterados.');
    }

    public function retry(ProductImport $productImport): RedirectResponse
    {
        $this->authorize('update', $productImport);

        if ($productImport->status !== ProductImportStatus::CompletedWithErrors) {
            return back()->withErrors(['import' => 'Esta importação não possui pendências para tentar novamente.']);
        }

        $pendingProducts = $productImport->rows()
            ->whereNull('processed_at')
            ->whereNotNull('product_sku')
            ->distinct()
            ->count('product_sku');

        if ($pendingProducts === 0) {
            return back()->withErrors(['import' => 'Não há peças pendentes nesta importação.']);
        }

        if ($this->hasAnotherRunningImport($productImport)) {
            return back()->withErrors(['import' => 'Outra coleção já está entrando no catálogo. Aguarde a conclusão.']);
        }

        $totalProducts = max(1, (int) data_get($productImport->summary, 'products', $pendingProducts));
        $processedProducts = max(0, $totalProducts - $pendingProducts);

        $productImport->update([
            'status' => ProductImportStatus::Processing,
            'progress' => 40 + (int) floor(($processedProducts / $totalProducts) * 55),
            'completed_at' => null,
            'error_message' => null,
        ]);
        ProcessProductImport::dispatch($productImport);

        return redirect()
            ->route('manufacturer.product-imports.show', $productImport)
            ->with('success', 'Vamos tentar novamente somente as peças que ficaram pendentes.');
    }

    public function destroy(ProductImport $productImport): RedirectResponse
    {
        $this->authorize('delete', $productImport);

        if ($productImport->status === ProductImportStatus::Processing) {
            return back()->withErrors(['import' => 'Uma importação em andamento não pode ser removida do histórico.']);
        }

        $productImport->delete();

        return redirect()
            ->route('manufacturer.product-imports.index')
            ->with('success', 'Importação removida do histórico.');
    }

    public function template(): StreamedResponse
    {
        $this->authorize('create', ProductImport::class);
        $manufacturer = $this->tenantManager->get();
        abort_unless($manufacturer, 403);
        $spreadsheet = $this->template->make($manufacturer);
        $fileName = 'modelo-zouth-'.(Str::slug($manufacturer->name) ?: 'colecao').'.xlsx';

        return response()->streamDownload(function () use ($spreadsheet): void {
            IOFactory::createWriter($spreadsheet, 'Xlsx')->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function errors(ProductImport $productImport): StreamedResponse
    {
        $this->authorize('view', $productImport);
        $rows = $productImport->rows()->whereNotNull('errors')->orderBy('row_number')->get();
        $globalErrors = $productImport->errors ?? [];

        return response()->streamDownload(function () use ($globalErrors, $rows): void {
            $stream = fopen('php://output', 'wb');
            fputcsv($stream, ['Linha', 'SKU', 'Pendências'], ';');

            foreach ($globalErrors as $error) {
                fputcsv($stream, ['Geral', '', $this->safeCsvValue((string) $error)], ';');
            }

            foreach ($rows as $row) {
                fputcsv($stream, [
                    $row->row_number,
                    $this->safeCsvValue($row->product_sku ?? ''),
                    $this->safeCsvValue(implode(' | ', $row->errors ?? [])),
                ], ';');
            }

            fclose($stream);
        }, 'pendencias-importacao-'.$productImport->id.'.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function hasAnotherRunningImport(ProductImport $productImport): bool
    {
        return ProductImport::query()
            ->where('manufacturer_id', $productImport->manufacturer_id)
            ->where('id', '!=', $productImport->id)
            ->where('status', ProductImportStatus::Processing)
            ->exists();
    }

    /** @return list<array{key: string, label: string, group: string, required?: bool}> */
    private function mappingFields(): array
    {
        return [
            ['key' => 'sku', 'label' => 'SKU principal', 'group' => 'Identificação', 'required' => true],
            ['key' => 'name', 'label' => 'Nome da peça', 'group' => 'Identificação'],
            ['key' => 'description', 'label' => 'Descrição', 'group' => 'Apresentação'],
            ['key' => 'category', 'label' => 'Categoria', 'group' => 'Organização'],
            ['key' => 'is_active', 'label' => 'Ativo', 'group' => 'Organização'],
            ['key' => 'price', 'label' => 'Preço geral', 'group' => 'Comercial'],
            ['key' => 'stock', 'label' => 'Estoque geral', 'group' => 'Comercial'],
            ['key' => 'variant_sku', 'label' => 'SKU da opção', 'group' => 'Variações'],
            ['key' => 'variant_price', 'label' => 'Preço da opção', 'group' => 'Variações'],
            ['key' => 'variant_stock', 'label' => 'Estoque da opção', 'group' => 'Variações'],
            ['key' => 'variation_type_1', 'label' => 'Tipo da variação 1', 'group' => 'Variações'],
            ['key' => 'variation_value_1', 'label' => 'Valor da variação 1', 'group' => 'Variações'],
            ['key' => 'variation_type_2', 'label' => 'Tipo da variação 2', 'group' => 'Variações'],
            ['key' => 'variation_value_2', 'label' => 'Valor da variação 2', 'group' => 'Variações'],
            ['key' => 'variation_type_3', 'label' => 'Tipo da variação 3', 'group' => 'Variações'],
            ['key' => 'variation_value_3', 'label' => 'Valor da variação 3', 'group' => 'Variações'],
            ['key' => 'image_url_1', 'label' => 'Imagem 1', 'group' => 'Imagens'],
            ['key' => 'image_url_2', 'label' => 'Imagem 2', 'group' => 'Imagens'],
            ['key' => 'image_url_3', 'label' => 'Imagem 3', 'group' => 'Imagens'],
            ['key' => 'image_url_4', 'label' => 'Imagem 4', 'group' => 'Imagens'],
            ['key' => 'image_url_5', 'label' => 'Imagem 5', 'group' => 'Imagens'],
        ];
    }

    private function safeCsvValue(string $value): string
    {
        return preg_match('/^[=+\-@]/', $value) === 1 ? "'{$value}" : $value;
    }
}
