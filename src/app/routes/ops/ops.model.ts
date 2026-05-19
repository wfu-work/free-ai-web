export interface OpsMetrics {
  ok: boolean;
  name: string;
  proxyPrefix?: string;
  accounts: number;
  availableAccounts: number;
  enabledModels: number;
  enabledKeys: number;
}

export interface OpsStats {
  total: number;
  success: number;
  failures: number;
  avgLatencyMs: number;
}

export interface MasterKeyStatus {
  path: string;
  exists: boolean;
  loaded: boolean;
  size: number;
  updatedAt: number;
  error?: string;
}

export interface CoreBackupImportResult {
  success: number;
  failed: number;
  accounts: number;
  failedAccounts: number;
  accountGroups: number;
  failedAccountGroups: number;
  accountQuotas: number;
  failedAccountQuotas: number;
  modelMappings: number;
  failedModelMappings: number;
  platformKeys: number;
  failedPlatformKeys: number;
  routeStates: number;
  failedRouteStates: number;
  gatewayConfig: number;
  failedGatewayConfig: number;
  errors?: string[];
}
