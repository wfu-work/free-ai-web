import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { PageEntity } from '@shared';
import { Observable } from 'rxjs';

import {
  Account,
  AccountAPIKeyPayload,
  AccountGroup,
  AccountGroupPayload,
  AccountHealthItem,
  AccountImportPayload,
  AccountImportBatchResult,
  AccountManualPayload,
  AccountModelFetchPayload,
  AccountModelFetchResult,
  AccountPayload,
  AccountResetCreditsResult,
  AccountOAuthCompletePayload,
  AccountOAuthSession,
  AccountOAuthStartPayload,
  AccountTestInput,
  AccountTestResult,
  AccountUsageRefreshResult,
  ConsumeAccountResetCreditResult,
  ReorderAccountItem,
} from './account.model';

@Injectable({ providedIn: 'root' })
export class AccountsService {
  private readonly http = inject(HttpClient);

  list(params: any): Observable<PageEntity<Account>> {
    return this.http.get<PageEntity<Account>>('/accounts/list', { params });
  }

  listAll(): Observable<Account[]> {
    return this.http.get<Account[]>('/accounts/list/all');
  }

  health(): Observable<AccountHealthItem[]> {
    return this.http.get<AccountHealthItem[]>('/ops/account-health');
  }

  get(guid: string): Observable<Account> {
    return this.http.get<Account>(`/accounts/${guid}`);
  }

  importAccount(payload: AccountImportPayload): Observable<Account> {
    return this.http.post<Account>('/accounts/import', payload);
  }

  importAccountFile(payload: AccountImportPayload): Observable<AccountImportBatchResult> {
    return this.http.post<AccountImportBatchResult>('/accounts/import-file', payload);
  }

  addManual(payload: AccountManualPayload): Observable<Account> {
    return this.http.post<Account>('/accounts', payload);
  }

  addAPIKey(payload: AccountAPIKeyPayload): Observable<Account> {
    return this.http.post<Account>('/accounts/api-key', payload);
  }

  startOAuth(payload: AccountOAuthStartPayload): Observable<AccountOAuthSession> {
    return this.http.post<AccountOAuthSession>('/accounts/oauth/sessions', payload);
  }

  oauthStatus(id: string): Observable<AccountOAuthSession> {
    return this.http.get<AccountOAuthSession>(`/accounts/oauth/sessions/${id}`);
  }

  completeOAuth(id: string, payload: AccountOAuthCompletePayload): Observable<AccountOAuthSession> {
    return this.http.post<AccountOAuthSession>(`/accounts/oauth/sessions/${id}/complete`, payload);
  }

  cancelOAuth(id: string): Observable<AccountOAuthSession> {
    return this.http.delete<AccountOAuthSession>(`/accounts/oauth/sessions/${id}`);
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

  refreshUsage(guid: string): Observable<AccountUsageRefreshResult> {
    return this.http.post<AccountUsageRefreshResult>(`/accounts/${guid}/refresh-usage`, {});
  }

  resetCredits(guid: string): Observable<AccountResetCreditsResult> {
    return this.http.get<AccountResetCreditsResult>(`/accounts/${guid}/reset-credits`);
  }

  consumeResetCredit(
    guid: string,
    payload: { idempotencyKey: string; creditId?: string },
  ): Observable<ConsumeAccountResetCreditResult> {
    return this.http.post<ConsumeAccountResetCreditResult>(
      `/accounts/${guid}/reset-credits/consume`,
      payload,
    );
  }

  probe(guid: string, payload: AccountTestInput = {}): Observable<AccountTestResult> {
    return this.http.post<AccountTestResult>(`/accounts/${guid}/probe`, payload);
  }

  exportAccount(guid: string): Observable<Blob> {
    return this.http.get(`/accounts/${guid}/export`, { responseType: 'blob' });
  }

  reorder(items: ReorderAccountItem[]): Observable<boolean> {
    return this.http.post<boolean>('/accounts/reorder', { items });
  }

  fetchModels(payload: AccountModelFetchPayload): Observable<AccountModelFetchResult> {
    return this.http.post<AccountModelFetchResult>('/accounts/fetch-models', payload);
  }

  listGroups(): Observable<AccountGroup[]> {
    return this.http.get<AccountGroup[]>('/account-groups/list/all');
  }

  listGroupsPage(params: any): Observable<PageEntity<AccountGroup>> {
    return this.http.get<PageEntity<AccountGroup>>('/account-groups/list', { params });
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
