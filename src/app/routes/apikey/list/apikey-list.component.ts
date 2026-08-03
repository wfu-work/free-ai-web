import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { finalize, firstValueFrom, forkJoin } from 'rxjs';

import { OpsService } from '../../ops/ops.service';
import { PlatformKey, PlatformKeyStats } from '../apikey.model';
import { PlatformKeysService } from '../apikey.service';

@Component({
  selector: 'app-platform-key-list',
  templateUrl: './apikey-list.component.html',
  styleUrls: ['./apikey-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent, NzPopoverModule],
})
export class PlatformKeyListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly platformKeysService = inject(PlatformKeysService);
  private readonly opsService = inject(OpsService);
  private readonly message = inject(NzMessageService);
  private readonly modalService = inject(NzModalService);
  private readonly cdr = inject(ChangeDetectorRef);

  q = {
    page: 1,
    size: 10,
    enabled: '',
    content: '',
  };

  protected data: PlatformKey[] = [];
  protected loading = false;
  protected copyingKeyGuid = '';
  totalCount = 0;
  protected proxyPrefix = '/v1';
  protected stats: PlatformKeyStats = {
    totalTokens: 0,
    totalAmount: 0,
  };

  protected readonly enabledTag: STColumnTag = {
    true: { text: '启用', color: 'green' },
    false: { text: '停用', color: 'red' },
  };

  protected readonly columns: Array<STColumn<PlatformKey>> = [
    { title: '名称', index: 'name', render: 'nameRender' },
    { title: '密钥标识', render: 'keyRender', width: 190 },
    { title: '账号组', render: 'strategyRender' },
    { title: '绑定模型', render: 'boundModelRender' },
    { title: 'Token / 金额', render: 'usageRender' },
    {
      title: '启用',
      index: 'enabled',
      type: 'tag',
      tag: this.enabledTag,
    },
    {
      title: '操作',
      buttons: [
        {
          text: '编辑',
          click: (item: PlatformKey) => this.edit(item.guid),
        },
        {
          text: '启用',
          click: (item: PlatformKey) => this.setEnabled(item, true),
          iif: (item: PlatformKey) => !item.enabled,
        },
        {
          text: '禁用',
          className: 'text-error',
          click: (item: PlatformKey) => this.setEnabled(item, false),
          iif: (item: PlatformKey) => item.enabled,
          pop: {
            title: '确定禁用?',
            okType: 'danger',
            icon: 'star',
          },
        },
        {
          text: '删除',
          className: 'text-error',
          click: (item: PlatformKey) => this.delete(item),
          pop: {
            title: '确定删除?',
            okType: 'danger',
            icon: 'star',
          },
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.getData();
  }

  protected getData(): void {
    this.loading = true;
    forkJoin({
      page: this.platformKeysService.list(this.q),
      stats: this.platformKeysService.stats(),
      metrics: this.opsService.metrics(),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe(({ page, stats, metrics }) => {
        this.data = page.data ?? [];
        this.totalCount = page.total ?? 0;
        this.stats = stats ?? { totalTokens: 0, totalAmount: 0 };
        this.proxyPrefix = this.normalizeProxyPrefix(metrics?.proxyPrefix);
      });
  }

  protected add(): void {
    this.router.navigateByUrl('/access/keys/new');
  }

  protected openCodexConfig(): void {
    this.router.navigateByUrl('/access/codex');
  }

  protected edit(guid: string): void {
    this.router.navigate(['/access/keys', guid]);
  }

  protected async copyFullKey(item: PlatformKey): Promise<void> {
    if (!item.guid || this.copyingKeyGuid) return;
    this.copyingKeyGuid = item.guid;
    this.cdr.markForCheck();
    try {
      const result = await firstValueFrom(this.platformKeysService.getSecret(item.guid));
      const secret = result.key?.trim();
      if (!secret) throw new Error('empty platform key secret');
      await navigator.clipboard.writeText(secret);
      this.message.success('完整 API 密钥已复制');
    } catch {
      this.message.error('完整 API 密钥复制失败，请检查主密钥状态和浏览器剪贴板权限');
    } finally {
      this.copyingKeyGuid = '';
      this.cdr.markForCheck();
    }
  }

  protected setEnabled(item: PlatformKey, enabled: boolean): void {
    this.modalService.confirm({
      nzTitle: enabled ? '确定启用该API 密钥？' : '确定禁用该API 密钥？',
      nzContent: enabled
        ? '启用后业务客户端可以继续使用该密钥访问 /v1。'
        : '禁用后该密钥会立即无法访问 /v1。',
      nzOkType: enabled ? 'primary' : 'default',
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          const request = enabled
            ? this.platformKeysService.enable(item.guid)
            : this.platformKeysService.disable(item.guid);
          request.subscribe({
            next: () => {
              this.message.success(enabled ? '密钥已启用' : '密钥已禁用');
              this.getData();
              resolve();
            },
            error: reject,
          });
        }),
    });
  }

  protected delete(item: PlatformKey): void {
    this.modalService.confirm({
      nzTitle: '确定删除该API 密钥？',
      nzContent: '删除后使用该 keyPrefix 的业务客户端将无法继续访问 /v1。',
      nzOkDanger: true,
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.platformKeysService.delete(item.guid).subscribe({
            next: () => {
              this.message.success('密钥已删除');
              this.getData();
              resolve();
            },
            error: reject,
          });
        }),
    });
  }

  protected get gatewayBaseUrl(): string {
    const { protocol, hostname, port } = window.location;
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && /^42\d\d$/.test(port)) {
      return `http://${hostname}:8787`;
    }
    return `${protocol}//${window.location.host}`;
  }

  protected get openAiGatewayEndpoint(): string {
    return `${this.gatewayBaseUrl}${this.proxyPrefix}`;
  }

  protected formatModels(value?: string): string {
    if (!value) return '全部模型';
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.length ? parsed.join(', ') : '全部模型';
    } catch {
      return value;
    }
    return value;
  }

  protected formatTokenLimit(item: PlatformKey): string {
    if (!item.totalTokenLimit || item.totalTokenLimit <= 0) return '不限额度';
    return `${item.totalTokenLimit}${item.tokenLimitUnit || ''} tokens`;
  }

  protected formatLimit(value?: number): string {
    if (!value || value <= 0) return '不限速';
    return `${value} / min`;
  }

  private normalizeProxyPrefix(value?: string): string {
    const prefix = (value || '/v1').trim();
    const normalized = prefix.startsWith('/') ? prefix : `/${prefix}`;
    return normalized.length > 1 ? normalized.replace(/\/+$/, '') : '/v1';
  }

  protected formatTokens(value?: number): string {
    const tokens = Number(value || 0);
    if (tokens >= 1000000000) return `${(tokens / 1000000000).toFixed(2)}B`;
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(2)}K`;
    return tokens.toFixed(2);
  }

  protected formatAmount(value?: number): string {
    return `$${Number(value || 0).toFixed(2)}`;
  }

  protected formatTokenLimitText(item: PlatformKey): string {
    return item.totalTokenLimit && item.totalTokenLimit > 0
      ? `${this.formatTokenLimit(item)}`
      : '不限额';
  }

  protected boundModelLabel(item: PlatformKey): string {
    return item.boundModel || '跟随请求';
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

  protected async copy(value: string, label: string): Promise<void> {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.message.success(`${label}已复制`);
    } catch {
      this.message.warning('当前浏览器不允许自动复制，请手动选择文本');
    }
  }

  tableChange(event: STChange): void {
    switch (event.type) {
      case 'pi':
      case 'ps':
      case 'filter':
      case 'sort':
        this.q.page = event.pi;
        this.q.size = event.ps;
        this.getData();
        break;
      default:
        break;
    }
  }
}
