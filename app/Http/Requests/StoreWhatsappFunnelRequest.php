<?php

namespace App\Http\Requests;

use App\Models\Product;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWhatsappFunnelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isManufacturerUser();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'code' => [
                'required',
                'string',
                'max:50',
                'regex:/^[A-Z0-9_-]+$/',
                Rule::unique('whatsapp_funnels', 'code')
                    ->where('manufacturer_id', $this->user()->current_manufacturer_id),
            ],
            'is_active' => ['nullable', 'boolean'],
            'steps' => ['required', 'array', 'min:1'],
            'steps.*.type' => ['required', 'string', 'in:wait,text,audio,product'],
            'steps.*.seconds' => ['nullable', 'integer', 'min:1', 'max:86400'],
            'steps.*.body' => ['nullable', 'string', 'max:4096'],
            'steps.*.media_path' => ['nullable', 'string', 'max:255'],
            'steps.*.file_name' => ['nullable', 'string', 'max:255'],
            'steps.*.mimetype' => ['nullable', 'string', 'max:100'],
            'steps.*.audio_file' => ['nullable', 'file', 'mimetypes:audio/mpeg,audio/mp3,audio/ogg,application/ogg,audio/opus,audio/wav,audio/x-wav,audio/vnd.wave,audio/mp4,audio/m4a,audio/x-m4a,audio/aac,audio/x-aac,audio/x-hx-aac-adts,audio/webm,video/webm', 'max:20480'],
            'steps.*.product_id' => ['nullable', 'integer', 'exists:products,id'],
            'steps.*.include_photo' => ['nullable', 'boolean'],
            'steps.*.include_price' => ['nullable', 'boolean'],
            'steps.*.include_description' => ['nullable', 'boolean'],
            'steps.*.include_sku' => ['nullable', 'boolean'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            foreach ($this->input('steps', []) as $index => $step) {
                match ($step['type'] ?? null) {
                    'wait' => $this->requireStepField($validator, $index, 'seconds'),
                    'text' => $this->requireStepField($validator, $index, 'body'),
                    'audio' => $this->requireAudioFile($validator, $index),
                    'product' => $this->requireProduct($validator, $index, $step),
                    default => null,
                };
            }
        });
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'steps.*.audio_file.mimetypes' => 'Envie um áudio MP3, M4A, OGG, WAV, AAC ou WebM.',
            'steps.*.audio_file.max' => 'Cada áudio deve ter no máximo 20 MB.',
            'steps.*.audio_file.uploaded' => 'Não foi possível receber o áudio. Tente enviá-lo novamente.',
        ];
    }

    private function requireStepField(Validator $validator, int $index, string $field): void
    {
        if (blank($this->input("steps.{$index}.{$field}"))) {
            $validator->errors()->add("steps.{$index}.{$field}", 'Campo obrigatório para este tipo de passo.');
        }
    }

    protected function requireAudioFile(Validator $validator, int $index): void
    {
        if ($this->hasFile("steps.{$index}.audio_file")) {
            return;
        }

        $mediaPath = (string) $this->input("steps.{$index}.media_path", '');

        if ($mediaPath === '') {
            $validator->errors()->add("steps.{$index}.audio_file", 'Envie um arquivo de áudio.');

            return;
        }

        if (! $this->acceptsExistingAudioPath($mediaPath)) {
            $validator->errors()->add("steps.{$index}.audio_file", 'O áudio informado não pertence a este funil.');
        }
    }

    protected function acceptsExistingAudioPath(string $mediaPath): bool
    {
        return false;
    }

    /**
     * @param  array<string, mixed>  $step
     */
    private function requireProduct(Validator $validator, int $index, array $step): void
    {
        if (blank($step['product_id'] ?? null)) {
            $validator->errors()->add("steps.{$index}.product_id", 'Selecione um produto.');

            return;
        }

        $belongsToManufacturer = Product::query()
            ->where('id', $step['product_id'])
            ->where('manufacturer_id', $this->user()->current_manufacturer_id)
            ->exists();

        if (! $belongsToManufacturer) {
            $validator->errors()->add("steps.{$index}.product_id", 'Produto inválido para este fabricante.');
        }
    }
}
