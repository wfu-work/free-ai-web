import { Routes } from '@angular/router';

import { SettingsGatewayComponent } from './gateway/settings-gateway.component';
import { SettingsMineComponent } from './mine/settings-mine.component';
import { SettingsRetentionComponent } from './retention/settings-retention.component';
import { SettingsSecurityComponent } from './security/settings-security.component';

export const routes: Routes = [
  { path: '', redirectTo: 'gateway', pathMatch: 'full' },
  {
    path: 'gateway',
    component: SettingsGatewayComponent,
    data: { title: '网关配置' },
  },
  {
    path: 'mine',
    component: SettingsMineComponent,
    data: { title: '个人中心' },
  },
  {
    path: 'security',
    component: SettingsSecurityComponent,
    data: { title: '安全诊断' },
  },
  {
    path: 'retention',
    component: SettingsRetentionComponent,
    data: { title: '数据管理' },
  },
];
