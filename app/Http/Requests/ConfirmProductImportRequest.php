<?php

namespace App\Http\Requests;

use App\Models\ProductImport;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ConfirmProductImportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $productImport = $this->route('productImport');

        return $productImport instanceof ProductImport
            && ($this->user()?->can('update', $productImport) ?? false);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'preview_signature' => ['required', 'string', 'size:64'],
            'accept_new_taxonomies' => ['sometimes', 'boolean'],
        ];
    }
}
