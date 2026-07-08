import { Task, TaskStatus } from '../../core/types';
import { PRIORITY_WEIGHT } from './priority.util';

/**
 * Ceiling of "weighted points" that represents a fully-loaded (100%)
 * engineer. This is a frontend display heuristic, not a backend value —
 * tune it here in one place if the team's real capacity assumptions change.
 */
export const WORKLOAD_CAPACITY_POINTS = 14;

/**
 * Computes a 0-100 workload percentage for a member from their currently
 * active (non-completed) tasks, weighting each task by its priority so
 * that e.g. two Critical tasks push workload up faster than two Low ones.
 */
export function calculateWorkloadPct(activeTasks: Task[]): number {
  const points = activeTasks
    .filter((t) => t.status !== TaskStatus.COMPLETED)
    .reduce((sum, t) => sum + PRIORITY_WEIGHT[t.priority], 0);

  const pct = Math.round((points / WORKLOAD_CAPACITY_POINTS) * 100);
  return Math.max(0, Math.min(100, pct));
}

export function getWorkloadBarClasses(pct: number): string {
  if (pct >= 85) return 'bg-red-600';
  if (pct >= 65) return 'bg-amber-500';
  return 'bg-blue-600';
}

export type AvailabilityStatus = 'Working' | 'Available' | 'Busy';

/**
 * Derives an at-a-glance availability label from workload + blocked count.
 * Blocked work signals the member needs help -> "Busy".
 * High workload with no blockers -> actively "Working".
 * Otherwise -> "Available".
 */
export function getAvailabilityStatus(workloadPct: number, blockedCount: number): AvailabilityStatus {
  if (blockedCount > 0 && workloadPct >= 65) return 'Busy';
  if (workloadPct >= 40) return 'Working';
  return 'Available';
}

export function getAvailabilityBadgeClasses(status: AvailabilityStatus): string {
  switch (status) {
    case 'Working':
      return 'bg-blue-600 text-white';
    case 'Busy':
      return 'bg-amber-100 text-amber-700';
    case 'Available':
    default:
      return 'bg-emerald-100 text-emerald-700';
  }
}
