import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';

interface GatewayConfig {
  listenAddress: string;
  accountSelectionStrategy: string;
  freeAccountModel: string;
  modelRewriteRules: string;
  originator: string;
  residency: string;
  upstreamProxyEnabled: boolean;
  upstreamProxyUrl: string;
  sseKeepAliveMs: number;
  upstreamTimeoutMs: number;
  upstreamStreamIdleTimeoutMs: number;
}

const STORAGE_KEY = 'freeai.gateway.config';

const DEFAULT_GATEWAY_CONFIG: GatewayConfig = {
  listenAddress: '127.0.0.1',
  accountSelectionStrategy: 'ordered',
  freeAccountModel: 'follow_request',
  modelRewriteRules: 'spark*=gpt-5.4-mini\nclaude-sonnet-4*=gpt-5.4',
  originator: 'codex_cli_rs',
  residency: '',
  upstreamProxyEnabled: false,
  upstreamProxyUrl: '',
  sseKeepAliveMs: 15000,
  upstreamTimeoutMs: 120000,
  upstreamStreamIdleTimeoutMs: 1800000,
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
    { label: '均衡轮询 (Round Robin)', value: 'round_robin' },
  ];

  protected readonly freeModelOptions = [
    { label: '跟随请求', value: 'follow_request' },
    { label: 'gpt-5.4-mini', value: 'gpt-5.4-mini' },
    { label: 'gpt-5.4', value: 'gpt-5.4' },
    { label: 'gpt-5.3-codex', value: 'gpt-5.3-codex' },
    { label: 'gpt-5.2', value: 'gpt-5.2' },
  ];

  protected readonly residencyOptions = [
    { label: '不限制', value: '' },
    { label: '美国 (us)', value: 'us' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    listenAddress: [DEFAULT_GATEWAY_CONFIG.listenAddress],
    accountSelectionStrategy: [DEFAULT_GATEWAY_CONFIG.accountSelectionStrategy],
    freeAccountModel: [DEFAULT_GATEWAY_CONFIG.freeAccountModel],
    modelRewriteRules: [DEFAULT_GATEWAY_CONFIG.modelRewriteRules],
    originator: [DEFAULT_GATEWAY_CONFIG.originator],
    residency: [DEFAULT_GATEWAY_CONFIG.residency],
    upstreamProxyEnabled: [DEFAULT_GATEWAY_CONFIG.upstreamProxyEnabled],
    upstreamProxyUrl: [DEFAULT_GATEWAY_CONFIG.upstreamProxyUrl],
    sseKeepAliveMs: [DEFAULT_GATEWAY_CONFIG.sseKeepAliveMs],
    upstreamTimeoutMs: [DEFAULT_GATEWAY_CONFIG.upstreamTimeoutMs],
    upstreamStreamIdleTimeoutMs: [DEFAULT_GATEWAY_CONFIG.upstreamStreamIdleTimeoutMs],
  });

  ngOnInit(): void {
    this.loadLocalConfig();
    this.loadRemoteConfig();
  }

  protected save(): void {
    const payload = this.normalizeConfig(this.form.getRawValue());
    if (payload.upstreamProxyEnabled && !payload.upstreamProxyUrl) {
      this.message.warning('开启翻墙代理后需要填写代理地址');
      return;
    }
    this.form.patchValue(payload);
    this.saving = true;
    this.http
      .put<Partial<GatewayConfig>>('/ops/gateway-config', {
        upstreamProxyEnabled: payload.upstreamProxyEnabled,
        upstreamProxyUrl: payload.upstreamProxyUrl,
      })
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((remote) => {
        const saved = this.normalizeConfig({ ...payload, ...remote });
        this.form.patchValue(saved);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        this.message.success('网关配置已保存');
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

  protected get freeModelLabel(): string {
    const value = this.form.controls.freeAccountModel.value;
    return this.freeModelOptions.find((item) => item.value === value)?.label || value || '-';
  }

  protected get upstreamModeLabel(): string {
    return this.form.controls.upstreamProxyEnabled.value ? '代理转发' : '直连上游';
  }

  protected get residencyLabel(): string {
    const value = this.form.controls.residency.value;
    return this.residencyOptions.find((item) => item.value === value)?.label || '-';
  }

  private loadLocalConfig(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Partial<GatewayConfig>;
      const migrated = {
        ...parsed,
        upstreamProxyUrl: parsed.upstreamProxyUrl || (parsed as { upstreamProxy?: string }).upstreamProxy || '',
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
      modelRewriteRules: value.modelRewriteRules.trim(),
      originator: value.originator.trim() || DEFAULT_GATEWAY_CONFIG.originator,
      upstreamProxyEnabled: Boolean(value.upstreamProxyEnabled),
      upstreamProxyUrl: value.upstreamProxyUrl.trim(),
      sseKeepAliveMs: Number(value.sseKeepAliveMs || DEFAULT_GATEWAY_CONFIG.sseKeepAliveMs),
      upstreamTimeoutMs: Number(value.upstreamTimeoutMs || 0),
      upstreamStreamIdleTimeoutMs: Number(
        value.upstreamStreamIdleTimeoutMs || DEFAULT_GATEWAY_CONFIG.upstreamStreamIdleTimeoutMs,
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
