import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';

import { TopbarComponent } from '../../shared/topbar/topbar.component';
import { StandupService } from '../../core/services/standup.service';
import { Member, Standup, Task } from '../../core/models/models';
import { statusClass, priorityClass, BADGE_STYLES } from '../../core/util/badge.util';

@Component({
  selector: 'app-standup-summary',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, TopbarComponent],
  template: `
    <app-topbar title="Stand-up Summary" searchPlaceholder="Search summaries..."></app-topbar>

    <div class="page">
      <div class="layout">
        <div class="card list-card">
          <div class="card-head">
            <h3>Recent Stand-ups</h3>
            <button class="btn-ghost" (click)="showPaste = !showPaste">{{ showPaste ? 'Cancel' : '+ Paste New' }}</button>
          </div>

          <div class="paste-box" *ngIf="showPaste">
            <textarea rows="5" [(ngModel)]="pasteText" placeholder="Member: John&#10;Message: Finished the auth flow, working on middleware refactor today.&#10;---"></textarea>
            <p class="error" *ngIf="pasteError">{{ pasteError }}</p>
            <button class="btn-primary" [disabled]="submitting" (click)="submitPaste()">
              {{ submitting ? 'Parsing…' : 'Parse & Save' }}
            </button>
          </div>

          <div class="list" *ngIf="standups.length; else noStandups">
            <button
              class="list-item"
              *ngFor="let s of standups"
              [class.active]="selected?._id === s._id"
              (click)="select(s)"
            >
              <span class="src" [ngClass]="'src-' + (s.source || 'Manual').toLowerCase()">{{ s.source || 'Manual' }}</span>
              <span class="date">{{ s.createdAt | date: 'MMM d, y · h:mm a' }}</span>
              <span class="status" [ngClass]="'p-' + s.parsingStatus.toLowerCase()">{{ s.parsingStatus }}</span>
            </button>
          </div>
          <ng-template #noStandups>
            <p class="empty">No stand-ups yet. Paste one above, or connect Slack from Integrations.</p>
          </ng-template>
        </div>

        <div class="card detail-card">
          <ng-container *ngIf="selected; else pickOne">
            <div class="card-head">
              <h3>Extracted Tasks</h3>
              <span class="count">{{ tasks.length }} task(s)</span>
            </div>

            <table class="table" *ngIf="tasks.length; else noTasks">
              <thead>
                <tr><th>Task Name</th><th>Assigned</th><th>Priority</th><th>Status</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let t of tasks">
                  <td>{{ t.title }}</td>
                  <td>{{ memberName(t) }}</td>
                  <td><span [ngClass]="priorityClass(t.priority)">{{ t.priority }}</span></td>
                  <td><span [ngClass]="statusClass(t.status)">{{ t.status }}</span></td>
                </tr>
              </tbody>
            </table>
            <ng-template #noTasks>
              <p class="empty">No tasks were extracted from this stand-up.</p>
            </ng-template>

            <div class="original">
              <div class="card-head">
                <h3>Original Message</h3>
                <span class="submitter" *ngIf="submitterName">Submitted by {{ submitterName }}</span>
              </div>
              <pre class="raw">{{ selected.message }}</pre>
            </div>
          </ng-container>

          <ng-template #pickOne>
            <p class="empty">Select a stand-up on the left to view its extracted tasks and original message.</p>
          </ng-template>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 24px 28px 60px; }
    .layout { display: grid; grid-template-columns: 340px 1fr; gap: 20px; align-items: start; }

    .card { background: #fff; border: 1px solid #E7EAF2; border-radius: 14px; padding: 20px; }
    .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .card-head h3 { font-size: 15px; font-weight: 700; }
    .count { font-size: 12px; color: #8A93A6; }

    .btn-ghost {
      background: #F2F5FC; border: none; color: #2554E8; font-size: 12px; font-weight: 700;
      padding: 6px 12px; border-radius: 8px;
    }
    .btn-primary {
      background: #2554E8; color: #fff; border: none; font-size: 13px; font-weight: 600;
      padding: 10px 16px; border-radius: 9px; margin-top: 8px;
    }
    .btn-primary:disabled { opacity: .6; }

    .paste-box { margin-bottom: 16px; display: flex; flex-direction: column; }
    .paste-box textarea {
      border: 1px solid #E1E5EF; border-radius: 8px; padding: 10px; font-size: 13px; font-family: inherit; resize: vertical;
    }
    .error { color: #D93025; font-size: 12px; margin-top: 6px; }

    .list { display: flex; flex-direction: column; gap: 8px; max-height: 560px; overflow-y: auto; }
    .list-item {
      display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
      border: 1px solid #EEF1F7; background: #FAFBFD; border-radius: 10px; padding: 10px 12px;
      text-align: left; width: 100%;
    }
    .list-item.active { border-color: #2554E8; background: #EEF3FE; }
    .src { font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 999px; }
    .src-slack { background: #ECE9FE; color: #6E56CF; }
    .src-manual { background: #E8EFFE; color: #2554E8; }
    .src-api { background: #FFF2E3; color: #B65C00; }
    .date { font-size: 12px; color: #4B5468; }
    .status { font-size: 10px; font-weight: 700; color: #8A93A6; }
    .p-completed { color: #0F9D58; }
    .p-failed { color: #D93025; }

    .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .table th {
      text-align: left; font-size: 11px; text-transform: uppercase; color: #8A93A6;
      padding: 10px 8px; border-bottom: 1px solid #EEF1F7;
    }
    .table td { padding: 12px 8px; border-bottom: 1px solid #F3F5F9; font-size: 13px; }

    .original { border-top: 1px solid #EEF1F7; padding-top: 16px; }
    .submitter { font-size: 12px; color: #8A93A6; }
    .raw {
      background: #F5F7FB; border-radius: 10px; padding: 14px; font-family: inherit;
      font-size: 13px; line-height: 1.6; white-space: pre-wrap; color: #333B4D;
    }

    .empty { font-size: 13px; color: #8A93A6; padding: 12px 0; }

    ${BADGE_STYLES}
  `],
})
export class StandupSummaryComponent implements OnInit {
  private standupService = inject(StandupService);

  standups: Standup[] = [];
  selected: Standup | null = null;
  tasks: Task[] = [];

  showPaste = false;
  pasteText = '';
  pasteError = '';
  submitting = false;

  statusClass = statusClass;
  priorityClass = priorityClass;

  get submitterName(): string {
    const s = this.selected?.submittedBy;
    return s && typeof s === 'object' ? (s as Member).name : '';
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.standupService
      .getStandups(20)
      .pipe(catchError(() => of([])))
      .subscribe((standups) => {
        this.standups = standups;
        if (standups.length) this.select(standups[0]);
      });
  }

  select(s: Standup): void {
    this.selected = s;
    this.standupService
      .getStandupById(s._id)
      .pipe(catchError(() => of({ standup: s, tasks: [] as Task[] })))
      .subscribe((res) => {
        this.tasks = res.tasks;
      });
  }

  memberName(t: Task): string {
    return typeof t.memberId === 'object' ? (t.memberId as Member).name : 'Unknown';
  }

  submitPaste(): void {
    if (!this.pasteText.trim()) {
      this.pasteError = 'Paste some stand-up text first.';
      return;
    }
    this.submitting = true;
    this.pasteError = '';
    this.standupService.submitManualStandup(this.pasteText).subscribe({
      next: () => {
        this.submitting = false;
        this.showPaste = false;
        this.pasteText = '';
        this.load();
      },
      error: (err) => {
        this.submitting = false;
        this.pasteError = err?.error?.error || 'Could not parse this stand-up.';
      },
    });
  }
}
