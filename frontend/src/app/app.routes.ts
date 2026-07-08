import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    title: 'Dashboard · TaskStream AI',
  },
  {
    path: 'tasks',
    loadComponent: () => import('./features/tasks/tasks.component').then((m) => m.TasksComponent),
    title: 'Tasks · TaskStream AI',
  },
  {
    path: 'standup-summary',
    loadComponent: () =>
      import('./features/standup-summary/standup-summary.component').then((m) => m.StandupSummaryComponent),
    title: 'Stand-up Summary · TaskStream AI',
  },
  {
    path: 'team',
    loadComponent: () => import('./features/team/team.component').then((m) => m.TeamComponent),
    title: 'Team · TaskStream AI',
  },
  { path: '**', redirectTo: 'dashboard' },
];
