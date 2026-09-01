/**
 * 计算账号对管理端可见的有效状态。
 *
 * 旧版本可能只保存了 tokenStatus=refresh_failed/invalid，而 status 仍为
 * available。保留这层兼容逻辑可避免历史账号继续显示为“可用”。
 */
export function effectiveAccountStatus(status?: string, tokenStatus?: string): string {
  const normalizedStatus = (status || '').trim().toLowerCase();
  const normalizedTokenStatus = (tokenStatus || '').trim().toLowerCase();
  const tokenInvalid =
    normalizedTokenStatus === 'refresh_failed' || normalizedTokenStatus === 'invalid';
  const legacyAvailable = !normalizedStatus || normalizedStatus === 'available';
  if (normalizedStatus !== 'disabled' && normalizedTokenStatus === 'invalid') {
    return 'invalid';
  }
  if (legacyAvailable && tokenInvalid) {
    return 'invalid';
  }
  return normalizedStatus;
}
