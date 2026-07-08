import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppNotification } from '../types';
import { API_BASE_URL } from '../api.config';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/notifications`;

  /** GET /api/notifications?recipientId= — powers the bell icon in the top bar */
  getNotifications(recipientId: string): Observable<AppNotification[]> {
    // TODO: Inject HttpClient and call Express API: GET /api/notifications
    return this.http.get<AppNotification[]>(this.baseUrl, { params: { recipientId } });
  }

  /** PATCH /api/notifications/:id/read */
  markAsRead(id: string): Observable<AppNotification> {
    // TODO: Inject HttpClient and call Express API: PATCH /api/notifications/:id/read
    return this.http.patch<AppNotification>(`${this.baseUrl}/${id}/read`, {});
  }
}
