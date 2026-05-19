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

type TrendRangeValue = '1h' | '12h' | '1d' | '2d' | '3d' | '1w' | '1m';

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
  protected trendRange: TrendRangeValue = '1h';
  protected readonly trendRangeOptions: Array<{ label: string; value: TrendRangeValue; ms: number; buckets: number; limit: number }> = [
    { label: '最近 1 小时', value: '1h', ms: 60 * 60 * 1000, buckets: 8, limit: 1000 },
    { label: '最近 12 小时', value: '12h', ms: 12 * 60 * 60 * 1000, buckets: 12, limit: 3000 },
    { label: '最近 1 天', value: '1d', ms: 24 * 60 * 60 * 1000, buckets: 12, limit: 5000 },
    { label: '最近 2 天', value: '2d', ms: 2 * 24 * 60 * 60 * 1000, buckets: 12, limit: 8000 },
    { label: '最近 3 天', value: '3d', ms: 3 * 24 * 60 * 60 * 1000, buckets: 12, limit: 10000 },
    { label: '最近 1 周', value: '1w', ms: 7 * 24 * 60 * 60 * 1000, buckets: 14, limit: 20000 },
    { label: '最近 1 月', value: '1m', ms: 30 * 24 * 60 * 60 * 1000, buckets: 15, limit: 50000 },
  ];

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
      logs: this.requestLogsService.list(this.selectedTrendRange.limit, this.trendStartAt),
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

  protected get failureRate(): string {
    if (!this.stats.total) return '--';
    return `${((this.stats.failures / this.stats.total) * 100).toFixed(1)}%`;
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

  protected get readinessScore(): number {
    let score = 0;
    if (this.metrics.ok) score += 25;
    if (this.masterKey?.loaded) score += 25;
    if ((this.metrics.availableAccounts || 0) > 0) score += 20;
    if ((this.metrics.enabledModels || 0) > 0) score += 15;
    if ((this.metrics.enabledKeys || 0) > 0) score += 15;
    return score;
  }

  protected get readinessLabel(): string {
    if (this.readinessScore >= 90) return '可接入';
    if (this.readinessScore >= 65) return '需关注';
    return '待配置';
  }

  protected get readinessTone(): string {
    if (this.readinessScore >= 90) return 'success';
    if (this.readinessScore >= 65) return 'warning';
    return 'danger';
  }

  protected get accountAvailabilityPercent(): number {
    if (!this.metrics.accounts) return 0;
    return Math.round(((this.metrics.availableAccounts || 0) / this.metrics.accounts) * 100);
  }

  protected get abnormalAccounts(): number {
    return this.healthItems.filter((item) =>
      ['limited', 'cooldown', 'exhausted', 'disabled', 'expired', 'invalid', 'unknown'].includes(item.status),
    ).length;
  }

  protected get recentRequestCount(): number {
    return this.logs.filter((log) => this.logTime(log) >= this.trendStartAt).length;
  }

  protected get recentFailureCount(): number {
    return this.logs.filter((log) => this.logTime(log) >= this.trendStartAt && this.isFailureLog(log)).length;
  }

  protected get latestRequestLabel(): string {
    const latest = this.sortedLogs[0];
    if (!latest) return '暂无请求';
    return this.formatTime(this.logTime(latest));
  }

  protected get qualityLabel(): string {
    if (!this.stats.total) return '等待请求数据';
    const success = this.stats.total ? (this.stats.success / this.stats.total) * 100 : 0;
    if (success >= 99) return '请求质量很好';
    if (success >= 95) return '请求质量稳定';
    if (success >= 85) return '请求质量需关注';
    return '请求质量需排查';
  }

  protected get providerHealthRows(): Array<{
    provider: string;
    total: number;
    available: number;
    abnormal: number;
    percent: number;
  }> {
    const map = new Map<string, { total: number; available: number; abnormal: number }>();
    for (const item of this.healthItems) {
      const provider = item.provider || item.supplierName || 'unknown';
      const current = map.get(provider) || { total: 0, available: 0, abnormal: 0 };
      current.total += 1;
      if (item.enabled && item.status === 'available') current.available += 1;
      if (!item.enabled || item.status !== 'available') current.abnormal += 1;
      map.set(provider, current);
    }
    return Array.from(map.entries())
      .map(([provider, item]) => ({
        provider,
        ...item,
        percent: item.total ? Math.round((item.available / item.total) * 100) : 0,
      }))
      .sort((a, b) => b.abnormal - a.abnormal || b.total - a.total)
      .slice(0, 5);
  }

  protected get recentLogs(): RequestLog[] {
    return this.sortedLogs.slice(0, 6);
  }

  protected get errorRows(): Array<{ label: string; count: number; percent: number }> {
    const map = new Map<string, number>();
    for (const log of this.logs) {
      if (!this.isFailureLog(log)) continue;
      const label = log.errorType || String(log.statusCode || 'unknown');
      map.set(label, (map.get(label) || 0) + 1);
    }
    const total = Array.from(map.values()).reduce((sum, count) => sum + count, 0);
    return Array.from(map.entries())
      .map(([label, count]) => ({
        label,
        count,
        percent: total ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  protected get routeRows(): ModelRouteState[] {
    return [...this.routeStates]
      .sort((a, b) => Number(b.updatedAtUnix || 0) - Number(a.updatedAtUnix || 0))
      .slice(0, 5);
  }

  protected get insightCards(): Array<{ title: string; value: string; text: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> {
    return [
      {
        title: '最近请求',
        value: `${this.recentRequestCount}`,
        text: `${this.selectedTrendRange.label}失败 ${this.recentFailureCount} 次，最新请求 ${this.latestRequestLabel}。`,
        tone: this.recentFailureCount > 0 ? 'warning' : 'success',
      },
      {
        title: '账号风险',
        value: `${this.abnormalAccounts}`,
        text: `可用率 ${this.accountAvailabilityPercent}%，异常包含限流、冷却、过期、失效和禁用账号。`,
        tone: this.abnormalAccounts > 0 ? 'warning' : 'success',
      },
      {
        title: '请求质量',
        value: this.successRate,
        text: `${this.qualityLabel}，平均延迟 ${this.avgLatencyLabel}，失败率 ${this.failureRate}。`,
        tone: this.stats.failures > 0 ? 'warning' : 'success',
      },
    ];
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
    const bucketCount = this.selectedTrendRange.buckets;
    const windowMs = this.selectedTrendRange.ms;
    const now = Date.now();
    const start = now - windowMs;
    const bucketSize = windowMs / bucketCount;
    const counts = Array.from({ length: bucketCount }, () => 0);

    for (const log of this.logs) {
      const createdAt = this.logTime(log);
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
        time: this.formatTrendTime(slotStart),
        raw: count,
        value: count === 0 ? 12 : Math.max(16, Math.round((count / max) * 100)),
        active: count === max && max > 0,
      };
    });
  }

  protected get trendBadge(): string {
    return `${this.selectedTrendRange.label} · ${this.recentRequestCount} 次请求`;
  }

  protected onTrendRangeChange(value: string): void {
    this.trendRange = this.trendRangeOptions.some((item) => item.value === value) ? (value as TrendRangeValue) : '1h';
    this.logs = [];
    this.cdr.markForCheck();
    this.load();
  }

  protected logTime(log: RequestLog): number {
    return Number(log.createdAtUnix || log.createTime || 0);
  }

  protected isFailureLog(log: RequestLog): boolean {
    return Number(log.statusCode || 0) >= 400 || Boolean(log.errorType);
  }

  protected formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', {
      hour12: false,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected formatMs(value?: number): string {
    if (value === undefined || value === null || Number.isNaN(Number(value))) return '-';
    return `${Number(value).toFixed(0)} ms`;
  }

  protected shortText(value?: string, fallback = '-'): string {
    const text = (value || '').trim();
    if (!text) return fallback;
    return text.length > 18 ? `${text.slice(0, 14)}...` : text;
  }

  private get selectedTrendRange(): { label: string; value: TrendRangeValue; ms: number; buckets: number; limit: number } {
    return this.trendRangeOptions.find((item) => item.value === this.trendRange) || this.trendRangeOptions[0];
  }

  private get trendStartAt(): number {
    return Date.now() - this.selectedTrendRange.ms;
  }

  private get sortedLogs(): RequestLog[] {
    return [...this.logs].sort((a, b) => this.logTime(b) - this.logTime(a));
  }

  private formatTrendTime(date: Date): string {
    if (this.trendRange === '1h' || this.trendRange === '12h') {
      return date.toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    if (this.trendRange === '1d') {
      return date.toLocaleString('zh-CN', {
        hour12: false,
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
      });
    }
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
  }
}
