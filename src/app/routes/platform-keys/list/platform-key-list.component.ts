import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs';

import { PlatformKeyEditComponent } from '../edit/platform-key-edit.component';
import { CreatePlatformKeyResult, PlatformKey } from '../platform-key.model';
import { PlatformKeysService } from '../platform-keys.service';

@Component({
  selector: 'app-platform-key-list',
  templateUrl: './platform-key-list.component.html',
  styleUrls: ['./platform-key-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class PlatformKeyListComponent implements OnInit {
  private readonly platformKeysService = inject(PlatformKeysService);
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
  totalCount = 0;
  protected secretVisible = false;
  protected secretView: CreatePlatformKeyResult | null = null;

  protected readonly enabledTag: STColumnTag = {
    true: { text: '启用', color: 'green' },
    false: { text: '停用', color: 'red' },
  };

  protected readonly columns: Array<STColumn<PlatformKey>> = [
    { title: '密钥', index: 'name', render: 'nameRender', width: 230 },
    { title: '允许模型', index: 'allowedModels', render: 'modelsRender' },
    { title: '每分钟限速', index: 'rateLimitPerMinute', render: 'limitRender' },
    { title: '启用', index: 'enabled', type: 'tag', tag: this.enabledTag },
    { title: '最近使用', index: 'lastUsedAt', render: 'lastUsedRender' },
    { title: '备注', index: 'remark', render: 'remarkRender' },
    {
      title: '操作',
      width: 190,
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
          click: (item: PlatformKey) => this.setEnabled(item, false),
          iif: (item: PlatformKey) => item.enabled,
        },
        {
          text: '删除',
          className: 'text-error',
          click: (item: PlatformKey) => this.delete(item),
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.getData();
  }

  protected getData(): void {
    this.loading = true;
    this.platformKeysService
      .list(this.q)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((r) => {
        this.data = r.data ?? [];
        this.totalCount = r.total ?? 0;
      });
  }

  protected add(): void {
    this.edit('new');
  }

  protected edit(guid: string): void {
     const title = guid === 'new平台密钥' ? '新增' : '编辑平台密钥';
    const modal = this.modalService.create({
      nzTitle: title,
      nzContent: PlatformKeyEditComponent,
      nzOkText: '确定',
      nzCancelText: '取消',
      nzMaskClosable: false,
      nzData: guid,
      nzOnOk: componentInstance => {
        componentInstance.submit().subscribe({
          next: r => {
            modal.close();
            if (r) {
              this.message.success('操作成功');
              this.getData();
            } else {
              this.message.error('操作失败');
            }
          },
          error: e => {
            this.message.error(e.message || '请求失败');
          }
        });
        return false;
      }
    });
  }

  protected setEnabled(item: PlatformKey, enabled: boolean): void {
    this.modalService.confirm({
      nzTitle: enabled ? '确定启用该平台密钥？' : '确定禁用该平台密钥？',
      nzContent: enabled ? '启用后业务客户端可以继续使用该密钥访问 /v1。' : '禁用后该密钥会立即无法访问 /v1。',
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
      nzTitle: '确定删除该平台密钥？',
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

  protected closeSecret(): void {
    this.secretVisible = false;
    this.secretView = null;
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

  protected formatLimit(value?: number): string {
    if (!value || value <= 0) return '不限速';
    return `${value} / min`;
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
