import { TaskPriority } from '../../core/types';

export interface PriorityDisplay {
  label: string;
  classes: string;
  dotClasses: string;
}

/**
 * Maps schema priority values to the display labels used in the
 * screenshots (Urgent / High / Normal) plus their pill styling.
 */
export function getPriorityDisplay(priority: TaskPriority): PriorityDisplay {
  switch (priority) {
    case TaskPriority.CRITICAL:
      return { label: 'Urgent', classes: 'text-red-600', dotClasses: 'bg-red-600' };
    case TaskPriority.HIGH:
      return { label: 'High', classes: 'text-amber-600', dotClasses: 'bg-amber-500' };
    case TaskPriority.MEDIUM:
      return { label: 'Normal', classes: 'text-slate-500', dotClasses: 'bg-slate-400' };
    case TaskPriority.LOW:
    default:
      return { label: 'Low', classes: 'text-slate-400', dotClasses: 'bg-slate-300' };
  }
}

/**
 * Relative "weight" of a priority level, used to weight workload
 * calculations so a Critical task counts for more than a Low one.
 * Tuned so a fully-loaded engineer (a handful of Critical/High tasks)
 * lands close to 100%.
 */
export const PRIORITY_WEIGHT: Record<TaskPriority, number> = {
  [TaskPriority.CRITICAL]: 4,
  [TaskPriority.HIGH]: 3,
  [TaskPriority.MEDIUM]: 2,
  [TaskPriority.LOW]: 1,
};
