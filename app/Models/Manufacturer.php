<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Laravel\Cashier\Billable;

class Manufacturer extends Model
{
    /** @use HasFactory<\Database\Factories\ManufacturerFactory> */
    use Billable;

    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'slug',
        'primary_owner_user_id',
        'is_active',
        'current_plan_id',
        'trial_ends_at',
        'trial_started_at',
        'trial_expired_at',
        'onboarding_started_at',
        'onboarding_account_created_at',
        'onboarding_preview_viewed_at',
        'onboarding_email_confirmed_at',
        'onboarding_completed_at',
        'onboarding_context',
        'welcome_sent_at',
        'trial_three_days_sent_at',
        'trial_last_day_sent_at',
        'trial_paused_sent_at',
        'cnpj',
        'phone',
        'logo_path',
        'zip_code',
        'state',
        'city',
        'neighborhood',
        'street',
        'address_number',
        'complement',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'trial_ends_at' => 'datetime',
            'trial_started_at' => 'datetime',
            'trial_expired_at' => 'datetime',
            'onboarding_started_at' => 'datetime',
            'onboarding_account_created_at' => 'datetime',
            'onboarding_preview_viewed_at' => 'datetime',
            'onboarding_email_confirmed_at' => 'datetime',
            'onboarding_completed_at' => 'datetime',
            'onboarding_context' => 'array',
            'welcome_sent_at' => 'datetime',
            'trial_three_days_sent_at' => 'datetime',
            'trial_last_day_sent_at' => 'datetime',
            'trial_paused_sent_at' => 'datetime',
        ];
    }

    /**
     * Get the Stripe customer name for this manufacturer.
     */
    public function stripeName(): string
    {
        return $this->name;
    }

    /**
     * Get the current plan for this manufacturer.
     */
    public function currentPlan(): BelongsTo
    {
        return $this->belongsTo(Plan::class, 'current_plan_id');
    }

    /**
     * Get all users belonging to this manufacturer.
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'manufacturer_user')
            ->using(ManufacturerUser::class)
            ->withPivot('role', 'status', 'capabilities')
            ->withTimestamps();
    }

    public function primaryOwner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'primary_owner_user_id');
    }

    public function isPrimaryOwner(User $user): bool
    {
        return $this->primary_owner_user_id === $user->id;
    }

    public function productCategories(): HasMany
    {
        return $this->hasMany(ProductCategory::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function productImports(): HasMany
    {
        return $this->hasMany(ProductImport::class);
    }

    public function productImportMappings(): HasMany
    {
        return $this->hasMany(ProductImportMapping::class);
    }

    public function onboardingSessions(): HasMany
    {
        return $this->hasMany(OnboardingSession::class);
    }

    public function variationTypes(): HasMany
    {
        return $this->hasMany(VariationType::class)->orderBy('display_order');
    }

    public function catalogSetting(): HasOne
    {
        return $this->hasOne(CatalogSetting::class);
    }

    public function catalogVisits(): HasMany
    {
        return $this->hasMany(CatalogVisit::class);
    }

    /**
     * Get all orders for this manufacturer.
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function orderRules(): HasMany
    {
        return $this->hasMany(OrderRule::class)->orderBy('sort_order')->orderBy('id');
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }

    public function affiliations(): HasMany
    {
        return $this->hasMany(ManufacturerAffiliation::class);
    }

    public function representativeInvitations(): HasMany
    {
        return $this->hasMany(RepresentativeInvitation::class);
    }

    public function whatsappInstances(): HasMany
    {
        return $this->hasMany(WhatsappInstance::class);
    }

    public function whatsappFunnels(): HasMany
    {
        return $this->hasMany(WhatsappFunnel::class);
    }

    public function whatsappAutomations(): HasMany
    {
        return $this->hasMany(WhatsappAutomation::class);
    }

    public function whatsappQuickReplies(): HasMany
    {
        return $this->hasMany(WhatsappQuickReply::class);
    }

    /**
     * Get the active owner of this manufacturer.
     */
    public function owner(): ?User
    {
        if ($this->primary_owner_user_id) {
            $primaryOwner = $this->users()
                ->whereKey($this->primary_owner_user_id)
                ->wherePivot('role', 'owner')
                ->wherePivot('status', 'active')
                ->first();

            if ($primaryOwner) {
                return $primaryOwner;
            }
        }

        return $this->users()
            ->wherePivot('role', 'owner')
            ->wherePivot('status', 'active')
            ->first();
    }
}
