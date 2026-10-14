import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MetricCardComponent, SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';

import { clearLegacyGatewayConfigStorage } from '../../../shared/utils/gateway-config-storage.util';

interface GatewayConfig {
  listenAddress: string;
  accountSelectionStrategy: string;
  originator: string;
  residency: string;
  upstreamProxyEnabled: boolean;
  upstreamProxyRequired: boolean;
  upstreamProxyUrl: string;
  upstreamProxyHasCredentials: boolean;
  sseKeepAliveMs: number;
  upstreamTimeoutMs: number;
  upstreamStreamIdleTimeoutMs: number;
  maxConcurrentRequests: number;
  maxRequestBodyMiB: number;
  maxRetries: number;
  overloadQueueTimeoutMs: number;
  contextCompactionEnabled: boolean;
  contextCompactionThresholdTokens: number;
}

interface UpstreamProxyTestResult {
  proxyAddress: string;
  exitIp?: string;
  checkedAt: number;
  checks: Array<{
    name: string;
    reachable: boolean;
    statusCode?: number;
    latencyMs: number;
    message: string;
  }>;
}

const DEFAULT_GATEWAY_CONFIG: GatewayConfig = {
  listenAddress: '127.0.0.1',
  accountSelectionStrategy: 'round_robin',
  originator: 'codex_cli_rs',
  residency: '',
  upstreamProxyEnabled: false,
  upstreamProxyRequired: false,
  upstreamProxyUrl: '',
  upstreamProxyHasCredentials: false,
  sseKeepAliveMs: 15000,
  upstreamTimeoutMs: 120000,
  upstreamStreamIdleTimeoutMs: 1800000,
  maxConcurrentRequests: 128,
  maxRequestBodyMiB: 8,
  maxRetries: 1,
  overloadQueueTimeoutMs: 0,
  contextCompactionEnabled: true,
  contextCompactionThresholdTokens: 100000,
};

@Component({
  selector: 'app-settings-gateway',
  templateUrl: './settings-gateway.component.html',
  styleUrls: ['./settings-gateway.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent, MetricCardComponent],
})
export class SettingsGatewayComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected saving = false;
  protected configLoaded = false;
  protected testingProxy = false;
  protected proxyTestError = '';
  private testedProxyUrl = '';
  private proxyTestResult: UpstreamProxyTestResult | null = null;

  protected readonly listenAddressOptions = [
    { label: '仅本机 (127.0.0.1)', value: '127.0.0.1' },
    { label: '全部网卡 (0.0.0.0)', value: '0.0.0.0' },
  ];

  protected readonly strategyOptions = [
    {
      label: '顺序优先 (Ordered)',
      value: 'ordered',
      description: '始终优先使用排序靠前的可用账号；失败重试时再切换到后续账号。',
    },
    {
      label: '自适应均衡 (Adaptive)',
      value: 'round_robin',
      description: '推荐。结合账号权重、近期首响、过载率和当前并发动态分流。',
    },
    {
      label: '纯轮询 (Round Robin)',
      value: 'equal_round_robin',
      description: '忽略账号权重，按顺序平均轮换所有可用账号。',
    },
    {
      label: '静态权重轮询 (Weighted)',
      value: 'weighted',
      description: '严格按照账号权重比例分流，不根据实时性能自动调整。',
    },
    {
      label: '额度优先 (Quota First)',
      value: 'quota_first',
      description: '优先选择最紧张额度窗口剩余比例更高的账号。',
    },
    {
      label: '会话亲和 (Sticky)',
      value: 'session_affinity',
      description: '根据会话标识稳定绑定账号；账号不可用或重试时自动切换。',
    },
    {
      label: '配额感知自适应 (Quota Adaptive)',
      value: 'quota_adaptive',
      description: '在自适应分流基础上结合额度剩余比例和重置时间，降低额度紧张账号的流量。',
    },
    {
      label: '最久未用 (Least Recently Used)',
      value: 'least_recently_used',
      description: '优先选择最久没有被调用的账号，使账号使用更均匀。',
    },
  ];

  protected readonly residencyOptions = [
    { label: '不限制', value: '' },
    { label: '美国 (us)', value: 'us' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    listenAddress: [DEFAULT_GATEWAY_CONFIG.listenAddress],
    accountSelectionStrategy: [DEFAULT_GATEWAY_CONFIG.accountSelectionStrategy],
    originator: [DEFAULT_GATEWAY_CONFIG.originator],
    residency: [DEFAULT_GATEWAY_CONFIG.residency],
    upstreamProxyEnabled: [DEFAULT_GATEWAY_CONFIG.upstreamProxyEnabled],
    upstreamProxyRequired: [DEFAULT_GATEWAY_CONFIG.upstreamProxyRequired],
    upstreamProxyUrl: [DEFAULT_GATEWAY_CONFIG.upstreamProxyUrl],
    upstreamProxyHasCredentials: [DEFAULT_GATEWAY_CONFIG.upstreamProxyHasCredentials],
    sseKeepAliveMs: [DEFAULT_GATEWAY_CONFIG.sseKeepAliveMs],
    upstreamTimeoutMs: [DEFAULT_GATEWAY_CONFIG.upstreamTimeoutMs],
    upstreamStreamIdleTimeoutMs: [DEFAULT_GATEWAY_CONFIG.upstreamStreamIdleTimeoutMs],
    maxConcurrentRequests: [
      DEFAULT_GATEWAY_CONFIG.maxConcurrentRequests,
      [Validators.required, Validators.min(1), Validators.max(4096)],
    ],
    maxRequestBodyMiB: [
      DEFAULT_GATEWAY_CONFIG.maxRequestBodyMiB,
      [Validators.required, Validators.min(1), Validators.max(512)],
    ],
    maxRetries: [
      DEFAULT_GATEWAY_CONFIG.maxRetries,
      [Validators.required, Validators.min(0), Validators.max(5)],
    ],
    overloadQueueTimeoutMs: [
      DEFAULT_GATEWAY_CONFIG.overloadQueueTimeoutMs,
      [Validators.required, Validators.min(0), Validators.max(60000)],
    ],
    contextCompactionEnabled: [DEFAULT_GATEWAY_CONFIG.contextCompactionEnabled],
    contextCompactionThresholdTokens: [
      DEFAULT_GATEWAY_CONFIG.contextCompactionThresholdTokens,
      [Validators.required, Validators.min(80000), Validators.max(120000)],
    ],
  });

  protected readonly proxyCredentials = this.fb.nonNullable.group({
    upstreamProxyUsername: [''],
    upstreamProxyPassword: [''],
    upstreamProxyClearCredentials: [false],
  });

  ngOnInit(): void {
    clearLegacyGatewayConfigStorage();
    this.loadRemoteConfig();
  }

  protected save(): void {
    if (!this.configLoaded || this.saving) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.message.warning('请先修正超出允许范围的配置项');
      return;
    }
    const payload = this.normalizeConfig(this.form.getRawValue());
    if (payload.upstreamProxyRequired && !payload.upstreamProxyEnabled) {
      this.message.warning('必须使用代理时，请开启上游代理并填写地址');
      return;
    }
    if (payload.upstreamProxyEnabled && !payload.upstreamProxyUrl) {
      this.message.warning('开启上游代理后需要填写代理地址');
      return;
    }
    const credentials = this.proxyCredentialInput();
    if (!credentials) return;
    this.form.patchValue(payload);
    this.saving = true;
    this.http
      .put<Partial<GatewayConfig>>('/ops/gateway-config', { ...payload, ...credentials })
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (remote) => {
          const saved = this.normalizeConfig({
            ...payload,
            ...remote,
            upstreamProxyUrl: this.redactedProxyAddress(
              remote.upstreamProxyUrl ?? payload.upstreamProxyUrl,
            ),
          });
          this.form.patchValue(saved);
          this.proxyCredentials.reset();
          this.testedProxyUrl = '';
          this.proxyTestResult = null;
          this.proxyTestError = '';
          clearLegacyGatewayConfigStorage();
          this.message.success('网关配置已保存');
        },
        error: () => {
          this.message.error('网关配置保存失败，请检查参数后重试');
        },
      });
  }

  protected testProxy(): void {
    const upstreamProxyUrl = this.form.controls.upstreamProxyUrl.value.trim();
    if (!upstreamProxyUrl || this.testingProxy) return;
    const credentials = this.proxyCredentialInput();
    if (!credentials) return;
    this.testedProxyUrl = this.proxyTestSignature;
    this.proxyTestResult = null;
    this.proxyTestError = '';
    this.testingProxy = true;
    this.http
      .post<UpstreamProxyTestResult>('/ops/upstream-proxy-test', {
        upstreamProxyUrl,
        ...credentials,
      })
      .pipe(
        finalize(() => {
          this.testingProxy = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (result) => {
          this.proxyTestResult = result;
        },
        error: () => {
          this.proxyTestError = '测试失败，请检查代理地址格式、认证和后端连接后重试';
        },
      });
  }

  protected get currentProxyTestResult(): UpstreamProxyTestResult | null {
    return this.testedProxyUrl === this.proxyTestSignature ? this.proxyTestResult : null;
  }

  protected get currentProxyTestError(): string {
    return this.testedProxyUrl === this.proxyTestSignature ? this.proxyTestError : '';
  }

  protected resetDefaults(): void {
    this.form.reset(DEFAULT_GATEWAY_CONFIG);
    this.proxyCredentials.reset();
    clearLegacyGatewayConfigStorage();
    this.save();
  }

  protected get listenModeLabel(): string {
    const value = this.form.controls.listenAddress.value;
    return this.listenAddressOptions.find((item) => item.value === value)?.label || '-';
  }

  protected get currentAccessAddress(): string {
    return `${this.currentAccessHost}:${this.gatewayPort}`;
  }

  protected get actualListenAddress(): string {
    return `${this.form.controls.listenAddress.value}:${this.gatewayPort}`;
  }

  protected get strategyLabel(): string {
    const value = this.form.controls.accountSelectionStrategy.value;
    return this.strategyOptions.find((item) => item.value === value)?.label || '-';
  }

  protected get strategyDescription(): string {
    const value = this.form.controls.accountSelectionStrategy.value;
    return this.strategyOptions.find((item) => item.value === value)?.description || '';
  }

  protected get upstreamModeLabel(): string {
    if (this.form.controls.upstreamProxyRequired.value) return '必须使用代理';
    return this.form.controls.upstreamProxyEnabled.value ? '代理转发' : '直连上游';
  }

  protected get residencyLabel(): string {
    const value = this.form.controls.residency.value;
    return this.residencyOptions.find((item) => item.value === value)?.label || '-';
  }

  protected get capacityLabel(): string {
    return `${this.form.controls.maxConcurrentRequests.value} 并发 · ${this.form.controls.maxRequestBodyMiB.value} MiB`;
  }

  protected get contextCompactionLabel(): string {
    if (!this.form.controls.contextCompactionEnabled.value) return '已关闭';
    return `${this.form.controls.contextCompactionThresholdTokens.value.toLocaleString()} Token`;
  }

  private get proxyTestSignature(): string {
    return JSON.stringify({
      address: this.form.controls.upstreamProxyUrl.value.trim(),
      ...this.proxyCredentials.getRawValue(),
    });
  }

  private proxyCredentialInput(): {
    upstreamProxyCredentials?: { username: string; password: string };
    upstreamProxyClearCredentials?: boolean;
  } | null {
    const {
      upstreamProxyUsername: username,
      upstreamProxyPassword: password,
      upstreamProxyClearCredentials: clear,
    } = this.proxyCredentials.getRawValue();
    if (clear && (username || password)) {
      this.message.warning('清除认证时请留空用户名和密码');
      return null;
    }
    if (password && !username) {
      this.message.warning('更新代理认证时请填写用户名');
      return null;
    }
    return {
      upstreamProxyCredentials: username ? { username, password } : undefined,
      upstreamProxyClearCredentials: clear || undefined,
    };
  }

  private redactedProxyAddress(value: string): string {
    if (!value) return '';
    try {
      const address = new URL(value);
      address.username = '';
      address.password = '';
      return address.toString();
    } catch {
      return '';
    }
  }

  private loadRemoteConfig(): void {
    this.loading = true;
    this.http
      .get<Partial<GatewayConfig>>('/ops/gateway-config')
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (remote) => {
          const payload = this.normalizeConfig({
            ...DEFAULT_GATEWAY_CONFIG,
            ...remote,
            upstreamProxyUrl: this.redactedProxyAddress(remote.upstreamProxyUrl ?? ''),
          });
          this.form.patchValue(payload);
          this.configLoaded = true;
        },
        error: () => this.message.error('网关配置读取失败，请刷新页面后重试'),
      });
  }

  private normalizeConfig(value: GatewayConfig): GatewayConfig {
    return {
      ...value,
      listenAddress: this.normalizeListenAddress(value.listenAddress),
      accountSelectionStrategy: this.normalizeAccountSelectionStrategy(
        value.accountSelectionStrategy,
      ),
      originator: value.originator.trim() || DEFAULT_GATEWAY_CONFIG.originator,
      upstreamProxyEnabled: Boolean(value.upstreamProxyEnabled),
      upstreamProxyRequired: Boolean(value.upstreamProxyRequired),
      upstreamProxyUrl: value.upstreamProxyUrl.trim(),
      upstreamProxyHasCredentials: Boolean(value.upstreamProxyHasCredentials),
      sseKeepAliveMs: Number(value.sseKeepAliveMs || DEFAULT_GATEWAY_CONFIG.sseKeepAliveMs),
      upstreamTimeoutMs: Number(value.upstreamTimeoutMs || 0),
      upstreamStreamIdleTimeoutMs: Number(
        value.upstreamStreamIdleTimeoutMs || DEFAULT_GATEWAY_CONFIG.upstreamStreamIdleTimeoutMs,
      ),
      maxConcurrentRequests: Number(
        value.maxConcurrentRequests ?? DEFAULT_GATEWAY_CONFIG.maxConcurrentRequests,
      ),
      maxRequestBodyMiB: Number(
        value.maxRequestBodyMiB ?? DEFAULT_GATEWAY_CONFIG.maxRequestBodyMiB,
      ),
      maxRetries: Number(value.maxRetries ?? DEFAULT_GATEWAY_CONFIG.maxRetries),
      overloadQueueTimeoutMs: Number(
        value.overloadQueueTimeoutMs ?? DEFAULT_GATEWAY_CONFIG.overloadQueueTimeoutMs,
      ),
      contextCompactionEnabled: Boolean(value.contextCompactionEnabled),
      contextCompactionThresholdTokens: Number(
        value.contextCompactionThresholdTokens ??
          DEFAULT_GATEWAY_CONFIG.contextCompactionThresholdTokens,
      ),
    };
  }

  private normalizeListenAddress(value: string): string {
    return value === '0.0.0.0' ? '0.0.0.0' : '127.0.0.1';
  }

  private normalizeAccountSelectionStrategy(value: string): string {
    return this.strategyOptions.some((item) => item.value === value)
      ? value
      : DEFAULT_GATEWAY_CONFIG.accountSelectionStrategy;
  }

  private get gatewayPort(): string {
    const { port } = window.location;
    if (/^42\d\d$/.test(port)) return '8787';
    return port || '8787';
  }

  private get currentAccessHost(): string {
    const { hostname } = window.location;
    if (!hostname || hostname === '0.0.0.0') return 'localhost';
    return hostname;
  }
}
