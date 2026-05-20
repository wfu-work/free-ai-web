export interface PlatformKey {
  guid: string;
  name: string;
  key?: string;
  keyPrefix: string;
  allowedModels: string;
  routingStrategy: string;
  accountGroupFilter: string;
  totalTokenLimit: number;
  tokenLimitUnit: string;
  protocolType: string;
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
  routingStrategy?: string;
  accountGroupFilter?: string;
  totalTokenLimit?: number;
  tokenLimitUnit?: string;
  protocolType?: string;
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
  platformKey: string;
  platformKeyId: string;
  platformKeyName: string;
  appliedAt?: number;
}
