import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'tasks',
    loadComponent: () => import('./pages/tasks/tasks.component').then((m) => m.TasksComponent),
  },
  {
    path: 'standup-summary',
    loadComponent: () =>
      import('./pages/standup-summary/standup-summary.component').then((m) => m.StandupSummaryComponent),
  },
  {
    path: 'team',
    loadComponent: () => import('./pages/team/team.component').then((m) => m.TeamComponent),
  },
  {
    path: 'integrations',
    loadComponent: () => import('./pages/integrations/integrations.component').then((m) => m.IntegrationsComponent),
  },
  { path: '**', redirectTo: 'dashboard' },
];
