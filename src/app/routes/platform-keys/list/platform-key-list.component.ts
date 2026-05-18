import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs';

import {
  CreatePlatformKeyResult,
  PlatformKey,
  PlatformKeyPayload,
} from '../platform-key.model';
import { PlatformKeysService } from '../platform-keys.service';

type PlatformKeyFormMode = 'create' | 'edit';

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
  private readonly modal = inject(NzModalService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  protected items: PlatformKey[] = [];
  protected loading = false;
  protected formVisible = false;
  protected saving = false;
  protected formMode: PlatformKeyFormMode = 'create';
  protected editing: PlatformKey | null = null;
  protected secretVisible = false;
  protected secretView: CreatePlatformKeyResult | null = null;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    allowedModels: [''],
    rateLimitPerMinute: [0],
    remark: [''],
  });

  protected readonly enabledTag: STColumnTag = {
    true: { text: '启用', color: 'green' },
    false: { text: '停用', color: 'red' },
  };

  protected readonly columns: Array<STColumn<PlatformKey>> = [
    { title: '密钥', index: 'name', render: 'nameRender', width: 230 },
    { title: '允许模型', index: 'allowedModels', render: 'modelsRender' },
    { title: '每分钟限速', index: 'rateLimitPerMinute', render: 'limitRender', width: 130 },
    { title: '启用', index: 'enabled', type: 'tag', tag: this.enabledTag, width: 86 },
    { title: '最近使用', index: 'lastUsedAt', render: 'lastUsedRender', width: 170 },
    { title: '备注', index: 'remark', render: 'remarkRender', width: 180 },
    { title: '操作', render: 'actionRender', width: 190, fixed: 'right' },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading = true;
    this.platformKeysService
      .list()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((items) => {
        this.items = items ?? [];
      });
  }

  protected openCreate(): void {
    this.formMode = 'create';
    this.editing = null;
    this.form.reset({ name: '', allowedModels: '', rateLimitPerMinute: 0, remark: '' });
    this.formVisible = true;
  }

  protected openEdit(item: PlatformKey): void {
    this.formMode = 'edit';
    this.editing = item;
    this.form.reset({
      name: item.name ?? '',
      allowedModels: item.allowedModels ?? '',
      rateLimitPerMinute: item.rateLimitPerMinute ?? 0,
      remark: item.remark ?? '',
    });
    this.formVisible = true;
  }

  protected closeForm(): void {
    this.formVisible = false;
    this.saving = false;
  }

  protected save(): void {
    Object.values(this.form.controls).forEach((control) => {
      control.markAsDirty();
      control.updateValueAndValidity();
    });
    if (this.form.invalid) return;

    const value = this.form.getRawValue();
    const payload: PlatformKeyPayload = {
      ...value,
      rateLimitPerMinute: Math.max(Number(value.rateLimitPerMinute || 0), 0),
    };
    this.saving = true;
    if (this.formMode === 'create') {
      this.platformKeysService
        .create(payload)
        .pipe(
          finalize(() => {
            this.saving = false;
            this.cdr.markForCheck();
          }),
        )
        .subscribe((result) => {
          this.formVisible = false;
          this.secretView = result;
          this.secretVisible = true;
          this.message.success('密钥已创建');
          this.load();
        });
      return;
    }

    this.platformKeysService
      .update(this.editing!.guid, payload)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe(() => {
        this.formVisible = false;
        this.message.success('密钥已更新');
        this.load();
      });
  }

  protected setEnabled(item: PlatformKey, enabled: boolean): void {
    this.modal.confirm({
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
              this.load();
              resolve();
            },
            error: reject,
          });
        }),
    });
  }

  protected delete(item: PlatformKey): void {
    this.modal.confirm({
      nzTitle: '确定删除该平台密钥？',
      nzContent: '删除后使用该 keyPrefix 的业务客户端将无法继续访问 /v1。',
      nzOkDanger: true,
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.platformKeysService.delete(item.guid).subscribe({
            next: () => {
              this.message.success('密钥已删除');
              this.load();
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
}
