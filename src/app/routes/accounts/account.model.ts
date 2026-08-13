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

export interface Account {
  guid: string;
  vendorCode: string;
  productCode: string;
  credentialType: string;
  name: string;
  email: string;
  chatgptAccountId: string;
  workspaceId: string;
  credentialHint: string;
  planType: string;
  subscriptionPlan: string;
  subscriptionExpiredAt: number;
  subscriptionRenewsAt: number;
  subscriptionWillRenew: boolean | null;
  accessTokenExpiresAt: number;
  tokenStatus: string;
  lastError?: string;
  availableModelCount?: number;
  accountGroup: string;
  status: AccountStatus;
  priority: number;
  weight: number;
  enabled: boolean;
  lastUsedAt: number;
  lastRefreshedAt: number;
  failureCount: number;
  cooldownUntil: number;
  remark: string;
  quotas?: AccountQuota[];
  resetCredits?: AccountResetCreditSummary;
  gatewayUsage?: AccountGatewayUsage;
}

export interface AccountGatewayUsage {
  since: number;
  until: number;
  requests: number;
  totalTokens: number;
  costMicrousd: number;
  costAmount: number;
  pricedRequests: number;
  costAvailable: boolean;
}

export interface AccountResetCreditSummary {
  availableCount: number;
  applicableAvailableCount?: number | null;
}

export interface AccountResetCredit {
  id: string;
  resetType: string;
  status: string;
  grantedAt?: number;
  expiresAt?: number;
  title?: string;
  description?: string;
}

export interface AccountResetCreditsResult extends AccountResetCreditSummary {
  accountGuid: string;
  credits: AccountResetCredit[];
  detailsAvailable: boolean;
  syncedAt: number;
}

export interface ConsumeAccountResetCreditResult {
  accountGuid: string;
  outcome: 'reset' | 'alreadyRedeemed' | 'nothingToReset' | 'noCredit' | string;
  creditId?: string;
  idempotencyKey: string;
  resetCredits: AccountResetCreditsResult;
  usage?: AccountUsageRefreshResult;
  refreshWarning?: string;
}

export interface AccountQuota {
  guid: string;
  accountGuid: string;
  windowType: string;
  usedPercent: number | null;
  limitWindowSeconds: number;
  resetAt: number;
  allowed: boolean | null;
  limitReached: boolean | null;
  source: 'wham' | 'response_header' | 'active_probe' | string;
  nextRefreshAt: number;
  lastSyncedAt: number;
  status: string;
  extra: string;
}

export interface AccountGroup {
  guid: string;
  name: string;
  description: string;
  sort: number;
  enabled: boolean;
  modelSummary: string;
  accountCount: number;
  enabledAccountCount: number;
  availableAccountCount: number;
  modelCount: number;
  enabledModelCount: number;
  summarySyncedAt: number;
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
  accountGroup: string;
  status: AccountStatus;
  enabled: boolean;
  failureCount: number;
  cooldownUntil: number;
  lastUsedAt: number;
  lastRefreshedAt?: number;
  subscriptionExpiredAt: number;
  planType?: string;
  tokenStatus?: string;
  quotas: AccountQuota[];
}

export interface AccountImportPayload {
  accountFile: Record<string, unknown>;
  vendorCode?: string;
  name?: string;
  accountGroup?: string;
  priority?: number;
  weight?: number;
  remark?: string;
}

export interface AccountPoolPayload {
  vendorCode?: string;
  name?: string;
  accountGroup?: string;
  priority?: number;
  weight?: number;
  remark?: string;
}

export interface AccountManualPayload extends AccountPoolPayload {
  accessToken?: string;
  refreshToken?: string;
  idToken?: string;
  accountId?: string;
}

export interface AccountAPIKeyPayload extends AccountPoolPayload {
  apiKey: string;
}

export type AccountOAuthMode = 'browser' | 'device';

export interface AccountOAuthStartPayload extends AccountPoolPayload {
  mode: AccountOAuthMode;
}

export type AccountOAuthStatusValue =
  | 'pending'
  | 'completing'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'expired';

export interface AccountOAuthSession {
  id: string;
  mode: AccountOAuthMode;
  status: AccountOAuthStatusValue;
  authorizationUrl?: string;
  verificationUrl?: string;
  userCode?: string;
  intervalSeconds?: number;
  expiresAt: number;
  accountGuid?: string;
  error?: string;
  callbackListening?: boolean;
}

export interface AccountOAuthCompletePayload {
  callbackUrl: string;
}

export interface AccountPayload {
  name: string;
  vendorCode?: string;
  accountGroup?: string;
  priority?: number;
  weight?: number;
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
  status?: string;
  statusCode?: number;
  errorType?: string;
  errorSummary?: string;
  model?: string;
  latencyMs?: number;
  quotas?: AccountQuota[];
}

export interface AccountModelFetchPayload {
  guid: string;
}

export interface AccountModelFetchResult {
  models: string[];
}

export interface AccountUsageRefreshResult {
  accountGuid: string;
  usageType: string;
  planType: string;
  quotas: AccountQuota[];
  raw?: Record<string, unknown>;
  resetCredits?: AccountResetCreditSummary;
}
