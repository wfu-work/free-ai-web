import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  MetricCardComponent,
  SHARED_IMPORTS,
  TitleLabelComponent,
  TokenTrendChartComponent,
  TokenTrendPoint,
  formatMetricNumber,
} from '@shared';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { UsageDimension, UsageSummary } from '../../usage/usage.model';
import { Account } from '../account.model';
import { AccountsService } from '../accounts.service';

interface UsageGridCell {
  key: string;
  timestamp: number;
  totalTokens: number;
  requests: number;
  level: number;
}

@Component({
  selector: 'app-account-detail',
  templateUrl: './account-detail.component.html',
  styleUrls: ['./account-detail.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent, MetricCardComponent, TokenTrendChartComponent],
})
export class AccountDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accountsService = inject(AccountsService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly ranges = [7, 30];
  protected account: Account | null = null;
  protected summary: UsageSummary = this.emptySummary();
  protected days = 30;
  protected loading = false;
  protected loadFailed = false;
  protected usageUnavailable = false;
  private accountGuid = '';

  private readonly statusTextMap: Record<string, string> = {
    available: '可用',
    limited: '限流',
    cooldown: '冷却',
    exhausted: '耗尽',
    disabled: '停用',
    expired: '过期',
    invalid: '失效',
    unknown: '未知',
  };

  ngOnInit(): void {
    this.accountGuid = this.route.snapshot.paramMap.get('guid')?.trim() || '';
    if (!this.accountGuid) {
      this.loadFailed = true;
      return;
    }
    this.load();
  }

  protected load(days = this.days): void {
    this.days = days;
    this.loading = true;
    this.loadFailed = false;
    this.usageUnavailable = false;
    forkJoin({
      account: this.accountsService.get(this.accountGuid),
      usage: this.accountsService.usage(this.accountGuid, days).pipe(
        catchError(() => {
          this.usageUnavailable = true;
          return of(this.emptySummary());
        }),
      ),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ account, usage }) => {
          this.account = account;
          this.summary = usage ?? this.emptySummary();
        },
        error: () => {
          this.loadFailed = true;
          this.account = null;
          this.summary = this.emptySummary();
        },
      });
  }

  protected edit(): void {
    if (!this.accountGuid) return;
    void this.router.navigate(['/accounts/edit', this.accountGuid]);
  }

  protected get totalTokens(): number {
    return Number(this.summary.inputTokens || 0) + Number(this.summary.outputTokens || 0);
  }

  protected get cacheHitRate(): string {
    const input = Number(this.summary.inputTokens || 0);
    if (input <= 0) return '--';
    return `${Math.min(100, (Number(this.summary.cachedTokens || 0) / input) * 100).toFixed(1)}%`;
  }

  protected get successRate(): string {
    if (!this.summary.totalRequests) return '--';
    return `${((this.summary.successRequests / this.summary.totalRequests) * 100).toFixed(1)}%`;
  }

  protected get tokenTrendPoints(): TokenTrendPoint[] {
    return (this.summary.timeline ?? []).map((point) => ({
      label: this.formatShortDate(point.bucketStart),
      timestamp: Number(point.bucketStart),
      inputTokens: Number(point.inputTokens || 0),
      outputTokens: Number(point.outputTokens || 0),
      cachedTokens: Number(point.cachedTokens || 0),
    }));
  }

  protected get usageGridCells(): UsageGridCell[] {
    const points = [...(this.summary.timeline ?? [])].sort(
      (left, right) => Number(left.bucketStart) - Number(right.bucketStart),
    );
    if (!points.length) return [];

    const totals = points.map(
      (point) => Number(point.inputTokens || 0) + Number(point.outputTokens || 0),
    );
    const maximum = Math.max(...totals, 0);
    return points.map((point, index) => {
      const totalTokens = totals[index];
      return {
        key: String(point.bucketStart),
        timestamp: Number(point.bucketStart),
        totalTokens,
        requests: Number(point.requests || 0),
        level: this.usageLevel(totalTokens, maximum),
      };
    });
  }

  protected get modelRows(): UsageDimension[] {
    return this.summary.models ?? [];
  }

  protected modelTokens(row: UsageDimension): number {
    return Number(row.inputTokens || 0) + Number(row.outputTokens || 0);
  }

  protected modelShare(row: UsageDimension): string {
    if (this.totalTokens <= 0) return '0%';
    return `${((this.modelTokens(row) / this.totalTokens) * 100).toFixed(1)}%`;
  }

  protected usageCellLabel(cell: UsageGridCell): string {
    return `${this.formatLongDate(cell.timestamp)}，${formatMetricNumber(cell.totalTokens)} Token，${formatMetricNumber(cell.requests)} 次请求`;
  }

  protected statusText(status?: string): string {
    return this.statusTextMap[status || 'unknown'] || status || '未知';
  }

  protected statusTone(status?: string): string {
    switch (status) {
      case 'available':
        return 'status-available';
      case 'limited':
      case 'cooldown':
        return 'status-warning';
      case 'exhausted':
      case 'expired':
      case 'invalid':
        return 'status-danger';
      default:
        return 'status-neutral';
    }
  }

  protected vendorMark(vendorCode?: string): string {
    switch ((vendorCode || '').toLowerCase()) {
      case 'openai':
        return 'OA';
      case 'google':
        return 'GG';
      case 'anthropic':
        return 'AN';
      default:
        return 'AI';
    }
  }

  protected planLabel(account: Account): string {
    return account.subscriptionPlan || account.planType || '未识别套餐';
  }

  protected formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  protected formatPeriod(): string {
    if (!this.summary.since || !this.summary.until) return `最近 ${this.days} 天`;
    return `${this.formatShortDate(this.summary.since)} - ${this.formatShortDate(this.summary.until)}`;
  }

  private usageLevel(value: number, maximum: number): number {
    if (value <= 0 || maximum <= 0) return 0;
    // 使用线性比例而不是对数比例，避免几十万/几千万的低用量被压到同一档。
    const ratio = value / maximum;
    if (ratio < 0.1) return 1;
    if (ratio < 0.25) return 2;
    if (ratio < 0.55) return 3;
    return 4;
  }

  protected formatShortDate(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  }

  private formatLongDate(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  private emptySummary(): UsageSummary {
    return {
      since: 0,
      until: 0,
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      avgLatencyMs: 0,
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      costMicrousd: 0,
      costAmount: 0,
      models: [],
      accounts: [],
      platformKeys: [],
      timeline: [],
      modelTimeline: [],
    };
  }
}
