import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { LoginPage } from '../pages/LoginPage';
import { RequireAuth } from '../context/AuthContext';
import { Skeleton, TableSkeleton } from '../../shared/components/ui/Skeleton';

// Generic page skeleton (title, stat cards, table) for lazy loaded routes
const PageFallback: React.FC = () => (
    <div aria-busy="true" className="space-y-6 p-2">
        <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full" />
            ))}
        </div>
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--surface-primary,#fff)]">
            <TableSkeleton rows={6} cols={5} />
        </div>
    </div>
);

// Lazy Loaded Main Pages for code-splitting
const DashboardPage = React.lazy(() => import('../pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const TasksPage = React.lazy(() => import('../pages/TasksPage').then(m => ({ default: m.TasksPage })));
const LeadsPage = React.lazy(() => import('../pages/LeadsPage').then(m => ({ default: m.LeadsPage })));
const BookingsPage = React.lazy(() => import('../pages/BookingsPage').then(m => ({ default: m.BookingsPage })));
const CarsPage = React.lazy(() => import('../pages/CarsPage').then(m => ({ default: m.CarsPage })));
const CarFormPage = React.lazy(() => import('../pages/CarFormPage').then(m => ({ default: m.CarFormPage })));
const EmployeesPage = React.lazy(() => import('../pages/EmployeesPage').then(m => ({ default: m.EmployeesPage })));
const RolesPage = React.lazy(() => import('../pages/RolesPage').then(m => ({ default: m.RolesPage })));
const SettingsPage = React.lazy(() => import('../pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ReportsPage = React.lazy(() => import('../pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const ModulesPage = React.lazy(() => import('../pages/ModulesPage').then(m => ({ default: m.ModulesPage })));
const UpdatesPage = React.lazy(() => import('../pages/UpdatesPage').then(m => ({ default: m.UpdatesPage })));
const AiAssistantPage = React.lazy(() => import('../pages/AiAssistantPage').then(m => ({ default: m.AiAssistantPage })));
const WhatsAppPage = React.lazy(() => import('../pages/WhatsAppPage').then(m => ({ default: m.WhatsAppPage })));

// Lazy Loaded Catalog Sub-Module Pages
const BrandsPage = React.lazy(() => import('../pages/catalog/CatalogSubPages').then(m => ({ default: m.BrandsPage })));
const CarModelsPage = React.lazy(() => import('../pages/catalog/CatalogSubPages').then(m => ({ default: m.CarModelsPage })));
const BrandTypesPage = React.lazy(() => import('../pages/catalog/CatalogSubPages').then(m => ({ default: m.BrandTypesPage })));
const CarCategoriesPage = React.lazy(() => import('../pages/catalog/CatalogSubPages').then(m => ({ default: m.CarCategoriesPage })));
const CarTypesPage = React.lazy(() => import('../pages/catalog/CatalogSubPages').then(m => ({ default: m.CarTypesPage })));
const SpecsPage = React.lazy(() => import('../pages/catalog/CatalogSubPages').then(m => ({ default: m.SpecsPage })));
const FeaturesPage = React.lazy(() => import('../pages/catalog/CatalogSubPages').then(m => ({ default: m.FeaturesPage })));
const SafetyFeaturesPage = React.lazy(() => import('../pages/catalog/CatalogSubPages').then(m => ({ default: m.SafetyFeaturesPage })));
const OffersManagerPage = React.lazy(() => import('../pages/catalog/CatalogSubPages').then(m => ({ default: m.OffersManagerPage })));

// Lazy Loaded Client Sub-Module Pages
const CalculatorLeadsPage = React.lazy(() => import('../pages/clients/ClientSubPages').then(m => ({ default: m.CalculatorLeadsPage })));
const ContactSourcesPage = React.lazy(() => import('../pages/clients/ClientSubPages').then(m => ({ default: m.ContactSourcesPage })));
const NewsletterSubscribersPage = React.lazy(() => import('../pages/clients/ClientSubPages').then(m => ({ default: m.NewsletterSubscribersPage })));

// Lazy Loaded Sales Sub-Module Pages
const KanbanTrackingPage = React.lazy(() => import('../pages/sales/SalesSubPages').then(m => ({ default: m.KanbanTrackingPage })));
const CalculatorSettingsPage = React.lazy(() => import('../pages/sales/SalesSubPages').then(m => ({ default: m.CalculatorSettingsPage })));

// Lazy Loaded Content Sub-Module Pages
const BlogPostsPage = React.lazy(() => import('../pages/content/ContentSubPages').then(m => ({ default: m.BlogPostsPage })));
const BlogCategoriesPage = React.lazy(() => import('../pages/content/ContentSubPages').then(m => ({ default: m.BlogCategoriesPage })));
const PartnersPage = React.lazy(() => import('../pages/content/ContentSubPages').then(m => ({ default: m.PartnersPage })));
const TestimonialsPage = React.lazy(() => import('../pages/content/ContentSubPages').then(m => ({ default: m.TestimonialsPage })));
const FaqsPage = React.lazy(() => import('../pages/content/ContentSubPages').then(m => ({ default: m.FaqsPage })));
const HeroSlidesPage = React.lazy(() => import('../pages/content/ContentSubPages').then(m => ({ default: m.HeroSlidesPage })));

export const AppRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/admin/login" element={<LoginPage />} />

            <Route
                path="/admin"
                element={
                    <RequireAuth>
                        <AdminLayout />
                    </RequireAuth>
                }
            >
                <Route
                    index
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <DashboardPage />
                        </Suspense>
                    }
                />

                {/* Catalog & Fleet */}
                <Route
                    path="cars"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <CarsPage />
                        </Suspense>
                    }
                />
                <Route
                    path="cars/create"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <CarFormPage />
                        </Suspense>
                    }
                />
                <Route
                    path="cars/:id/edit"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <CarFormPage />
                        </Suspense>
                    }
                />
                <Route
                    path="catalog/brands"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <BrandsPage />
                        </Suspense>
                    }
                />
                <Route
                    path="catalog/models"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <CarModelsPage />
                        </Suspense>
                    }
                />
                <Route
                    path="catalog/brand-types"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <BrandTypesPage />
                        </Suspense>
                    }
                />
                <Route
                    path="catalog/categories"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <CarCategoriesPage />
                        </Suspense>
                    }
                />
                <Route
                    path="catalog/types"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <CarTypesPage />
                        </Suspense>
                    }
                />
                <Route
                    path="catalog/specs"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <SpecsPage />
                        </Suspense>
                    }
                />
                <Route
                    path="catalog/features"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <FeaturesPage />
                        </Suspense>
                    }
                />
                <Route
                    path="catalog/safety"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <SafetyFeaturesPage />
                        </Suspense>
                    }
                />
                <Route
                    path="catalog/offers"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <OffersManagerPage />
                        </Suspense>
                    }
                />

                {/* Clients & Leads */}
                <Route
                    path="leads"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <LeadsPage />
                        </Suspense>
                    }
                />
                <Route
                    path="leads/calculator"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <CalculatorLeadsPage />
                        </Suspense>
                    }
                />
                <Route
                    path="leads/sources"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <ContactSourcesPage />
                        </Suspense>
                    }
                />
                <Route
                    path="leads/newsletter"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <NewsletterSubscribersPage />
                        </Suspense>
                    }
                />

                {/* Sales & Pipeline */}
                <Route
                    path="bookings"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <BookingsPage group="active" />
                        </Suspense>
                    }
                />
                <Route
                    path="sales/bookings"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <BookingsPage group="active" />
                        </Suspense>
                    }
                />
                <Route
                    path="sales/bookings/active"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <BookingsPage group="active" />
                        </Suspense>
                    }
                />
                <Route
                    path="sales/bookings/pending"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <BookingsPage group="pending" />
                        </Suspense>
                    }
                />
                <Route
                    path="sales/bookings/delivered"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <BookingsPage group="delivered" />
                        </Suspense>
                    }
                />
                <Route
                    path="sales/bookings/closed"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <BookingsPage group="closed" />
                        </Suspense>
                    }
                />
                <Route
                    path="sales/tracking"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <KanbanTrackingPage />
                        </Suspense>
                    }
                />
                <Route
                    path="sales/calculator"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <CalculatorSettingsPage />
                        </Suspense>
                    }
                />

                {/* Team & Tasks */}
                <Route
                    path="tasks"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <TasksPage />
                        </Suspense>
                    }
                />
                <Route
                    path="employees"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <EmployeesPage />
                        </Suspense>
                    }
                />
                <Route
                    path="roles"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <RolesPage />
                        </Suspense>
                    }
                />

                {/* Reports */}
                <Route
                    path="reports"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <ReportsPage />
                        </Suspense>
                    }
                />
                <Route
                    path="reports/sources"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <ReportsPage />
                        </Suspense>
                    }
                />
                <Route
                    path="reports/bookings"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <ReportsPage />
                        </Suspense>
                    }
                />
                <Route
                    path="reports/monthly"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <ReportsPage />
                        </Suspense>
                    }
                />

                {/* CMS Content */}
                <Route
                    path="content/blog"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <BlogPostsPage />
                        </Suspense>
                    }
                />
                <Route
                    path="content/blog-categories"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <BlogCategoriesPage />
                        </Suspense>
                    }
                />
                <Route
                    path="content/partners"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <PartnersPage />
                        </Suspense>
                    }
                />
                <Route
                    path="content/testimonials"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <TestimonialsPage />
                        </Suspense>
                    }
                />
                <Route
                    path="content/faqs"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <FaqsPage />
                        </Suspense>
                    }
                />
                <Route
                    path="content/hero-slides"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <HeroSlidesPage />
                        </Suspense>
                    }
                />
                <Route
                    path="content/designs"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <SettingsPage />
                        </Suspense>
                    }
                />
                <Route
                    path="content/promo-cards"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <SettingsPage />
                        </Suspense>
                    }
                />
                <Route
                    path="content/promo-banners"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <SettingsPage />
                        </Suspense>
                    }
                />
                <Route
                    path="content/finance-steps"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <SettingsPage />
                        </Suspense>
                    }
                />
                <Route
                    path="content/budget-ranges"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <SettingsPage />
                        </Suspense>
                    }
                />
                <Route
                    path="content/home-sections"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <SettingsPage />
                        </Suspense>
                    }
                />
                <Route
                    path="content/translations"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <SettingsPage />
                        </Suspense>
                    }
                />

                {/* System Settings & Modules */}
                <Route
                    path="settings"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <SettingsPage />
                        </Suspense>
                    }
                />
                <Route
                    path="settings/integrations"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <SettingsPage />
                        </Suspense>
                    }
                />
                <Route
                    path="modules"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <ModulesPage />
                        </Suspense>
                    }
                />
                <Route
                    path="updates"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <UpdatesPage />
                        </Suspense>
                    }
                />
                <Route
                    path="ai-assistant"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <AiAssistantPage />
                        </Suspense>
                    }
                />
                <Route
                    path="whatsapp"
                    element={
                        <Suspense fallback={<PageFallback />}>
                            <WhatsAppPage />
                        </Suspense>
                    }
                />

                <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
        </Routes>
    );
};
