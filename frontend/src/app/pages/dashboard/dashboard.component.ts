import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { TopbarComponent } from '../../shared/topbar/topbar.component';
import { DashboardService } from '../../core/services/dashboard.service';
import { ActivityService } from '../../core/services/activity.service';
import { StandupService } from '../../core/services/standup.service';
import { MemberService } from '../../core/services/member.service';
import { Activity, DashboardSummary, Member, MemberStats, Standup } from '../../core/models/models';
import { initials, avatarColor, BADGE_STYLES } from '../../core/util/badge.util';

interface MemberRow extends Member {
  stats?: MemberStats;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, TopbarComponent],
  template: `
 <app-topbar
  title="Dashboard"
  searchPlaceholder="Search tasks, teams, or summaries..."
  [showSlackButton]="true"
  (slackConnect)="connectSlack()">
</app-topbar>

    <div class="page">
      <ng-container *ngIf="!loading; else loadingTpl">

        <div class="stat-grid" *ngIf="summary as s">
          <div class="stat-card">
            <div class="stat-label">Total Tasks</div>
            <div class="stat-value">{{ s.totalTasks }}</div>
            <div class="stat-hint up" *ngIf="s.taskGrowth">{{ s.taskGrowth > 0 ? '+' : '' }}{{ s.taskGrowth }}%</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">In Progress</div>
            <div class="stat-value">{{ s.inProgress }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Completed</div>
            <div class="stat-value">{{ s.completed }}</div>
            <div class="stat-hint up" *ngIf="s.completedTodayDelta">+{{ s.completedTodayDelta }} today</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Blocked</div>
            <div class="stat-value danger">{{ s.blocked }}</div>
            <div class="stat-hint danger" *ngIf="s.blocked">CRITICAL</div>
          </div>
          <div class="stat-card accent">
            <div class="stat-label">Due Today</div>
            <div class="stat-value">{{ s.dueToday }}</div>
            <a routerLink="/tasks" class="stat-link">View list</a>
          </div>
        </div>

        <div class="row">
          <div class="card standup-card">
            <div class="card-head">
              <h3>Today's Stand-up Summary</h3>
              <a routerLink="/standup-summary" class="btn-primary">View Original Stand-up</a>
            </div>

            <div class="standup-body" *ngIf="latestStandup; else noStandup">
              <p class="standup-text">{{ latestStandup.message | slice: 0:420 }}<span *ngIf="(latestStandup.message?.length || 0) > 420">…</span></p>
              <div class="standup-meta">
                <span class="src-badge">{{ latestStandup.source || 'Manual' }}</span>
                <span>{{ latestStandup.createdAt | date: 'medium' }}</span>
              </div>
            </div>
            <ng-template #noStandup>
              <p class="empty">No stand-ups have been submitted yet. Paste one from the Stand-up Summary page or connect Slack in Integrations.</p>
            </ng-template>
          </div>

          <div class="card activity-card">
            <div class="card-head">
              <h3>Recent Activity</h3>
            </div>
            <div class="activity-list" *ngIf="activities.length; else noActivity">
              <div class="activity-item" *ngFor="let a of activities">
                <div class="activity-dot" [ngClass]="a.activityType?.toLowerCase()"></div>
                <div class="activity-body">
                  <div class="activity-msg">{{ a.message || (a.activityType + ' — ' + (a.currentStatus || '')) }}</div>
                  <div class="activity-time">{{ a.createdAt | date: 'short' }}</div>
                </div>
              </div>
            </div>
            <ng-template #noActivity>
              <p class="empty">No activity recorded yet.</p>
            </ng-template>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <h3>Team Overview</h3>
            <a routerLink="/team" class="link">Manage Team →</a>
          </div>

          <table class="table" *ngIf="members.length; else noMembers">
            <thead>
              <tr>
                <th>Member</th>
                <th>Active</th>
                <th>Blocked</th>
                <th>Done Today</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let m of members">
                <td class="member-cell">
                  <div class="avatar" [style.background]="avatarColor(m.name)">{{ initials(m.name) }}</div>
                  <div>
                    <div class="member-name">{{ m.name }}</div>
                    <div class="member-role">{{ m.role }}</div>
                  </div>
                </td>
                <td>{{ m.stats?.current ?? '—' }}</td>
                <td [class.danger-text]="(m.stats?.blocked || 0) > 0">{{ m.stats?.blocked ?? '—' }}</td>
                <td>{{ m.stats?.doneToday ?? '—' }}</td>
              </tr>
            </tbody>
          </table>
          <ng-template #noMembers>
            <p class="empty">No team members yet. They'll appear automatically once a stand-up is processed.</p>
          </ng-template>
        </div>

      </ng-container>

      <ng-template #loadingTpl>
        <p class="empty">Loading dashboard…</p>
      </ng-template>

      <p class="error" *ngIf="error">{{ error }}</p>
    </div>
  `,
  styles: [`
    .page { padding: 24px 28px 60px; display: flex; flex-direction: column; gap: 20px; }

    .stat-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; }
    .stat-card {
      background: #fff; border: 1px solid #E7EAF2; border-radius: 14px; padding: 16px 18px;
      display: flex; flex-direction: column; gap: 6px; min-height: 92px;
    }
    .stat-card.accent { border-color: #2554E8; }
    .stat-label { font-size: 12px; color: #8A93A6; font-weight: 600; }
    .stat-value { font-size: 26px; font-weight: 800; color: #1E2433; }
    .stat-value.danger { color: #D93025; }
    .stat-hint { font-size: 11px; font-weight: 700; }
    .stat-hint.up { color: #0F9D58; }
    .stat-hint.danger { color: #D93025; }
    .stat-link { font-size: 12px; font-weight: 600; color: #2554E8; }

    .row { display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; align-items: start; }

    .card { background: #fff; border: 1px solid #E7EAF2; border-radius: 14px; padding: 20px 22px; }
    .card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .card-head h3 { font-size: 15px; font-weight: 700; }
    .link { font-size: 13px; font-weight: 600; color: #2554E8; }

    .btn-primary {
      background: #2554E8; color: #fff; font-size: 12px; font-weight: 600;
      padding: 8px 14px; border-radius: 8px;
    }

    .standup-body { background: #F5F7FB; border-radius: 10px; padding: 16px; }
    .standup-text { font-size: 14px; line-height: 1.6; color: #333B4D; }
    .standup-meta { display: flex; gap: 10px; margin-top: 10px; font-size: 11px; color: #8A93A6; }
    .src-badge { background: #E8EFFE; color: #2554E8; padding: 2px 8px; border-radius: 999px; font-weight: 700; }

    .activity-list { display: flex; flex-direction: column; gap: 14px; }
    .activity-item { display: flex; gap: 10px; }
    .activity-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; background: #2554E8; flex-shrink: 0; }
    .activity-dot.status_change { background: #0F9D58; }
    .activity-dot.comment { background: #8A93A6; }
    .activity-dot.notification { background: #D97706; }
    .activity-msg { font-size: 13px; color: #333B4D; line-height: 1.5; }
    .activity-time { font-size: 11px; color: #8A93A6; margin-top: 2px; }

    .table { width: 100%; border-collapse: collapse; }
    .table th {
      text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
      color: #8A93A6; padding: 10px 8px; border-bottom: 1px solid #EEF1F7;
    }
    .table td { padding: 12px 8px; border-bottom: 1px solid #F3F5F9; font-size: 13px; }
    .member-cell { display: flex; align-items: center; gap: 10px; }
    .avatar { width: 30px; height: 30px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
    .member-name { font-weight: 600; color: #1E2433; }
    .member-role { font-size: 11px; color: #8A93A6; }
    .danger-text { color: #D93025; font-weight: 700; }

    .empty { font-size: 13px; color: #8A93A6; padding: 12px 0; }
    .error { color: #D93025; font-size: 13px; }

    ${BADGE_STYLES}
  `],
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private activityService = inject(ActivityService);
  private standupService = inject(StandupService);
  private memberService = inject(MemberService);

  loading = true;
  error = '';
  summary: DashboardSummary | null = null;
  activities: Activity[] = [];
  latestStandup: Standup | null = null;
  members: MemberRow[] = [];

  initials = initials;
  avatarColor = avatarColor;

  ngOnInit(): void {
    forkJoin({
      summary: this.dashboardService.getSummary().pipe(catchError(() => of(null))),
      activities: this.activityService.getRecentActivity(6).pipe(catchError(() => of([] as Activity[]))),
      standups: this.standupService.getStandups(1).pipe(catchError(() => of([] as Standup[]))),
      members: this.memberService.getMembers({ isActive: true }).pipe(catchError(() => of([] as Member[]))),
    })
      .pipe(
        switchMap(({ summary, activities, standups, members }) => {
          this.summary = summary;
          this.activities = activities;
          this.latestStandup = standups[0] || null;

          if (!members.length) {
            this.members = [];
            return of([] as MemberRow[]);
          }

          const withStats = members.slice(0, 6).map((m) =>
            this.memberService.getMemberStats(m._id).pipe(
              catchError(() => of(undefined)),
              switchMap((stats) => of({ ...m, stats } as MemberRow))
            )
          );
          return forkJoin(withStats);
        }),
        catchError((err) => {
          this.error = 'Could not load part of the dashboard. Is the backend running on the expected port?';
          return of([] as MemberRow[]);
        })
      )
      .subscribe((rows) => {
        this.members = rows;
        this.loading = false;
      });
  }
  connectSlack(): void {
    window.open(
      'http://localhost:5000/api/slack/install',
      '_blank'
    );
  }
}
