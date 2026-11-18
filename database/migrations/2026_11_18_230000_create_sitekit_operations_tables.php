<?php

declare(strict_types=1);

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
        if (! Schema::hasTable('update_history')) {
            Schema::create('update_history', function (Blueprint $table) {
                $table->id();
                $table->string('from_version', 50)->nullable();
                $table->string('to_version', 50);
                $table->string('status', 30)->default('pending')->index();
                $table->timestamp('started_at')->nullable();
                $table->timestamp('finished_at')->nullable();
                $table->json('log')->nullable();
                $table->text('error')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('modules_registry')) {
            Schema::create('modules_registry', function (Blueprint $table) {
                $table->id();
                $table->string('key', 100)->unique();
                $table->string('name', 150);
                $table->string('version', 50)->default('1.0.0');
                $table->boolean('enabled')->default(true)->index();
                $table->json('config')->nullable();
                $table->timestamp('installed_at')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('modules_registry');
        Schema::dropIfExists('update_history');
    }
};
