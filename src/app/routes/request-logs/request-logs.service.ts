import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { OpsStats, RequestLog } from './request-log.model';
import { PageEntity } from '@shared';

@Injectable({ providedIn: 'root' })
export class RequestLogsService {
  private readonly http = inject(HttpClient);

  list(limit = 200, since?: number): Observable<RequestLog[]> {
    const params: Record<string, number> = { limit };
    if (since) {
      params['since'] = since;
    }
    return this.http.get<RequestLog[]>('/request-logs/list/all', { params });
  }

  pageList(params: any): Observable<PageEntity<RequestLog>> {
    return this.http.get<PageEntity<RequestLog>>('/request-logs/list', { params });
  }

  get(guid: string): Observable<RequestLog> {
    return this.http.get<RequestLog>(`/request-logs/${guid}`);
  }

  clearByRetention(retentionDays: number): Observable<boolean> {
    return this.http.delete<boolean>('/request-logs', { params: { retentionDays } });
  }

  clearBefore(before: number): Observable<boolean> {
    return this.http.delete<boolean>('/request-logs', { params: { before } });
  }

  stats(): Observable<OpsStats> {
    return this.http.get<OpsStats>('/ops/stats');
  }
}
