import { Routes } from '@angular/router';

import { OpsMetricsComponent } from './metrics/ops-metrics.component';
import { OpsStatsComponent } from './stats/ops-stats.component';

export const routes: Routes = [
  { path: '', redirectTo: 'metrics', pathMatch: 'full' },
  {
    path: 'metrics',
    component: OpsMetricsComponent,
    data: { title: '运行指标' },
  },
  {
    path: 'stats',
    component: OpsStatsComponent,
    data: { title: '统计分析' },
  },
];
