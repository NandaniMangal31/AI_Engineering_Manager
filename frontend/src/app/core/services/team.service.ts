import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Team, ThroughputPoint } from '../models/models';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/teams`;

  getTeams(): Observable<Team[]> {
    return this.http.get<Team[]>(this.base);
  }

  getTeamById(id: string): Observable<Team> {
    return this.http.get<Team>(`${this.base}/${id}`);
  }

  getTeamThroughput(id: string): Observable<ThroughputPoint[]> {
    return this.http.get<ThroughputPoint[]>(`${this.base}/${id}/throughput`);
  }
}
