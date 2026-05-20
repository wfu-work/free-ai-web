import { Routes } from '@angular/router';
import { startPageGuard } from '@core';
import { authSimpleCanActivate, authSimpleCanActivateChild } from '@delon/auth';

import { LayoutBasic } from '../layout';
import { DashboardComponent } from './dashboard/dashboard.component';

export const routes: Routes = [
  {
    path: '',
    component: LayoutBasic,
    canActivate: [startPageGuard, authSimpleCanActivate],
    canActivateChild: [authSimpleCanActivateChild],
    data: {},
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent, data: { title: '工作台' } },
      { path: 'accounts', loadChildren: () => import('./accounts/routes').then((m) => m.routes) },
      {
        path: 'platform-keys',
        loadChildren: () => import('./platform-keys/routes').then((m) => m.routes),
      },
      { path: 'models', loadChildren: () => import('./models/routes').then((m) => m.routes) },
      {
        path: 'request-logs',
        loadChildren: () => import('./request-logs/routes').then((m) => m.routes),
      },
      { path: 'ops', loadChildren: () => import('./ops/routes').then((m) => m.routes) },
      { path: 'settings', loadChildren: () => import('./settings/routes').then((m) => m.routes) },
      { path: 'help', redirectTo: 'settings/guide', pathMatch: 'full' },
    ],
  },
  { path: '', loadChildren: () => import('./passport/routes').then((m) => m.routes) },
  { path: 'exception', loadChildren: () => import('./exception/routes').then((m) => m.routes) },
  { path: '**', redirectTo: 'exception/404' },
];
