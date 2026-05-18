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
import { finalize, forkJoin } from 'rxjs';

import { Account, AccountQuota, AccountQuotaPayload } from '../account.model';
import { AccountsService } from '../accounts.service';

type QuotaFormMode = 'create' | 'edit';

@Component({
  selector: 'app-account-quotas',
  templateUrl: './account-quotas.component.html',
  styleUrls: ['./account-quotas.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SHARED_IMPORTS, TitleLabelComponent],
})
export class AccountQuotasComponent implements OnInit {
  private readonly accountsService = inject(AccountsService);
  private readonly message = inject(NzMessageService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly fb = inject(FormBuilder);

  protected items: AccountQuota[] = [];
  protected accounts: Account[] = [];
  protected loading = false;
  protected formVisible = false;
  protected saving = false;
  protected formMode: QuotaFormMode = 'create';
  protected editing: AccountQuota | null = null;

  protected readonly filterForm = this.fb.nonNullable.group({
    accountGuid: [''],
    status: [''],
  });

  protected readonly form = this.fb.nonNullable.group({
    accountGuid: ['', [Validators.required]],
    windowType: ['', [Validators.required]],
    totalTokens: [0],
    remainingTokens: [0],
    status: ['available'],
    resetAt: [0],
    nextRefreshAt: [0],
  });

  protected readonly statusTag: STColumnTag = {
    available: { text: '可用', color: 'green' },
    limited: { text: '限流', color: 'orange' },
    exhausted: { text: '耗尽', color: 'red' },
    unknown: { text: '未知', color: 'default' },
  };

  protected readonly columns: Array<STColumn<AccountQuota>> = [
    { title: '账号', render: 'accountRender', width: 220 },
    { title: '窗口类型', index: 'windowType', width: 120 },
    { title: '状态', index: 'status', type: 'tag', tag: this.statusTag, width: 92 },
    { title: '已用比例', render: 'usageRender', width: 140 },
    { title: '剩余 / 总量', render: 'tokenRender', width: 170 },
    { title: '重置时间', render: 'resetRender', width: 180 },
    { title: '下次刷新', render: 'refreshRender', width: 180 },
    { title: '操作', render: 'actionRender', width: 90, fixed: 'right' },
  ];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    const accountGuid = this.filterForm.controls.accountGuid.value || undefined;
    this.loading = true;
    forkJoin({
      accounts: this.accountsService.list(),
      quotas: this.accountsService.quotas(accountGuid),
    })
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe(({ accounts, quotas }) => {
        this.accounts = accounts ?? [];
        this.items = this.applyStatusFilter(quotas ?? []);
      });
  }

  protected applyFilters(): void {
    this.load();
  }

  protected openCreate(): void {
    this.formMode = 'create';
    this.editing = null;
    this.form.reset({
      accountGuid: this.filterForm.controls.accountGuid.value || '',
      windowType: '',
      totalTokens: 0,
      remainingTokens: 0,
      status: 'available',
      resetAt: 0,
      nextRefreshAt: 0,
    });
    this.formVisible = true;
  }

  protected openEdit(item: AccountQuota): void {
    this.formMode = 'edit';
    this.editing = item;
    this.form.reset({
      accountGuid: item.accountGuid || '',
      windowType: item.windowType || '',
      totalTokens: Number(item.totalTokens || 0),
      remainingTokens: Number(item.remainingTokens || 0),
      status: item.status || 'available',
      resetAt: Number(item.resetAt || 0),
      nextRefreshAt: Number(item.nextRefreshAt || 0),
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
    const totalTokens = Math.max(Number(value.totalTokens || 0), 0);
    const remainingTokens = Math.max(Number(value.remainingTokens || 0), 0);
    const payload: AccountQuotaPayload = {
      accountGuid: value.accountGuid,
      windowType: value.windowType,
      totalTokens,
      remainingTokens,
      usedPercent: totalTokens > 0 ? ((totalTokens - remainingTokens) / totalTokens) * 100 : 0,
      status: value.status || 'available',
      resetAt: Number(value.resetAt || 0),
      nextRefreshAt: Number(value.nextRefreshAt || 0),
    };

    this.saving = true;
    this.accountsService
      .upsertQuota(value.accountGuid, payload)
      .pipe(
        finalize(() => {
          this.saving = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe(() => {
        this.formVisible = false;
        this.message.success(this.formMode === 'create' ? '额度窗口已创建' : '额度窗口已更新');
        this.load();
      });
  }

  protected get totalCount(): number {
    return this.items.length;
  }

  protected get availableCount(): number {
    return this.items.filter((item) => item.status === 'available').length;
  }

  protected get limitedCount(): number {
    return this.items.filter((item) => item.status === 'limited').length;
  }

  protected get exhaustedCount(): number {
    return this.items.filter((item) => item.status === 'exhausted').length;
  }

  protected accountName(guid: string): string {
    return this.accounts.find((item) => item.guid === guid)?.name || guid || '-';
  }

  protected accountMeta(guid: string): string {
    const account = this.accounts.find((item) => item.guid === guid);
    if (!account) return '账号已不存在';
    return `${account.provider || '-'} / ${account.accountGroup || '默认账号组'}`;
  }

  protected formatPercent(value?: number): string {
    return `${Number(value || 0).toFixed(1)}%`;
  }

  protected formatTokens(value?: number): string {
    const count = Number(value || 0);
    if (!count) return '0';
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return `${count}`;
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
      second: '2-digit',
    });
  }

  private applyStatusFilter(items: AccountQuota[]): AccountQuota[] {
    const status = this.filterForm.controls.status.value;
    if (!status) return items;
    return items.filter((item) => item.status === status);
  }
}
