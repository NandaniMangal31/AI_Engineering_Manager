import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Member, MemberStats } from '../models/models';

@Injectable({ providedIn: 'root' })
export class MemberService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/members`;

  getMembers(filter: { isActive?: boolean; teamId?: string } = {}): Observable<Member[]> {
    let params = new HttpParams();
    if (filter.isActive !== undefined) params = params.set('isActive', String(filter.isActive));
    if (filter.teamId) params = params.set('teamId', filter.teamId);
    return this.http.get<Member[]>(this.base, { params });
  }

  getMemberById(id: string): Observable<Member> {
    return this.http.get<Member>(`${this.base}/${id}`);
  }

  getMemberStats(id: string): Observable<MemberStats> {
    return this.http.get<MemberStats>(`${this.base}/${id}/stats`);
  }
}
