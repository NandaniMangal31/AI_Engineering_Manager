import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Task } from '../../../core/types';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';
import { PriorityBadgeComponent } from '../priority-badge/priority-badge.component';
import { AvatarComponent } from '../avatar/avatar.component';
import { getTaskDisplayStatus } from '../../utils/task-status.util';

export interface TaskRowViewModel {
  task: Task;
  assigneeName: string;
  assigneeInitialsLabel: string; // e.g. "AN" fallback if no avatar image
  code: string; // e.g. "TASK-1024"
  category: string; // e.g. "Auth Module"
}

@Component({
  selector: 'app-task-row',
  standalone: true,
  imports: [RouterLink, DatePipe, StatusBadgeComponent, PriorityBadgeComponent, AvatarComponent],
  template: `
    <tr class="border-b border-slate-100 last:border-0 hover:bg-slate-50">
      <td class="px-6 py-4">
        <a [routerLink]="['/tasks', row.task._id]" class="font-semibold text-blue-700 hover:underline">
          {{ row.task.title }}
        </a>
        <p class="mt-0.5 text-xs text-slate-400">{{ row.code }} &bull; {{ row.category }}</p>
      </td>
      <td class="px-6 py-4">
        <div class="flex items-center gap-2.5">
          <app-avatar [name]="row.assigneeName" size="sm" />
          <span class="text-sm text-slate-700">{{ row.assigneeName }}</span>
        </div>
      </td>
      <td class="px-6 py-4">
        <app-priority-badge [priority]="row.task.priority" />
      </td>
      <td class="px-6 py-4">
        <app-status-badge [status]="row.task.status" [workflowStage]="row.task.workflowStage" />
      </td>
      <td class="px-6 py-4 text-sm text-slate-500">
        {{ row.task.deadline ? (row.task.deadline | date: 'MMM d, y') : '—' }}
      </td>
    </tr>
  `,
})
export class TaskRowComponent {
  @Input({ required: true }) row!: TaskRowViewModel;

  get displayStatus() {
    return getTaskDisplayStatus(this.row.task);
  }
}
