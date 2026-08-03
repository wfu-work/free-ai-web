import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { UsageSummary } from './usage.model';

@Injectable({ providedIn: 'root' })
export class UsageService {
  private readonly http = inject(HttpClient);

  summary(days = 30): Observable<UsageSummary> {
    return this.http.get<UsageSummary>('/ops/usage', { params: { days } });
  }
}
