<?php

namespace App\Http\Requests;

use App\Models\ProductImport;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

class StoreProductImportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', ProductImport::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'spreadsheet' => [
                'required',
                File::default()->extensions(['xlsx', 'csv'])->max(20 * 1024),
            ],
            'images' => [
                'nullable',
                File::default()->extensions(['zip'])->max(200 * 1024),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'spreadsheet.required' => 'Escolha a planilha que traz a sua coleção.',
            'spreadsheet.extensions' => 'Envie a planilha em XLSX ou CSV.',
            'spreadsheet.max' => 'A planilha pode ter no máximo 20 MB.',
            'images.extensions' => 'Envie as fotografias em um arquivo ZIP.',
            'images.max' => 'O pacote de imagens pode ter no máximo 200 MB.',
        ];
    }
}
