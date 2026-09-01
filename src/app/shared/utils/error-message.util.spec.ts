import { describe, expect, it } from 'vitest';

import { translateErrorMessage } from './error-message.util';

describe('translateErrorMessage', () => {
  it('识别 OAuth 刷新令牌失效错误', () => {
    expect(
      translateErrorMessage(
        'codexauth: {"error":{"message":"Could not validate your refresh token.","code":"invalid_grant"}}',
      ),
    ).toBe('刷新令牌无效或已过期，请重新登录该账号');
    expect(translateErrorMessage('codexauth: {"error":{"message":"Invalid refresh token."}}')).toBe(
      '刷新令牌无效或已过期，请重新登录该账号',
    );
  });

  it('识别常见网络和令牌错误', () => {
    expect(translateErrorMessage('context deadline exceeded')).toBe(
      '连接上游服务超时，请检查网络或代理设置',
    );
    expect(translateErrorMessage('codexauth: invalid JWT')).toBe(
      'OAuth 令牌格式无效，请重新获取账号凭据',
    );
  });

  it('保留已有中文错误信息', () => {
    expect(translateErrorMessage('同步失败：账号已停用')).toBe('同步失败：账号已停用');
  });
});
