import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { MasterKeyStatus, OpsMetrics } from '../../ops/ops.model';
import { OpsService } from '../../ops/ops.service';

interface SecurityGatewayConfig {
  listenAddress?: string;
  upstreamProxyEnabled?: boolean;
  upstreamProxyUrl?: string;
}

@Component({
  selector: 'app-settings-security',
  templateUrl: './settings-security.component.html',
  styleUrls: ['./settings-security.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class SettingsSecurityComponent implements OnInit {
  private readonly opsService = inject(OpsService);
  private readonly http = inject(HttpClient);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected masterKey: MasterKeyStatus | null = null;
  protected metrics: OpsMetrics | null = null;
  protected gatewayConfig: SecurityGatewayConfig | null = null;

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    forkJoin({
      masterKey: this.opsService.masterKey().pipe(catchError(() => of(null))),
      metrics: this.opsService.metrics().pipe(catchError(() => of(null))),
      gatewayConfig: this.http.get<SecurityGatewayConfig>('/ops/gateway-config').pipe(catchError(() => of(null))),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe(({ masterKey, metrics, gatewayConfig }) => {
        this.masterKey = masterKey;
        this.metrics = metrics;
        this.gatewayConfig = gatewayConfig;
      });
  }

  protected get statusLabel(): string {
    if (!this.masterKey) return '--';
    if (this.masterKey.loaded) return '已加载';
    if (this.masterKey.exists) return '文件异常';
    return '不存在';
  }

  protected get statusTone(): string {
    if (!this.masterKey) return '';
    if (this.masterKey.loaded) return 'metric-success';
    if (this.masterKey.exists) return 'metric-warning';
    return 'metric-danger';
  }

  protected get postureLabel(): string {
    if (!this.masterKey?.loaded) return '需处理';
    if (this.isLanExposed) return '注意暴露面';
    return '稳定';
  }

  protected get postureTone(): string {
    if (!this.masterKey?.loaded) return 'metric-danger';
    if (this.isLanExposed) return 'metric-warning';
    return 'metric-success';
  }

  protected get listenLabel(): string {
    const value = this.gatewayConfig?.listenAddress || '127.0.0.1';
    return value === '0.0.0.0' ? '全部网卡' : '仅本机';
  }

  protected get isLanExposed(): boolean {
    return this.gatewayConfig?.listenAddress === '0.0.0.0';
  }

  protected get upstreamProxyLabel(): string {
    return this.gatewayConfig?.upstreamProxyEnabled ? '已启用' : '未启用';
  }

  protected get proxyTargetLabel(): string {
    if (!this.gatewayConfig?.upstreamProxyEnabled) return '直连上游';
    return this.gatewayConfig.upstreamProxyUrl || '未填写代理地址';
  }

  protected get enabledKeysLabel(): string {
    return `${Number(this.metrics?.enabledKeys || 0)} 个`;
  }

  protected get availableAccountsLabel(): string {
    return `${Number(this.metrics?.availableAccounts || 0)} / ${Number(this.metrics?.accounts || 0)}`;
  }

  protected get proxyPrefixLabel(): string {
    return this.metrics?.proxyPrefix || '/v1';
  }

  protected get checklist(): Array<{ title: string; desc: string; ok: boolean; warn?: boolean }> {
    return [
      {
        title: '主密钥可用',
        desc: '账号 Secret 与平台密钥依赖主密钥解密，异常时新增、测试、转发都会受影响。',
        ok: Boolean(this.masterKey?.loaded),
      },
      {
        title: '管理入口未暴露到全部网卡',
        desc: '仅本机监听适合个人本地部署；如果开放到局域网，应确认外层有防火墙或反向代理鉴权。',
        ok: !this.isLanExposed,
        warn: this.isLanExposed,
      },
      {
        title: '平台代理密钥已启用',
        desc: '业务侧调用 /v1/* 需要平台密钥；停用无效密钥可以减少误用面。',
        ok: Number(this.metrics?.enabledKeys || 0) > 0,
      },
      {
        title: '上游账号池可用',
        desc: '可用账号为 0 时，平台密钥即使有效也无法完成代理请求。',
        ok: Number(this.metrics?.availableAccounts || 0) > 0,
      },
      {
        title: '上游代理配置完整',
        desc: '开启代理后必须填写代理地址，否则 OpenAI 登录、模型拉取和网关转发可能失败。',
        ok: !this.gatewayConfig?.upstreamProxyEnabled || Boolean(this.gatewayConfig?.upstreamProxyUrl),
      },
    ];
  }

  protected checklistTone(item: { ok: boolean; warn?: boolean }): string {
    if (item.ok && !item.warn) return 'check-ok';
    if (item.warn) return 'check-warn';
    return 'check-danger';
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
