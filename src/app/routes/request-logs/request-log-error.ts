const ERROR_TYPE_LABELS: Record<string, string> = {
  auth_failed: '认证失败',
  rate_limited: '上游限流',
  quota_exhausted: '额度耗尽',
  upstream_timeout: '上游超时',
  upstream_http_4xx: '上游请求错误',
  upstream_http_5xx: '上游服务错误',
  upstream_failed: '上游响应失败',
  upstream_5xx: '上游服务错误（旧）',
  stream_incomplete: '响应流不完整',
  client_disconnected: '客户端已断开',
  protocol_error: '协议解析错误',
  network_error: '网络连接错误',
  internal_error: '网关内部错误',
  model_not_supported: '模型不支持',
  no_available_account: '无可用账号',
  platform_key_invalid: 'API 密钥无效',
  platform_key_limited: 'API 密钥受限',
  server_overloaded: '网关过载',
  request_too_large: '请求体过大',
  invalid_request_error: '请求格式错误',
};

const DIAGNOSTIC_TYPE_LABELS: Record<string, string> = {
  client_closed_after_completion: '完成后客户端关闭',
  context_compacted: '上下文已压缩',
};

export function requestLogErrorLabel(errorType?: string): string {
  const value = (errorType || '').trim();
  if (!value) return '无错误';
  return ERROR_TYPE_LABELS[value] || value;
}

export function requestLogDiagnosticLabel(diagnosticType?: string): string {
  const value = (diagnosticType || '').trim();
  if (!value) return '无诊断';
  return DIAGNOSTIC_TYPE_LABELS[value] || value;
}
