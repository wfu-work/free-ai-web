import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CreatePlatformKeyResult, PlatformKey, PlatformKeyPayload, PlatformKeyStats } from './platform-key.model';
import { PageEntity } from '@shared';

@Injectable({ providedIn: 'root' })
export class PlatformKeysService {
  private readonly http = inject(HttpClient);

  list(params: any): Observable<PageEntity<PlatformKey>> {
    return this.http.get<PageEntity<PlatformKey>>('/platform-keys/list', { params });
  }

  listAll(): Observable<PlatformKey[]> {
    return this.http.get<PlatformKey[]>('/platform-keys/list/all');
  }

  stats(): Observable<PlatformKeyStats> {
    return this.http.get<PlatformKeyStats>('/platform-keys/stats');
  }

  get(guid: string): Observable<PlatformKey> {
    return this.http.get<PlatformKey>(`/platform-keys/${guid}`);
  }

  create(payload: PlatformKeyPayload): Observable<CreatePlatformKeyResult> {
    return this.http.post<CreatePlatformKeyResult>('/platform-keys', payload);
  }

  update(guid: string, payload: PlatformKeyPayload): Observable<PlatformKey> {
    return this.http.put<PlatformKey>(`/platform-keys/${guid}`, payload);
  }

  delete(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/platform-keys/${guid}`);
  }

  enable(guid: string): Observable<boolean> {
    return this.http.post<boolean>(`/platform-keys/${guid}/enable`, {});
  }

  disable(guid: string): Observable<boolean> {
    return this.http.post<boolean>(`/platform-keys/${guid}/disable`, {});
  }
}
