import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PageEntity } from '@shared';
import { Observable } from 'rxjs';

import {
  ModelAccountItem,
  ModelCatalogItem,
  ModelPolicyPayload,
  ModelPricingSyncResult,
  ModelSyncPayload,
  ModelSyncResult,
} from './model.model';

@Injectable({ providedIn: 'root' })
export class ModelsService {
  private readonly http = inject(HttpClient);

  list(
    params: Record<string, string | number | boolean>,
  ): Observable<PageEntity<ModelCatalogItem>> {
    return this.http.get<PageEntity<ModelCatalogItem>>('/models/list', { params });
  }

  listAll(): Observable<ModelCatalogItem[]> {
    return this.http.get<ModelCatalogItem[]>('/models/list/all');
  }

  get(guid: string): Observable<ModelCatalogItem> {
    return this.http.get<ModelCatalogItem>(`/models/${guid}`);
  }

  update(guid: string, payload: ModelPolicyPayload): Observable<ModelCatalogItem> {
    return this.http.put<ModelCatalogItem>(`/models/${guid}`, payload);
  }

  sync(payload: ModelSyncPayload = {}): Observable<ModelSyncResult> {
    return this.http.post<ModelSyncResult>('/models/sync', payload);
  }

  syncPricing(): Observable<ModelPricingSyncResult> {
    return this.http.post<ModelPricingSyncResult>('/models/pricing/sync', {});
  }

  accounts(guid: string): Observable<ModelAccountItem[]> {
    return this.http.get<ModelAccountItem[]>(`/models/${guid}/accounts`);
  }

  enable(guid: string): Observable<boolean> {
    return this.http.post<boolean>(`/models/${guid}/enable`, {});
  }

  disable(guid: string): Observable<boolean> {
    return this.http.post<boolean>(`/models/${guid}/disable`, {});
  }
}
