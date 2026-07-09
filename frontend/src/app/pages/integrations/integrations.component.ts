import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { catchError, of } from 'rxjs';

import { TopbarComponent } from '../../shared/topbar/topbar.component';
import { SlackService, SlackChannel } from '../../core/services/slack.service';

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [CommonModule, TopbarComponent],
  template: `
    <app-topbar title="Integrations" searchPlaceholder="Search integrations..."></app-topbar>

    <div class="page">
      <div class="card intro">
        <div>
          <h3>Slack</h3>
          <p class="sub">Connect a workspace so daily stand-ups posted to a channel are pulled in and parsed automatically.</p>
        </div>
        <a class="btn-primary" [href]="installUrl" target="_blank" rel="noopener">Connect Slack</a>
      </div>

      <div class="card">
        <div class="card-head">
          <h3>Channels</h3>
          <button class="btn-ghost" (click)="loadChannels()">Refresh</button>
        </div>

        <p class="error" *ngIf="error">{{ error }}</p>

        <table class="table" *ngIf="channels.length; else emptyTpl">
          <thead><tr><th>Channel</th><th>Members</th><th>Status</th><th></th></tr></thead>
          <tbody>
            <tr *ngFor="let c of channels">
              <td>#{{ c.name }}</td>
              <td>{{ c.memberCount }}</td>
              <td>{{ c.isMember ? 'Bot in channel' : 'Not joined' }}</td>
              <td class="actions">
                <button class="btn-ghost" *ngIf="!c.isMember" (click)="join(c)">Join</button>
                <button class="btn-primary sm" (click)="process(c)" [disabled]="processingId === c.id">
                  {{ processingId === c.id ? 'Processing…' : 'Run Pipeline' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <ng-template #emptyTpl>
          <p class="empty">No channels loaded yet. Connect Slack, then refresh.</p>
        </ng-template>

        <p class="result" *ngIf="lastResult">{{ lastResult }}</p>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 24px 28px 60px; display: flex; flex-direction: column; gap: 20px; }
    .card { background: #fff; border: 1px solid #E7EAF2; border-radius: 14px; padding: 20px 22px; }
    .intro { display: flex; align-items: center; justify-content: space-between; }
    h3 { font-size: 15px; font-weight: 700; }
    .sub { font-size: 13px; color: #8A93A6; margin-top: 4px; max-width: 480px; }
    .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }

    .btn-primary {
      background: #2554E8; color: #fff; border: none; font-size: 13px; font-weight: 600;
      padding: 10px 18px; border-radius: 9px; display: inline-block;
    }
    .btn-primary.sm { padding: 7px 12px; font-size: 12px; }
    .btn-primary:disabled { opacity: .6; }
    .btn-ghost {
      background: #F2F5FC; border: none; color: #2554E8; font-size: 12px; font-weight: 700;
      padding: 7px 12px; border-radius: 8px;
    }

    .table { width: 100%; border-collapse: collapse; }
    .table th { text-align: left; font-size: 11px; text-transform: uppercase; color: #8A93A6; padding: 10px 8px; border-bottom: 1px solid #EEF1F7; }
    .table td { padding: 12px 8px; border-bottom: 1px solid #F3F5F9; font-size: 13px; }
    .actions { display: flex; gap: 8px; }

    .empty { font-size: 13px; color: #8A93A6; padding: 12px 0; }
    .error { color: #D93025; font-size: 12px; margin-bottom: 10px; }
    .result { margin-top: 14px; font-size: 13px; color: #0F9D58; }
  `],
})
export class IntegrationsComponent implements OnInit {
  private slackService = inject(SlackService);

  installUrl = this.slackService.getInstallUrl();
  channels: SlackChannel[] = [];
  error = '';
  processingId = '';
  lastResult = '';

  ngOnInit(): void {
    this.loadChannels();
  }

  loadChannels(): void {
    this.error = '';
    this.slackService.getChannels().pipe(
      catchError((err) => {
        this.error = err?.error?.error || 'Could not load channels. Make sure Slack is connected.';
        return of({ channels: [] as SlackChannel[] });
      })
    ).subscribe((res) => (this.channels = res.channels));
  }

  join(c: SlackChannel): void {
    this.slackService.joinChannel(c.id).subscribe(() => this.loadChannels());
  }

  process(c: SlackChannel): void {
    this.processingId = c.id;
    this.lastResult = '';
    this.slackService.processChannel(c.id).subscribe({
      next: (res) => {
        this.processingId = '';
        this.lastResult = `Processed #${c.name}: ${res.processedCount ?? 0} message(s), ${res.savedTaskCount ?? 0} task(s) saved.`;
      },
      error: (err) => {
        this.processingId = '';
        this.error = err?.error?.error || 'Pipeline failed.';
      },
    });
  }
}
