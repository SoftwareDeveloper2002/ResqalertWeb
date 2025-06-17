import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { Reports } from './reports/reports';
import { AdminPanel } from './admin-panel/admin-panel'; // ✅ Import your login component

export const routes: Routes = [
  { path: '', redirectTo: 'admin-panel', pathMatch: 'full' },
  { path: 'admin-panel', component: AdminPanel }, // ✅ Add this line
  { path: 'dashboard', component: Dashboard },
  { path: 'reports', component: Reports },
  { path: '**', redirectTo: 'admin-panel' }
];
