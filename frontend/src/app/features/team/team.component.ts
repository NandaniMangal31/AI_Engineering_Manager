import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TeamRosterService } from '../../core/services/team-roster.service';
import { MemberService } from '../../core/services/member.service';
import { TeamMemberWorkload, ThroughputPoint } from '../../core/types';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { SkeletonCardComponent } from '../../shared/components/skeleton/skeleton.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { BarChartComponent, BarChartPoint } from '../../shared/components/bar-chart/bar-chart.component';
import { getAvailabilityBadgeClasses, getWorkloadBarClasses } from '../../shared/utils/workload.util';
import { computeSkillDistribution, SkillDistributionSlice } from '../../shared/utils/skill-distribution.util';

@Component({
  selector: 'app-team',
  standalone: true,
  imports: [RouterLink, AvatarComponent, SkeletonCardComponent, ErrorStateComponent, BarChartComponent],
  templateUrl: './team.component.html',
})
export class TeamComponent implements OnInit {
  private teamRosterService = inject(TeamRosterService);
  private memberService = inject(MemberService);

  loading = signal(true);
  error = signal(false);

  workloads = signal<TeamMemberWorkload[]>([]);
  throughput = signal<ThroughputPoint[]>([]);
  skillDistribution = signal<SkillDistributionSlice[]>([]);

  availableCount = computed(() => this.workloads().filter((w) => w.status === 'Available').length);
  busyCount = computed(() => this.workloads().filter((w) => w.status === 'Busy').length);

  throughputChartData = computed<BarChartPoint[]>(() =>
    this.throughput().map((p) => ({ label: p.day, value: p.completed }))
  );

  getAvailabilityBadgeClasses = getAvailabilityBadgeClasses;
  getWorkloadBarClasses = getWorkloadBarClasses;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);

    this.teamRosterService.getWorkloads().subscribe({
      next: (workloads) => {
        this.workloads.set(workloads);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });

    this.teamRosterService.getWeeklyThroughput().subscribe({
      next: (points) => this.throughput.set(points),
      error: () => this.throughput.set([]),
    });

    this.memberService.getMembers({ isActive: true }).subscribe({
      next: (members) => this.skillDistribution.set(computeSkillDistribution(members)),
      error: () => this.skillDistribution.set([]),
    });
  }
}
