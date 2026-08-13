import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PageEntity } from '@shared';
import { Observable } from 'rxjs';

import {
  CodexConfigPayload,
  CodexConfigPreview,
  CreatePlatformKeyResult,
  PlatformKey,
  PlatformKeyConcurrencyStats,
  PlatformKeyDebugPayload,
  PlatformKeyDebugResult,
  PlatformKeyPayload,
  PlatformKeySecretResult,
  PlatformKeyStats,
} from './apikey.model';

@Injectable({ providedIn: 'root' })
export class PlatformKeysService {
  private readonly http = inject(HttpClient);

  list(params: Record<string, string | number | boolean>): Observable<PageEntity<PlatformKey>> {
    return this.http.get<PageEntity<PlatformKey>>('/platform-keys/list', { params });
  }

  listAll(): Observable<PlatformKey[]> {
    return this.http.get<PlatformKey[]>('/platform-keys/list/all');
  }

  stats(): Observable<PlatformKeyStats> {
    return this.http.get<PlatformKeyStats>('/platform-keys/stats');
  }

  concurrency(): Observable<PlatformKeyConcurrencyStats> {
    return this.http.get<PlatformKeyConcurrencyStats>('/platform-keys/concurrency');
  }

  getSecret(guid: string): Observable<PlatformKeySecretResult> {
    return this.http.post<PlatformKeySecretResult>(`/platform-keys/${guid}/secret`, {});
  }

  debug(guid: string, payload: PlatformKeyDebugPayload): Observable<PlatformKeyDebugResult> {
    return this.http.post<PlatformKeyDebugResult>(`/platform-keys/${guid}/debug`, payload);
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

  codexConfigPreview(payload: CodexConfigPayload): Observable<CodexConfigPreview> {
    return this.http.post<CodexConfigPreview>('/platform-keys/codex-config/preview', payload);
  }

  applyCodexConfig(payload: CodexConfigPayload): Observable<CodexConfigPreview> {
    return this.http.post<CodexConfigPreview>('/platform-keys/codex-config/apply', payload);
  }
}
