import { Routes } from '@angular/router';

import { PlatformKeyCodexConfigComponent } from '../apikey/codex-config/apikey-codex-config.component';
import { PlatformKeyEditComponent } from '../apikey/edit/apikey-edit.component';
import { PlatformKeyListComponent } from '../apikey/list/apikey-list.component';
import { SettingsIntegrationComponent } from '../settings/integration/settings-integration.component';

export const routes: Routes = [
  { path: '', redirectTo: 'keys', pathMatch: 'full' },
  {
    path: 'keys',
    component: PlatformKeyListComponent,
    data: { title: 'API 密钥' },
  },
  {
    path: 'keys/new',
    component: PlatformKeyEditComponent,
    data: { title: '创建API 密钥' },
  },
  {
    path: 'keys/:guid',
    component: PlatformKeyEditComponent,
    data: { title: '编辑API 密钥' },
  },
  {
    path: 'guide',
    component: SettingsIntegrationComponent,
    data: { title: '接入指南' },
  },
  {
    path: 'codex',
    component: PlatformKeyCodexConfigComponent,
    data: { title: 'Codex 配置' },
  },
];
