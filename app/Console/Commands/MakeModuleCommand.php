<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

class MakeModuleCommand extends Command
{
    protected $signature = 'sitekit:make-module {name : The name of the module (e.g. Blog)}';

    protected $description = 'Scaffold a new decoupled Sitekit module in app/Modules';

    public function handle(): int
    {
        $rawName = trim((string) $this->argument('name'));
        $name = Str::studly($rawName);
        $key = Str::kebab($name);
        $snake = Str::snake($name);
        $pluralKey = Str::plural($key);

        $moduleDir = app_path("Modules/{$name}");

        if (File::isDirectory($moduleDir)) {
            $this->components->error("Module [{$name}] already exists at [{$moduleDir}].");

            return self::FAILURE;
        }

        File::makeDirectory("{$moduleDir}/Http/Controllers", 0755, true);
        File::makeDirectory("{$moduleDir}/Http/Requests", 0755, true);
        File::makeDirectory("{$moduleDir}/Http/Resources", 0755, true);
        File::makeDirectory("{$moduleDir}/Models", 0755, true);
        File::makeDirectory("{$moduleDir}/Policies", 0755, true);
        File::makeDirectory("{$moduleDir}/Routes", 0755, true);
        File::makeDirectory("{$moduleDir}/Database/migrations", 0755, true);

        // 1. module.json
        $manifest = [
            'key' => $key,
            'name' => $name,
            'version' => '1.0.0',
            'enabled' => true,
            'provider' => "App\\Modules\\{$name}\\{$name}ServiceProvider",
            'permissions' => [
                "{$key}.view",
                "{$key}.create",
                "{$key}.update",
                "{$key}.delete",
            ],
            'dependencies' => ['sitekit/core:^1.0'],
        ];
        File::put("{$moduleDir}/module.json", json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        // 2. Service Provider
        $providerContent = <<<PHP
<?php

declare(strict_types=1);

namespace App\Modules\\{$name};

use App\Modules\\{$name}\Models\\{$name};
use App\Modules\\{$name}\Policies\\{$name}Policy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class {$name}ServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        \$this->registerRoutes();
        \$this->registerMigrations();
        \$this->registerPolicies();
    }

    protected function registerRoutes(): void
    {
        if (file_exists(__DIR__ . '/Routes/api.php')) {
            Route::prefix('api/v1')
                ->middleware(['web', 'auth:employee', 'guard.employee', 'employee.active'])
                ->group(__DIR__ . '/Routes/api.php');
        }
    }

    protected function registerMigrations(): void
    {
        \$this->loadMigrationsFrom(__DIR__ . '/Database/migrations');
    }

    protected function registerPolicies(): void
    {
        Gate::policy({$name}::class, {$name}Policy::class);
    }
}
PHP;
        File::put("{$moduleDir}/{$name}ServiceProvider.php", $providerContent);

        // 3. Model
        $modelContent = <<<PHP
<?php

declare(strict_types=1);

namespace App\Modules\\{$name}\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class {$name} extends Model
{
    use HasFactory;

    protected \$table = '{$snake}s';

    protected \$fillable = [
        'title',
        'is_active',
    ];

    protected \$casts = [
        'is_active' => 'boolean',
    ];
}
PHP;
        File::put("{$moduleDir}/Models/{$name}.php", $modelContent);

        // 4. Policy
        $policyContent = <<<PHP
<?php

declare(strict_types=1);

namespace App\Modules\\{$name}\Policies;

use App\Models\Employee;
use App\Modules\\{$name}\Models\\{$name};

class {$name}Policy
{
    public function viewAny(Employee \$employee): bool
    {
        return \$employee->isAdmin() || \$employee->checkPermissionTo('{$key}.view', 'employee');
    }

    public function view(Employee \$employee, {$name} \$model): bool
    {
        return \$this->viewAny(\$employee);
    }

    public function create(Employee \$employee): bool
    {
        return \$employee->isAdmin() || \$employee->checkPermissionTo('{$key}.create', 'employee');
    }

    public function update(Employee \$employee, {$name} \$model): bool
    {
        return \$employee->isAdmin() || \$employee->checkPermissionTo('{$key}.update', 'employee');
    }

    public function delete(Employee \$employee, {$name} \$model): bool
    {
        return \$employee->isAdmin() || \$employee->checkPermissionTo('{$key}.delete', 'employee');
    }
}
PHP;
        File::put("{$moduleDir}/Policies/{$name}Policy.php", $policyContent);

        // 5. Request
        $requestContent = <<<PHP
<?php

declare(strict_types=1);

namespace App\Modules\\{$name}\Http\Requests;

use App\Http\Requests\Api\ApiBaseRequest;

final class {$name}Request extends ApiBaseRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
PHP;
        File::put("{$moduleDir}/Http/Requests/{$name}Request.php", $requestContent);

        // 6. Resource
        $resourceContent = <<<PHP
<?php

declare(strict_types=1);

namespace App\Modules\\{$name}\Http\Resources;

use App\Modules\\{$name}\Models\\{$name};
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin {$name}
 */
class {$name}Resource extends JsonResource
{
    public function toArray(Request \$request): array
    {
        return [
            'id' => \$this->id,
            'title' => \$this->title,
            'is_active' => (bool) \$this->is_active,
            'created_at' => \$this->created_at?->toIso8601String(),
            'updated_at' => \$this->updated_at?->toIso8601String(),
        ];
    }
}
PHP;
        File::put("{$moduleDir}/Http/Resources/{$name}Resource.php", $resourceContent);

        // 7. Controller
        $controllerContent = <<<PHP
<?php

declare(strict_types=1);

namespace App\Modules\\{$name}\Http\Controllers;

use App\Http\Api\Contracts\ApiResponse;
use App\Http\Controllers\Api\ApiBaseController;
use App\Modules\\{$name}\Http\Requests\\{$name}Request;
use App\Modules\\{$name}\Http\Resources\\{$name}Resource;
use App\Modules\\{$name}\Models\\{$name};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class {$name}Controller extends ApiBaseController
{
    public function index(Request \$request): ApiResponse
    {
        Gate::authorize('viewAny', {$name}::class);

        \$items = {$name}::latest()->paginate(20);
        \$items->setCollection(collect({$name}Resource::collection(\$items->getCollection())->resolve()));

        return \$this->respondPaginated(\$items, '{$name} items retrieved successfully');
    }

    public function store({$name}Request \$request): ApiResponse
    {
        Gate::authorize('create', {$name}::class);

        \$model = {$name}::create(\$request->validated());

        return \$this->respondCreated(
            (new {$name}Resource(\$model))->resolve(),
            '{$name} created successfully'
        );
    }

    public function show({$name} \$model): ApiResponse
    {
        Gate::authorize('view', \$model);

        return \$this->respondSuccess((new {$name}Resource(\$model))->resolve());
    }

    public function update({$name}Request \$request, {$name} \$model): ApiResponse
    {
        Gate::authorize('update', \$model);

        \$model->update(\$request->validated());

        return \$this->respondSuccess(
            (new {$name}Resource(\$model))->resolve(),
            '{$name} updated successfully'
        );
    }

    public function destroy({$name} \$model): ApiResponse
    {
        Gate::authorize('delete', \$model);

        \$model->delete();

        return \$this->respondDeleted('{$name} deleted successfully');
    }
}
PHP;
        File::put("{$moduleDir}/Http/Controllers/{$name}Controller.php", $controllerContent);

        // 8. Routes
        $routesContent = <<<PHP
<?php

declare(strict_types=1);

use App\Modules\\{$name}\Http\Controllers\\{$name}Controller;
use Illuminate\Support\Facades\Route;

Route::apiResource('{$pluralKey}', {$name}Controller::class);
PHP;
        File::put("{$moduleDir}/Routes/api.php", $routesContent);

        $this->components->info("Module [{$name}] successfully scaffolded at [{$moduleDir}].");

        return self::SUCCESS;
    }
}
