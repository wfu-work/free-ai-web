import { Routes } from '@angular/router';

import { ModelEditComponent } from './edit/model-edit.component';
import { ModelListComponent } from './list/model-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  {
    path: 'list',
    component: ModelListComponent,
    data: { title: '模型目录' },
  },
  {
    path: 'edit/:guid',
    component: ModelEditComponent,
    data: { title: '模型对外策略' },
  },
];
