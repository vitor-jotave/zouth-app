<?php

namespace App\Rules;

use App\Support\ProductVideo;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class SupportedProductVideoUrl implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ProductVideo::fromUrl($value) === null) {
            $fail('Use um link válido do YouTube, Vimeo, Dailymotion, Loom ou um arquivo MP4/WebM público.');
        }
    }
}
