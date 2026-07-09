import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Task } from '../models/models';

export interface TaskFilter {
  memberId?: string;
  status?: string;
  priority?: string;
  standupId?: string;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/tasks`;

  getTasks(filter: TaskFilter = {}): Observable<Task[]> {
    let params = new HttpParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value) params = params.set(key, value);
    });
    return this.http.get<Task[]>(this.base, { params });
  }

  getTaskById(id: string): Observable<Task> {
    return this.http.get<Task>(`${this.base}/${id}`);
  }

  createTask(payload: Partial<Task> & { memberId: string; title: string }): Observable<Task> {
    return this.http.post<Task>(this.base, payload);
  }

  updateTaskStatus(id: string, status: string): Observable<Task> {
    return this.http.patch<Task>(`${this.base}/${id}/status`, { status });
  }
}
