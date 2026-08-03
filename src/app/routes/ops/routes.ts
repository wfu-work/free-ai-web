import { Routes } from '@angular/router';

import { OpsTasksComponent } from './tasks/ops-tasks.component';

export const routes: Routes = [
  { path: '', redirectTo: 'tasks', pathMatch: 'full' },
  {
    path: 'tasks',
    component: OpsTasksComponent,
    data: { title: '任务中心' },
  },
];
