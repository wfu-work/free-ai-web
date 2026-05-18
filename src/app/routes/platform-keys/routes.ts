import { Routes } from '@angular/router';

import { PlatformKeyListComponent } from './list/platform-key-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  {
    path: 'list',
    component: PlatformKeyListComponent,
    data: { title: '平台密钥' },
  },
];
