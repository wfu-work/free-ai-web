import { Routes } from '@angular/router';

import { ExceptionComponent } from './exception.component';

export const routes: Routes = [
  {
    path: '403',
    component: ExceptionComponent,
    data: { type: 403, title: '无权访问' },
  },
  {
    path: '404',
    component: ExceptionComponent,
    data: { type: 404, title: '页面不存在' },
  },
  {
    path: '500',
    component: ExceptionComponent,
    data: { type: 500, title: '服务异常' },
  },
];
