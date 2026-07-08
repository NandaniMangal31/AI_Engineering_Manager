import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Team } from '../types';
import { API_BASE_URL } from '../api.config';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/teams`;

  /** GET /api/teams */
  getTeams(): Observable<Team[]> {
    // TODO: Inject HttpClient and call Express API: GET /api/teams
    return this.http.get<Team[]>(this.baseUrl);
  }

  /** GET /api/teams/:id */
  getTeamById(id: string): Observable<Team> {
    // TODO: Inject HttpClient and call Express API: GET /api/teams/:id
    return this.http.get<Team>(`${this.baseUrl}/${id}`);
  }

  /** POST /api/teams */
  createTeam(payload: Partial<Team>): Observable<Team> {
    // TODO: Inject HttpClient and call Express API: POST /api/teams
    return this.http.post<Team>(this.baseUrl, payload);
  }
}
