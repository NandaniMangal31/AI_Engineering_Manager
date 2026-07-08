import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task, TaskPriority, TaskStatus } from '../types';
import { API_BASE_URL } from '../api.config';

export interface TaskQueryParams {
  memberId?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  teamId?: string;
  dueToday?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/tasks`;

  /** GET /api/tasks?memberId=&status=&priority=&teamId= */
  getTasks(params?: TaskQueryParams): Observable<Task[]> {
    // TODO: Inject HttpClient and call Express API: GET /api/tasks
    return this.http.get<Task[]>(this.baseUrl, { params: toHttpParams(params) });
  }

  /** GET /api/tasks/:id */
  getTaskById(id: string): Observable<Task> {
    // TODO: Inject HttpClient and call Express API: GET /api/tasks/:id
    return this.http.get<Task>(`${this.baseUrl}/${id}`);
  }

  /** POST /api/tasks */
  createTask(payload: Partial<Task>): Observable<Task> {
    // TODO: Inject HttpClient and call Express API: POST /api/tasks
    return this.http.post<Task>(this.baseUrl, payload);
  }

  /** PATCH /api/tasks/:id */
  updateTask(id: string, payload: Partial<Task>): Observable<Task> {
    // TODO: Inject HttpClient and call Express API: PATCH /api/tasks/:id
    return this.http.patch<Task>(`${this.baseUrl}/${id}`, payload);
  }

  /** PATCH /api/tasks/:id/status */
  updateTaskStatus(id: string, status: TaskStatus): Observable<Task> {
    // TODO: Inject HttpClient and call Express API: PATCH /api/tasks/:id/status
    return this.http.patch<Task>(`${this.baseUrl}/${id}/status`, { status });
  }

  /** POST /api/tasks/:id/export-jira */
  exportToJira(id: string): Observable<{ jiraKey: string }> {
    // TODO: Inject HttpClient and call Express API: POST /api/tasks/:id/export-jira
    return this.http.post<{ jiraKey: string }>(`${this.baseUrl}/${id}/export-jira`, {});
  }

  /** DELETE /api/tasks/:id */
  deleteTask(id: string): Observable<void> {
    // TODO: Inject HttpClient and call Express API: DELETE /api/tasks/:id
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}

function toHttpParams<T extends object>(obj?: T) {
  if (!obj) return undefined;
  const clean: Record<string, string> = {};
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) clean[k] = String(v);
  });
  return clean;
}
