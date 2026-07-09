import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { TopbarComponent } from '../../shared/topbar/topbar.component';
import { MemberService } from '../../core/services/member.service';
import { TeamService } from '../../core/services/team.service';
import { Member, MemberStats, Team, ThroughputPoint } from '../../core/models/models';
import { initials, avatarColor } from '../../core/util/badge.util';

interface MemberCard extends Member {
  stats: MemberStats;
}

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [CommonModule, FormsModule, TopbarComponent],
  template: `
    <app-topbar title="Team" searchPlaceholder="Find a team member..."></app-topbar>

    <div class="page">
      <div class="head-row">
        <div>
          <h2>Engineering Squad</h2>
          <p class="sub">Real-time workload and availability overview.</p>
        </div>
        <select *ngIf="teams.length" [(ngModel)]="selectedTeamId" (ngModelChange)="loadMembers()">
          <option value="">All Teams</option>
          <option *ngFor="let t of teams" [value]="t._id">{{ t.name }}</option>
        </select>
      </div>

      <div class="cards-grid" *ngIf="members.length; else noMembers">
        <div class="member-card" *ngFor="let m of members">
          <div class="card-top">
            <div class="avatar" [style.background]="avatarColor(m.name)">{{ initials(m.name) }}</div>
            <div class="who">
              <div class="name">{{ m.name }}</div>
              <div class="role">{{ m.role }}</div>
            </div>
          </div>

          <div class="metrics">
            <div><span class="label">Current</span><span class="value">{{ m.stats.current }}</span></div>
            <div><span class="label">Blocked</span><span class="value" [class.danger]="m.stats.blocked > 0">{{ m.stats.blocked }}</span></div>
            <div><span class="label">Done Today</span><span class="value">{{ m.stats.doneToday }}</span></div>
          </div>

          <div class="workload">
            <div class="workload-head"><span>Workload</span><span>{{ m.stats.workloadPercent }}%</span></div>
            <div class="bar"><div class="fill" [style.width.%]="m.stats.workloadPercent" [class.hot]="m.stats.workloadPercent > 80"></div></div>
          </div>
        </div>
      </div>
      <ng-template #noMembers>
        <p class="empty">No team members found for this filter.</p>
      </ng-template>

      <div class="card throughput-card" *ngIf="selectedTeamId">
        <div class="card-head"><h3>Weekly Throughput</h3></div>
        <div class="chart" *ngIf="throughput.length; else noThroughput">
          <div class="chart-col" *ngFor="let p of throughput">
            <div class="chart-bar" [style.height.px]="barHeight(p.completed)"></div>
            <span class="chart-day">{{ p.day }}</span>
          </div>
        </div>
        <ng-template #noThroughput>
          <p class="empty">No completed tasks in the last 7 days.</p>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 24px 28px 60px; display: flex; flex-direction: column; gap: 22px; }
    .head-row { display: flex; align-items: center; justify-content: space-between; }
    .head-row h2 { font-size: 20px; font-weight: 800; }
    .sub { font-size: 13px; color: #8A93A6; margin-top: 4px; }
    select {
      border: 1px solid #E1E5EF; background: #fff; border-radius: 8px;
      padding: 9px 12px; font-size: 13px; color: #333B4D;
    }

    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .member-card { background: #fff; border: 1px solid #E7EAF2; border-radius: 14px; padding: 18px; }
    .card-top { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .avatar { width: 44px; height: 44px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; }
    .name { font-size: 15px; font-weight: 700; color: #1E2433; }
    .role { font-size: 12px; color: #8A93A6; }

    .metrics { display: flex; justify-content: space-between; margin-bottom: 16px; }
    .metrics div { display: flex; flex-direction: column; align-items: center; gap: 2px; }
    .label { font-size: 10px; text-transform: uppercase; color: #8A93A6; letter-spacing: .03em; }
    .value { font-size: 17px; font-weight: 700; color: #1E2433; }
    .value.danger { color: #D93025; }

    .workload-head { display: flex; justify-content: space-between; font-size: 12px; color: #4B5468; margin-bottom: 6px; }
    .bar { height: 6px; background: #EEF1F7; border-radius: 999px; overflow: hidden; }
    .fill { height: 100%; background: #2554E8; border-radius: 999px; }
    .fill.hot { background: #D93025; }

    .card { background: #fff; border: 1px solid #E7EAF2; border-radius: 14px; padding: 20px; }
    .card-head h3 { font-size: 15px; font-weight: 700; margin-bottom: 14px; }
    .chart { display: flex; align-items: flex-end; gap: 18px; height: 160px; padding-top: 10px; }
    .chart-col { display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; justify-content: flex-end; }
    .chart-bar { width: 100%; max-width: 40px; background: #2554E8; border-radius: 6px 6px 0 0; min-height: 4px; }
    .chart-day { font-size: 11px; color: #8A93A6; }

    .empty { font-size: 13px; color: #8A93A6; padding: 12px 0; }
  `],
})
export class TeamComponent implements OnInit {
  private memberService = inject(MemberService);
  private teamService = inject(TeamService);

  teams: Team[] = [];
  members: MemberCard[] = [];
  throughput: ThroughputPoint[] = [];
  selectedTeamId = '';

  initials = initials;
  avatarColor = avatarColor;

  ngOnInit(): void {
    this.teamService
      .getTeams()
      .pipe(catchError(() => of([])))
      .subscribe((teams) => {
        this.teams = teams;
        this.loadMembers();
      });
  }

  loadMembers(): void {
    this.memberService
      .getMembers({ isActive: true, teamId: this.selectedTeamId || undefined })
      .pipe(
        switchMap((members) => {
          if (!members.length) return of([] as MemberCard[]);
          const withStats = members.map((m) =>
            this.memberService.getMemberStats(m._id).pipe(
              catchError(() => of({ memberId: m._id, current: 0, blocked: 0, doneToday: 0, workloadPercent: 0 } as MemberStats)),
              switchMap((stats) => of({ ...m, stats } as MemberCard))
            )
          );
          return forkJoin(withStats);
        }),
        catchError(() => of([] as MemberCard[]))
      )
      .subscribe((members) => (this.members = members));

    if (this.selectedTeamId) {
      this.teamService
        .getTeamThroughput(this.selectedTeamId)
        .pipe(catchError(() => of([])))
        .subscribe((points) => (this.throughput = points));
    } else {
      this.throughput = [];
    }
  }

  barHeight(completed: number): number {
    const max = Math.max(...this.throughput.map((p) => p.completed), 1);
    return Math.max(4, Math.round((completed / max) * 130));
  }
}
