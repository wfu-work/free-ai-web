import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzMessageService } from 'ng-zorro-antd/message';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { OpsService } from '../../ops/ops.service';
import { CodexConfigPayload, CodexConfigPreview, PlatformKey } from '../platform-key.model';
import { PlatformKeysService } from '../platform-keys.service';

@Component({
  selector: 'app-platform-key-codex-config',
  templateUrl: './platform-key-codex-config.component.html',
  styleUrls: ['./platform-key-codex-config.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent, NzEmptyModule],
})
export class PlatformKeyCodexConfigComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly platformKeysService = inject(PlatformKeysService);
  private readonly opsService = inject(OpsService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = false;
  protected previewing = false;
  protected saving = false;
  protected showSecret = false;
  protected platformKeys: PlatformKey[] = [];
  protected preview: CodexConfigPreview | null = null;
  protected proxyPrefix = '/v1';

  protected readonly form = this.fb.nonNullable.group({
    platformKeyGuid: ['', [Validators.required]],
    apiBaseUrl: ['', [Validators.required]],
    model: ['gpt-5.5', [Validators.required]],
    providerName: ['custom', [Validators.required]],
    reasoningEffort: ['medium'],
    writeGlobal: [true],
  });

  ngOnInit(): void {
    this.loading = true;
    forkJoin({
      keys: this.platformKeysService.listAll().pipe(catchError(() => of([]))),
      metrics: this.opsService.metrics().pipe(catchError(() => of(null))),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe(({ keys, metrics }) => {
        this.proxyPrefix = this.normalizeProxyPrefix(metrics?.proxyPrefix);
        this.platformKeys = keys.filter(
          (item) => item.enabled && (item.protocolType || 'openai_compatible') === 'openai_compatible',
        );
        this.form.patchValue({ apiBaseUrl: this.defaultGatewayEndpoint });
        if (this.platformKeys.length > 0) {
          this.form.patchValue({
            platformKeyGuid: this.platformKeys[0].guid,
            model: this.defaultModel(this.platformKeys[0]),
          });
          this.previewConfig();
        }
      });
  }

  protected get selectedKey(): PlatformKey | undefined {
    const guid = this.form.controls.platformKeyGuid.value;
    return this.platformKeys.find((item) => item.guid === guid);
  }

  protected get maskedKey(): string {
    const key = this.preview?.platformKey || this.selectedKey?.key || '';
    if (!key) return '-';
    if (this.showSecret) return key;
    return '•'.repeat(Math.min(Math.max(key.length, 24), 64));
  }

  protected get modelOptions(): string[] {
    const selected = this.selectedKey;
    if (!selected) return ['gpt-5.5'];
    const models = new Set<string>();
    if (selected.boundModel) models.add(selected.boundModel);
    for (const model of this.parseModels(selected.allowedModels)) {
      if (model && model !== '*') models.add(model);
    }
    models.add(this.form.controls.model.value || 'gpt-5.5');
    return Array.from(models);
  }

  protected get defaultGatewayEndpoint(): string {
    return `${this.gatewayBaseUrl}${this.proxyPrefix}`;
  }

  protected get gatewayBaseUrl(): string {
    const { protocol, hostname, port } = window.location;
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && /^42\d\d$/.test(port)) {
      return `http://${hostname}:8787`;
    }
    return `${protocol}//${window.location.host}`;
  }

  protected onKeyChange(guid: string): void {
    const key = this.platformKeys.find((item) => item.guid === guid);
    if (key) {
      this.form.patchValue({ model: this.defaultModel(key) });
    }
    this.previewConfig();
  }

  protected resetEndpoint(): void {
    this.form.patchValue({ apiBaseUrl: this.defaultGatewayEndpoint });
    this.previewConfig();
  }

  protected previewConfig(): void {
    if (this.form.invalid) return;
    this.previewing = true;
    this.platformKeysService
      .codexConfigPreview(this.payload())
      .pipe(
        finalize(() => {
          this.previewing = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((result) => {
        this.preview = result;
      });
  }

  protected save(): void {
    Object.values(this.form.controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
    if (this.form.invalid) return;
    this.saving = true;
    this.platformKeysService
      .applyCodexConfig(this.payload())
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((result) => {
        this.preview = result;
        this.message.success('Codex 本地配置已写入');
      });
  }

  protected goList(): void {
    this.router.navigateByUrl('/platform-keys/list');
  }

  protected copy(value: string, label: string): void {
    if (!value) return;
    navigator.clipboard?.writeText(value).then(() => this.message.success(`${label}已复制`));
  }

  protected codeLines(value?: string): string[] {
    return (value || '').replace(/\n$/, '').split('\n');
  }

  protected maskedAuthJson(): string {
    const value = this.preview?.authJson || '';
    if (this.showSecret) return value;
    return value.replace(/("OPENAI_API_KEY"\s*:\s*")([^"]+)(")/, (_match, prefix, secret, suffix) => {
      const masked = secret.length > 12 ? `${secret.slice(0, 8)}${'•'.repeat(18)}${secret.slice(-6)}` : '••••••';
      return `${prefix}${masked}${suffix}`;
    });
  }

  protected formatTime(value?: number): string {
    if (!value) return '尚未写入';
    return new Date(value).toLocaleString('zh-CN', { hour12: false });
  }

  private payload(): CodexConfigPayload {
    return {
      platformKeyGuid: this.form.controls.platformKeyGuid.value,
      apiBaseUrl: this.form.controls.apiBaseUrl.value,
      model: this.form.controls.model.value,
      providerName: this.form.controls.providerName.value,
      reasoningEffort: this.form.controls.reasoningEffort.value,
      writeGlobal: this.form.controls.writeGlobal.value,
    };
  }

  private defaultModel(key: PlatformKey): string {
    if (key.boundModel) return key.boundModel;
    const first = this.parseModels(key.allowedModels).find((item) => item && item !== '*');
    return first || 'gpt-5.5';
  }

  private parseModels(value?: string): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map((item) => String(item));
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return [];
  }

  private normalizeProxyPrefix(value?: string): string {
    const prefix = (value || '/v1').trim();
    const normalized = prefix.startsWith('/') ? prefix : `/${prefix}`;
    return normalized.length > 1 ? normalized.replace(/\/+$/, '') : '/v1';
  }
}
