import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  Account,
  AccountGroup,
  AccountGroupPayload,
  AccountHealthItem,
  AccountModelFetchPayload,
  AccountModelFetchResult,
  AccountPayload,
  AccountQuota,
  AccountQuotaPayload,
  AccountTestInput,
  AccountTestResult,
  AccountUsageRefreshResult,
  ReorderAccountItem,
} from './account.model';

@Injectable({ providedIn: 'root' })
export class AccountsService {
  private readonly http = inject(HttpClient);

  list(): Observable<Account[]> {
    return this.http.get<Account[]>('/accounts');
  }

  health(): Observable<AccountHealthItem[]> {
    return this.http.get<AccountHealthItem[]>('/ops/account-health');
  }

  quotas(accountGuid?: string): Observable<AccountQuota[]> {
    const params = accountGuid ? { accountGuid } : undefined;
    return this.http.get<AccountQuota[]>('/quotas', { params });
  }

  upsertQuota(accountGuid: string, payload: AccountQuotaPayload): Observable<AccountQuota> {
    return this.http.post<AccountQuota>(`/accounts/${accountGuid}/quotas`, payload);
  }

  get(guid: string): Observable<Account> {
    return this.http.get<Account>(`/accounts/${guid}`);
  }

  create(payload: AccountPayload): Observable<Account> {
    return this.http.post<Account>('/accounts', payload);
  }

  update(guid: string, payload: AccountPayload): Observable<Account> {
    return this.http.put<Account>(`/accounts/${guid}`, payload);
  }

  delete(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/accounts/${guid}`);
  }

  enable(guid: string): Observable<boolean> {
    return this.http.post<boolean>(`/accounts/${guid}/enable`, {});
  }

  disable(guid: string): Observable<boolean> {
    return this.http.post<boolean>(`/accounts/${guid}/disable`, {});
  }

  refresh(guid: string): Observable<Account> {
    return this.http.post<Account>(`/accounts/${guid}/refresh`, {});
  }

  refreshUsage(guid: string): Observable<AccountUsageRefreshResult> {
    return this.http.post<AccountUsageRefreshResult>(`/accounts/${guid}/refresh-usage`, {});
  }

  test(guid: string, payload: AccountTestInput = {}): Observable<AccountTestResult> {
    return this.http.post<AccountTestResult>(`/accounts/${guid}/test`, payload);
  }

  reorder(items: ReorderAccountItem[]): Observable<boolean> {
    return this.http.post<boolean>('/accounts/reorder', { items });
  }

  fetchModels(payload: AccountModelFetchPayload): Observable<AccountModelFetchResult> {
    return this.http.post<AccountModelFetchResult>('/accounts/fetch-models', payload);
  }

  listGroups(): Observable<AccountGroup[]> {
    return this.http.get<AccountGroup[]>('/account-groups');
  }

  createGroup(payload: AccountGroupPayload): Observable<AccountGroup> {
    return this.http.post<AccountGroup>('/account-groups', payload);
  }

  updateGroup(guid: string, payload: AccountGroupPayload): Observable<AccountGroup> {
    return this.http.put<AccountGroup>(`/account-groups/${guid}`, payload);
  }

  deleteGroup(guid: string): Observable<boolean> {
    return this.http.delete<boolean>(`/account-groups/${guid}`);
  }
}
