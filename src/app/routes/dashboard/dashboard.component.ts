import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import {
  ModelCallTrendChartComponent,
  ModelCallTrendSeries,
  SHARED_IMPORTS,
  TitleLabelComponent,
  TokenTrendChartComponent,
  TokenTrendPoint,
} from '@shared';
import { finalize, forkJoin } from 'rxjs';

import { AccountHealthItem } from '../accounts/account.model';
import { AccountsService } from '../accounts/accounts.service';
import { MasterKeyStatus, OpsMetrics, OpsStats } from '../ops/ops.model';
import { OpsService } from '../ops/ops.service';
import { RequestLog } from '../request-logs/request-log.model';
import { RequestLogsService } from '../request-logs/request-logs.service';

type TrendRangeValue = '1h' | '12h' | '1d' | '2d' | '3d' | '1w' | '1m';
type SignalTone = 'success' | 'idle' | 'warning';

interface TrendRangeOption {
  label: string;
  value: TrendRangeValue;
  ms: number;
  buckets: number;
  limit: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SHARED_IMPORTS,
    TitleLabelComponent,
    TokenTrendChartComponent,
    ModelCallTrendChartComponent,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly opsService = inject(OpsService);
  private readonly accountsService = inject(AccountsService);
  private readonly requestLogsService = inject(RequestLogsService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected lastUpdatedAt = 0;
  protected trendUntil = Date.now();
  protected trendRange: TrendRangeValue = '1h';
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
  protected logs: RequestLog[] = [];

  protected readonly trendRangeOptions: TrendRangeOption[] = [
    { label: '最近 1 小时', value: '1h', ms: 60 * 60 * 1000, buckets: 12, limit: 1000 },
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
    this.trendUntil = Date.now();
    forkJoin({
      metrics: this.opsService.metrics(),
      stats: this.opsService.stats(),
      masterKey: this.opsService.masterKey(),
      healthItems: this.accountsService.health(),
      logs: this.requestLogsService.list(this.selectedTrendRange.limit, this.trendStartAt),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe(({ metrics, stats, masterKey, healthItems, logs }) => {
        this.metrics = metrics ?? this.metrics;
        this.stats = stats ?? this.stats;
        this.masterKey = masterKey ?? null;
        this.healthItems = healthItems ?? [];
        this.logs = logs ?? [];
        this.lastUpdatedAt = Date.now();
      });
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
    if (this.readinessScore >= 90) return '运行就绪';
    if (this.readinessScore >= 65) return '需要关注';
    return '等待配置';
  }

  protected get readinessTone(): 'success' | 'warning' | 'danger' {
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
      ['limited', 'cooldown', 'exhausted', 'disabled', 'expired', 'invalid', 'unknown'].includes(
        item.status,
      ),
    ).length;
  }

  protected get recentRequestCount(): number {
    return this.windowLogs.length;
  }

  protected get recentFailureCount(): number {
    return this.windowLogs.filter((log) => this.isFailureLog(log)).length;
  }

  protected get recentSuccessRate(): string {
    if (!this.recentRequestCount) return '--';
    return `${(((this.recentRequestCount - this.recentFailureCount) / this.recentRequestCount) * 100).toFixed(1)}%`;
  }

  protected get recentAverageLatencyLabel(): string {
    if (!this.recentRequestCount) return '--';
    const total = this.windowLogs.reduce((sum, log) => sum + Number(log.latencyMs || 0), 0);
    return this.formatDuration(total / this.recentRequestCount);
  }

  protected get recentTokenCount(): number {
    return this.windowLogs.reduce(
      (total, log) => total + Number(log.inputTokens || 0) + Number(log.outputTokens || 0),
      0,
    );
  }

  protected get trendPeriodLabel(): string {
    return `${this.selectedTrendRange.label} · ${this.recentRequestCount} 次请求`;
  }

  protected get tokenTrendPoints(): TokenTrendPoint[] {
    const range = this.selectedTrendRange;
    const start = this.trendUntil - range.ms;
    const bucketSize = range.ms / range.buckets;
    const points = Array.from({ length: range.buckets }, (_, index) => ({
      label: this.formatTrendTime(new Date(start + index * bucketSize)),
      timestamp: start + index * bucketSize,
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
    }));

    for (const log of this.windowLogs) {
      const index = Math.min(
        points.length - 1,
        Math.max(0, Math.floor((this.logTime(log) - start) / bucketSize)),
      );
      points[index].inputTokens += Number(log.inputTokens || 0);
      points[index].outputTokens += Number(log.outputTokens || 0);
      points[index].cachedTokens += Number(log.cachedInputTokens || 0);
    }
    return points;
  }

  protected get modelTrendLabels(): string[] {
    return this.tokenTrendPoints.map((point) => point.label);
  }

  protected get modelTrendSeries(): ModelCallTrendSeries[] {
    const totals = new Map<string, number>();
    for (const log of this.windowLogs) {
      const model = (log.model || '').trim() || '未标识';
      totals.set(model, (totals.get(model) || 0) + 1);
    }

    const topModels = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([model]) => model);
    const topModelSet = new Set(topModels);
    const names = totals.size > topModels.length ? [...topModels, '其他'] : topModels;
    const data = new Map(
      names.map((model) => [model, Array(this.selectedTrendRange.buckets).fill(0)]),
    );
    const start = this.trendUntil - this.selectedTrendRange.ms;
    const bucketSize = this.selectedTrendRange.ms / this.selectedTrendRange.buckets;

    for (const log of this.windowLogs) {
      const model = (log.model || '').trim() || '未标识';
      const target = topModelSet.has(model) ? model : '其他';
      const values = data.get(target);
      if (!values) continue;
      const index = Math.min(
        values.length - 1,
        Math.max(0, Math.floor((this.logTime(log) - start) / bucketSize)),
      );
      values[index] += 1;
    }

    return names.map((model) => ({
      model,
      totalRequests: data.get(model)?.reduce((sum, value) => sum + value, 0) || 0,
      data: data.get(model) || [],
    }));
  }

  protected get pendingSignals(): Array<{
    name: string;
    description: string;
    status: string;
    tone: SignalTone;
  }> {
    const accountTone: SignalTone = this.abnormalAccounts ? 'warning' : 'success';
    return [
      {
        name: '主密钥',
        description: '本地网关认证入口',
        status: this.masterKey?.loaded ? '已加载' : '未加载',
        tone: this.masterKey?.loaded ? 'success' : 'warning',
      },
      {
        name: '账号池',
        description: `${this.metrics.availableAccounts || 0} / ${this.metrics.accounts || 0} 个账号可用`,
        status: this.abnormalAccounts ? `${this.abnormalAccounts} 个异常` : '状态正常',
        tone: accountTone,
      },
      {
        name: '窗口请求',
        description: `${this.selectedTrendRange.label}请求质量`,
        status: this.recentFailureCount ? `${this.recentFailureCount} 次失败` : '无失败',
        tone: this.recentFailureCount ? 'warning' : 'success',
      },
      {
        name: '模型与密钥',
        description: `${this.metrics.enabledModels || 0} 个模型 · ${this.metrics.enabledKeys || 0} 个密钥`,
        status: this.metrics.enabledModels && this.metrics.enabledKeys ? '可以接入' : '待配置',
        tone: this.metrics.enabledModels && this.metrics.enabledKeys ? 'success' : 'idle',
      },
    ];
  }

  protected get accountGroupHealthRows(): Array<{
    group: string;
    total: number;
    available: number;
    abnormal: number;
    percent: number;
  }> {
    const map = new Map<string, { total: number; available: number; abnormal: number }>();
    for (const item of this.healthItems) {
      const group = item.accountGroup || 'default';
      const current = map.get(group) || { total: 0, available: 0, abnormal: 0 };
      current.total += 1;
      if (item.enabled && item.status === 'available') current.available += 1;
      if (!item.enabled || item.status !== 'available') current.abnormal += 1;
      map.set(group, current);
    }
    return Array.from(map.entries())
      .map(([group, item]) => ({
        group,
        ...item,
        percent: item.total ? Math.round((item.available / item.total) * 100) : 0,
      }))
      .sort((a, b) => b.abnormal - a.abnormal || b.total - a.total)
      .slice(0, 5);
  }

  protected get errorRows(): Array<{ label: string; count: number; percent: number }> {
    const map = new Map<string, number>();
    for (const log of this.windowLogs) {
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

  protected get recentLogs(): RequestLog[] {
    return this.sortedLogs.slice(0, 6);
  }

  protected onTrendRangeChange(value: string): void {
    this.trendRange = this.trendRangeOptions.some((item) => item.value === value)
      ? (value as TrendRangeValue)
      : '1h';
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

  protected formatDuration(value?: number): string {
    const milliseconds = Number(value || 0);
    if (milliseconds <= 0) return '-';
    if (milliseconds < 1000) return `${Math.round(milliseconds)} ms`;
    return `${(milliseconds / 1000).toFixed(milliseconds >= 10_000 ? 0 : 1)} s`;
  }

  protected formatCompact(value?: number): string {
    const count = Number(value || 0);
    if (Math.abs(count) >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`;
    if (Math.abs(count) >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (Math.abs(count) >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return Math.round(count).toLocaleString('zh-CN');
  }

  protected shortText(value?: string, fallback = '-'): string {
    const text = (value || '').trim();
    if (!text) return fallback;
    return text.length > 18 ? `${text.slice(0, 14)}...` : text;
  }

  private get selectedTrendRange(): TrendRangeOption {
    return (
      this.trendRangeOptions.find((item) => item.value === this.trendRange) ||
      this.trendRangeOptions[0]
    );
  }

  private get trendStartAt(): number {
    return this.trendUntil - this.selectedTrendRange.ms;
  }

  private get windowLogs(): RequestLog[] {
    return this.logs.filter((log) => {
      const time = this.logTime(log);
      return time >= this.trendStartAt && time <= this.trendUntil;
    });
  }

  private get sortedLogs(): RequestLog[] {
    return [...this.windowLogs].sort((a, b) => this.logTime(b) - this.logTime(a));
  }

  private formatTrendTime(date: Date): string {
    if (this.trendRange === '1h' || this.trendRange === '12h') {
      return date.toLocaleTimeString('zh-CN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    if (this.trendRange === '1d' || this.trendRange === '2d' || this.trendRange === '3d') {
      return date.toLocaleString('zh-CN', {
        hour12: false,
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
      });
    }
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  }
}
