import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TaskUpdate } from '../types';
import { API_BASE_URL } from '../api.config';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/activities`;

  /** GET /api/activities/recent?limit= — feeds the Dashboard "Recent Activity" panel */
  getRecentActivity(limit = 10): Observable<TaskUpdate[]> {
    // TODO: Inject HttpClient and call Express API: GET /api/activities/recent
    return this.http.get<TaskUpdate[]>(`${this.baseUrl}/recent`, { params: { limit: String(limit) } });
  }

  /** GET /api/activities?taskId= — full timeline for a single task */
  getTaskActivity(taskId: string): Observable<TaskUpdate[]> {
    // TODO: Inject HttpClient and call Express API: GET /api/activities
    return this.http.get<TaskUpdate[]>(this.baseUrl, { params: { taskId } });
  }

  /** POST /api/activities — e.g. adding a manual comment */
  logActivity(payload: Partial<TaskUpdate>): Observable<TaskUpdate> {
    // TODO: Inject HttpClient and call Express API: POST /api/activities
    return this.http.post<TaskUpdate>(this.baseUrl, payload);
  }
}
