import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { TaskService } from './task.service';
import { MemberService } from './member.service';
import { ActivityService } from './activity.service';
import { DashboardStats, Task, TaskStatus, TeamOverviewRow } from '../types';
import { calculateWorkloadPct, getAvailabilityStatus } from '../../shared/utils/workload.util';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private taskService = inject(TaskService);
  private memberService = inject(MemberService);
  private activityService = inject(ActivityService);

  /**
   * Composes GET /api/tasks into the 5 stat cards at the top of the
   * Dashboard. A real backend may prefer to expose this as a single
   * GET /api/dashboard/stats endpoint — swap the implementation below
   * for an http.get() call if/when that exists.
   */
  getStats(): Observable<DashboardStats> {
    return this.taskService.getTasks().pipe(
      map((tasks) => {
        const today = new Date().toDateString();
        return {
          totalTasks: tasks.length,
          inProgress: tasks.filter((t) => t.status === TaskStatus.PROCESSING).length,
          completed: tasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
          blocked: tasks.filter((t) => t.status === TaskStatus.BLOCKED).length,
          dueToday: tasks.filter((t) => t.deadline && new Date(t.deadline).toDateString() === today).length,
        };
      })
    );
  }

  /** Composes members + tasks into the "Team Overview" table rows. */
  getTeamOverview(): Observable<TeamOverviewRow[]> {
    return forkJoin({
      members: this.memberService.getMembers({ isActive: true }),
      tasks: this.taskService.getTasks(),
    }).pipe(
      map(({ members, tasks }) =>
        members.map((member) => {
          const memberTasks = tasks.filter((t) => t.memberId === member._id);
          const active = memberTasks.filter((t) => t.status === TaskStatus.PROCESSING).length;
          const blocked = memberTasks.filter((t) => t.status === TaskStatus.BLOCKED).length;
          const doneToday = memberTasks.filter(
            (t) => t.status === TaskStatus.COMPLETED && isToday(t.updatedAt)
          ).length;
          const workloadPct = calculateWorkloadPct(memberTasks);
          return {
            member,
            active,
            blocked,
            doneToday,
            status: getAvailabilityStatus(workloadPct, blocked),
          };
        })
      )
    );
  }

  getRecentActivity(limit = 5) {
    return this.activityService.getRecentActivity(limit);
  }
}

function isToday(iso?: string): boolean {
  if (!iso) return false;
  return new Date(iso).toDateString() === new Date().toDateString();
}

// Re-export so components don't need to import Task type separately
export type { Task };
