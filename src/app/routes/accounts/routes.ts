import { Routes } from '@angular/router';

import { AccountEditComponent } from './edit/account-edit.component';
import { AccountGroupsComponent } from './groups/account-groups.component';
import { AccountHealthComponent } from './health/account-health.component';
import { AccountListComponent } from './list/account-list.component';
import { AccountQuotasComponent } from './quotas/account-quotas.component';

export const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  {
    path: 'list',
    component: AccountListComponent,
    data: { title: '账号列表' },
  },
  {
    path: 'edit',
    component: AccountEditComponent,
    data: { title: '新增账号' },
  },
  {
    path: 'edit/:guid',
    component: AccountEditComponent,
    data: { title: '编辑账号' },
  },
  {
    path: 'groups',
    component: AccountGroupsComponent,
    data: { title: '账号分组' },
  },
  {
    path: 'health',
    component: AccountHealthComponent,
    data: { title: '账号健康' },
  },
  {
    path: 'quotas',
    component: AccountQuotasComponent,
    data: { title: '额度管理' },
  },
];
