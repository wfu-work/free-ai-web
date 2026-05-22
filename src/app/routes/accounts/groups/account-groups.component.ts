import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs/operators';

import { AccountGroup } from '../account.model';
import { AccountsService } from '../accounts.service';

@Component({
  selector: 'app-account-groups',
  templateUrl: './account-groups.component.html',
  styleUrls: ['./account-groups.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class AccountGroupsComponent implements OnInit {
  private readonly accountsService = inject(AccountsService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  protected loading = false;
  protected saving = false;
  protected formVisible = false;
  protected editing: AccountGroup | null = null;
  q = {
    page: 1,
    size: 10,
    enabled: '',
    content: '',
  };

  protected data: AccountGroup[] = [];
  totalCount = 0;

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    description: [''],
    sort: [0],
    enabled: [true],
    remark: [''],
  });

  protected readonly enabledTag: STColumnTag = {
    true: { text: '启用', color: 'green' },
    false: { text: '停用', color: 'red' },
  };

  protected readonly columns: Array<STColumn<AccountGroup>> = [
    { title: '账号分组', render: 'groupRender', width: 230, fixed: 'left' },
    { title: '供应商', render: 'providerRender', width: 180 },
    { title: '账号池', render: 'accountRender', width: 160 },
    { title: '模型映射', render: 'modelRender', width: 220 },
    { title: '账号类型', render: 'typeRender', width: 160 },
    { title: '排序', index: 'sort', width: 90 },
    { title: '启用', index: 'enabled', type: 'tag', tag: this.enabledTag, width: 86 },
    { title: '说明 / 同步', render: 'descriptionRender', width: 220 },
    {
      title: '操作',
      width: 120,
      fixed: 'right',
      buttons: [
        {
          text: '编辑',
          click: (item: AccountGroup) => this.edit(item),
        },
        {
          text: '删除',
          className: 'text-error',
          click: (item: AccountGroup) => this.delete(item),
        },
      ],
    },
  ];

  ngOnInit(): void {
    this.getData();
  }

  protected getData(): void {
    this.loading = true;
    this.accountsService
      .listGroupsPage(this.q)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((result) => {
        this.data = result.data ?? [];
        this.totalCount = result.total ?? 0;
      });
  }

  protected add(): void {
    this.editing = null;
    this.form.reset({ name: '', description: '', sort: 0, enabled: true, remark: '' });
    this.formVisible = true;
  }

  protected edit(item: AccountGroup): void {
    this.editing = item;
    this.form.reset({
      name: item.name ?? '',
      description: item.description ?? '',
      sort: item.sort ?? 0,
      enabled: item.enabled,
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

    this.saving = true;
    const payload = this.form.getRawValue();
    const request = this.editing
      ? this.accountsService.updateGroup(this.editing.guid, payload)
      : this.accountsService.createGroup(payload);
    request
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe(() => {
        this.message.success(this.editing ? '账号分组已更新' : '账号分组已创建');
        this.formVisible = false;
        this.getData();
      });
  }

  protected delete(item: AccountGroup): void {
    this.modal.confirm({
      nzTitle: '确定删除该账号分组？',
      nzContent: '删除后新增账号和模型映射将无法再选择该分组；如果已有引用，后端会拒绝删除。',
      nzOkDanger: true,
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.accountsService.deleteGroup(item.guid).subscribe({
            next: () => {
              this.message.success('账号分组已删除');
              this.getData();
              resolve();
            },
            error: reject,
          });
        }),
    });
  }

  protected get totalGroups(): number {
    return this.totalCount;
  }

  protected get activeGroups(): number {
    return this.data.filter((item) => item.enabled).length;
  }

  protected get disabledGroups(): number {
    return this.data.filter((item) => !item.enabled).length;
  }

  protected summaryValues(value?: string): string[] {
    const raw = (value || '').trim();
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item || '').trim()).filter(Boolean);
      }
    } catch {
      return raw.split(',').map((item) => item.trim()).filter(Boolean);
    }
    return [];
  }

  protected formatTime(value?: number): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('zh-CN', {
      hour12: false,
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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
