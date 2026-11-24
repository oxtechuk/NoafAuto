<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Indexes for the hottest CRM lookups: list filters by status / assignee / date, and the
     * lead-by-phone lookup that runs on every new booking (Booking::created).
     *
     * 2026_11_19_132935 documented some of these but its up() is empty (they were added by hand on
     * one server), so each index is created only when neither its name nor its column set exists yet.
     * Safe to run on any instance.
     *
     * @var array<string, array<string, list<string>>>
     */
    private array $indexes = [
        'bookings' => [
            'idx_bookings_status_created' => ['status', 'created_at'],
            'idx_bookings_assigned_status' => ['assigned_to', 'status'],
        ],
        'leads' => [
            'idx_leads_status_created' => ['status', 'created_at'],
            'idx_leads_assigned_status' => ['assigned_to', 'status'],
            'idx_leads_client_phone' => ['client_phone'],
        ],
        'tasks' => [
            'idx_tasks_assigned_status' => ['assigned_to', 'status'],
            'idx_tasks_status_due' => ['status', 'due_date'],
        ],
    ];

    public function up(): void
    {
        foreach ($this->indexes as $table => $indexes) {
            foreach ($indexes as $name => $columns) {
                if (Schema::hasIndex($table, $name) || Schema::hasIndex($table, $columns)) {
                    continue;
                }

                Schema::table($table, fn (Blueprint $blueprint) => $blueprint->index($columns, $name));
            }
        }
    }

    public function down(): void
    {
        foreach ($this->indexes as $table => $indexes) {
            foreach (array_keys($indexes) as $name) {
                if (Schema::hasIndex($table, $name)) {
                    Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropIndex($name));
                }
            }
        }
    }
};
