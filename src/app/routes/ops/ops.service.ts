import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { MasterKeyStatus, OpsMetrics, OpsStats } from './ops.model';

@Injectable({ providedIn: 'root' })
export class OpsService {
  private readonly http = inject(HttpClient);

  metrics(): Observable<OpsMetrics> {
    return this.http.get<OpsMetrics>('/ops/metrics');
  }

  stats(): Observable<OpsStats> {
    return this.http.get<OpsStats>('/ops/stats');
  }

  masterKey(): Observable<MasterKeyStatus> {
    return this.http.get<MasterKeyStatus>('/ops/master-key');
  }
}
