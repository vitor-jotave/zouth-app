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
    public function authorize(): bool
    {
        $product = $this->route('product');

        return $product instanceof Product
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
            'files' => ['required', 'array', 'min:1'],
            'files.*' => [$imageRule],
            'sort_order' => ['nullable', 'integer', 'min:0'],
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
                    $validator->errors()->add('type', 'Apenas um video e permitido por produto.');
                }
            }
        });
    }
}
