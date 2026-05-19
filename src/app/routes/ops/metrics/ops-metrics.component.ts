import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { finalize, forkJoin } from 'rxjs';

import { MasterKeyStatus, OpsMetrics } from '../ops.model';
import { OpsService } from '../ops.service';

@Component({
  selector: 'app-ops-metrics',
  templateUrl: './ops-metrics.component.html',
  styleUrls: ['./ops-metrics.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class OpsMetricsComponent implements OnInit {
  private readonly opsService = inject(OpsService);
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
  protected masterKey: MasterKeyStatus | null = null;

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    forkJoin({
      metrics: this.opsService.metrics(),
      masterKey: this.opsService.masterKey(),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe(({ metrics, masterKey }) => {
        this.metrics = metrics ?? this.metrics;
        this.masterKey = masterKey ?? null;
      });
  }

  protected get serviceStatusLabel(): string {
    return this.metrics.ok ? '正常' : '异常';
  }

  protected get serviceStatusTone(): string {
    return this.metrics.ok ? 'metric-success' : 'metric-danger';
  }

  protected get accountAvailability(): string {
    return `${this.metrics.availableAccounts || 0} / ${this.metrics.accounts || 0}`;
  }

  protected get accountAvailabilityPercent(): number {
    if (!this.metrics.accounts) return 0;
    return Math.round(((this.metrics.availableAccounts || 0) / this.metrics.accounts) * 100);
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

  protected get accountPoolLabel(): string {
    if (!this.metrics.accounts) return '未配置账号';
    if (!this.metrics.availableAccounts) return '没有可用账号';
    if (this.accountAvailabilityPercent >= 80) return '账号池充足';
    if (this.accountAvailabilityPercent >= 40) return '账号池偏紧';
    return '账号池风险较高';
  }

  protected get masterKeyStatusLabel(): string {
    if (!this.masterKey) return '--';
    if (this.masterKey.loaded) return '已加载';
    if (this.masterKey.exists) return '文件异常';
    return '不存在';
  }

  protected get masterKeyTone(): string {
    if (!this.masterKey) return '';
    if (this.masterKey.loaded) return 'metric-success';
    if (this.masterKey.exists) return 'metric-warning';
    return 'metric-danger';
  }

  protected get proxyPrefixLabel(): string {
    return this.metrics.proxyPrefix || '/v1';
  }

  protected get readinessChecks(): Array<{ label: string; value: string; ok: boolean; tip: string }> {
    return [
      {
        label: '服务进程',
        value: this.serviceStatusLabel,
        ok: this.metrics.ok,
        tip: this.metrics.ok ? '管理 API 正常响应。' : '无法确认服务状态，先检查后端进程。',
      },
      {
        label: '主密钥',
        value: this.masterKeyStatusLabel,
        ok: Boolean(this.masterKey?.loaded),
        tip: this.masterKey?.loaded ? 'Secret 加解密能力可用。' : '账号密钥可能无法解密或保存。',
      },
      {
        label: '上游账号',
        value: this.accountAvailability,
        ok: (this.metrics.availableAccounts || 0) > 0,
        tip: '至少需要一个可用账号才能完成代理请求。',
      },
      {
        label: '模型映射',
        value: `${this.metrics.enabledModels || 0}`,
        ok: (this.metrics.enabledModels || 0) > 0,
        tip: '客户端请求的 model 需要能匹配到启用的模型映射。',
      },
      {
        label: '平台密钥',
        value: `${this.metrics.enabledKeys || 0}`,
        ok: (this.metrics.enabledKeys || 0) > 0,
        tip: '业务客户端通过平台密钥访问网关。',
      },
    ];
  }

  protected formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  protected formatBytes(value?: number): string {
    const size = Number(value || 0);
    if (!size) return '0 B';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
}
