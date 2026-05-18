export interface RequestLog {
  guid: string;
  requestId: string;
  platformKeyId: string;
  accountGuid: string;
  model: string;
  upstreamModel: string;
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
  createdAtUnix: number;
}

export interface OpsStats {
  total: number;
  success: number;
  failures: number;
  avgLatencyMs: number;
}
