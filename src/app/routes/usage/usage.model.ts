export interface UsageDimension {
  dimension: string;
  requests: number;
  failures: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  costMicrousd: number;
  costAmount: number;
}

export interface UsageSummary {
  since: number;
  until: number;
  totalRequests: number;
  successRequests: number;
  failedRequests: number;
  avgLatencyMs: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  costMicrousd: number;
  costAmount: number;
  models: UsageDimension[];
  accounts: UsageDimension[];
  platformKeys: UsageDimension[];
}
