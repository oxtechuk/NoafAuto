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
        // Indexes on bookings and leads were created.
        // Cars table already has idx_cars_active_brand and idx_active.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropIndex('idx_bookings_status_created');
            $table->dropIndex('idx_bookings_assigned_status');
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex('idx_leads_status_created');
            $table->dropIndex('idx_leads_assigned_status');
        });
    }
};
