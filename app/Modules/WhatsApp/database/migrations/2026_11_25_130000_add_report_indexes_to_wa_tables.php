<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Reports: messages per period (any direction) and new conversations per period.
        if (! Schema::hasIndex('wa_messages', ['created_at'])) {
            Schema::table('wa_messages', fn (Blueprint $table) => $table->index('created_at'));
        }
        if (! Schema::hasIndex('wa_conversations', ['created_at'])) {
            Schema::table('wa_conversations', fn (Blueprint $table) => $table->index('created_at'));
        }
    }

    public function down(): void
    {
        Schema::table('wa_messages', fn (Blueprint $table) => $table->dropIndex(['created_at']));
        Schema::table('wa_conversations', fn (Blueprint $table) => $table->dropIndex(['created_at']));
    }
};
