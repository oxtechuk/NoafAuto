<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wa_conversations', function (Blueprint $table) {
            $table->foreignId('assigned_to')->nullable()->after('lead_id')->constrained('employees')->nullOnDelete();
            $table->timestamp('assigned_at')->nullable()->after('assigned_to');
            $table->string('status', 20)->default('open')->after('assigned_at'); // open | pending | closed
            $table->json('tags')->nullable()->after('status');

            $table->index(['assigned_to', 'last_message_at']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::table('wa_conversations', function (Blueprint $table) {
            $table->dropIndex(['assigned_to', 'last_message_at']);
            $table->dropIndex(['status']);
            $table->dropConstrainedForeignId('assigned_to');
            $table->dropColumn(['assigned_at', 'status', 'tags']);
        });
    }
};
