<?php

use App\Models\Car;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add a dedicated indexed `horsepower` column so the HP filter can use
     * a simple WHERE clause instead of loading every car into PHP memory.
     *
     * The column is back-filled from the existing `specs->hp` JSON value and
     * kept in sync by the Car model's `saving` hook.
     */
    public function up(): void
    {
        Schema::table('cars', function (Blueprint $table) {
            $table->unsignedSmallInteger('horsepower')->nullable()->after('specs');
            $table->index(['is_active', 'horsepower'], 'idx_cars_active_hp');
        });

        DB::table('cars')
            ->whereNotNull('specs')
            ->select(['id', 'specs'])
            ->orderBy('id')
            ->chunkById(500, function ($cars): void {
                foreach ($cars as $car) {
                    $specs = json_decode((string) $car->specs, true);
                    $horsepower = Car::parseHorsepower(is_array($specs) ? ($specs['hp'] ?? null) : null);

                    if ($horsepower !== null) {
                        DB::table('cars')->where('id', $car->id)->update(['horsepower' => $horsepower]);
                    }
                }
            });
    }

    public function down(): void
    {
        Schema::table('cars', function (Blueprint $table) {
            $table->dropIndex('idx_cars_active_hp');
            $table->dropColumn('horsepower');
        });
    }
};
