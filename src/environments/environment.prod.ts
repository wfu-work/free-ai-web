import { Environment } from '@delon/theme';

export const environment = {
  production: true,
  useHash: true,
  api: {
    baseUrl: '/api',
    refreshTokenEnabled: false,
    refreshTokenType: 'auth-refresh',
  },
} as Environment;
