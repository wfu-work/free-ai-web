export type AccountStatus =
  | 'available'
  | 'limited'
  | 'cooldown'
  | 'exhausted'
  | 'disabled'
  | 'expired'
  | 'invalid'
  | 'unknown'
  | string;

export type AccountAuthType = 'api_key' | 'bearer_token' | string;

export interface Account {
  guid: string;
  name: string;
  email: string;
  provider: string;
  apiBaseUrl: string;
  supplierName: string;
  officialUrl: string;
  usageQueryType: string;
  usageApiUrl: string;
  accountType: string;
  authType: AccountAuthType;
  secretHint: string;
  supportedModels: string;
  accountGroup: string;
  status: AccountStatus;
  priority: number;
  weight: number;
  enabled: boolean;
  lastUsedAt: number;
  lastRefreshedAt: number;
  subscriptionExpiredAt: number;
  failureCount: number;
  cooldownUntil: number;
  remark: string;
}

export interface AccountQuota {
  guid: string;
  accountGuid: string;
  windowType: string;
  usedPercent: number;
  remainingTokens: number;
  totalTokens: number;
  unit: string;
  usedAmount: number;
  remainingAmount: number;
  totalAmount: number;
  resetAt: number;
  nextRefreshAt: number;
  lastSyncedAt: number;
  status: string;
  extra: string;
}

export interface AccountQuotaPayload {
  accountGuid?: string;
  windowType: string;
  usedPercent?: number;
  remainingTokens?: number;
  totalTokens?: number;
  unit?: string;
  usedAmount?: number;
  remainingAmount?: number;
  totalAmount?: number;
  resetAt?: number;
  nextRefreshAt?: number;
  lastSyncedAt?: number;
  status?: string;
  extra?: string;
}

export interface AccountGroup {
  guid: string;
  name: string;
  description: string;
  sort: number;
  enabled: boolean;
  remark: string;
}

export interface AccountGroupPayload {
  name: string;
  description?: string;
  sort?: number;
  enabled?: boolean;
  remark?: string;
}

export interface AccountHealthItem {
  guid: string;
  name: string;
  provider: string;
  supplierName: string;
  usageQueryType: string;
  usageApiUrl: string;
  accountGroup: string;
  status: AccountStatus;
  enabled: boolean;
  failureCount: number;
  cooldownUntil: number;
  lastUsedAt: number;
  subscriptionExpiredAt: number;
  quotas: AccountQuota[];
}

export interface AccountPayload {
  name: string;
  email?: string;
  provider: string;
  apiBaseUrl?: string;
  supplierName?: string;
  officialUrl?: string;
  usageQueryType?: string;
  usageApiUrl?: string;
  accountType?: string;
  authType?: AccountAuthType;
  secret?: string;
  supportedModels?: string;
  accountGroup?: string;
  priority?: number;
  weight?: number;
  subscriptionExpiredAt?: number;
  remark?: string;
}

export interface ReorderAccountItem {
  guid: string;
  priority: number;
  weight: number;
}

export interface AccountTestInput {
  model?: string;
  prompt?: string;
}

export interface AccountTestResult {
  ok: boolean;
  provider: string;
  status: string;
  secretHint: string;
  enabled: boolean;
  modelCount: number;
  checkedAtMs: number;
  upstreamStatusCode?: number;
  upstreamErrorType?: string;
  latencyMs?: number;
}

export interface AccountModelFetchPayload {
  provider?: string;
  apiBaseUrl?: string;
  authType?: AccountAuthType;
  secret?: string;
}

export interface AccountModelFetchResult {
  models: string[];
}

export interface AccountUsageRefreshResult {
  accountGuid: string;
  provider: string;
  usageType: string;
  quotas: AccountQuota[];
  raw?: Record<string, unknown>;
}
