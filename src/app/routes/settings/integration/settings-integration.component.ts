import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';

import { PlatformKey } from '../../platform-keys/platform-key.model';
import { PlatformKeysService } from '../../platform-keys/platform-keys.service';

@Component({
  selector: 'app-settings-integration',
  templateUrl: './settings-integration.component.html',
  styleUrls: ['./settings-integration.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class SettingsIntegrationComponent implements OnInit {
  private readonly platformKeysService = inject(PlatformKeysService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected keys: PlatformKey[] = [];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    this.platformKeysService
      .listAll()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((keys) => {
        this.keys = keys ?? [];
      });
  }

  protected get proxyBaseUrl(): string {
    return 'http://127.0.0.1:8787/v1';
  }

  protected get adminBaseUrl(): string {
    return 'http://127.0.0.1:8787/api';
  }

  protected get enabledKeyCount(): number {
    return this.keys.filter((item) => item.enabled).length;
  }

  protected get sampleKeyPrefix(): string {
    const key = this.keys.find((item) => item.enabled) || this.keys[0];
    return key?.keyPrefix || 'fk_live_example';
  }

  protected get sampleModel(): string {
    const key = this.keys.find((item) => item.enabled) || this.keys[0];
    const parsed = this.parseAllowedModels(key?.allowedModels);
    return parsed[0] || 'gpt-4.1-mini';
  }

  protected get authHeaderPreview(): string {
    return `Authorization: Bearer ${this.sampleKeyPrefix}...`;
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
      { "role": "system", "content": "You are a helpful assistant." },
      { "role": "user", "content": "ping" }
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
    "input": "Summarize the current routing strategy in one sentence."
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
  messages: [{ role: "user", content: "ping" }]
});

console.log(response.choices[0]?.message?.content);`;
  }

  protected get embeddingsExample(): string {
    return `curl -sS ${this.proxyBaseUrl}/embeddings \\
  -H "Content-Type: application/json" \\
  -H "${this.authHeaderPreview}" \\
  -d '{
    "model": "${this.sampleModel}",
    "input": "hello world"
  }'`;
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
}
