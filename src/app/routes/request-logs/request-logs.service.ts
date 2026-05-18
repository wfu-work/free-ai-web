import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { OpsStats, RequestLog } from './request-log.model';

@Injectable({ providedIn: 'root' })
export class RequestLogsService {
  private readonly http = inject(HttpClient);

  list(limit = 200): Observable<RequestLog[]> {
    return this.http.get<RequestLog[]>('/request-logs', { params: { limit } });
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
