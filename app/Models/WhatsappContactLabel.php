<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhatsappContactLabel extends Model
{
    /** @use HasFactory<\Database\Factories\WhatsappContactLabelFactory> */
    use HasFactory;

    protected $fillable = ['manufacturer_id', 'name', 'name_key', 'color'];

    public function manufacturer(): BelongsTo
    {
        return $this->belongsTo(Manufacturer::class);
    }
}
