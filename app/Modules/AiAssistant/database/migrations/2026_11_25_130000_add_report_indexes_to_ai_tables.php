<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Reports: conversations and assistant replies per period.
        if (! Schema::hasIndex('ai_conversations', ['created_at'])) {
            Schema::table('ai_conversations', fn (Blueprint $table) => $table->index('created_at'));
        }
        if (! Schema::hasIndex('ai_messages', ['created_at', 'role'])) {
            Schema::table('ai_messages', fn (Blueprint $table) => $table->index(['created_at', 'role']));
        }
    }

    public function down(): void
    {
        Schema::table('ai_conversations', fn (Blueprint $table) => $table->dropIndex(['created_at']));
        Schema::table('ai_messages', fn (Blueprint $table) => $table->dropIndex(['created_at', 'role']));
    }
};
