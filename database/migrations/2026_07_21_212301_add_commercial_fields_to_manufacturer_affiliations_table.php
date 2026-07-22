<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('manufacturer_affiliations', function (Blueprint $table) {
            $table->enum('source', ['request', 'invitation'])->default('request')->after('status');
            $table->text('application_note')->nullable()->after('source');
            $table->timestamp('requested_at')->nullable()->after('application_note');
            $table->timestamp('approved_at')->nullable()->after('requested_at');
            $table->timestamp('rejected_at')->nullable()->after('approved_at');
            $table->timestamp('revoked_at')->nullable()->after('rejected_at');
            $table->foreignId('decided_by_user_id')->nullable()->after('revoked_at')->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('manufacturer_affiliations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('decided_by_user_id');
            $table->dropColumn([
                'source',
                'application_note',
                'requested_at',
                'approved_at',
                'rejected_at',
                'revoked_at',
            ]);
        });
    }
};
