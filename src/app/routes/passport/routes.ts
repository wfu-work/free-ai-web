import { Routes } from '@angular/router';

import { UserLoginComponent } from './login/login.component';
import { LayoutPassport } from '../../layout';

export const routes: Routes = [
  {
    path: 'passport',
    component: LayoutPassport,
    children: [
      {
        path: 'login',
        component: UserLoginComponent,
        data: { title: '登录' },
      },
    ],
  },
];
