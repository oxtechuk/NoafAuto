<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row: the showroom owner's assistant configuration (API key encrypted).
        Schema::create('ai_assistant_settings', function (Blueprint $table) {
            $table->id();
            $table->json('data')->nullable();
            $table->text('api_key')->nullable();
            $table->timestamps();
        });

        Schema::create('ai_conversations', function (Blueprint $table) {
            $table->id();
            $table->uuid('session_id')->unique();
            $table->string('channel', 20)->default('storefront');
            $table->string('locale', 5)->default('ar');
            $table->json('page_context')->nullable();
            $table->json('profile')->nullable();
            $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->string('provider', 30)->nullable();
            $table->string('model', 100)->nullable();
            $table->unsignedInteger('messages_count')->default(0);
            $table->unsignedInteger('tokens_in')->default(0);
            $table->unsignedInteger('tokens_out')->default(0);
            $table->string('ip_hash', 64)->nullable();
            $table->timestamp('last_activity_at')->nullable()->index();
            $table->timestamps();
        });

        Schema::create('ai_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('ai_conversations')->cascadeOnDelete();
            // user | model | tool — "payload" keeps the provider's raw parts so they can be replayed exactly.
            $table->string('role', 10);
            $table->text('content')->nullable();
            $table->json('payload')->nullable();
            $table->json('cards')->nullable();
            $table->json('guard_flags')->nullable();
            $table->unsignedInteger('tokens_in')->default(0);
            $table->unsignedInteger('tokens_out')->default(0);
            $table->unsignedInteger('latency_ms')->default(0);
            $table->timestamps();

            $table->index(['conversation_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_messages');
        Schema::dropIfExists('ai_conversations');
        Schema::dropIfExists('ai_assistant_settings');
    }
};
