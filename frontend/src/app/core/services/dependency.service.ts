import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TaskDependency } from '../types';
import { API_BASE_URL } from '../api.config';

@Injectable({ providedIn: 'root' })
export class DependencyService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/dependencies`;

  /** GET /api/dependencies?taskId= — what a given task is blocked by */
  getDependenciesForTask(taskId: string): Observable<TaskDependency[]> {
    // TODO: Inject HttpClient and call Express API: GET /api/dependencies
    return this.http.get<TaskDependency[]>(this.baseUrl, { params: { taskId } });
  }

  /** POST /api/dependencies */
  createDependency(payload: Partial<TaskDependency>): Observable<TaskDependency> {
    // TODO: Inject HttpClient and call Express API: POST /api/dependencies
    return this.http.post<TaskDependency>(this.baseUrl, payload);
  }

  /** DELETE /api/dependencies/:id */
  removeDependency(id: string): Observable<void> {
    // TODO: Inject HttpClient and call Express API: DELETE /api/dependencies/:id
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
