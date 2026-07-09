import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  memberCount: number;
}

@Injectable({ providedIn: 'root' })
export class SlackService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/slack`;

  getInstallUrl(): string {
    return `${this.base}/install`;
  }

  getChannels(): Observable<{ channels: SlackChannel[] }> {
    return this.http.get<{ channels: SlackChannel[] }>(`${this.base}/channels`);
  }

  joinChannel(channelId: string): Observable<any> {
    return this.http.post(`${this.base}/channels/${channelId}/join`, {});
  }

  processChannel(channelId: string, limit = 50): Observable<any> {
    return this.http.post(`${this.base}/channels/${channelId}/process?limit=${limit}`, {});
  }
}
