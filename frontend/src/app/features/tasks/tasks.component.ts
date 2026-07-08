import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../core/services/task.service';
import { MemberService } from '../../core/services/member.service';
import { Member, Task, TaskPriority, TaskStatus } from '../../core/types';
import { TaskRowComponent, TaskRowViewModel } from '../../shared/components/task-row/task-row.component';
import { SkeletonTableComponent } from '../../shared/components/skeleton/skeleton.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';

type SortKey = 'title' | 'priority' | 'status' | 'deadline';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [FormsModule, TaskRowComponent, SkeletonTableComponent, ErrorStateComponent],
  templateUrl: './tasks.component.html',
})
export class TasksComponent implements OnInit {
  private taskService = inject(TaskService);
  private memberService = inject(MemberService);

  readonly TaskStatus = TaskStatus;
  readonly TaskPriority = TaskPriority;

  loading = signal(true);
  error = signal(false);

  tasks = signal<Task[]>([]);
  members = signal<Member[]>([]);

  searchQuery = signal('');
  memberFilter = signal<string>('all');
  statusFilter = signal<TaskStatus | 'all'>('all');
  priorityFilter = signal<TaskPriority | 'all'>('all');
  sortKey = signal<SortKey>('deadline');
  sortAsc = signal(true);

  membersById = computed(() => new Map(this.members().map((m) => [m._id, m])));

  filteredRows = computed<TaskRowViewModel[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const memberFilter = this.memberFilter();
    const statusFilter = this.statusFilter();
    const priorityFilter = this.priorityFilter();
    const byId = this.membersById();

    let rows = this.tasks()
      .filter((t) => (memberFilter === 'all' ? true : t.memberId === memberFilter))
      .filter((t) => (statusFilter === 'all' ? true : t.status === statusFilter))
      .filter((t) => (priorityFilter === 'all' ? true : t.priority === priorityFilter))
      .filter((t) => (query ? t.title.toLowerCase().includes(query) : true))
      .map((task) => this.toRowViewModel(task, byId));

    rows = rows.sort((a, b) => this.compareRows(a, b));
    return rows;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);

    this.memberService.getMembers({ isActive: true }).subscribe({
      next: (members) => this.members.set(members),
      error: () => this.error.set(true),
    });

    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  setSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortAsc.set(!this.sortAsc());
    } else {
      this.sortKey.set(key);
      this.sortAsc.set(true);
    }
  }

  private toRowViewModel(task: Task, byId: Map<string, Member>): TaskRowViewModel {
    const member = byId.get(task.memberId);
    return {
      task,
      assigneeName: member?.name ?? 'Unassigned',
      assigneeInitialsLabel: (member?.name ?? '?').slice(0, 2).toUpperCase(),
      code: `TASK-${task._id.slice(-4).toUpperCase()}`,
      category: task.workflowStage,
    };
  }

  private compareRows(a: TaskRowViewModel, b: TaskRowViewModel): number {
    const dir = this.sortAsc() ? 1 : -1;
    const key = this.sortKey();

    switch (key) {
      case 'title':
        return a.task.title.localeCompare(b.task.title) * dir;
      case 'priority':
        return a.task.priority.localeCompare(b.task.priority) * dir;
      case 'status':
        return a.task.status.localeCompare(b.task.status) * dir;
      case 'deadline':
      default: {
        const aTime = a.task.deadline ? new Date(a.task.deadline).getTime() : Infinity;
        const bTime = b.task.deadline ? new Date(b.task.deadline).getTime() : Infinity;
        return (aTime - bTime) * dir;
      }
    }
  }
}
