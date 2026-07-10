import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-name">TaskStream AI</span>
        <span class="brand-sub">Engineering Lead</span>
      </div>

      <nav class="nav">
        <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
          <span class="dot"></span> Dashboard
        </a>
        <a routerLink="/tasks" routerLinkActive="active" class="nav-item">
          <span class="dot"></span> Tasks
        </a>
        <a routerLink="/standup-summary" routerLinkActive="active" class="nav-item">
          <span class="dot"></span> Stand-up Summary
        </a>
        <a routerLink="/team" routerLinkActive="active" class="nav-item">
          <span class="dot"></span> Team
        </a>
        <a routerLink="/integrations" routerLinkActive="active" class="nav-item">
          <span class="dot"></span> Integrations
        </a>
      </nav>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 240px;
      min-height: 100vh;
      background: #ffffff;
      border-right: 1px solid #E7EAF2;
      display: flex;
      flex-direction: column;
      padding: 24px 16px;
      position: sticky;
      top: 0;
    }
    .brand { padding: 0 8px 28px; }
    .brand-name { display: block; font-size: 19px; font-weight: 800; color: #2554E8; letter-spacing: -0.3px; }
    .brand-sub { display: block; font-size: 12px; color: #8A93A6; margin-top: 2px; }

    .nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .nav-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: 10px;
      font-size: 14px; font-weight: 500; color: #4B5468;
      transition: background .15s ease, color .15s ease;
    }
    .nav-item:hover { background: #F2F5FC; }
    .nav-item.active { background: #EAF0FE; color: #2554E8; font-weight: 600; }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .55; }

    .footer {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 8px; border-top: 1px solid #EEF1F7; margin-top: 12px;
    }
    .avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: #2554E8; color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700;
    }
    .name { font-size: 13px; font-weight: 600; color: #1E2433; }
    .role { font-size: 11px; color: #8A93A6; }
  `],
})
export class SidebarComponent {}
