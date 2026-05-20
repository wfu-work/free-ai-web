import { Routes } from '@angular/router';

import { PlatformKeyCodexConfigComponent } from './codex-config/platform-key-codex-config.component';
import { PlatformKeyEditComponent } from './edit/platform-key-edit.component';
import { PlatformKeyListComponent } from './list/platform-key-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  {
    path: 'list',
    component: PlatformKeyListComponent,
    data: { title: '平台密钥' },
  },
  {
    path: 'edit',
    component: PlatformKeyEditComponent,
    data: { title: '创建平台密钥' },
  },
  {
    path: 'edit/:guid',
    component: PlatformKeyEditComponent,
    data: { title: '编辑平台密钥' },
  },
  {
    path: 'codex-config',
    component: PlatformKeyCodexConfigComponent,
    data: { title: 'Codex 配置' },
  },
];
