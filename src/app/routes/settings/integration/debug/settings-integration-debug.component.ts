import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { SHARED_IMPORTS } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { firstValueFrom } from 'rxjs';

import {
  PlatformKey,
  PlatformKeyDebugEndpoint,
  PlatformKeyDebugPayload,
} from '../../../apikey/apikey.model';
import { PlatformKeysService } from '../../../apikey/apikey.service';
import { ModelCatalogItem } from '../../../models/model.model';

interface DebugModalData {
  keys: PlatformKey[];
  modelCatalog: ModelCatalogItem[];
  proxyBaseUrl: string;
  sampleModel: string;
}

type DebugEndpoint = PlatformKeyDebugEndpoint;

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
  private readonly platformKeysService = inject(PlatformKeysService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly endpoints: EndpointOption[] = [
    { label: '获取模型', value: 'models', method: 'GET', path: '/models' },
    { label: '聊天补全', value: 'chat', method: 'POST', path: '/chat/completions' },
    { label: '响应接口', value: 'responses', method: 'POST', path: '/responses' },
  ];
  protected readonly reasoningOptions = [
    { label: '跟随密钥/请求', value: '' },
    { label: '低', value: 'low' },
    { label: '中', value: 'medium' },
    { label: '高', value: 'high' },
  ];
  protected readonly serviceTierOptions = [
    { label: '跟随密钥/默认', value: '' },
    { label: '默认', value: 'default' },
    { label: '优先', value: 'priority' },
    { label: '弹性', value: 'flex' },
  ];

  protected readonly keys = this.data?.keys ?? [];
  protected readonly modelCatalog = this.data?.modelCatalog ?? [];
  protected readonly displayBaseUrl = this.data?.proxyBaseUrl || `${window.location.origin}/v1`;

  protected form = {
    endpoint: 'chat' as DebugEndpoint,
    platformKeyGuid: this.keys.find((item) => item.enabled)?.guid || this.keys[0]?.guid || '',
    model: this.data?.sampleModel || 'gpt-4.1-mini',
    reasoningEffort: '',
    serviceTier: '',
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
    const selectedKey = this.keys.find((item) => item.guid === this.form.platformKeyGuid);
    const mappedModels = this.modelCatalog
      .filter((model) => model.enabled && model.availableAccountCount > 0)
      .filter((model) => this.modelAllowedByKey(selectedKey, model))
      .flatMap((model) => this.publicModelNames(model));
    const allowedModels = this.parseAllowedModels(selectedKey?.allowedModels).filter(
      (model) => !this.isRuleModel(model),
    );
    return this.unique([
      this.form.model,
      ...mappedModels,
      ...allowedModels,
      this.data?.sampleModel,
      'gpt-4.1-mini',
    ]);
  }

  protected onKeyChange(): void {
    const selectedKey = this.keys.find((item) => item.guid === this.form.platformKeyGuid);
    const models = this.availableModels;
    if (models.length > 0 && !models.includes(this.form.model)) {
      this.form.model = models[0];
    }
    this.form.reasoningEffort = selectedKey?.reasoningEffort || '';
    this.form.serviceTier = selectedKey?.serviceTier || '';
  }

  async submit(): Promise<boolean> {
    if (!this.form.platformKeyGuid) {
      this.message.warning('请选择 API 密钥');
      return false;
    }

    const request = this.buildDebugRequest();
    this.loading = true;
    this.resultStatus = '请求中...';
    this.resultText = '';
    this.cdr.markForCheck();

    try {
      const response = await firstValueFrom(
        this.platformKeysService.debug(this.form.platformKeyGuid, request),
      );
      this.resultStatus = `${response.statusCode} ${response.statusText || ''} · ${response.latencyMs}ms`;
      this.resultText = this.formatResponse(response.body);
      if (response.statusCode >= 200 && response.statusCode < 300) {
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

  private buildDebugRequest(): PlatformKeyDebugPayload {
    const endpoint = this.selectedEndpoint;
    return {
      endpoint: endpoint.value,
      payload: endpoint.method === 'POST' ? this.buildPayload(endpoint.value) : undefined,
    };
  }

  private buildPayload(endpoint: DebugEndpoint): Record<string, unknown> {
    const payload = this.basePayload(endpoint);
    return this.withModelLevel(payload);
  }

  private basePayload(endpoint: DebugEndpoint): Record<string, unknown> {
    switch (endpoint) {
      case 'responses':
        return { model: this.form.model, input: this.form.input };
      default:
        return {
          model: this.form.model,
          messages: [{ role: 'user', content: this.form.message }],
          stream: false,
        };
    }
  }

  private withModelLevel(payload: Record<string, unknown>): Record<string, unknown> {
    if (this.form.reasoningEffort) {
      payload['reasoning'] = { effort: this.form.reasoningEffort };
    }
    if (this.form.serviceTier) {
      payload['service_tier'] = this.form.serviceTier;
    }
    return payload;
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

  private publicModelNames(model: ModelCatalogItem): string[] {
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

  private modelAllowedByKey(key: PlatformKey | undefined, model: ModelCatalogItem): boolean {
    if (!key) return true;
    if (key.accountGroupFilter && key.accountGroupFilter !== model.accountGroup) {
      return false;
    }
    return this.allowedByRules(key.allowedModels, (allowed) => {
      if (allowed === '*') return true;
      if (allowed === model.publicModel) return true;
      if (allowed.startsWith('group:')) return allowed.slice(6) === model.accountGroup;
      return false;
    });
  }

  private allowedByRules(raw: string | undefined, match: (allowed: string) => boolean): boolean {
    const rules = this.parseAllowedModels(raw);
    if (rules.length === 0) return true;
    return rules.some((rule) => match(rule));
  }

  private isRuleModel(value: string): boolean {
    return value === '*' || value.startsWith('group:');
  }

  private unique(values: Array<string | undefined>): string[] {
    return Array.from(new Set(values.map((item) => item?.trim()).filter(Boolean) as string[]));
  }
}
