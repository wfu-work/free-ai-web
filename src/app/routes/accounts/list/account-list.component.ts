import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { STChange, STColumn, STColumnTag } from '@delon/abc/st';
import { SHARED_IMPORTS, TitleLabelComponent } from '@shared';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs';

import { Account, AccountTestResult } from '../account.model';
import { AccountsService } from '../accounts.service';

@Component({
  selector: 'app-account-list',
  templateUrl: './account-list.component.html',
  styleUrls: ['./account-list.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class AccountListComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly accountsService = inject(AccountsService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  q = {
    page: 1,
    size: 10,
    enabled: '',
    content: '',
  };

  protected data: Account[] = [];
  protected loading = false;
  totalCount = 0;
  protected testVisible = false;
  protected testing = false;
  protected testTarget: Account | null = null;
  protected testResult: AccountTestResult | null = null;

  protected readonly testForm = this.fb.nonNullable.group({
    model: [''],
    prompt: ['ping'],
  });

  protected readonly statusTag: STColumnTag = {
    available: { text: '可用', color: 'green' },
    limited: { text: '限流', color: 'orange' },
    cooldown: { text: '冷却', color: 'gold' },
    exhausted: { text: '耗尽', color: 'red' },
    disabled: { text: '禁用', color: 'default' },
    expired: { text: '过期', color: 'red' },
    invalid: { text: '失效', color: 'red' },
    unknown: { text: '未知', color: 'default' },
  };

  protected readonly enabledTag: STColumnTag = {
    true: { text: '启用', color: 'green' },
    false: { text: '停用', color: 'red' },
  };

  protected readonly columns: Array<STColumn<Account>> = [
    { title: '账号', index: 'name', render: 'nameRender', width: 220 },
    { title: '供应商 / 分组', index: 'provider', render: 'providerRender', width: 170 },
    { title: '状态', index: 'status', type: 'tag', tag: this.statusTag, width: 92 },
    { title: '启用', index: 'enabled', type: 'tag', tag: this.enabledTag, width: 86 },
    { title: '权重', index: 'weight', render: 'weightRender', width: 92 },
    { title: '失败', index: 'failureCount', width: 72 },
    { title: '最近使用', index: 'lastUsedAt', render: 'lastUsedRender', width: 170 },
    { title: 'Secret', index: 'secretHint', render: 'secretRender', width: 140 },
    {
      title: '操作',
      width: 230,
      fixed: 'right',
      buttons: [
        {
          text: '编辑',
          click: (item: Account) => this.edit(item),
        },
        {
          text: '测试',
          click: (item: Account) => this.openTest(item),
        },
        {
          text: '刷新',
          click: (item: Account) => this.refresh(item),
        },
        {
          text: '启用',
          click: (item: Account) => this.setEnabled(item, true),
          iif: (item: Account) => !item.enabled,
        },
        {
          text: '禁用',
          click: (item: Account) => this.setEnabled(item, false),
          iif: (item: Account) => item.enabled,
        },
        {
          text: '删除',
          className: 'text-error',
          click: (item: Account) => this.delete(item),
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
    this.router.navigateByUrl('/accounts/edit');
  }

  protected edit(item: Account): void {
    this.router.navigate(['/accounts/edit', item.guid]);
  }

  protected setEnabled(item: Account, enabled: boolean): void {
    const title = enabled ? '确定启用该账号？' : '确定禁用该账号？';
    this.modal.confirm({
      nzTitle: title,
      nzContent: enabled ? '启用后账号会重新参与模型路由。' : '禁用后该账号不会再被代理路由命中。',
      nzOkType: enabled ? 'primary' : 'default',
      nzOnOk: () => {
        const request = enabled
          ? this.accountsService.enable(item.guid)
          : this.accountsService.disable(item.guid);
        return new Promise<void>((resolve, reject) => {
          request.subscribe({
            next: () => {
              this.message.success(enabled ? '账号已启用' : '账号已禁用');
              this.getData();
              resolve();
            },
            error: reject,
          });
        });
      },
    });
  }

  protected refresh(item: Account): void {
    this.accountsService.refresh(item.guid).subscribe(() => {
      this.message.success('账号状态已刷新');
      this.getData();
    });
  }

  protected delete(item: Account): void {
    this.modal.confirm({
      nzTitle: '确定删除该账号？',
      nzContent: '删除后账号 Secret 和路由能力将不可恢复，请确认没有模型映射仍依赖它。',
      nzOkDanger: true,
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.accountsService.delete(item.guid).subscribe({
            next: () => {
              this.message.success('账号已删除');
              this.getData();
              resolve();
            },
            error: reject,
          });
        }),
    });
  }

  protected openTest(item: Account): void {
    this.testTarget = item;
    this.testResult = null;
    this.testForm.reset({ model: this.firstSupportedModel(item.supportedModels), prompt: 'ping' });
    this.testVisible = true;
  }

  protected closeTest(): void {
    this.testVisible = false;
    this.testing = false;
    this.testTarget = null;
    this.testResult = null;
  }

  protected runTest(): void {
    if (!this.testTarget) return;
    this.testing = true;
    this.testResult = null;
    this.accountsService
      .test(this.testTarget.guid, this.testForm.getRawValue())
      .pipe(
        finalize(() => {
          this.testing = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe((result) => {
        this.testResult = result;
        if (result.ok) {
          this.message.success('账号测试通过');
        } else {
          this.message.warning('账号测试未通过，请查看结果');
        }
        this.getData();
      });
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

  protected modelCount(value?: string): string {
    if (!value) return '未限制';
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return `${parsed.length} 个模型`;
    } catch {
      return '自定义';
    }
    return '自定义';
  }

  protected firstSupportedModel(value?: string): string {
    if (!value) return '';
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return String(parsed[0] || '');
    } catch {
      return value.split(',').map((item) => item.trim()).filter(Boolean)[0] || '';
    }
    return '';
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
