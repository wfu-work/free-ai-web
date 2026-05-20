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
  provider: string;
  statusCode: number;
  errorType: string;
  switched: boolean;
  switchCount: number;
  switchReason: string;
  latencyMs: number;
  firstTokenMs: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cachedInputTokens?: number;
  cacheWriteTokens?: number;
  inputCost?: number;
  outputCost?: number;
  cacheReadCost?: number;
  cacheWriteCost?: number;
  totalCost?: number;
  chargedAmount?: number;
  createdAtUnix: number;
  createTime?: number;
}

export interface OpsStats {
  total: number;
  success: number;
  failures: number;
  avgLatencyMs: number;
}
