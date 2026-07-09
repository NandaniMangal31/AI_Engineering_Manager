import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-topbar',
  standalone: true,
  template: `
    <header class="topbar">
      <h1>{{ title }}</h1>
      <div class="search">
        <span class="icon">search</span>
        <input type="text" [placeholder]="searchPlaceholder" />
      </div>
    </header>
  `,
  styles: [`
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 28px; background: #ffffff; border-bottom: 1px solid #E7EAF2;
    }
    h1 { font-size: 20px; font-weight: 700; color: #1E2433; }
    .search {
      display: flex; align-items: center; gap: 8px;
      background: #F2F5FC; border-radius: 10px; padding: 8px 14px; width: 320px;
    }
    .search .icon { font-size: 12px; color: #8A93A6; }
    .search input {
      border: none; background: transparent; outline: none; width: 100%;
      font-size: 13px; color: #1E2433;
    }
  `],
})
export class TopbarComponent {
  @Input() title = '';
  @Input() searchPlaceholder = 'Search...';
}
