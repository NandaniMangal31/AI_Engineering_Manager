import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  label: string;
  icon: 'dashboard' | 'tasks' | 'standup' | 'team';
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
})
export class SidebarComponent {
  readonly navItems: NavItem[] = [
    { label: 'Dashboard', icon: 'dashboard', route: '/dashboard' },
    { label: 'Tasks', icon: 'tasks', route: '/tasks' },
    { label: 'Stand-up Summary', icon: 'standup', route: '/standup-summary' },
    { label: 'Team', icon: 'team', route: '/team' },
  ];

  // TODO: replace with the signed-in user, e.g. from an AuthService.currentUser() signal
  currentUser = {
    name: 'Alex Rivera',
    role: 'Engineering Lead',
    avatarUrl: '',
  };
}
