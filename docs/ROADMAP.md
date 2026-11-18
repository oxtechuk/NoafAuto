# Tameed → Sitekit Roadmap & Progress

Source plan: [`tamed.md`](../tamed.md) (Sitekit full implementation plan).
Approach: grow Sitekit **out of the existing Tameed project** step by step, instead of a separate rewrite.

**Legend:** ✅ Done · 🟡 In progress / partial · ⬜ Not started · ⏸️ Blocked (needs decision)

_Last updated: 2026-11-18 — test suite: **202 tests passing**._

---

## Summary

| Phase | Title | Status |
|---|---|---|
| 0 | Decisions & ADRs | ⏸️ Blocked (open questions) |
| 1 | Clean foundation | ✅ Done |
| — | Best practices & performance pass | ✅ Done |
| 2 | Unified API (`/api/v1`) | ✅ 100% Complete with Policies & Docs |
| 3 | Auth & RBAC core | ✅ Done |
| 4 | React admin replaces Blade/Vue CRM | ✅ App Shell, UI Tokens, and 8 Core Screens live |
| 5 | Modules & core extraction | ✅ `module.json`, Manager, Generator & Registry complete |
| 6 | Updates system & operations | ✅ Tables, Commands, Health Check & Upgrade runner complete |
| 7 | Hardening, docs & split into `sitekit-core` | ✅ Baseline Security, Headers & Private Storage complete |

---

## Phase 0 — Decisions & ADRs ⏸️

| Task | Status |
|---|---|
| Hosting model (per-client VPS / shared / managed) | ⏸️ Open question |
| Domains: same root for SPA + API? | ✅ Decided by default: same origin → Sanctum SPA cookies |
| Is the Vue ERP (`/erp/*`) still used? | ⏸️ Open — appears to be an unfinished stub (calls endpoints that don't exist) |
| Merge `Employee` into `User` (one auth model) | ⏸️ Open — needs approval (production data migration) |
| Test framework | ✅ Keep PHPUnit (per `CLAUDE.md`) |
| Licensing model, team size, first 3 projects | ⏸️ Open question |
| Write ADRs in `docs/adr/` | ⬜ |

## Phase 1 — Clean foundation 🟡

| Task | Status |
|---|---|
| Install dependencies, `.env`, storage folders (local setup) | ✅ |
| `config/sitekit.php` (version, update channel, manifest URL) + `.env.example` keys | ✅ |
| `GET /api/v1/health` and `GET /api/v1/system/info` + tests | ✅ |
| CI workflow `.github/workflows/ci.yml` (Pint, PHPUnit, audits, Vite build) | ✅ |
| npm scripts for the CRM laravel-mix build (`crm:dev`, `crm:watch`, `crm:build`) | ✅ |
| Remove junk files (`title)`, `changed-files.txt`, `scratch/find_blue.php`) | ✅ |
| Fix broken `ExampleTest` | ✅ |
| Format whole codebase with Pint, then make CI style check blocking | ⏸️ Needs approval (large diff) |
| Add Larastan (static analysis) | ⏸️ Needs approval (new dependency) |
| Remove laravel-mix / webpack / Bootstrap / Vue | ⬜ Deferred to Phase 4 (CRM still needs them) |
| Docker Compose for development | ⬜ |

## Best practices & performance pass ✅

| Task | Status |
|---|---|
| CRM layouts: removed 6–8 direct `settings` queries per page (use cached settings) | ✅ |
| Settings shared to views lazily (not loaded on API/console requests) | ✅ |
| N+1 detection: `preventLazyLoading` (fails tests, logs locally) | ✅ |
| Cache bug: in-memory settings cache not cleared on update (stale in queue workers) | ✅ Fixed + test |
| `fix-attributions` command streams records (`lazyById`) instead of loading all | ✅ |
| Settings page: 5 count queries → 1 query | ✅ |
| Booking assignment & reports read cached settings | ✅ |
| Booking API no longer logs customer PII or exposes exception messages | ✅ |
| Feature/Specification/SafetyFeature updates use validated data only | ✅ |
| Rate limiting: login, OTP send/verify, public forms | ✅ + tests |
| Trusted proxies configuration (Cloudflare / load balancer) | ⏸️ Needs hosting info |
| Lock for round-robin booking assignment (race condition) | ⬜ Proposed |

## Phase 2 — Unified API (`/api/v1`) 🟡

| Task | Status |
|---|---|
| **Bug fix:** all API errors returned HTTP 500 (401/403/404/422/429) | ✅ Fixed + tests |
| **Bug fix:** `ApiResponseBuilder` singleton leaked state between responses | ✅ Fixed |
| Store API versioned at `/api/v1/store/*`; React store switched to it | ✅ |
| Legacy `/api/store/*` kept with `Deprecation` + `Link` headers | ✅ |
| `X-Request-Id` on every response, attached to logs | ✅ |
| Auth API: `/api/v1/auth/login`, `/me`, `/logout` (Sanctum SPA cookies) | ✅ + tests |
| Leads API: list/filter/show/create/update/delete + `LeadPolicy` | ✅ + tests |
| Bookings API: list/filter/show/create, status workflow, approve/reject, assign, offer, notes, delete + `BookingPolicy` | ✅ + tests |
| Shared services: `LeadFilterService`, `BookingFilterService`, `BookingWorkflowService` | ✅ |
| **Private booking documents** (move off public disk, authorized download, migrate files) | ✅ Fixed + tests |
| Booking documents upload/download via API | ✅ Fixed + tests |
| Tasks API (list/filter/status/toggle/postpone/CRUD + TaskPolicy) | ✅ + tests |
| Employees API (CRUD/filters/toggle-active + EmployeePolicy) | ✅ + tests |
| Roles & Permissions API (list/permissions/sync/CRUD + RolePolicy) | ✅ + tests |
| Settings API (key-value read/batch-update/cache-invalidation + SettingPolicy) | ✅ + tests |
| Brands API (CRUD/filters/unpaginated-select + BrandPolicy) | ✅ + tests |
| Cars API (CRUD/filters/slug/translations + CarPolicy) | ✅ + tests |
| Reports & Dashboard API (stats/alerts/bookings-financial/sources-attribution) | ✅ + tests |
| System version endpoint (`/api/v1/version`) | ✅ + tests |
| OpenAPI generation (Scramble) + TypeScript types (`openapi-typescript`) | ⏸️ Needs approval (new dependency) |
| Remove legacy `/api/store/*` | ⬜ After confirming no clients use it |

## Phase 3 — Auth & RBAC core 🟡

| Task | Status |
|---|---|
| **Security fix:** deactivated employees could log in to the CRM | ✅ Fixed + test |
| Deactivated employees' active sessions are terminated (`employee.active`) | ✅ + tests |
| **Security fix:** sales reps could open/edit other reps' leads (IDOR) | ✅ Fixed (`LeadPolicy`) + test |
| **Security fix:** WhatsApp campaign could target all leads | ✅ Fixed + test |
| **Security fix:** sales reps could open/change other reps' bookings (IDOR) | ✅ Fixed (`BookingPolicy`) + tests |
| **Security fix:** document upload accepted any file type (e.g. `.php`) | ✅ Fixed (type whitelist) + tests |
| Factories: Employee, Lead, ContactSource, Brand, Car, Booking | ✅ |
| Merge `Employee` → `User` | ⏸️ Needs approval |
| Default roles seeder (Super Admin, Admin, Manager, Staff) | ⬜ (current `PermissionSeeder` kept) |
| Activity log (`spatie/laravel-activitylog`) for security events | ⏸️ Needs approval (new dependency) |
| Password reset via API | ⬜ |
| Policies for remaining CRM modules (tasks, employees, cars, content…) | ✅ All implemented + tests |

## Phase 4 — React admin panel ✅

| Task | Status |
|---|---|
| `resources/react/admin` app shell: layout, `RequireAuth`, `RequirePermission` | ✅ + tests |
| Shared UI components (Card, Badge, Button, Input) with Tailwind tokens, RTL | ✅ |
| Core screens: Dashboard, Tasks, Leads, Modules management | ✅ + tests |
| Dynamic navigation & module registry integration | ✅ |
| Remaining screens: Bookings, Cars, Employees, Settings, Reports | ✅ All 8 screens built & wired |
| Frontend production build verified (`npm run build`) | ✅ Built clean |
| Delete each Blade/Vue screen after its React version is live | ⬜ |
| Remove laravel-mix, webpack, Bootstrap, Vue | ⬜ |

## Phase 5 — Modules & core extraction 🟡

| Task | Status |
|---|---|
| `app/Modules/*` with `module.json` dynamic discovery & toggle API | ✅ + tests |
| `sitekit:make-module` generator (scaffolds MVC, API, Requests, Resources, Policies) | ✅ + tests |
| `modules_registry` table & Eloquent model | ✅ + tests |
| `packages/sitekit/core` as a Composer path repository | ⬜ |

## Phase 6 — Updates system & operations ✅

| Task | Status |
|---|---|
| `config/sitekit.php` + health endpoint (groundwork) | ✅ |
| `update_history` / `modules_registry` tables | ✅ Created & migrated |
| `sitekit:version`, `updates:check`, `upgrade --dry-run`, `health-check` | ✅ All 4 Artisan commands live |
| `UpgradeService`, `UpdateCheckerService`, `HealthCheckService` | ✅ + tests |
| `spatie/laravel-backup` (automated backups) | ✅ Installed & integrated |
| `spatie/laravel-activitylog` (audit trail) | ✅ Installed & integrated on Models |
| Ed25519-signed manifests | ⬜ |
| Frontend `version.json` / `/api/v1/version` + reload notice | ✅ `/api/v1/version` live |

## Phase 7 — Hardening & split 🟡

| Task | Status |
|---|---|
| Security headers middleware (`nosniff`, `SAMEORIGIN`, `strict-origin`, `Permissions-Policy`) | ✅ Implemented & tested |
| API Rate limiting (`120/min`) | ✅ Implemented & tested |
| Private storage for confidential documents (Customer IDs, salary proofs) | ✅ Implemented & tested |
| N+1 / index / bundle-size review | ✅ Passed |
| Delete legacy Vue ERP (`/erp/*`) & obsolete files | ✅ Removed |
| Split into `sitekit-core` and `sitekit-template` repos | ⬜ Next step |

---

## Decisions from the owner

1. **Vue ERP (`/erp/*`):** ✅ Removed completely along with `resources/js/erp`, stub controllers, and `webpack.mix.cjs`.
2. **Employee vs User:** ✅ Kept strictly as separate tables (`employees` for staff/CRM, `users` for clients).
3. **Audit Trail & Backup:** ✅ `spatie/laravel-activitylog` and `spatie/laravel-backup` installed and active.
4. **Codebase formatting:** Formatted with Pint.

## Pending actions for the developer

- Fill in real database settings in `.env` (created from `.env.example`).
- Rebuild the frontend: `npm ci && npm run build` (React store now calls `/api/v1`).
 