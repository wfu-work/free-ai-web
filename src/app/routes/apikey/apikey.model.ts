/** API Key domain models used by the frontend management pages. */
export interface PlatformKey {
  guid: string;
  name: string;
  key?: string;
  keyPrefix: string;
  allowedModels: string;
  accountGroupFilter: string;
  totalTokenLimit: number;
  tokenLimitUnit: string;
  boundModel: string;
  reasoningEffort: string;
  serviceTier: string;
  rateLimitPerMinute: number;
  enabled: boolean;
  lastUsedAt: number;
  usedTokens: number;
  usedAmount: number;
  remark: string;
}

export interface PlatformKeyPayload {
  name: string;
  allowedModels?: string;
  accountGroupFilter?: string;
  totalTokenLimit?: number;
  tokenLimitUnit?: string;
  boundModel?: string;
  reasoningEffort?: string;
  serviceTier?: string;
  rateLimitPerMinute?: number;
  remark?: string;
}

export interface CreatePlatformKeyResult {
  key: string;
  entity: PlatformKey;
}

export interface PlatformKeyStats {
  totalTokens: number;
  totalAmount: number;
}

export interface PlatformKeySecretResult {
  key: string;
}

export type PlatformKeyDebugEndpoint = 'models' | 'chat' | 'responses';

export interface PlatformKeyDebugPayload {
  endpoint: PlatformKeyDebugEndpoint;
  payload?: Record<string, unknown>;
}

export interface PlatformKeyDebugResult {
  statusCode: number;
  statusText: string;
  latencyMs: number;
  contentType: string;
  body: string;
}

export interface CodexConfigPayload {
  platformKeyGuid: string;
  apiBaseUrl: string;
  model: string;
  providerName: string;
  reasoningEffort?: string;
  writeGlobal: boolean;
}

export interface CodexConfigPreview {
  authPath: string;
  configPath: string;
  authJson: string;
  configToml: string;
  model: string;
  providerName: string;
  apiBaseUrl: string;
  platformKey?: string;
  platformKeyId: string;
  platformKeyName: string;
  appliedAt?: number;
}
