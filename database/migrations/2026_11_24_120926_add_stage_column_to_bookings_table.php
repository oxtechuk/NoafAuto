<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->string('stage', 50)->default('new')->after('status')->index();
        });

        // Map existing statuses to initial pipeline stages
        DB::table('bookings')
            ->whereIn('status', ['contacted', 'contacted_no_answer'])
            ->update(['stage' => 'contacted']);

        DB::table('bookings')
            ->whereIn('status', ['waiting_documents', 'approved'])
            ->update(['stage' => 'credit_check']);

        DB::table('bookings')
            ->whereIn('status', ['bank_review', 'authorized'])
            ->update(['stage' => 'bank_approval']);

        DB::table('bookings')
            ->whereIn('status', ['received', 'sold'])
            ->update(['stage' => 'shipping']);

        DB::table('bookings')
            ->whereIn('status', ['done', 'delivered'])
            ->update(['stage' => 'delivered']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropColumn('stage');
        });
    }
};
