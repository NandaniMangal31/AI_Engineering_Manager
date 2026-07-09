import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Standup, Task } from '../models/models';

@Injectable({ providedIn: 'root' })
export class StandupService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/standups`;

  getStandups(limit = 20): Observable<Standup[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<Standup[]>(this.base, { params });
  }

  getStandupById(id: string): Observable<{ standup: Standup; tasks: Task[] }> {
    return this.http.get<{ standup: Standup; tasks: Task[] }>(`${this.base}/${id}`);
  }

  submitManualStandup(rawText: string, memberId?: string): Observable<{ standupId: string; tasksAdded: number }> {
    return this.http.post<{ standupId: string; tasksAdded: number }>(this.base, { rawText, memberId });
  }
}
