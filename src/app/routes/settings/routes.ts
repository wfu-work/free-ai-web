import { Routes } from '@angular/router';

import { SettingsGatewayComponent } from './gateway/settings-gateway.component';
import { SettingsIntegrationComponent } from './integration/settings-integration.component';
import { SettingsRetentionComponent } from './retention/settings-retention.component';
import { SettingsSecurityComponent } from './security/settings-security.component';

export const routes: Routes = [
  { path: '', redirectTo: 'integration', pathMatch: 'full' },
  {
    path: 'integration',
    component: SettingsGatewayComponent,
    data: { title: '网关配置' },
  },
  {
    path: 'guide',
    component: SettingsIntegrationComponent,
    data: { title: '接入指南' },
  },
  {
    path: 'security',
    component: SettingsSecurityComponent,
    data: { title: '安全设置' },
  },
  {
    path: 'retention',
    component: SettingsRetentionComponent,
    data: { title: '数据保留' },
  },
];
