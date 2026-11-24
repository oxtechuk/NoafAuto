<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class CrmLookupIndexesTest extends TestCase
{
    use RefreshDatabase;

    public function test_crm_lookup_indexes_exist(): void
    {
        $this->assertTrue(Schema::hasIndex('bookings', ['status', 'created_at']));
        $this->assertTrue(Schema::hasIndex('bookings', ['assigned_to', 'status']));
        $this->assertTrue(Schema::hasIndex('leads', ['status', 'created_at']));
        $this->assertTrue(Schema::hasIndex('leads', ['assigned_to', 'status']));
        $this->assertTrue(Schema::hasIndex('leads', ['client_phone']));
        $this->assertTrue(Schema::hasIndex('tasks', ['assigned_to', 'status']));
        $this->assertTrue(Schema::hasIndex('tasks', ['status', 'due_date']));
    }

    public function test_migration_can_run_again_on_a_database_that_already_has_the_indexes(): void
    {
        $this->migration()->up();

        $this->assertTrue(Schema::hasIndex('leads', 'idx_leads_client_phone'));
    }

    public function test_migration_skips_an_index_that_exists_under_another_name(): void
    {
        $this->migration()->down();
        Schema::table('leads', fn ($table) => $table->index('client_phone', 'leads_phone_added_by_hand'));

        $this->migration()->up();

        $this->assertTrue(Schema::hasIndex('leads', 'leads_phone_added_by_hand'));
        $this->assertFalse(Schema::hasIndex('leads', 'idx_leads_client_phone'));
    }

    public function test_migration_rolls_back_cleanly(): void
    {
        $this->migration()->down();

        $this->assertFalse(Schema::hasIndex('tasks', 'idx_tasks_status_due'));
        $this->assertFalse(Schema::hasIndex('leads', 'idx_leads_client_phone'));
    }

    private function migration(): Migration
    {
        return require database_path('migrations/2026_11_24_171258_add_missing_crm_lookup_indexes.php');
    }
}
