<?php

namespace App\Http\Requests;

use App\Enums\ProductMediaType;
use App\Models\Product;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\File;

class ProductMediaStoreRequest extends FormRequest
{
    private const MAX_IMAGES_PER_PRODUCT = 10;

    public function authorize(): bool
    {
        $product = $this->route('product');

        return $product instanceof Product
            && ! $product->isCombo()
            ? $this->user()?->can('update', $product) ?? false
            : false;
    }

    public function rules(): array
    {
        $type = $this->input('type');
        $imageRule = File::image()->max(5120);
        $videoRule = File::types(['mp4', 'mov', 'webm'])->max(51200);

        if ($type === ProductMediaType::Video->value) {
            return [
                'type' => ['required', Rule::enum(ProductMediaType::class)],
                'file' => ['required', $videoRule],
                'files' => ['prohibited'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
            ];
        }

        return [
            'type' => ['required', Rule::enum(ProductMediaType::class)],
            'file' => ['prohibited'],
            'files' => ['required', 'array', 'min:1', 'max:'.self::MAX_IMAGES_PER_PRODUCT],
            'files.*' => [$imageRule],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'files.max' => 'Um produto pode ter no máximo 10 imagens.',
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $product = $this->route('product');

            if (! $product instanceof Product) {
                return;
            }

            if ($this->input('type') === ProductMediaType::Video->value) {
                $hasVideo = $product->media()->where('type', ProductMediaType::Video->value)->exists();

                if ($hasVideo) {
                    $validator->errors()->add('file', 'Apenas um vídeo é permitido por produto.');
                }

                return;
            }

            if ($this->input('type') !== ProductMediaType::Image->value) {
                return;
            }

            $currentImageCount = $product->media()
                ->where('type', ProductMediaType::Image->value)
                ->count();
            $files = $this->file('files', []);
            $newImageCount = is_array($files) ? count($files) : 0;

            if (
                $newImageCount <= self::MAX_IMAGES_PER_PRODUCT
                && $currentImageCount + $newImageCount > self::MAX_IMAGES_PER_PRODUCT
            ) {
                $validator->errors()->add(
                    'files',
                    'Um produto pode ter no máximo 10 imagens. Remova uma imagem antes de adicionar novas.',
                );
            }
        });
    }
}
