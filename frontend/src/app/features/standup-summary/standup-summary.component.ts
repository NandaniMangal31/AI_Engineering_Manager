import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { StandupService, StandupInsights } from '../../core/services/standup.service';
import { TaskService } from '../../core/services/task.service';
import { MemberService } from '../../core/services/member.service';
import { Member, Standup, StandupMessage, Task } from '../../core/types';
import { TaskRowViewModel } from '../../shared/components/task-row/task-row.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { PriorityBadgeComponent } from '../../shared/components/priority-badge/priority-badge.component';
import { SkeletonCardComponent, SkeletonTableComponent } from '../../shared/components/skeleton/skeleton.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { BarChartComponent, BarChartPoint } from '../../shared/components/bar-chart/bar-chart.component';

@Component({
  selector: 'app-standup-summary',
  standalone: true,
  imports: [
    DatePipe,
    StatusBadgeComponent,
    PriorityBadgeComponent,
    SkeletonCardComponent,
    SkeletonTableComponent,
    ErrorStateComponent,
    BarChartComponent,
  ],
  templateUrl: './standup-summary.component.html',
})
export class StandupSummaryComponent implements OnInit {
  private standupService = inject(StandupService);
  private taskService = inject(TaskService);
  private memberService = inject(MemberService);

  loading = signal(true);
  error = signal(false);

  standup = signal<Standup | null>(null);
  insights = signal<StandupInsights | null>(null);
  extractedTasks = signal<Task[]>([]);
  members = signal<Member[]>([]);
  threadMessages = signal<StandupMessage[]>([]);
  dismissedDuplicateIds = signal<Set<string>>(new Set());

  membersById = computed(() => new Map(this.members().map((m) => [m._id, m])));

  extractedTaskRows = computed<TaskRowViewModel[]>(() => {
    const byId = this.membersById();
    return this.extractedTasks().map((task) => {
      const member = byId.get(task.memberId);
      return {
        task,
        assigneeName: member?.name ?? 'Unassigned',
        assigneeInitialsLabel: (member?.name ?? '?').slice(0, 2).toUpperCase(),
        code: `TASK-${task._id.slice(-4).toUpperCase()}`,
        category: task.workflowStage,
      };
    });
  });

  visibleDuplicates = computed(
    () => this.insights()?.duplicates.filter((d) => !this.dismissedDuplicateIds().has(d._id)) ?? []
  );

  sentimentChartData = computed<BarChartPoint[]>(
    () => this.insights()?.sentimentOverWeek.map((p) => ({ label: p.day, value: p.score })) ?? []
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);

    this.memberService.getMembers().subscribe({ next: (m) => this.members.set(m) });

    this.standupService.getLatestStandup().subscribe({
      next: (standup) => {
        this.standup.set(standup);
        this.fetchDependentData(standup._id);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  private fetchDependentData(standupId: string): void {
    this.standupService.getStandupInsights(standupId).subscribe({
      next: (insights) => {
        this.insights.set(insights);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });

    this.taskService.getTasks({ /* standupId is applied server-side via the standup's own task list */ }).subscribe({
      next: (tasks) => this.extractedTasks.set(tasks.filter((t) => t.standupId === standupId)),
    });

    this.standupService.getStandupMessages(standupId).subscribe({
      next: (messages) => this.threadMessages.set(messages),
    });
  }

  dismissDuplicate(duplicateId: string): void {
    const standupId = this.standup()?._id;
    if (!standupId) return;

    // Optimistic UI update
    this.dismissedDuplicateIds.set(new Set([...this.dismissedDuplicateIds(), duplicateId]));

    this.standupService.dismissDuplicate(standupId, duplicateId).subscribe({
      error: () => {
        // Roll back on failure
        const next = new Set(this.dismissedDuplicateIds());
        next.delete(duplicateId);
        this.dismissedDuplicateIds.set(next);
      },
    });
  }

  exportToJira(taskId: string): void {
    this.taskService.exportToJira(taskId).subscribe();
  }

  memberName(memberId: string): string {
    return this.membersById().get(memberId)?.name ?? 'Unknown';
  }
}
