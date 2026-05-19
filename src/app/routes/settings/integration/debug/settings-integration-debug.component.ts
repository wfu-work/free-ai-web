import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { SHARED_IMPORTS } from '@shared';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';

import { ModelMapping } from '../../../models/model.model';
import { PlatformKey } from '../../../platform-keys/platform-key.model';

interface DebugModalData {
  keys: PlatformKey[];
  modelMappings: ModelMapping[];
  proxyBaseUrl: string;
  requestBaseUrl: string;
  sampleKey: string;
  sampleModel: string;
}

type DebugEndpoint = 'models' | 'chat' | 'responses' | 'embeddings';

interface EndpointOption {
  label: string;
  value: DebugEndpoint;
  method: 'GET' | 'POST';
  path: string;
}

@Component({
  selector: 'app-settings-integration-debug',
  templateUrl: './settings-integration-debug.component.html',
  styleUrls: ['./settings-integration-debug.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS],
})
export class SettingsIntegrationDebugComponent {
  private readonly data = inject<DebugModalData>(NZ_MODAL_DATA, { optional: true });
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly endpoints: EndpointOption[] = [
    { label: '获取模型', value: 'models', method: 'GET', path: '/models' },
    { label: '聊天补全', value: 'chat', method: 'POST', path: '/chat/completions' },
    { label: '响应接口', value: 'responses', method: 'POST', path: '/responses' },
    { label: '向量接口', value: 'embeddings', method: 'POST', path: '/embeddings' },
  ];

  protected readonly keys = this.data?.keys ?? [];
  protected readonly modelMappings = this.data?.modelMappings ?? [];
  protected readonly displayBaseUrl = this.data?.proxyBaseUrl || `${window.location.origin}/v1`;
  private readonly requestBaseUrl = this.data?.requestBaseUrl || '/v1';

  protected form = {
    endpoint: 'chat' as DebugEndpoint,
    platformKey: this.data?.sampleKey || '',
    model: this.data?.sampleModel || 'gpt-4.1-mini',
    message: '请回复 ping',
    input: '用一句话说明当前网关路由策略。',
  };
  protected loading = false;
  protected resultStatus = '';
  protected resultText = '';

  protected get selectedEndpoint(): EndpointOption {
    return this.endpoints.find((item) => item.value === this.form.endpoint) || this.endpoints[1];
  }

  protected get requestPreview(): string {
    return `${this.selectedEndpoint.method} ${this.displayBaseUrl}${this.selectedEndpoint.path}`;
  }

  protected get availableModels(): string[] {
    const selectedKey = this.keys.find((item) => item.key === this.form.platformKey);
    const mappedModels = this.modelMappings
      .filter((model) => model.enabled)
      .filter((model) => this.modelAllowedByKey(selectedKey, model))
      .flatMap((model) => this.publicModelNames(model));
    const allowedModels = this.parseAllowedModels(selectedKey?.allowedModels).filter((model) => !this.isRuleModel(model));
    return this.unique([this.form.model, ...mappedModels, ...allowedModels, this.data?.sampleModel, 'gpt-4.1-mini']);
  }

  protected onKeyChange(): void {
    const models = this.availableModels;
    if (models.length > 0 && !models.includes(this.form.model)) {
      this.form.model = models[0];
    }
  }

  async submit(): Promise<boolean> {
    if (!this.form.platformKey) {
      this.message.warning('请选择或输入平台密钥');
      return false;
    }

    const request = this.buildRequest();
    this.loading = true;
    this.resultStatus = '请求中...';
    this.resultText = '';
    this.cdr.markForCheck();

    const startedAt = performance.now();
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
      const elapsed = Math.round(performance.now() - startedAt);
      const text = await response.text();
      this.resultStatus = `${response.status} ${response.statusText || ''} · ${elapsed}ms`;
      this.resultText = this.formatResponse(text);
      if (response.ok) {
        this.message.success('调试请求完成');
      } else {
        this.message.warning('调试请求返回异常状态');
      }
    } catch (error) {
      this.resultStatus = '请求失败';
      this.resultText = error instanceof Error ? error.message : String(error);
      this.message.error('调试请求失败');
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }

    return false;
  }

  protected async copyResult(): Promise<void> {
    if (!this.resultText) return;
    try {
      await navigator.clipboard.writeText(this.resultText);
      this.message.success('响应结果已复制');
    } catch {
      this.message.warning('当前浏览器不允许自动复制，请手动选择文本');
    }
  }

  private buildRequest(): { url: string; method: string; headers: HeadersInit; body?: string } {
    const endpoint = this.selectedEndpoint;
    const headers: Record<string, string> = {
      Authorization: this.form.platformKey,
    };
    let body: string | undefined;

    if (endpoint.method === 'POST') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(this.buildPayload(endpoint.value));
    }

    return {
      url: `${this.requestBaseUrl}${endpoint.path}`,
      method: endpoint.method,
      headers,
      body,
    };
  }

  private buildPayload(endpoint: DebugEndpoint): Record<string, unknown> {
    switch (endpoint) {
      case 'responses':
        return { model: this.form.model, input: this.form.input };
      case 'embeddings':
        return { model: this.form.model, input: this.form.input || this.form.message };
      default:
        return {
          model: this.form.model,
          messages: [{ role: 'user', content: this.form.message }],
          stream: false,
        };
    }
  }

  private formatResponse(text: string): string {
    if (!text) return '';
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  }

  private parseAllowedModels(value?: string): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item)).filter(Boolean);
      }
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  }

  private publicModelNames(model: ModelMapping): string[] {
    return this.unique([model.publicModel, ...this.parseAliases(model.aliases)]);
  }

  private parseAliases(value?: string): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item)).filter(Boolean);
      }
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  }

  private modelAllowedByKey(key: PlatformKey | undefined, model: ModelMapping): boolean {
    if (!key) return true;
    if (key.accountGroupFilter && key.accountGroupFilter !== model.accountGroup) {
      return false;
    }
    return this.allowedByRules(key.allowedModels, (allowed) => {
      if (allowed === '*') return true;
      if (allowed === model.publicModel || allowed === model.upstreamModel) return true;
      if (allowed.startsWith('group:')) return allowed.slice(6) === model.accountGroup;
      if (allowed.startsWith('provider:')) return allowed.slice(9) === model.provider;
      return false;
    });
  }

  private allowedByRules(raw: string | undefined, match: (allowed: string) => boolean): boolean {
    const rules = this.parseAllowedModels(raw);
    if (rules.length === 0) return true;
    return rules.some((rule) => match(rule));
  }

  private isRuleModel(value: string): boolean {
    return value === '*' || value.startsWith('group:') || value.startsWith('provider:');
  }

  private unique(values: Array<string | undefined>): string[] {
    return Array.from(new Set(values.map((item) => item?.trim()).filter(Boolean) as string[]));
  }
}
