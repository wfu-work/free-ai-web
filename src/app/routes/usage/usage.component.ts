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
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';

import { UsageDimension, UsageSummary } from './usage.model';
import { UsageService } from './usage.service';

type UsageDimensionKey = 'models' | 'accounts' | 'platformKeys';
type AnalysisTone = 'good' | 'warn' | 'bad' | 'neutral';

@Component({
  selector: 'app-usage',
  templateUrl: './usage.component.html',
  styleUrls: ['./usage.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SHARED_IMPORTS,
    TitleLabelComponent,
    TokenTrendChartComponent,
    ModelCallTrendChartComponent,
  ],
})
export class UsageComponent implements OnInit {
  private readonly usageService = inject(UsageService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly ranges = [1, 7, 30, 90];
  protected readonly dimensions: Array<{ key: UsageDimensionKey; label: string }> = [
    { key: 'models', label: '按模型' },
    { key: 'accounts', label: '按账号' },
    { key: 'platformKeys', label: '按 API 密钥' },
  ];
  protected days = 1;
  protected dimension: UsageDimensionKey = 'models';
  protected loading = false;
  protected summary: UsageSummary = this.emptySummary();

  ngOnInit(): void {
    this.load();
  }

  protected load(days = this.days): void {
    this.days = days;
    this.loading = true;
    this.usageService
      .summary(days)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (summary) => {
          this.summary = summary ?? this.emptySummary();
        },
        error: () => {
          this.message.error('用量数据加载失败');
          this.summary = this.emptySummary();
        },
      });
  }

  protected get rows(): UsageDimension[] {
    return this.summary[this.dimension] ?? [];
  }

  protected get successRate(): string {
    if (!this.summary.totalRequests) return '--';
    return `${((this.summary.successRequests / this.summary.totalRequests) * 100).toFixed(1)}%`;
  }

  protected get failureRate(): string {
    if (!this.summary.totalRequests) return '--';
    return `${((this.summary.failedRequests / this.summary.totalRequests) * 100).toFixed(1)}%`;
  }

  protected get successPercent(): number {
    if (!this.summary.totalRequests) return 0;
    return Math.round((this.summary.successRequests / this.summary.totalRequests) * 100);
  }

  protected get failurePercent(): number {
    if (!this.summary.totalRequests) return 0;
    return Math.round((this.summary.failedRequests / this.summary.totalRequests) * 100);
  }

  protected get qualityScore(): number {
    if (!this.summary.totalRequests) return 0;
    const latency = Number(this.summary.avgLatencyMs || 0);
    const latencyPenalty = latency <= 0 ? 0 : Math.min(30, Math.round(latency / 500));
    return Math.max(0, Math.min(100, this.successPercent - latencyPenalty));
  }

  protected get qualityStrokeColor(): string {
    if (!this.summary.totalRequests) return '#8a94a6';
    if (this.qualityScore >= 90) return '#14856e';
    if (this.qualityScore >= 70) return '#b7791f';
    return '#c24141';
  }

  protected get reliabilityLabel(): string {
    if (!this.summary.totalRequests) return '暂无请求';
    if (this.successPercent >= 99) return '非常稳定';
    if (this.successPercent >= 95) return '整体稳定';
    if (this.successPercent >= 85) return '需要关注';
    return '需要排查';
  }

  protected get latencyLabel(): string {
    const latency = Number(this.summary.avgLatencyMs || 0);
    if (!this.summary.totalRequests) return '暂无延迟数据';
    if (latency <= 1500) return '响应较快';
    if (latency <= 5000) return '延迟可接受';
    if (latency <= 12000) return '延迟偏高';
    return '延迟严重偏高';
  }

  protected get failurePressureLabel(): string {
    if (!this.summary.totalRequests) return '暂无请求数据';
    if (!this.summary.failedRequests) return '暂无失败压力';
    if (this.failurePercent <= 1) return '失败压力很低';
    if (this.failurePercent <= 5) return '失败压力可控';
    if (this.failurePercent <= 15) return '失败压力偏高';
    return '失败压力严重';
  }

  protected get analysisItems(): Array<{ title: string; text: string; tone: AnalysisTone }> {
    if (!this.summary.totalRequests) {
      return [
        {
          title: '等待请求数据',
          text: '完成一次调试或业务调用后，这里会按当前时间范围生成质量判断。',
          tone: 'neutral',
        },
      ];
    }
    return [
      {
        title: '稳定性',
        text: `成功率 ${this.successRate}，当前判断为“${this.reliabilityLabel}”。`,
        tone: this.successPercent >= 95 ? 'good' : this.successPercent >= 85 ? 'warn' : 'bad',
      },
      {
        title: '失败压力',
        text: `${this.failurePressureLabel}，失败 ${this.formatNumber(this.summary.failedRequests)} 次，失败率 ${this.failureRate}。`,
        tone: this.failurePercent <= 5 ? 'good' : this.failurePercent <= 15 ? 'warn' : 'bad',
      },
      {
        title: '延迟表现',
        text: `平均延迟 ${this.formatMs(this.summary.avgLatencyMs)}，当前判断为“${this.latencyLabel}”。`,
        tone:
          Number(this.summary.avgLatencyMs || 0) <= 5000
            ? 'good'
            : Number(this.summary.avgLatencyMs || 0) <= 12000
              ? 'warn'
              : 'bad',
      },
    ];
  }

  protected get totalTokens(): number {
    return Number(this.summary.inputTokens || 0) + Number(this.summary.outputTokens || 0);
  }

  protected get tokenTrendSubtitle(): string {
    return this.days === 1
      ? '按小时聚合输入、输出与缓存命中，帮助识别一天内的用量波动和缓存效率变化。'
      : '按天聚合输入、输出与缓存命中，帮助识别用量增长和缓存效率变化。';
  }

  protected get modelTrendSubtitle(): string {
    return this.days === 1
      ? '按小时对比不同模型的调用次数，观察一天内的主力模型与流量变化。'
      : '按天对比不同模型的调用次数，观察主力模型、流量迁移与长尾调用。';
  }

  protected get tokenTrendPoints(): TokenTrendPoint[] {
    return (this.summary.timeline ?? []).map((point) => ({
      label: this.formatTimelineLabel(point.bucketStart),
      timestamp: point.bucketStart,
      inputTokens: Number(point.inputTokens || 0),
      outputTokens: Number(point.outputTokens || 0),
      cachedTokens: Number(point.cachedTokens || 0),
    }));
  }

  protected get modelTrendLabels(): string[] {
    return this.modelTrendBucketStarts.map((value) => this.formatTimelineLabel(value));
  }

  protected get modelTrendSeries(): ModelCallTrendSeries[] {
    const bucketStarts = this.modelTrendBucketStarts;
    return (this.summary.modelTimeline ?? []).map((series) => {
      const requestsByBucket = new Map(
        (series.points ?? []).map((point) => [
          Number(point.bucketStart),
          Number(point.requests || 0),
        ]),
      );
      return {
        model: series.model || '未标识',
        totalRequests: Number(series.totalRequests || 0),
        data: bucketStarts.map((bucketStart) => requestsByBucket.get(bucketStart) || 0),
      };
    });
  }

  protected formatNumber(value?: number): string {
    return Number(value || 0).toLocaleString('zh-CN');
  }

  protected formatCost(value?: number): string {
    return `$${Number(value || 0).toFixed(4)}`;
  }

  protected formatMs(value?: number): string {
    if (value === undefined || value === null || Number.isNaN(Number(value))) return '-';
    return `${Number(value).toFixed(1)} ms`;
  }

  protected formatDate(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
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

  private get modelTrendBucketStarts(): number[] {
    const timeline = this.summary.timeline ?? [];
    if (timeline.length) return timeline.map((point) => Number(point.bucketStart));
    return (this.summary.modelTimeline?.[0]?.points ?? []).map((point) =>
      Number(point.bucketStart),
    );
  }

  private formatTimelineLabel(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    if (this.days === 1) {
      return date.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    }
    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
    });
  }
}
