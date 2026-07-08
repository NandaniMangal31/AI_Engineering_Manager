import { Task, TaskStatus, WorkflowStage } from '../../core/types';

export interface StatusDisplay {
  label: string;
  classes: string; // Tailwind classes for the pill
  dotClasses?: string;
}

/**
 * Derives the fine-grained display status shown in the UI ("To Do",
 * "In Progress", "Review", "Blocked", "Completed") from the two schema
 * fields that actually exist: `status` and `workflowStage`.
 *
 * BLOCKED and COMPLETED are terminal/interrupt states and always win,
 * regardless of workflow stage. Otherwise the stage decides the label.
 */
export function getTaskDisplayStatus(task: Pick<Task, 'status' | 'workflowStage'>): StatusDisplay {
  if (task.status === TaskStatus.BLOCKED) {
    return {
      label: 'Blocked',
      classes: 'bg-red-600 text-white',
    };
  }

  if (task.status === TaskStatus.COMPLETED) {
    return {
      label: 'Completed',
      classes: 'bg-slate-100 text-slate-500',
    };
  }

  // status === PROCESSING -> use workflowStage for nuance
  switch (task.workflowStage) {
    case WorkflowStage.REVIEW:
      return { label: 'Review', classes: 'bg-slate-100 text-slate-600' };
    case WorkflowStage.QA:
      return { label: 'In Progress', classes: 'bg-blue-600 text-white' };
    case WorkflowStage.PRODUCTION:
      return { label: 'In Progress', classes: 'bg-blue-600 text-white' };
    case WorkflowStage.DEVELOPMENT:
    default:
      return { label: 'To Do', classes: 'bg-slate-100 text-slate-600' };
  }
}
