import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { Reports } from './reports/reports';
import { Feedback } from './feedback/feedback';
import { AdminPanel } from './admin-panel/admin-panel';
import { RoleGuard } from './guards/role-guard';
import { MobileApp } from './mobile-app/mobile-app';

export const routes: Routes = [
  { path: '', redirectTo: 'admin-panel', pathMatch: 'full' },
  { path: 'admin-panel', component: AdminPanel },
  { path: 'dashboard', component: Dashboard },
  { path: 'reports', component: Reports },

  // Protected Feedback route
  {
    path: 'feedback',
    component: Feedback,
    canActivate: [RoleGuard],
    data: { expectedRole: 'SA' }
  },
  {
    path: 'app',
    component: MobileApp,
    canActivate: [RoleGuard],
    data: { expectedRole: 'SA' }
  },

  // Dynamically loaded Settings route
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings').then(m => m.Settings)
  },

  { path: '**', redirectTo: 'admin-panel' }
];
