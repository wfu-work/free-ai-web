import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';

interface GatewayConfig {
  listenAddress: string;
  accountSelectionStrategy: string;
  originator: string;
  residency: string;
  upstreamProxyEnabled: boolean;
  upstreamProxyUrl: string;
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

const STORAGE_KEY = 'freeai.gateway.config';

const DEFAULT_GATEWAY_CONFIG: GatewayConfig = {
  listenAddress: '127.0.0.1',
  accountSelectionStrategy: 'ordered',
  originator: 'codex_cli_rs',
  residency: '',
  upstreamProxyEnabled: false,
  upstreamProxyUrl: '',
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
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class SettingsGatewayComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected saving = false;

  protected readonly listenAddressOptions = [
    { label: '仅本机 (127.0.0.1)', value: '127.0.0.1' },
    { label: '全部网卡 (0.0.0.0)', value: '0.0.0.0' },
  ];

  protected readonly strategyOptions = [
    { label: '顺序优先 (Ordered)', value: 'ordered' },
    { label: '自适应均衡 (Adaptive)', value: 'round_robin' },
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
    upstreamProxyUrl: [DEFAULT_GATEWAY_CONFIG.upstreamProxyUrl],
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

  ngOnInit(): void {
    this.loadLocalConfig();
    this.loadRemoteConfig();
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.message.warning('请先修正超出允许范围的配置项');
      return;
    }
    const payload = this.normalizeConfig(this.form.getRawValue());
    if (payload.upstreamProxyEnabled && !payload.upstreamProxyUrl) {
      this.message.warning('开启翻墙代理后需要填写代理地址');
      return;
    }
    this.form.patchValue(payload);
    this.saving = true;
    this.http
      .put<Partial<GatewayConfig>>('/ops/gateway-config', payload)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (remote) => {
          const saved = this.normalizeConfig({ ...payload, ...remote });
          this.form.patchValue(saved);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
          this.message.success('网关配置已保存');
        },
        error: () => {
          this.message.error('网关配置保存失败，请检查参数后重试');
        },
      });
  }

  protected resetDefaults(): void {
    this.form.reset(DEFAULT_GATEWAY_CONFIG);
    localStorage.removeItem(STORAGE_KEY);
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

  protected get upstreamModeLabel(): string {
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

  private loadLocalConfig(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Partial<GatewayConfig>;
      const migrated = {
        ...parsed,
        upstreamProxyUrl:
          parsed.upstreamProxyUrl || (parsed as { upstreamProxy?: string }).upstreamProxy || '',
      };
      this.form.patchValue(this.normalizeConfig({ ...DEFAULT_GATEWAY_CONFIG, ...migrated }));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
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
      .subscribe((remote) => {
        const payload = this.normalizeConfig({ ...this.form.getRawValue(), ...remote });
        this.form.patchValue(payload);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      });
  }

  private normalizeConfig(value: GatewayConfig): GatewayConfig {
    return {
      ...value,
      listenAddress: this.normalizeListenAddress(value.listenAddress),
      originator: value.originator.trim() || DEFAULT_GATEWAY_CONFIG.originator,
      upstreamProxyEnabled: Boolean(value.upstreamProxyEnabled),
      upstreamProxyUrl: value.upstreamProxyUrl.trim(),
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
