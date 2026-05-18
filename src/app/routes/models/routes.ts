import { Routes } from '@angular/router';

import { ModelEditComponent } from './edit/model-edit.component';
import { ModelListComponent } from './list/model-list.component';
import { ModelRoutesComponent } from './routes/model-routes.component';

export const routes: Routes = [
  { path: '', redirectTo: 'list', pathMatch: 'full' },
  {
    path: 'list',
    component: ModelListComponent,
    data: { title: '模型映射' },
  },
  {
    path: 'edit',
    component: ModelEditComponent,
    data: { title: '新增模型映射' },
  },
  {
    path: 'edit/:guid',
    component: ModelEditComponent,
    data: { title: '编辑模型映射' },
  },
  {
    path: 'routes',
    component: ModelRoutesComponent,
    data: { title: '路由状态' },
  },
];
