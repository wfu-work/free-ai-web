export interface RequestLog {
  guid: string;
  requestId: string;
  method: string;
  path: string;
  platformKeyId: string;
  platformKey: string;
  keyPrefix: string;
  accountGuid: string;
  accountName: string;
  model: string;
  upstreamModel: string;
  reasoningEffort: string;
  serviceTier: string;
  statusCode: number;
  errorType: string;
  switched: boolean;
  switchCount: number;
  switchReason: string;
  latencyMs: number;
  firstTokenMs: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  costMicrousd?: number;
  costAmount?: number;
  pricingMatched?: boolean;
  pricingSource?: string;
  createdAtUnix: number;
  createTime?: number;
}

export interface OpsStats {
  total: number;
  success: number;
  failures: number;
  avgLatencyMs: number;
}
