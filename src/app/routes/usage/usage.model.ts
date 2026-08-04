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

export interface UsageTimelinePoint {
  bucketStart: number;
  requests: number;
  failures: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  costMicrousd: number;
  costAmount: number;
}

export interface ModelUsageTimelinePoint {
  bucketStart: number;
  requests: number;
  failures: number;
}

export interface ModelUsageTimelineSeries {
  model: string;
  totalRequests: number;
  points: ModelUsageTimelinePoint[];
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
  timeline: UsageTimelinePoint[];
  modelTimeline: ModelUsageTimelineSeries[];
}
