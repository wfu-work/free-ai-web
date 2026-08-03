import { Routes } from '@angular/router';

import { UsageComponent } from './usage.component';

export const routes: Routes = [
  {
    path: '',
    component: UsageComponent,
    data: { title: '用量分析' },
  },
];
