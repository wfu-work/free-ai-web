import { Environment } from '@delon/theme';

export const environment = {
  production: false,
  useHash: true,
  api: {
    baseUrl: '/dev',
    refreshTokenEnabled: false,
    refreshTokenType: 'auth-refresh',
  },
  providers: [],
  interceptorFns: [],
} as Environment;
