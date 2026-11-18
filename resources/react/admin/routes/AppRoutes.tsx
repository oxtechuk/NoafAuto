import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { TasksPage } from '../pages/TasksPage';
import { LeadsPage } from '../pages/LeadsPage';
import { BookingsPage } from '../pages/BookingsPage';
import { CarsPage } from '../pages/CarsPage';
import { EmployeesPage } from '../pages/EmployeesPage';
import { SettingsPage } from '../pages/SettingsPage';
import { ReportsPage } from '../pages/ReportsPage';
import { ModulesPage } from '../pages/ModulesPage';
import { RequireAuth } from '../context/AuthContext';

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
                <Route index element={<DashboardPage />} />
                <Route path="leads" element={<LeadsPage />} />
                <Route path="bookings" element={<BookingsPage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="cars" element={<CarsPage />} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="modules" element={<ModulesPage />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
        </Routes>
    );
};
