import { Routes } from '@angular/router';

import { RequestLogDetailComponent } from './detail/request-log-detail.component';
import { RequestLogListComponent } from './list/request-log-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  {
    path: 'list',
    component: RequestLogListComponent,
    data: { title: '请求记录' },
  },
  {
    path: 'detail/:guid',
    component: RequestLogDetailComponent,
    data: { title: '调用详情' },
  },
];
