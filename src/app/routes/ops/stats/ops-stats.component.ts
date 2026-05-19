import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { finalize } from 'rxjs';

import { OpsStats } from '../ops.model';
import { OpsService } from '../ops.service';

@Component({
  selector: 'app-ops-stats',
  templateUrl: './ops-stats.component.html',
  styleUrls: ['./ops-stats.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class OpsStatsComponent implements OnInit {
  private readonly opsService = inject(OpsService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected stats: OpsStats = { total: 0, success: 0, failures: 0, avgLatencyMs: 0 };

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    this.opsService
      .stats()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((stats) => {
        this.stats = stats ?? this.stats;
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

  protected get successPercent(): number {
    if (!this.stats.total) return 0;
    return Math.round((this.stats.success / this.stats.total) * 100);
  }

  protected get failurePercent(): number {
    if (!this.stats.total) return 0;
    return Math.round((this.stats.failures / this.stats.total) * 100);
  }

  protected get reliabilityLabel(): string {
    if (!this.stats.total) return '暂无请求';
    if (this.successPercent >= 99) return '非常稳定';
    if (this.successPercent >= 95) return '整体稳定';
    if (this.successPercent >= 85) return '需要关注';
    return '需要排查';
  }

  protected get latencyLabel(): string {
    const latency = Number(this.stats.avgLatencyMs || 0);
    if (!latency) return '暂无延迟数据';
    if (latency <= 1500) return '响应较快';
    if (latency <= 5000) return '延迟可接受';
    if (latency <= 12000) return '延迟偏高';
    return '延迟严重偏高';
  }

  protected get qualityScore(): number {
    if (!this.stats.total) return 0;
    const latency = Number(this.stats.avgLatencyMs || 0);
    const latencyPenalty = latency <= 0 ? 0 : Math.min(30, Math.round(latency / 500));
    return Math.max(0, Math.min(100, this.successPercent - latencyPenalty));
  }

  protected get failurePressureLabel(): string {
    if (!this.stats.failures) return '暂无失败压力';
    if (this.failurePercent <= 1) return '失败压力很低';
    if (this.failurePercent <= 5) return '失败压力可控';
    if (this.failurePercent <= 15) return '失败压力偏高';
    return '失败压力严重';
  }

  protected get successFailureRatio(): string {
    if (!this.stats.failures) return this.stats.success ? `${this.stats.success}:0` : '--';
    return `${Math.round((this.stats.success || 0) / this.stats.failures)}:1`;
  }

  protected get analysisItems(): Array<{ title: string; text: string; tone: string }> {
    return [
      {
        title: '稳定性',
        text: this.stats.total
          ? `成功率 ${this.successRate}，当前判断为“${this.reliabilityLabel}”。`
          : '暂无请求日志，完成一次调试或业务调用后这里会出现质量判断。',
        tone: this.successPercent >= 95 ? 'good' : this.successPercent >= 85 ? 'warn' : 'bad',
      },
      {
        title: '失败压力',
        text: `${this.failurePressureLabel}，失败请求 ${this.stats.failures || 0} 次，成功/失败约为 ${this.successFailureRatio}。`,
        tone: this.failurePercent <= 5 ? 'good' : this.failurePercent <= 15 ? 'warn' : 'bad',
      },
      {
        title: '延迟表现',
        text: `平均延迟 ${this.formatMs(this.stats.avgLatencyMs)}，当前判断为“${this.latencyLabel}”。`,
        tone: Number(this.stats.avgLatencyMs || 0) <= 5000 ? 'good' : Number(this.stats.avgLatencyMs || 0) <= 12000 ? 'warn' : 'bad',
      },
    ];
  }

  protected formatMs(value?: number): string {
    if (value === undefined || value === null || Number.isNaN(Number(value))) return '-';
    return `${Number(value).toFixed(1)} ms`;
  }
}
