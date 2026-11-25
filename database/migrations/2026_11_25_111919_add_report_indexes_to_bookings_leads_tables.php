<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reports filter every table by a created_at range (and often by assignee), so these
 * indexes turn full scans into range scans. Only indexes that don't exist yet are added.
 */
return new class extends Migration
{
    /** @var array<string, list<list<string>>> */
    private array $indexes = [
        'bookings' => [['created_at'], ['assigned_to', 'created_at'], ['follow_up_at']],
        'leads' => [['created_at'], ['assigned_to', 'created_at']],
        'tasks' => [['created_at']],
        'calculator_leads' => [['created_at']],
    ];

    public function up(): void
    {
        foreach ($this->indexes as $table => $indexes) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            foreach ($indexes as $columns) {
                if (! Schema::hasIndex($table, $columns)) {
                    Schema::table($table, fn (Blueprint $blueprint) => $blueprint->index($columns));
                }
            }
        }
    }

    public function down(): void
    {
        foreach ($this->indexes as $table => $indexes) {
            foreach ($indexes as $columns) {
                $name = $table.'_'.implode('_', $columns).'_index';
                if (Schema::hasTable($table) && Schema::hasIndex($table, $name)) {
                    Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropIndex($name));
                }
            }
        }
    }
};
