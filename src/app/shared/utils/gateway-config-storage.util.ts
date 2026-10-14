// Older releases cached complete proxy URLs, including authentication.
export function clearLegacyGatewayConfigStorage(): void {
  localStorage.removeItem('freeai.gateway.config');
  sessionStorage.removeItem('freeai.gateway.config');
}
