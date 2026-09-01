interface ErrorDetails {
  code: string;
  type: string;
  message: string;
}

/**
 * 将后端/OAuth 上游错误转换为管理界面可读的中文文案。
 * 原始错误仍保留在 API 响应和后端日志中，这里只负责用户界面展示。
 */
export function translateErrorMessage(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const details = parseErrorDetails(raw);
  const text = `${details.code} ${details.type} ${details.message} ${raw}`.toLowerCase();

  if (
    /invalid[_ -]?grant|invalid[_ -]?refresh[_ -]?token|invalid refresh token|could not validate .*refresh token|refresh token .*\b(expired|invalid|revoked|reused)\b/.test(
      text,
    )
  ) {
    return '刷新令牌无效或已过期，请重新登录该账号';
  }
  if (
    /refresh[_ -]?token.*(empty|missing|required)|oauth account does not contain refresh_token/.test(
      text,
    )
  ) {
    return '账号缺少刷新令牌，请重新导入完整的 OAuth 凭据';
  }
  if (/access[_ -]?token.*(expired|invalid)|token.*\b(expired|revoked)\b/.test(text)) {
    return '访问令牌已过期或无效，请重新登录该账号';
  }
  if (/account file does not contain access[_ -]?token|oauth access token is empty/.test(text)) {
    return '账号文件缺少访问令牌，请重新导入 OAuth 文件';
  }
  if (/account file does not contain chatgpt account id/.test(text)) {
    return '账号文件缺少 ChatGPT 账号 ID，请重新导入';
  }
  if (/account identifier.*(does not match|mismatch)|account identifiers do not match/.test(text)) {
    return '账号 ID 与令牌信息不匹配，请重新导入正确的账号文件';
  }
  if (/invalid jwt|decode jwt|malformed jwt/.test(text)) {
    return 'OAuth 令牌格式无效，请重新获取账号凭据';
  }
  if (/\b401\b|unauthorized|not authorized|authentication failed|auth failed/.test(text)) {
    return '账号授权已失效，请重新登录该账号';
  }
  if (/\b429\b|rate limit|too many requests|quota exceeded/.test(text)) {
    return '上游服务当前限流，请稍后再试';
  }
  if (/timeout|timed out|deadline exceeded|context deadline/.test(text)) {
    return '连接上游服务超时，请检查网络或代理设置';
  }
  if (/connection refused|connection reset|no such host|tls handshake|network error/.test(text)) {
    return '上游网络连接失败，请检查网络或代理设置';
  }

  if (details.message && /[\u3400-\u9fff]/.test(details.message)) {
    return details.message;
  }
  if (details.code) {
    return `账号同步失败，请稍后重试（错误码：${details.code}）`;
  }
  return '账号同步失败，请稍后重试';
}

function parseErrorDetails(raw: string): ErrorDetails {
  const parsed = parseJsonError(raw);
  if (parsed) return parsed;

  const message = raw.match(/"message"\s*:\s*"((?:\\.|[^"\\])*)"/i)?.[1];
  return {
    code: raw.match(/"code"\s*:\s*"?([\w.-]+)/i)?.[1] || '',
    type: raw.match(/"type"\s*:\s*"?([\w.-]+)/i)?.[1] || '',
    message: message ? decodeJsonString(message) : stripErrorPrefix(raw),
  };
}

function parseJsonError(raw: string): ErrorDetails | null {
  const start = raw.indexOf('{');
  if (start < 0) return null;
  try {
    const root = JSON.parse(raw.slice(start)) as Record<string, unknown>;
    const error =
      asRecord(root['error']) || asRecord(asRecord(root['response'])?.['error']) || root;
    return {
      code: stringValue(error['code']) || stringValue(root['code']),
      type: stringValue(error['type']) || stringValue(root['type']),
      message: stringValue(error['message']) || stringValue(root['message']),
    };
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function decodeJsonString(value: string): string {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value;
  }
}

function stripErrorPrefix(value: string): string {
  return value.replace(/^\s*[\w.-]+:\s*/i, '').trim();
}
