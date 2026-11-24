<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Track updates that run through the client's GitHub Action
     * (who started them, which step is running, and the Actions run link).
     */
    public function up(): void
    {
        Schema::table('update_history', function (Blueprint $table) {
            $table->string('source', 30)->default('local')->after('status');
            $table->string('step', 50)->nullable()->after('source');
            $table->string('run_url')->nullable()->after('step');
            $table->unsignedBigInteger('triggered_by')->nullable()->after('run_url');
        });
    }

    public function down(): void
    {
        Schema::table('update_history', function (Blueprint $table) {
            $table->dropColumn(['source', 'step', 'run_url', 'triggered_by']);
        });
    }
};
