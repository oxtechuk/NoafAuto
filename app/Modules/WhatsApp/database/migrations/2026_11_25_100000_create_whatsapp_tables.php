<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row: provider choice + options (data) and encrypted credentials (secrets).
        Schema::create('wa_settings', function (Blueprint $table) {
            $table->id();
            $table->json('data')->nullable();
            $table->text('secrets')->nullable();
            $table->timestamps();
        });

        Schema::create('wa_conversations', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 20)->unique(); // E.164 digits without "+"
            $table->string('name')->nullable();
            $table->foreignId('lead_id')->nullable()->constrained('leads')->nullOnDelete();
            $table->uuid('assistant_session_id')->nullable();
            $table->timestamp('last_inbound_at')->nullable();
            $table->timestamp('last_message_at')->nullable()->index();
            $table->timestamp('ai_paused_until')->nullable();
            $table->unsignedInteger('unread_count')->default(0);
            $table->timestamps();
        });

        Schema::create('wa_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('wa_conversations')->cascadeOnDelete();
            $table->string('direction', 3); // in | out
            $table->string('provider', 10);
            $table->string('type', 20)->default('text'); // text | template | media | other
            $table->text('body')->nullable();
            $table->string('event', 50)->nullable(); // booking_created, booking_status_updated, campaign, ai_reply, agent_reply…
            $table->string('provider_message_id')->nullable()->unique();
            $table->string('status', 20)->default('queued'); // received | queued | sent | delivered | read | failed
            $table->text('error')->nullable();
            $table->foreignId('sent_by')->nullable()->constrained('employees')->nullOnDelete();
            $table->json('payload')->nullable();
            $table->timestamps();

            $table->index(['conversation_id', 'id']);
            $table->index(['direction', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wa_messages');
        Schema::dropIfExists('wa_conversations');
        Schema::dropIfExists('wa_settings');
    }
};
