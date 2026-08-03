import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { finalize, forkJoin } from 'rxjs';

import { SettingsIntegrationDebugComponent as EditComponent } from './debug/settings-integration-debug.component';
import { PlatformKey } from '../../apikey/apikey.model';
import { PlatformKeysService } from '../../apikey/apikey.service';
import { ModelCatalogItem } from '../../models/model.model';
import { ModelsService } from '../../models/models.service';
import { OpsService } from '../../ops/ops.service';

@Component({
  selector: 'app-settings-integration',
  templateUrl: './settings-integration.component.html',
  styleUrls: ['./settings-integration.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SHARED_IMPORTS,
    TitleLabelComponent,
    NzDescriptionsModule,
    NzListModule,
    NzStatisticModule,
    NzStepsModule,
    NzTagModule,
  ],
})
export class SettingsIntegrationComponent implements OnInit {
  private readonly platformKeysService = inject(PlatformKeysService);
  private readonly modelsService = inject(ModelsService);
  private readonly opsService = inject(OpsService);
  private readonly message = inject(NzMessageService);
  private readonly modalService = inject(NzModalService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected keys: PlatformKey[] = [];
  protected modelCatalog: ModelCatalogItem[] = [];
  protected proxyPrefix = '/v1';
  protected readonly sampleKey = 'sk-your-api-key';
  protected readonly publicEndpoints = [
    {
      method: 'GET',
      name: '获取模型',
      path: '/models',
      description: '返回当前 API 密钥可访问的公开模型列表。',
    },
    {
      method: 'POST',
      name: '聊天补全',
      path: '/chat/completions',
      description: '兼容 OpenAI Chat Completions 请求格式。',
    },
    {
      method: 'POST',
      name: '响应接口',
      path: '/responses',
      description: '兼容 OpenAI Responses 请求格式。',
    },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    forkJoin({
      keys: this.platformKeysService.listAll(),
      models: this.modelsService.listAll(),
      metrics: this.opsService.metrics(),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe(({ keys, models, metrics }) => {
        this.keys = keys ?? [];
        this.modelCatalog = models ?? [];
        this.proxyPrefix = this.normalizeProxyPrefix(metrics?.proxyPrefix);
      });
  }

  protected get proxyBaseUrl(): string {
    return `${this.gatewayBaseUrl}${this.proxyPrefix}`;
  }

  protected get gatewayBaseUrl(): string {
    const { protocol, hostname, port } = window.location;
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && /^42\d\d$/.test(port)) {
      return `http://${hostname}:8787`;
    }
    return `${protocol}//${window.location.host}`;
  }

  protected get enabledKeyCount(): number {
    return this.keys.filter((item) => item.enabled).length;
  }

  protected get sampleModel(): string {
    const key = this.keys.find((item) => item.enabled) || this.keys[0];
    const parsed = this.parseAllowedModels(key?.allowedModels);
    const catalogModel = this.modelCatalog.find(
      (item) => item.enabled && item.availableAccountCount > 0 && item.publicModel,
    );
    return (
      parsed.find((item) => item !== '*' && !item.startsWith('group:')) ||
      catalogModel?.publicModel ||
      'gpt-4.1-mini'
    );
  }

  protected get authHeaderPreview(): string {
    return `Authorization: Bearer ${this.sampleKey}`;
  }

  protected get curlModelsExample(): string {
    return `curl -sS ${this.proxyBaseUrl}/models \\
  -H "${this.authHeaderPreview}"`;
  }

  protected get curlChatExample(): string {
    return `curl -sS ${this.proxyBaseUrl}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "${this.authHeaderPreview}" \\
  -d '{
    "model": "${this.sampleModel}",
    "messages": [
      { "role": "system", "content": "你是一个可靠的助手。" },
      { "role": "user", "content": "请回复 ping" }
    ],
    "stream": false
  }'`;
  }

  protected get curlResponsesExample(): string {
    return `curl -sS ${this.proxyBaseUrl}/responses \\
  -H "Content-Type: application/json" \\
  -H "${this.authHeaderPreview}" \\
  -d '{
    "model": "${this.sampleModel}",
    "input": "用一句话说明当前网关路由策略。"
  }'`;
  }

  protected get openAiSdkExample(): string {
    return `import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.FREEAI_PLATFORM_KEY,
  baseURL: "${this.proxyBaseUrl}"
});

const response = await client.chat.completions.create({
  model: "${this.sampleModel}",
  messages: [{ role: "user", content: "请回复 ping" }]
});

console.log(response.choices[0]?.message?.content);`;
  }

  protected async copy(value: string, label: string): Promise<void> {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.message.success(`${label}已复制`);
    } catch {
      this.message.warning('当前浏览器不允许自动复制，请手动选择文本');
    }
  }

  protected openDebug(): void {
    const title = '网关接口调试';
    const modal = this.modalService.create({
      nzTitle: title,
      nzContent: EditComponent,
      nzOkText: '开始调试',
      nzCancelText: '关闭',
      nzMaskClosable: false,
      nzWidth: 800,
      nzData: {
        keys: this.keys,
        modelCatalog: this.modelCatalog,
        proxyBaseUrl: this.proxyBaseUrl,
        sampleModel: this.sampleModel,
      },
      nzOnOk: (component) => component?.submit(),
    });
    modal.afterClose.subscribe(() => this.cdr.markForCheck());
  }

  protected parseAllowedModels(value?: string): string[] {
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

  private normalizeProxyPrefix(value?: string): string {
    const prefix = (value || '/v1').trim();
    const normalized = prefix.startsWith('/') ? prefix : `/${prefix}`;
    return normalized.length > 1 ? normalized.replace(/\/+$/, '') : '/v1';
  }
}
