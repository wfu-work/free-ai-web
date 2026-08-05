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
  errorSummary: string;
  switched: boolean;
  switchCount: number;
  switchReason: string;
  latencyMs: number;
  preparationMs: number;
  dnsMs: number;
  connectMs: number;
  tlsHandshakeMs: number;
  upstreamHeaderMs: number;
  firstEventMs: number;
  firstTokenMs: number;
  connectionReused: boolean;
  connectionTraced: boolean;
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
