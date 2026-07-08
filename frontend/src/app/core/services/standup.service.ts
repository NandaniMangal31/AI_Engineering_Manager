import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  DetectedDuplicate,
  ParserStatus,
  SentimentPoint,
  Standup,
  StandupHighlight,
  StandupMessage,
} from '../types';
import { API_BASE_URL } from '../api.config';

/**
 * Aggregate payload for the Stand-up Summary page. The PDF schema doesn't
 * define a dedicated collection for the AI narrative/parser/duplicate
 * widgets seen in the screenshot, so this assumes a composed endpoint
 * (`GET /api/standups/:id/insights`) that the AI pipeline writes to
 * alongside `standups.parsingStatus`. If the backend instead stores these
 * as fields on `standups`, just fold them back into the `Standup`
 * interface and simplify this call to `getStandupById`.
 */
export interface StandupInsights {
  standup: Standup;
  aiSynthesis: string;
  highlights: StandupHighlight[];
  contributorMemberIds: string[];
  parserStatus: ParserStatus;
  duplicates: DetectedDuplicate[];
  sentimentOverWeek: SentimentPoint[];
}

@Injectable({ providedIn: 'root' })
export class StandupService {
  private http = inject(HttpClient);
  private baseUrl = `${API_BASE_URL}/standups`;

  /** GET /api/standups?date= */
  getStandups(params?: { date?: string }): Observable<Standup[]> {
    // TODO: Inject HttpClient and call Express API: GET /api/standups
    return this.http.get<Standup[]>(this.baseUrl, { params: params as Record<string, string> });
  }

  /** GET /api/standups/latest */
  getLatestStandup(): Observable<Standup> {
    // TODO: Inject HttpClient and call Express API: GET /api/standups/latest
    return this.http.get<Standup>(`${this.baseUrl}/latest`);
  }

  /** GET /api/standups/:id/insights */
  getStandupInsights(standupId: string): Observable<StandupInsights> {
    // TODO: Inject HttpClient and call Express API: GET /api/standups/:id/insights
    return this.http.get<StandupInsights>(`${this.baseUrl}/${standupId}/insights`);
  }

  /** GET /api/standups/:id/messages */
  getStandupMessages(standupId: string): Observable<StandupMessage[]> {
    // TODO: Inject HttpClient and call Express API: GET /api/standups/:id/messages
    return this.http.get<StandupMessage[]>(`${this.baseUrl}/${standupId}/messages`);
  }

  /** POST /api/standups */
  submitStandup(payload: { submittedBy: string; message: string }): Observable<Standup> {
    // TODO: Inject HttpClient and call Express API: POST /api/standups
    return this.http.post<Standup>(this.baseUrl, payload);
  }

  /** POST /api/standups/:id/duplicates/:duplicateId/dismiss */
  dismissDuplicate(standupId: string, duplicateId: string): Observable<void> {
    // TODO: Inject HttpClient and call Express API: POST /api/standups/:id/duplicates/:duplicateId/dismiss
    return this.http.post<void>(`${this.baseUrl}/${standupId}/duplicates/${duplicateId}/dismiss`, {});
  }
}
