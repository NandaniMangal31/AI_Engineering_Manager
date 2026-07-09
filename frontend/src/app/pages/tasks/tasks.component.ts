import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';

import { TopbarComponent } from '../../shared/topbar/topbar.component';
import { TaskService } from '../../core/services/task.service';
import { MemberService } from '../../core/services/member.service';
import { Member, Task } from '../../core/models/models';
import { statusClass, statusLabel, priorityClass, initials, avatarColor, BADGE_STYLES } from '../../core/util/badge.util';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, TopbarComponent],
  template: `
    <app-topbar title="Tasks" searchPlaceholder="Search tasks, PRs, or team..."></app-topbar>

    <div class="page">
      <div class="filters">
        <select [(ngModel)]="memberFilter" (ngModelChange)="load()">
          <option value="">All Members</option>
          <option *ngFor="let m of members" [value]="m._id">{{ m.name }}</option>
        </select>
        <select [(ngModel)]="statusFilter" (ngModelChange)="load()">
          <option value="">Status: All</option>
          <option value="PROCESSING">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="BLOCKED">Blocked</option>
        </select>
        <select [(ngModel)]="priorityFilter" (ngModelChange)="load()">
          <option value="">Priority: All</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>
        <div class="spacer"></div>
        <button class="btn-primary" (click)="openCreate()">+ Create Task</button>
      </div>

      <div class="card">
        <table class="table" *ngIf="tasks.length; else emptyTpl">
          <thead>
            <tr>
              <th>Task Name</th>
              <th>Assigned To</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let t of tasks">
              <td>
                <div class="task-title">{{ t.title }}</div>
                <div class="task-sub">{{ t.workflowStage }}</div>
              </td>
              <td>
                <div class="member-cell" *ngIf="memberOf(t) as m">
                  <div class="avatar" [style.background]="avatarColor(m.name)">{{ initials(m.name) }}</div>
                  {{ m.name }}
                </div>
                <span *ngIf="!memberOf(t)">Unassigned</span>
              </td>
              <td><span [ngClass]="priorityClass(t.priority)">{{ t.priority }}</span></td>
              <td>
                <select class="status-select" [ngClass]="statusClass(t.status)" [(ngModel)]="t.status" (ngModelChange)="changeStatus(t, $event)">
                  <option value="PROCESSING">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </td>
              <td>{{ t.deadline ? (t.deadline | date: 'MMM d, y') : '—' }}</td>
            </tr>
          </tbody>
        </table>
        <ng-template #emptyTpl>
          <p class="empty">No tasks match these filters yet.</p>
        </ng-template>
      </div>
    </div>

    <div class="modal-backdrop" *ngIf="showCreate" (click)="showCreate = false">
      <div class="modal" (click)="$event.stopPropagation()">
        <h3>Create Task</h3>

        <label>Title</label>
        <input type="text" [(ngModel)]="newTask.title" placeholder="e.g. Refactor auth middleware" />

        <label>Owner</label>
        <select [(ngModel)]="newTask.memberId">
          <option value="" disabled>Select a member</option>
          <option *ngFor="let m of members" [value]="m._id">{{ m.name }}</option>
        </select>

        <label>Priority</label>
        <select [(ngModel)]="newTask.priority">
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Critical">Critical</option>
        </select>

        <label>Workflow Stage</label>
        <select [(ngModel)]="newTask.workflowStage">
          <option value="DEVELOPMENT">Development</option>
          <option value="QA">QA</option>
          <option value="REVIEW">Review</option>
          <option value="PRODUCTION">Production</option>
        </select>

        <label>Description (optional)</label>
        <textarea [(ngModel)]="newTask.description" rows="3"></textarea>

        <p class="error" *ngIf="createError">{{ createError }}</p>

        <div class="modal-actions">
          <button class="btn-ghost" (click)="showCreate = false">Cancel</button>
          <button class="btn-primary" [disabled]="creating" (click)="submitCreate()">
            {{ creating ? 'Creating…' : 'Create Task' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 24px 28px 60px; display: flex; flex-direction: column; gap: 18px; }

    .filters { display: flex; align-items: center; gap: 12px; }
    .spacer { flex: 1; }
    select {
      border: 1px solid #E1E5EF; background: #fff; border-radius: 8px;
      padding: 9px 12px; font-size: 13px; color: #333B4D;
    }

    .btn-primary {
      background: #2554E8; color: #fff; border: none; font-size: 13px; font-weight: 600;
      padding: 10px 18px; border-radius: 9px;
    }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-ghost {
      background: #fff; border: 1px solid #E1E5EF; color: #333B4D; font-size: 13px; font-weight: 600;
      padding: 10px 18px; border-radius: 9px;
    }

    .card { background: #fff; border: 1px solid #E7EAF2; border-radius: 14px; overflow: hidden; }
    .table { width: 100%; border-collapse: collapse; }
    .table th {
      text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .04em;
      color: #8A93A6; padding: 14px 20px; border-bottom: 1px solid #EEF1F7; background: #FAFBFD;
    }
    .table td { padding: 16px 20px; border-bottom: 1px solid #F3F5F9; font-size: 13px; vertical-align: middle; }
    .task-title { font-weight: 600; color: #1E2433; }
    .task-sub { font-size: 11px; color: #8A93A6; margin-top: 2px; }
    .member-cell { display: flex; align-items: center; gap: 8px; }
    .avatar { width: 26px; height: 26px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }

    .status-select {
      border: none; font-weight: 600; padding: 5px 10px; border-radius: 999px; font-size: 12px;
      -webkit-appearance: none; appearance: none;
    }

    .empty { padding: 40px; text-align: center; color: #8A93A6; font-size: 13px; }
    .error { color: #D93025; font-size: 12px; }

    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(20,24,36,.45);
      display: flex; align-items: center; justify-content: center; z-index: 50;
    }
    .modal {
      background: #fff; border-radius: 16px; padding: 24px; width: 420px;
      display: flex; flex-direction: column; gap: 6px;
    }
    .modal h3 { font-size: 16px; font-weight: 700; margin-bottom: 10px; }
    .modal label { font-size: 12px; font-weight: 600; color: #4B5468; margin-top: 8px; }
    .modal input, .modal select, .modal textarea {
      border: 1px solid #E1E5EF; border-radius: 8px; padding: 10px 12px; font-size: 13px; font-family: inherit;
    }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }

    ${BADGE_STYLES}
  `],
})
export class TasksComponent implements OnInit {
  private taskService = inject(TaskService);
  private memberService = inject(MemberService);

  tasks: Task[] = [];
  members: Member[] = [];

  memberFilter = '';
  statusFilter = '';
  priorityFilter = '';

  showCreate = false;
  creating = false;
  createError = '';
  newTask: { title: string; memberId: string; priority: string; workflowStage: string; description: string } = {
    title: '', memberId: '', priority: 'Medium', workflowStage: 'DEVELOPMENT', description: '',
  };

  statusClass = statusClass;
  statusLabel = statusLabel;
  priorityClass = priorityClass;
  initials = initials;
  avatarColor = avatarColor;

  ngOnInit(): void {
    this.memberService.getMembers({ isActive: true }).pipe(catchError(() => of([]))).subscribe((m) => (this.members = m));
    this.load();
  }

  load(): void {
    this.taskService
      .getTasks({ memberId: this.memberFilter, status: this.statusFilter, priority: this.priorityFilter })
      .pipe(catchError(() => of([])))
      .subscribe((tasks) => (this.tasks = tasks));
  }

  memberOf(t: Task): Member | null {
    return typeof t.memberId === 'object' ? (t.memberId as Member) : null;
  }

  changeStatus(t: Task, status: string): void {
    this.taskService.updateTaskStatus(t._id, status).subscribe();
  }

  openCreate(): void {
    this.createError = '';
    this.newTask = { title: '', memberId: '', priority: 'Medium', workflowStage: 'DEVELOPMENT', description: '' };
    this.showCreate = true;
  }

  submitCreate(): void {
    if (!this.newTask.title.trim() || !this.newTask.memberId) {
      this.createError = 'Title and owner are required.';
      return;
    }
    this.creating = true;
    this.taskService
      .createTask({
        title: this.newTask.title,
        memberId: this.newTask.memberId,
        priority: this.newTask.priority as Task['priority'],
        workflowStage: this.newTask.workflowStage as Task['workflowStage'],
        description: this.newTask.description || null,
      })
      .subscribe({
        next: () => {
          this.creating = false;
          this.showCreate = false;
          this.load();
        },
        error: (err) => {
          this.creating = false;
          this.createError = err?.error?.error || 'Could not create task.';
        },
      });
  }
}
