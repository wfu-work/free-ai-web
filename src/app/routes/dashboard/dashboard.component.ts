import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { SHARED_IMPORTS } from '@shared';
import { PanelComponent } from 'src/app/shared/components/panel/panel.component';
import { TitleLabelComponent } from 'src/app/shared/components/title-label/title-label.component';
import { finalize, forkJoin } from 'rxjs';

import { AccountHealthItem } from '../accounts/account.model';
import { AccountsService } from '../accounts/accounts.service';
import { ModelRouteState } from '../models/model.model';
import { ModelsService } from '../models/models.service';
import { OpsMetrics, OpsStats, MasterKeyStatus } from '../ops/ops.model';
import { OpsService } from '../ops/ops.service';
import { RequestLog } from '../request-logs/request-log.model';
import { RequestLogsService } from '../request-logs/request-logs.service';
import { DashboardActiveRulesComponent } from './widgets/active-rules';
import { DashboardTrafficTrendComponent } from './widgets/traffic-trend';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SHARED_IMPORTS,
    TitleLabelComponent,
    PanelComponent,
    DashboardTrafficTrendComponent,
    DashboardActiveRulesComponent,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly opsService = inject(OpsService);
  private readonly accountsService = inject(AccountsService);
  private readonly modelsService = inject(ModelsService);
  private readonly requestLogsService = inject(RequestLogsService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected metrics: OpsMetrics = {
    ok: false,
    name: 'FreeAiGo',
    accounts: 0,
    availableAccounts: 0,
    enabledModels: 0,
    enabledKeys: 0,
  };
  protected stats: OpsStats = { total: 0, success: 0, failures: 0, avgLatencyMs: 0 };
  protected masterKey: MasterKeyStatus | null = null;
  protected healthItems: AccountHealthItem[] = [];
  protected routeStates: ModelRouteState[] = [];
  protected logs: RequestLog[] = [];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    forkJoin({
      metrics: this.opsService.metrics(),
      stats: this.opsService.stats(),
      masterKey: this.opsService.masterKey(),
      healthItems: this.accountsService.health(),
      routeStates: this.modelsService.routeStates(),
      logs: this.requestLogsService.list(200),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe(({ metrics, stats, masterKey, healthItems, routeStates, logs }) => {
        this.metrics = metrics ?? this.metrics;
        this.stats = stats ?? this.stats;
        this.masterKey = masterKey ?? null;
        this.healthItems = healthItems ?? [];
        this.routeStates = routeStates ?? [];
        this.logs = logs ?? [];
      });
  }

  protected get successRate(): string {
    if (!this.stats.total) return '--';
    return `${((this.stats.success / this.stats.total) * 100).toFixed(1)}%`;
  }

  protected get avgLatencyLabel(): string {
    return `${Number(this.stats.avgLatencyMs || 0).toFixed(0)} ms`;
  }

  protected get availableAccountsLabel(): string {
    return `${this.metrics.availableAccounts || 0} / ${this.metrics.accounts || 0}`;
  }

  protected get totalAccountsLabel(): string {
    return `${this.metrics.accounts || 0}`;
  }

  protected get enabledModelsLabel(): string {
    return `${this.metrics.enabledModels || 0}`;
  }

  protected get enabledKeysLabel(): string {
    return `${this.metrics.enabledKeys || 0}`;
  }

  protected get pendingRules(): Array<{
    name: string;
    flow: string;
    status: string;
    tone: 'success' | 'idle' | 'warning';
  }> {
    const limited = this.healthItems.filter((item) => item.status === 'limited').length;
    const cooldown = this.healthItems.filter((item) => item.status === 'cooldown').length;
    const abnormal = this.healthItems.filter((item) =>
      ['exhausted', 'disabled', 'expired', 'invalid', 'unknown'].includes(item.status),
    ).length;
    const staleRoutes = this.routeStates.filter((item) => Date.now() - (item.updatedAtUnix || 0) > 24 * 60 * 60 * 1000).length;

    return [
      {
        name: '主密钥状态',
        flow: '检查主密钥文件、路径和加载结果',
        status: this.masterKey?.loaded ? '正常' : '待处理',
        tone: this.masterKey?.loaded ? 'success' : 'warning',
      },
      {
        name: '失败请求',
        flow: '查看请求日志中的错误类型与切换原因',
        status: `${this.stats.failures || 0} 条`,
        tone: this.stats.failures > 0 ? 'warning' : 'success',
      },
      {
        name: '账号池波动',
        flow: '关注限流、冷却和异常账号',
        status: `${limited + cooldown + abnormal} 个异常`,
        tone: limited + cooldown + abnormal > 0 ? 'warning' : 'idle',
      },
      {
        name: '路由状态',
        flow: '核对 routeKey、游标和最近命中账号',
        status: staleRoutes > 0 ? `${staleRoutes} 个陈旧` : '正常',
        tone: staleRoutes > 0 ? 'warning' : 'idle',
      },
    ];
  }

  protected get trendBars(): Array<{ time: string; value: number; active?: boolean; raw?: number }> {
    const bucketCount = 8;
    const windowMs = 60 * 60 * 1000;
    const now = Date.now();
    const start = now - windowMs;
    const bucketSize = windowMs / bucketCount;
    const counts = Array.from({ length: bucketCount }, () => 0);

    for (const log of this.logs) {
      const createdAt = Number(log.createdAtUnix || 0);
      if (createdAt < start || createdAt > now) continue;
      const index = Math.min(
        bucketCount - 1,
        Math.max(0, Math.floor((createdAt - start) / bucketSize)),
      );
      counts[index] += 1;
    }

    const max = Math.max(...counts, 1);
    return counts.map((count, index) => {
      const slotStart = new Date(start + bucketSize * index);
      return {
        time: slotStart.toLocaleTimeString('zh-CN', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        }),
        raw: count,
        value: count === 0 ? 12 : Math.max(16, Math.round((count / max) * 100)),
        active: count === max && max > 0,
      };
    });
  }
}
