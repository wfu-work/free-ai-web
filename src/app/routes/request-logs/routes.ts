import { Routes } from '@angular/router';

import { RequestLogListComponent } from './list/request-log-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  {
    path: 'list',
    component: RequestLogListComponent,
    data: { title: '请求日志' },
  },
];
