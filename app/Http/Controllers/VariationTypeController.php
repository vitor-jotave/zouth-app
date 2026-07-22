<?php

namespace App\Http\Controllers;

use App\Http\Requests\VariationTypeStoreRequest;
use App\Http\Requests\VariationTypeUpdateRequest;
use App\Models\VariationType;
use App\Services\TenantManager;
use App\Services\VariationTextureStorage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Throwable;

class VariationTypeController extends Controller
{
    public function __construct(private readonly VariationTextureStorage $textureStorage)
    {
        $this->authorizeResource(VariationType::class, 'variation_type');
    }

    public function index(Request $request, TenantManager $tenantManager): Response
    {
        $manufacturer = $tenantManager->get();

        if (! $manufacturer) {
            abort(403);
        }

        $variationTypes = VariationType::where('manufacturer_id', $manufacturer->id)
            ->with('values')
            ->withCount('productVariations')
            ->orderBy('display_order')
            ->orderBy('name')
            ->get();

        return Inertia::render('manufacturer/variation-types/index', [
            'variation_types' => $variationTypes->map(fn (VariationType $type) => [
                'id' => $type->id,
                'name' => $type->name,
                'is_color_type' => $type->is_color_type,
                'display_order' => $type->display_order,
                'products_count' => $type->product_variations_count,
                'values' => $type->values->map(fn ($value) => [
                    'id' => $value->id,
                    'value' => $value->value,
                    'hex' => $value->hex,
                    'image_path' => $value->image_path,
                    'thumbnail_path' => $value->thumbnail_path,
                    'image_url' => $this->variationValueImageUrl(
                        $value->image_path,
                        $value->thumbnail_path,
                    ),
                    'display_order' => $value->display_order,
                ]),
            ]),
        ]);
    }

    public function store(VariationTypeStoreRequest $request): RedirectResponse
    {
        $manufacturerId = $request->user()->current_manufacturer_id;
        $maxOrder = VariationType::where('manufacturer_id', $manufacturerId)->max('display_order') ?? 0;
        $storedTextures = [];

        try {
            DB::transaction(function () use ($request, $manufacturerId, $maxOrder, &$storedTextures): void {
                $type = VariationType::create([
                    'manufacturer_id' => $manufacturerId,
                    'name' => $request->validated('name'),
                    'is_color_type' => $request->validated('is_color_type', false),
                    'display_order' => $maxOrder + 1,
                ]);

                $values = $request->validated('values', []);
                foreach ($values as $index => $valueData) {
                    $storedTexture = $type->is_color_type
                        ? $this->storeVariationValueTexture($request, $index)
                        : null;

                    if ($storedTexture) {
                        $storedTextures[] = $storedTexture;
                    }

                    $type->values()->create([
                        'value' => $valueData['value'],
                        'hex' => $type->is_color_type ? ($valueData['hex'] ?? null) : null,
                        'image_path' => $storedTexture['image_path'] ?? null,
                        'thumbnail_path' => $storedTexture['thumbnail_path'] ?? null,
                        'display_order' => $index,
                    ]);
                }
            });
        } catch (Throwable $exception) {
            foreach ($storedTextures as $storedTexture) {
                $this->textureStorage->delete(
                    $storedTexture['image_path'],
                    $storedTexture['thumbnail_path'],
                );
            }

            throw $exception;
        }

        return redirect()
            ->back()
            ->with('success', 'Tipo de variação criado com sucesso.');
    }

    public function update(VariationTypeUpdateRequest $request, VariationType $variationType): RedirectResponse
    {
        $variationType->update([
            'name' => $request->validated('name'),
            'is_color_type' => $request->validated('is_color_type', false),
        ]);

        $incomingValues = collect($request->validated('values', []));
        $existingIds = $incomingValues->pluck('id')->filter()->all();

        $removedValues = $variationType->values()
            ->when($existingIds !== [], fn ($query) => $query->whereNotIn('id', $existingIds))
            ->get();

        foreach ($removedValues as $removedValue) {
            $this->textureStorage->delete(
                $removedValue->image_path,
                $removedValue->thumbnail_path,
            );
        }

        $variationType->values()
            ->when($existingIds !== [], fn ($query) => $query->whereNotIn('id', $existingIds))
            ->delete();

        foreach ($incomingValues as $index => $valueData) {
            if (! empty($valueData['id'])) {
                $value = $variationType->values()->where('id', $valueData['id'])->first();

                if (! $value) {
                    continue;
                }

                $storedTexture = $variationType->is_color_type
                    ? $this->storeVariationValueTexture($request, $index)
                    : null;
                $previousImagePath = $value->image_path;
                $previousThumbnailPath = $value->thumbnail_path;
                $shouldRemoveTexture = $request->boolean("values.{$index}.remove_image")
                    || ! $variationType->is_color_type;
                $imagePath = $previousImagePath;
                $thumbnailPath = $previousThumbnailPath;

                if ($storedTexture) {
                    $imagePath = $storedTexture['image_path'];
                    $thumbnailPath = $storedTexture['thumbnail_path'];
                } elseif ($shouldRemoveTexture) {
                    $imagePath = null;
                    $thumbnailPath = null;
                }

                try {
                    $value->update([
                        'value' => $valueData['value'],
                        'hex' => $variationType->is_color_type ? ($valueData['hex'] ?? null) : null,
                        'image_path' => $imagePath,
                        'thumbnail_path' => $thumbnailPath,
                        'display_order' => $index,
                    ]);
                } catch (Throwable $exception) {
                    if ($storedTexture) {
                        $this->textureStorage->delete(
                            $storedTexture['image_path'],
                            $storedTexture['thumbnail_path'],
                        );
                    }

                    throw $exception;
                }

                if ($storedTexture || $shouldRemoveTexture) {
                    $this->textureStorage->delete(
                        $previousImagePath,
                        $previousThumbnailPath,
                    );
                }
            } else {
                $storedTexture = $variationType->is_color_type
                    ? $this->storeVariationValueTexture($request, $index)
                    : null;

                try {
                    $variationType->values()->create([
                        'value' => $valueData['value'],
                        'hex' => $variationType->is_color_type ? ($valueData['hex'] ?? null) : null,
                        'image_path' => $storedTexture['image_path'] ?? null,
                        'thumbnail_path' => $storedTexture['thumbnail_path'] ?? null,
                        'display_order' => $index,
                    ]);
                } catch (Throwable $exception) {
                    if ($storedTexture) {
                        $this->textureStorage->delete(
                            $storedTexture['image_path'],
                            $storedTexture['thumbnail_path'],
                        );
                    }

                    throw $exception;
                }
            }
        }

        return redirect()
            ->back()
            ->with('success', 'Tipo de variação atualizado com sucesso.');
    }

    public function destroy(VariationType $variationType): RedirectResponse
    {
        // Check if any products are using this variation type
        if ($variationType->productVariations()->exists()) {
            return redirect()
                ->back()
                ->with('error', 'Não é possível excluir um tipo de variação em uso por produtos.');
        }

        foreach ($variationType->values as $value) {
            $this->textureStorage->delete(
                $value->image_path,
                $value->thumbnail_path,
            );
        }

        $variationType->delete();

        return redirect()
            ->back()
            ->with('success', 'Tipo de variação excluído com sucesso.');
    }

    /**
     * @return array{image_path: string, thumbnail_path: string}|null
     */
    private function storeVariationValueTexture(Request $request, int|string $index): ?array
    {
        $file = $request->file("values.{$index}.image");

        if (! $file) {
            return null;
        }

        $contents = file_get_contents($file->getRealPath());

        if (! is_string($contents) || $contents === '') {
            throw ValidationException::withMessages([
                "values.{$index}.image" => 'Não foi possível ler a textura enviada.',
            ]);
        }

        try {
            return $this->textureStorage->optimizeAndStore($contents);
        } catch (Throwable $exception) {
            throw ValidationException::withMessages([
                "values.{$index}.image" => $exception instanceof RuntimeException
                    ? 'Não foi possível armazenar a textura. Tente novamente.'
                    : $exception->getMessage(),
            ]);
        }
    }

    private function variationValueImageUrl(?string $imagePath, ?string $thumbnailPath): ?string
    {
        $path = $thumbnailPath ?: $imagePath;

        return $path ? Storage::disk('s3')->url($path) : null;
    }
}
