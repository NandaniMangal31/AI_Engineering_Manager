import { Component, Input } from '@angular/core';
import { Task } from '../../../core/types';
import { getTaskDisplayStatus } from '../../utils/task-status.util';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span
      class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
      [class]="display.classes"
    >
      {{ display.label }}
    </span>
  `,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: Task['status'];
  @Input({ required: true }) workflowStage!: Task['workflowStage'];

  get display() {
    return getTaskDisplayStatus({ status: this.status, workflowStage: this.workflowStage });
  }
}
