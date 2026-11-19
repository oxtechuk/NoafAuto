<?php

declare(strict_types=1);

namespace Tests\Feature;

use Tests\TestCase;

class AdminSpaTest extends TestCase
{
    public function test_admin_spa_routes_render_admin_view(): void
    {
        $this->withoutVite();
        $routes = [
            '/admin',
            '/admin/login',
            '/admin/leads',
            '/admin/tasks',
            '/admin/bookings',
            '/admin/modules',
        ];

        foreach ($routes as $route) {
            $response = $this->get($route);
            $response->assertOk();
            $response->assertSee('admin-root', false);
            $response->assertSee('تعميد CRM', false);
        }
    }
}
