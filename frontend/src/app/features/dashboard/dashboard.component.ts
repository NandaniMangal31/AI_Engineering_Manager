import { Component, OnInit, inject, signal } from '@angular/core';
import { DashboardService } from '../../core/services/dashboard.service';
import { StandupService, StandupInsights } from '../../core/services/standup.service';
import { DashboardStats, StandupHighlight, TeamOverviewRow, TaskUpdate } from '../../core/types';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { SkeletonCardComponent, SkeletonTableComponent } from '../../shared/components/skeleton/skeleton.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { getAvailabilityBadgeClasses } from '../../shared/utils/workload.util';
import { timeAgo } from '../../shared/utils/time-ago.util';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    StatCardComponent,
    AvatarComponent,
    SkeletonCardComponent,
    SkeletonTableComponent,
    ErrorStateComponent,
  ],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private dashboardService = inject(DashboardService);
  private standupService = inject(StandupService);

  statsLoading = signal(true);
  statsError = signal(false);
  stats = signal<DashboardStats | null>(null);

  summaryLoading = signal(true);
  summaryError = signal(false);
  insights = signal<StandupInsights | null>(null);

  teamLoading = signal(true);
  teamError = signal(false);
  teamOverview = signal<TeamOverviewRow[]>([]);

  activityLoading = signal(true);
  activityError = signal(false);
  recentActivity = signal<TaskUpdate[]>([]);

  getAvailabilityBadgeClasses = getAvailabilityBadgeClasses;
  timeAgo = timeAgo;

  ngOnInit(): void {
    this.loadStats();
    this.loadStandupSummary();
    this.loadTeamOverview();
    this.loadActivity();
  }

  loadStats(): void {
    this.statsLoading.set(true);
    this.statsError.set(false);
    this.dashboardService.getStats().subscribe({
      next: (stats) => {
        this.stats.set(stats);
        this.statsLoading.set(false);
      },
      error: () => {
        this.statsError.set(true);
        this.statsLoading.set(false);
      },
    });
  }

  loadStandupSummary(): void {
    this.summaryLoading.set(true);
    this.summaryError.set(false);
    this.standupService.getLatestStandup().subscribe({
      next: (standup) =>
        this.standupService.getStandupInsights(standup._id).subscribe({
          next: (insights) => {
            this.insights.set(insights);
            this.summaryLoading.set(false);
          },
          error: () => {
            this.summaryError.set(true);
            this.summaryLoading.set(false);
          },
        }),
      error: () => {
        this.summaryError.set(true);
        this.summaryLoading.set(false);
      },
    });
  }

  loadTeamOverview(): void {
    this.teamLoading.set(true);
    this.teamError.set(false);
    this.dashboardService.getTeamOverview().subscribe({
      next: (rows) => {
        this.teamOverview.set(rows);
        this.teamLoading.set(false);
      },
      error: () => {
        this.teamError.set(true);
        this.teamLoading.set(false);
      },
    });
  }

  loadActivity(): void {
    this.activityLoading.set(true);
    this.activityError.set(false);
    this.dashboardService.getRecentActivity(5).subscribe({
      next: (items) => {
        this.recentActivity.set(items);
        this.activityLoading.set(false);
      },
      error: () => {
        this.activityError.set(true);
        this.activityLoading.set(false);
      },
    });
  }

  iconFor(icon: StandupHighlight['icon']): string {
    switch (icon) {
      case 'success':
        return 'text-blue-600';
      case 'warning':
        return 'text-red-500';
      case 'progress':
        return 'text-amber-500';
      case 'shield':
        return 'text-emerald-600';
    }
  }
}
