import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { MasterKeyStatus } from '../../ops/ops.model';
import { OpsService } from '../../ops/ops.service';

interface SecurityGatewayConfig {
  listenAddress?: string;
  upstreamProxyEnabled?: boolean;
  upstreamProxyUrl?: string;
}

type DiagnosticStatus = 'ok' | 'warning' | 'danger' | 'unknown';

interface DiagnosticItem {
  title: string;
  desc: string;
  icon: string;
  status: DiagnosticStatus;
  statusLabel: string;
  actionLabel?: string;
  link?: string;
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
  protected gatewayConfig: SecurityGatewayConfig | null = null;

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    forkJoin({
      masterKey: this.opsService.masterKey().pipe(catchError(() => of(null))),
      gatewayConfig: this.http
        .get<SecurityGatewayConfig>('/ops/gateway-config')
        .pipe(catchError(() => of(null))),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe(({ masterKey, gatewayConfig }) => {
        this.masterKey = masterKey;
        this.gatewayConfig = gatewayConfig;
      });
  }

  protected get statusLabel(): string {
    if (!this.masterKey) return '无法获取';
    if (this.masterKey.loaded) return '可用';
    if (this.masterKey.exists) return '文件异常';
    return '不存在';
  }

  protected get postureLabel(): string {
    if (this.hasIncompleteData) return '状态获取不完整';
    if (this.issueCount > 0) return `发现 ${this.issueCount} 项需要关注`;
    return '未发现明显风险';
  }

  protected get postureTone(): string {
    if (this.hasIncompleteData) return 'posture-unknown';
    if (!this.masterKey?.loaded) return 'posture-danger';
    if (this.issueCount > 0) return 'posture-warning';
    return 'posture-success';
  }

  protected get postureStatus(): string {
    if (this.hasIncompleteData) return '检查不完整';
    if (!this.masterKey?.loaded) return '需立即处理';
    if (this.issueCount > 0) return '需关注';
    return '全部通过';
  }

  protected get listenLabel(): string {
    if (!this.gatewayConfig) return '无法获取';
    const value = this.gatewayConfig?.listenAddress || '127.0.0.1';
    return value === '0.0.0.0' ? '全部网卡' : '仅本机';
  }

  protected get isLanExposed(): boolean {
    return this.gatewayConfig?.listenAddress === '0.0.0.0';
  }

  protected get upstreamProxyLabel(): string {
    if (!this.gatewayConfig) return '无法获取';
    return this.gatewayConfig?.upstreamProxyEnabled ? '已启用' : '未启用';
  }

  protected get isProxyConfigIncomplete(): boolean {
    return Boolean(
      this.gatewayConfig?.upstreamProxyEnabled && !this.gatewayConfig.upstreamProxyUrl,
    );
  }

  protected get proxyTargetLabel(): string {
    if (!this.gatewayConfig) return '无法获取';
    if (!this.gatewayConfig?.upstreamProxyEnabled) return '直连上游';
    return this.gatewayConfig.upstreamProxyUrl || '未填写代理地址';
  }

  protected get hasIncompleteData(): boolean {
    return !this.masterKey || !this.gatewayConfig;
  }

  protected get issueCount(): number {
    return this.checklist.filter((item) => item.status === 'warning' || item.status === 'danger')
      .length;
  }

  protected get checklist(): DiagnosticItem[] {
    return [
      {
        title: '主密钥可用',
        desc: !this.masterKey
          ? '暂时无法读取主密钥状态，请刷新后重试。'
          : this.masterKey.loaded
            ? '账号凭据和 API 密钥可以正常加密与解密。'
            : '账号凭据和 API 密钥依赖主密钥；请检查文件是否存在、内容是否有效以及服务进程是否有读取权限。',
        icon: 'key',
        status: !this.masterKey ? 'unknown' : this.masterKey.loaded ? 'ok' : 'danger',
        statusLabel: !this.masterKey ? '无法获取' : this.masterKey.loaded ? '通过' : '未通过',
      },
      {
        title: '管理入口暴露面',
        desc: !this.gatewayConfig
          ? '暂时无法读取监听配置，请刷新后重试。'
          : this.isLanExposed
            ? '当前监听全部网卡。请确认局域网边界已有防火墙、访问控制或反向代理鉴权。'
            : '当前仅监听本机地址，适合个人本地部署。',
        icon: 'global',
        status: !this.gatewayConfig ? 'unknown' : this.isLanExposed ? 'warning' : 'ok',
        statusLabel: !this.gatewayConfig ? '无法获取' : this.isLanExposed ? '需关注' : '通过',
        actionLabel: '前往网关设置',
        link: '/settings/gateway',
      },
      {
        title: '上游代理配置完整',
        desc: !this.gatewayConfig
          ? '暂时无法读取上游代理配置，请刷新后重试。'
          : this.gatewayConfig.upstreamProxyEnabled && !this.gatewayConfig.upstreamProxyUrl
            ? '代理已开启但未填写地址，OpenAI 登录、模型拉取和请求转发可能失败。'
            : this.gatewayConfig.upstreamProxyEnabled
              ? '上游代理已开启且目标地址完整。'
              : '当前直连 OpenAI 上游，不依赖额外代理配置。',
        icon: 'cloud',
        status: !this.gatewayConfig
          ? 'unknown'
          : this.gatewayConfig.upstreamProxyEnabled && !this.gatewayConfig.upstreamProxyUrl
            ? 'danger'
            : 'ok',
        statusLabel: !this.gatewayConfig
          ? '无法获取'
          : this.gatewayConfig.upstreamProxyEnabled && !this.gatewayConfig.upstreamProxyUrl
            ? '未通过'
            : '通过',
        actionLabel: '前往网关设置',
        link: '/settings/gateway',
      },
    ];
  }

  protected checklistTone(item: DiagnosticItem): string {
    return `check-${item.status}`;
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
    if (value === undefined || value === null) return '-';
    const size = Number(value);
    if (!Number.isFinite(size) || size < 0) return '-';
    if (!size) return '0 B';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
}
