export interface PlatformKey {
  guid: string;
  name: string;
  keyPrefix: string;
  allowedModels: string;
  rateLimitPerMinute: number;
  enabled: boolean;
  lastUsedAt: number;
  remark: string;
}

export interface PlatformKeyPayload {
  name: string;
  allowedModels?: string;
  rateLimitPerMinute?: number;
  remark?: string;
}

export interface CreatePlatformKeyResult {
  key: string;
  entity: PlatformKey;
}
