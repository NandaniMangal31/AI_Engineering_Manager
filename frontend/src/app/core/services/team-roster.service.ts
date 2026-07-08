import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, Observable } from 'rxjs';
import { MemberService } from './member.service';
import { TaskService } from './task.service';
import { TaskStatus, TeamMemberWorkload, ThroughputPoint } from '../types';
import { calculateWorkloadPct, getAvailabilityStatus } from '../../shared/utils/workload.util';
import { API_BASE_URL } from '../api.config';

@Injectable({ providedIn: 'root' })
export class TeamRosterService {
  private memberService = inject(MemberService);
  private taskService = inject(TaskService);
  private http = inject(HttpClient);

  /** Composes GET /api/members + GET /api/tasks into the Team page cards. */
  getWorkloads(teamId?: string): Observable<TeamMemberWorkload[]> {
    return forkJoin({
      members: this.memberService.getMembers({ teamId, isActive: true }),
      tasks: this.taskService.getTasks({ teamId }),
    }).pipe(
      map(({ members, tasks }) =>
        members.map((member) => {
          const memberTasks = tasks.filter((t) => t.memberId === member._id);
          const current = memberTasks.filter((t) => t.status !== TaskStatus.COMPLETED).length;
          const today = memberTasks.filter((t) => isToday(t.createdAt)).length;
          const blocked = memberTasks.filter((t) => t.status === TaskStatus.BLOCKED).length;
          const workloadPct = calculateWorkloadPct(memberTasks);
          return {
            member,
            current,
            today,
            blocked,
            workloadPct,
            status: getAvailabilityStatus(workloadPct, blocked),
          };
        })
      )
    );
  }

  /**
   * GET /api/teams/:id/throughput — daily completed-vs-capacity counts for
   * the "Weekly Throughput" chart. Assumes a dedicated reporting endpoint
   * since the raw `tasks` collection would need to be aggregated by day
   * server-side for this to be efficient at scale.
   */
  getWeeklyThroughput(teamId?: string): Observable<ThroughputPoint[]> {
    // TODO: Inject HttpClient and call Express API: GET /api/teams/:id/throughput
    return this.http.get<ThroughputPoint[]>(`${API_BASE_URL}/teams/${teamId ?? 'me'}/throughput`);
  }
}

function isToday(iso?: string): boolean {
  if (!iso) return false;
  return new Date(iso).toDateString() === new Date().toDateString();
}
