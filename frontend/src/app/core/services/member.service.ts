import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Member } from '../types';
import { API_BASE_URL } from '../api.config';

@Injectable({ providedIn: 'root' })
export class MemberService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/members`;

  /** GET /api/members?teamId=&isActive= */
  getMembers(params?: { teamId?: string; isActive?: boolean }): Observable<Member[]> {
    // TODO: Inject HttpClient and call Express API: GET /api/members
    return this.http.get<Member[]>(this.baseUrl, { params: toHttpParams(params) });
  }

  /** GET /api/members/:id */
  getMemberById(id: string): Observable<Member> {
    // TODO: Inject HttpClient and call Express API: GET /api/members/:id
    return this.http.get<Member>(`${this.baseUrl}/${id}`);
  }

  /** POST /api/members */
  createMember(payload: Partial<Member>): Observable<Member> {
    // TODO: Inject HttpClient and call Express API: POST /api/members
    return this.http.post<Member>(this.baseUrl, payload);
  }

  /** PATCH /api/members/:id */
  updateMember(id: string, payload: Partial<Member>): Observable<Member> {
    // TODO: Inject HttpClient and call Express API: PATCH /api/members/:id
    return this.http.patch<Member>(`${this.baseUrl}/${id}`, payload);
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
