import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule], 
  template: `
    <header class="topbar">

      <h1>{{ title }}</h1>

      <div class="actions">

        <div class="search">
          <span class="icon">search</span>
          <input
            type="text"
            [placeholder]="searchPlaceholder" />
        </div>

        <button
          *ngIf="showSlackButton"
          class="slack-btn"
          (click)="slackConnect.emit()">
          Connect to Slack
        </button>

      </div>

    </header>
  `,
  styles: [`
    .topbar {
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:20px 28px;
      background:#fff;
      border-bottom:1px solid #E7EAF2;
    }

    h1{
      font-size:20px;
      font-weight:700;
      color:#1E2433;
    }

    .actions{
      display:flex;
      align-items:center;
      gap:16px;
    }

    .search{
      display:flex;
      align-items:center;
      gap:8px;
      background:#F2F5FC;
      border-radius:10px;
      padding:8px 14px;
      width:320px;
    }

    .search input{
      border:none;
      outline:none;
      background:transparent;
      width:100%;
    }

    .slack-btn{
      background:#4A154B;
      color:#fff;
      border:none;
      border-radius:8px;
      padding:10px 16px;
      cursor:pointer;
      font-weight:600;
    }

    .slack-btn:hover{
      background:#611f69;
    }
  `]
})
export class TopbarComponent {

  @Input() title = '';

  @Input() searchPlaceholder = 'Search...';

  @Input() showSlackButton = false;

  @Output() slackConnect = new EventEmitter<void>();

}