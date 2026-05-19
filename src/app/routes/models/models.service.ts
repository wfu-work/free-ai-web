import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ModelMapping, ModelPayload, ModelRouteState } from './model.model';
import { PageEntity } from '@shared';

@Injectable({ providedIn: 'root' })
export class ModelsService {
  private readonly http = inject(HttpClient);

  list(params: any): Observable<PageEntity<ModelMapping>> {
    return this.http.get<PageEntity<ModelMapping>>('/models/list', { params });
  }

  listAll(): Observable<ModelMapping[]> {
    return this.http.get<ModelMapping[]>('/models/list/all');
  }

  routeStates(): Observable<ModelRouteState[]> {
    return this.http.get<ModelRouteState[]>('/ops/routes');
  }

  get(guid: string): Observable<ModelMapping> {
    return this.http.get<ModelMapping>(`/models/${guid}`);
  }

  create(payload: ModelPayload): Observable<ModelMapping> {
    return this.http.post<ModelMapping>('/models', payload);
  }

  update(guid: string, payload: ModelPayload): Observable<ModelMapping> {
    return this.http.put<ModelMapping>(`/models/${guid}`, payload);
  }

  delete(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/models/${guid}`);
  }

  enable(guid: string): Observable<boolean> {
    return this.http.post<boolean>(`/models/${guid}/enable`, {});
  }

  disable(guid: string): Observable<boolean> {
    return this.http.post<boolean>(`/models/${guid}/disable`, {});
  }
}
