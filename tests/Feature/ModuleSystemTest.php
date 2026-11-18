<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Employee;
use App\Services\Modules\ModuleManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class ModuleSystemTest extends TestCase
{
    use RefreshDatabase;

    private Employee $admin;

    private Employee $sales;

    private string $testModuleDir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = Employee::factory()->admin()->create();
        $this->sales = Employee::factory()->create(['role' => 'sales']);

        $this->testModuleDir = app_path('Modules/FeedbackDemo');
        if (File::isDirectory($this->testModuleDir)) {
            File::deleteDirectory($this->testModuleDir);
        }
    }

    protected function tearDown(): void
    {
        if (File::isDirectory($this->testModuleDir)) {
            File::deleteDirectory($this->testModuleDir);
        }

        parent::tearDown();
    }

    public function test_make_module_command_creates_module_structure(): void
    {
        $this->artisan('sitekit:make-module', ['name' => 'FeedbackDemo'])
            ->assertSuccessful();

        $this->assertDirectoryExists($this->testModuleDir);
        $this->assertFileExists("{$this->testModuleDir}/module.json");
        $this->assertFileExists("{$this->testModuleDir}/FeedbackDemoServiceProvider.php");
        $this->assertFileExists("{$this->testModuleDir}/Models/FeedbackDemo.php");
        $this->assertFileExists("{$this->testModuleDir}/Http/Controllers/FeedbackDemoController.php");
        $this->assertFileExists("{$this->testModuleDir}/Http/Requests/FeedbackDemoRequest.php");
        $this->assertFileExists("{$this->testModuleDir}/Http/Resources/FeedbackDemoResource.php");
        $this->assertFileExists("{$this->testModuleDir}/Policies/FeedbackDemoPolicy.php");
        $this->assertFileExists("{$this->testModuleDir}/Routes/api.php");

        $manifest = json_decode(File::get("{$this->testModuleDir}/module.json"), true);
        $this->assertSame('feedback-demo', $manifest['key']);
        $this->assertTrue($manifest['enabled']);
    }

    public function test_module_manager_discovers_and_toggles_modules(): void
    {
        $this->artisan('sitekit:make-module', ['name' => 'FeedbackDemo'])->assertSuccessful();

        $manager = new ModuleManager;
        $all = $manager->all();

        $this->assertTrue($all->has('feedback-demo'));
        $this->assertTrue($manager->find('feedback-demo')['enabled']);

        // Disable
        $this->assertTrue($manager->disable('feedback-demo'));
        $this->assertFalse($manager->find('feedback-demo')['enabled']);

        // Enable
        $this->assertTrue($manager->enable('feedback-demo'));
        $this->assertTrue($manager->find('feedback-demo')['enabled']);
    }

    public function test_admin_manages_modules_via_api(): void
    {
        $this->artisan('sitekit:make-module', ['name' => 'FeedbackDemo'])->assertSuccessful();

        // Non-admin forbidden
        $this->actingAs($this->sales, 'employee')
            ->getJson(route('api.v1.modules.index'))
            ->assertForbidden();

        // Admin lists modules
        $this->actingAs($this->admin, 'employee')
            ->getJson(route('api.v1.modules.index'))
            ->assertOk()
            ->assertJsonPath('success', true);

        // Admin disables module
        $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.modules.disable', 'feedback-demo'))
            ->assertOk()
            ->assertJsonPath('data.enabled', false);

        // Admin enables module
        $this->actingAs($this->admin, 'employee')
            ->postJson(route('api.v1.modules.enable', 'feedback-demo'))
            ->assertOk()
            ->assertJsonPath('data.enabled', true);
    }
}
