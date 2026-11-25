<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Local copy of the approved message templates in the showroom's WhatsApp Business account.
        Schema::create('wa_templates', function (Blueprint $table): void {
            $table->id();
            $table->string('provider_template_id', 64)->nullable();
            $table->string('name', 512);
            $table->string('language', 15);
            $table->string('category', 30)->nullable(); // marketing | utility | authentication
            $table->string('status', 30)->nullable(); // approved | pending | rejected | paused | disabled
            $table->string('rejected_reason')->nullable();
            $table->json('components')->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();

            $table->unique(['name', 'language']);
        });

        // Meta reports per message whether it is billable and its pricing category (status webhooks).
        Schema::table('wa_messages', function (Blueprint $table): void {
            $table->string('pricing_category', 30)->nullable()->after('status');
            $table->boolean('billable')->nullable()->after('pricing_category');
        });
    }

    public function down(): void
    {
        Schema::table('wa_messages', function (Blueprint $table): void {
            $table->dropColumn(['pricing_category', 'billable']);
        });
        Schema::dropIfExists('wa_templates');
    }
};
