export interface OpsMetrics {
  ok: boolean;
  name: string;
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
