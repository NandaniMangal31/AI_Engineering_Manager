import { Component, Input } from '@angular/core';
import { TaskPriority } from '../../../core/types';
import { getPriorityDisplay } from '../../utils/priority.util';

@Component({
  selector: 'app-priority-badge',
  standalone: true,
  template: `
    <span class="inline-flex items-center gap-1.5 text-sm font-medium" [class]="display.classes">
      <span class="h-1.5 w-1.5 rounded-full" [class]="display.dotClasses"></span>
      {{ display.label }}
    </span>
  `,
})
export class PriorityBadgeComponent {
  @Input({ required: true }) priority!: TaskPriority;

  get display() {
    return getPriorityDisplay(this.priority);
  }
}
