import { Environment } from '@delon/theme';

export const environment = {
  production: false,
  useHash: true,
  api: {
    baseUrl: '/api',
    refreshTokenEnabled: false,
    refreshTokenType: 'auth-refresh',
  },
  providers: [],
  interceptorFns: [],
} as Environment;
