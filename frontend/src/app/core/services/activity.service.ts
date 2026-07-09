import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Activity } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/activities`;

  getRecentActivity(limit = 5): Observable<Activity[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<Activity[]>(`${this.base}/recent`, { params });
  }
}
