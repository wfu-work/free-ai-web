export interface ModelCatalogItem {
  guid: string;
  createTime: number;
  updateTime: number;
  vendorCode: string;
  productCode: string;
  upstreamProtocol: string;
  remoteModelId: string;
  displayName: string;
  description: string;
  ownedBy: string;
  capabilitiesJson: string;
  reasoningEfforts: string[];
  defaultReasoningEffort: string;
  source: string;
  remoteCreatedAt: number;
  firstSeenAt: number;
  lastSeenAt: number;
  deprecated: boolean;
  exposureGuid: string;
  publicModel: string;
  aliases: string;
  accountGroup: string;
  timeoutSec: number;
  enabled: boolean;
  visible: boolean;
  availableAccountCount: number;
  pricing: ModelPriceItem[];
  pricingUpdatedAt: number;
  pricingSourceUrl: string;
  pricingSourceKind: string;
  pricingSourceVersion?: string;
}

export interface ModelPriceItem {
  scope: string;
  serviceTier: string;
  contextTier: string;
  currency: string;
  unit: string;
  inputMicrousdPer1M?: number | null;
  cachedInputMicrousdPer1M?: number | null;
  cacheWriteMicrousdPer1M?: number | null;
  outputMicrousdPer1M?: number | null;
  sourceUrl: string;
  sourceKind: string;
  sourceVersion?: string;
  lastSyncedAt: number;
}

export interface ModelPolicyPayload {
  publicModel: string;
  aliases?: string;
  accountGroup?: string;
  timeoutSec?: number;
  enabled?: boolean;
  visible?: boolean;
}

export interface ModelSyncPayload {
  accountGuid?: string;
  vendorCode?: string;
  productCode?: string;
}

export interface ModelSyncStats {
  accountGuid: string;
  models: string[];
  discovered: number;
  created: number;
  updated: number;
  unavailable: number;
}

export interface ModelSyncResult {
  checked: number;
  updated: number;
  failed: number;
  results: ModelSyncStats[];
  errors?: string[];
}

export interface ModelPricingSyncResult {
  checked: number;
  created: number;
  updated: number;
  preserved: number;
  deactivated: number;
  sourceKind: string;
  sourceVersion?: string;
  sourceUrl: string;
  syncedAt: number;
  warning?: string;
}

export interface ModelAccountItem {
  accountGuid: string;
  name: string;
  email: string;
  accountGroup: string;
  status: string;
  enabled: boolean;
  available: boolean;
  firstSeenAt: number;
  lastSeenAt: number;
  lastError?: string;
}
